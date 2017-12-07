'use strict';

const _ = require('lodash');
const config = require('../config');
const util = require('util');
const pg = require('pg');
const JiraApi = require('jira').JiraApi;
const ACCEPTED_STATUS = "ACCEPTED";
const RED = "ff0000";
const GREEN = "33cc33";
const qs = require('querystring');
const axios = require('axios');

const dbConfig = config('DB_CONFIG');
var pool = new pg.Pool(dbConfig);
const jira = new JiraApi('https', config('JIRA_HOST'), config('JIRA_PORT'), config('JIRA_USER'), config('JIRA_PWD'), 'latest');

var jiraKey;
var jiraAssingee;
var jiraDesc;
var jiraSummary;
var jiraIssue;
var senderSlackName;
var receiverSlackName;

var issueTrans = {
    "transition": {
        "id": "21"   //"21" is the ID of the transition to "In Progress" status.
    }
};

const handler = (payload, res) => {
    
    var acceptingUserID = "<@" + payload.user.id + ">";
	var taskNumber = payload.submission.task;
    let clarifications = '';
    let dbQ1 = "SELECT * FROM clarify_table WHERE serial_id = $1";
	let dbQ2 = "SELECT * FROM ask_table WHERE serial_id = $1";
    let channel = payload.channel.id;
    
    res.send('');
	pool.connect().then(client => {
		return client.query(dbQ1, [taskNumber])
			.then(result => {
				client.release();
				if (result.rows.length > 0) {
                    for (let i=0; i<result.rows.length; i++) {
                        clarifications += '\n\nQuestion:\n'+ result.rows[i].clar_quest + '\nAnswer:\n'+ result.rows[i].clar_answer;
                    }
				}
				pool.connect().then(client1 => {
					return client1.query(dbQ2, [taskNumber])
						.then(result1 => {
                            client1.release();
                            var taskNumberRow = result1.rows;
                            jiraSummary = taskNumberRow[0].title;
                            let receiverSlackID = taskNumberRow[0].receiver_id;
                            let senderSlackID = taskNumberRow[0].sender_id;
                            let baseDesc = taskNumberRow[0].req_desc;
                            let dueDate = taskNumberRow[0].due_date;

                            pool.connect().then(client2 => {
                                return client2.query('SELECT * FROM user_table WHERE slack_id = $1 OR slack_id = $2', [receiverSlackID, senderSlackID])
                                    .then(res => {
                                        client2.release();
                                        //console.log("Log 1: "+ res.rows[0].f_name); //#DEBUG CODE: UNCOMMENT FOR DEBUGGING PURPOSES ONLY
                                        for (let i=0; i<res.rows.length; i++){
                                            if (res.rows[i].slack_id == senderSlackID){
                                                senderSlackName = res.rows[i].f_name +' '+ res.rows[i].l_name;
                                            }
                                            if (res.rows[i].slack_id == receiverSlackID){
                                                receiverSlackName = res.rows[i].f_name +' '+ res.rows[i].l_name;
                                                jiraAssingee = res.rows[i].jira_name;
                                            }
                                        }
                                        jiraDesc = 'Assigned by: '+ senderSlackName +'\n\n'+'Assigned to: '+ receiverSlackName +'\n\n'+ baseDesc + clarifications;
                                        jiraIssue = {
                                            "fields": {
                                                "project": {
                                                    "id": "13100"  //TASK PROJECT ID
                                                },
                                                "summary": jiraSummary,
                                                "issuetype": {
                                                    "id": "3"  //'Task' issue type
                                                },
                                                "assignee": {
                                                    "name": jiraAssingee
                                                },
                                                "description": jiraDesc,
                                                "duedate": dueDate,
                                                "customfield_10100": [{  //Custom Field for Review Type.
                                                    "id": "10103"  //All slack task will not require review.
                                                }]
                                            }
                                        };
                                        //console.log("Log 2 :"+ jiraIssue); //#DEBUG CODE: UNCOMMENT FOR DEBUGGING PURPOSES ONLY
                                        jira.addNewIssue(jiraIssue, function (error, issue){
                                            if (error){
                                                sendMessage("*** ERROR ***", "" + error, RED);
                                                return(error);
                                            } else {
                                                //console.log('Console log 3, Jira Key: ' + issue.key); //#DEBUG CODE: UNCOMMENT FOR DEBUGGING PURPOSES ONLY
                                                jiraKey = issue.key;
                                                //console.log('Console log 4: '+ jiraKey); //#DEBUG CODE: UNCOMMENT FOR DEBUGGING PURPOSES ONLY
                                                jira.transitionIssue(jiraKey, issueTrans, function (err, issueUpdate) {  //Changes the Issue's Status to In Progress
                                                    if (err) {
                                                        console.log(err);
                                                        return(err);
                                                    } else {
                                                        //console.log("Console log 5, Jira Status change was a: "+ JSON.stringify(issueUpdate)); //#DEBUG CODE: UNCOMMENT FOR DEBUGGING PURPOSES ONLY
                                                        pool.connect().then(client => {
                                                            client.query("UPDATE ASK_TABLE SET STATUS = $1, JIRA_ID = $2 WHERE SERIAL_ID = $3", [ACCEPTED_STATUS, jiraKey, taskNumber])
                                                                .then(result => {
                                                                    client.query("SELECT * FROM ASK_TABLE WHERE SERIAL_ID = $1", [taskNumber])
                                                                        .then(result2 => {
                                                                            client.release();
                                                                            taskNumberRow = result2.rows;
                                                                            sendMessage("Accepted", "", GREEN);
                                                                        
                                                                            var finalUser;
                                                                            var finalUserId;
                                                                            var targetDM = senderSlackID.slice(2,11);

                                                                            axios.post('https://slack.com/api/im.list', qs.stringify({
                                                                                token: config('POST_BOT_TOKEN'),

                                                                            })).then(function (resp){
                                                                                //console.log(resp.data); //#DEBUG CODE: UNCOMMENT FOR DEBUGGING PURPOSES ONLY
                                                                                for(var t = 0; t < resp.data.ims.length; t++){
                                                                                    if(targetDM==resp.data.ims[t].user){
                                                                                        finalUser = resp.data.ims[t].id;
                                                                                        finalUserId = resp.data.ims[t].user;
                                                                                        axios.post('https://slack.com/api/chat.postMessage', qs.stringify({
                                                                                            token: config('POST_BOT_TOKEN'),
                                                                                            channel: finalUser,
                                                                                            user:finalUserId,
                                                                                            as_user:true,
                                                                                            attachments: JSON.stringify([{
                                                                                                title: "Accepted",
                                                                                                color: GREEN,
                                                                                                text: "*Task ID:* " + taskNumber + "\n *Title:* " + taskNumberRow[0].title + "\n *Recipient:* " + taskNumberRow[0].receiver_id + " *Owner:* " + taskNumberRow[0].sender_id,
                                                                                                mrkdwn_in: [
                                                                                                    "text"
                                                                                                ],
                                                                                            }]),

                                                                                        })).then((result) => {
                                                                                            //console.log('sendConfirmation: ', result.data); //#DEBUG CODE: UNCOMMENT FOR DEBUGGING PURPOSES ONLY
                                                                                        }).catch((err) => {
                                                                                            //console.log('sendConfirmation error: ', err); //#DEBUG CODE: UNCOMMENT FOR DEBUGGING PURPOSES ONLY
                                                                                        });
                                                                                    }
                                                                                }
                                                                            }).catch(function (err){
                                                                                console.log(err);
                                                                            });
                                                                        })
                                                                        .catch(err1 => {
                                                                            client.release();
                                                                            sendMessage("*** ERROR ***", "" + err1, RED)
                                                                        });
                                                                    })
                                                                    .catch(err2 => {
                                                                        client.release();
                                                                        sendMessage("*** ERROR ***", "" + err2, RED)
                                                                    });
                                                        })
                                                    }
                                                });
                                            }
                                        });
                                    }).catch(e => {
                                        client2.release();
										sendMessage("*** ERROR ***", "" + e, RED);
                                        //console.log(e.stack); //#DEBUG CODE: UNCOMMENT FOR DEBUGGING PURPOSES ONLY
                                    });
                            });
                    })
                    .catch(err3 => {
                        client1.release();
                        sendMessage("*** ERROR ***", "" + err3, RED)
                    });
				});
			})
			.catch(err4 => {
                client.release();
                sendMessage("*** ERROR ***", "" + err4, RED)
			});
	})
    .catch(err => {
        sendMessage("*** ERROR ***", "" + err, RED)
    });

    function sendMessage(title, text, color){
        axios.post('https://slack.com/api/chat.postEphemeral', qs.stringify({
            token: config('OAUTH_TOKEN'),
            user: payload.user.id,
            channel: channel,
            attachments: JSON.stringify([{
                title: title,
                color: color,
                text: text,
            }]),
        })).then((result) => {
            //console.log('sendConfirmation: ', result.data); //#DEBUG CODE: UNCOMMENT FOR DEBUGGING PURPOSES ONLY
        }).catch((err) => {
            //console.log('sendConfirmation error: ', err); //#DEBUG CODE: UNCOMMENT FOR DEBUGGING PURPOSES ONLY
			console.log(err);
        });
    }
}

module.exports = { pattern: /acceptDialogHandler/ig, handler: handler }
