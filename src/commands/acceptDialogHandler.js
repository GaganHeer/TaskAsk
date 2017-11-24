
'use strict';

const _ = require('lodash');
const config = require('../config');
const util = require('util');
const pg = require('pg');
const JiraApi = require('jira').JiraApi;
const ACCEPTED_STATUS = "ACCEPTED";
const RED = "ff0000";
const GREEN = "33cc33";
const IN_CHANNEL = 'in_channel';
const ONLY_USER = 'ephemeral';
const qs = require('querystring');
const axios = require('axios');

var dbURL = process.env.ELEPHANTSQL_URL;
var onlyNumbers = /^[0-9]*$/;
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
var questions = [];
var answers = [];

var issueTrans = {
    "transition": {
        "id": "21"   //"21" is the ID of the transition to "In Progress" status.
    }
};

const handler = (payload, res) => {
    var taskNumber = payload.submission.task;
    var taskNumberRow = "";
    var channelName = payload.channel.id
    var acceptingUserID = "<@" + payload.user.id + ">";
    let dbQ1 = "SELECT * FROM ask_table INNER JOIN clarify_table ON (ask_table.serial_id = clarify_table.serial_id) WHERE ask_table.serial_id = $1;";
    
    pg.connect(dbURL, function(err, client, done) {		
		if(err) {
			sendMessage(true, "*** ERROR ***", err, RED);
		}
		console.log('1  Task Number: '+ taskNumber);
		client.query(dbQ1, [taskNumber], function(err, selectResult){
			done();
			if(err){
				sendMessage(true, "*** ERROR ***", err, RED);
			}
            console.log(taskNumber);

            jiraSummary = selectResult.rows[0].title;
            let receiverSlackID = selectResult.rows[0].receiver_id;
            let senderSlackID = selectResult.rows[0].sender_id;
            let baseDesc = selectResult.rows[0].req_desc;
            let dueDate = selectResult.rows[0].due_date;
            let clarifications = '';
            for (let i=0; i<selectResult.rows.length; i++) {
                clarifications += '\n\nQuestion:\n'+ selectResult.rows[i].clar_quest + '\n\nAnswer:\n'+ selectResult.rows[i].clar_answer;
            }
            pool.connect().then(client => {
                return client.query('SELECT * FROM user_table WHERE slack_id = $1 OR slack_id = $2', [receiverSlackID, senderSlackID])
                    .then(res => {
                    client.release();
                    console.log("Log 1: "+ res.rows[0].f_name);
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
                    console.log("Log 2 :"+ jiraIssue);
                    jira.addNewIssue(jiraIssue, function (error, issue){
                        if (error){
                            sendMessage(true, "*** ERROR ***", error, RED);
                            return(error);
                        } else {
                            console.log('Console log 3, Jira Key: ' + issue.key);
                            jiraKey = issue.key;
                            console.log('Console log 4: '+ jiraKey);
                            jira.transitionIssue(jiraKey, issueTrans, function (err, issueUpdate) {  //Changes the Issue's Status to In Progress
                                if (err) {
                                    sendMessage(true, "*** ERROR ***", err, RED);
                                    return(err);
                                } else {
                                    console.log("Console log 5, Jira Status change was a: "+ JSON.stringify(issueUpdate));
                                    client.query("UPDATE ASK_TABLE SET STATUS = $1, JIRA_ID = $2 WHERE SERIAL_ID = $3", [ACCEPTED_STATUS, jiraKey, taskNumber], function (err, updateResult) {
                                        client.query("SELECT * FROM ASK_TABLE WHERE SERIAL_ID = $1", [taskNumber], function (err2, selectResult) {
                                            done();
                                            if(err) {
                                                sendMessage(true, "*** ERROR ***", err, RED);
                                            }
                                            if(err2) {
                                                sendMessage(true, "*** ERROR ***", err, RED);
                                            }
                                            taskNumberRow = selectResult.rows;
                                            var acceptMsg = "You have accepted Task ID: " + taskNumberRow[0].serial_id + ": " + taskNumberRow[0].title;
                                            var acceptTitle = "Accepted";
                                            sendMessage(false, acceptTitle, acceptMsg, GREEN);
                                        });
                                    });
                                }
                            });
                        }
                    });
                    res.send('');
                })
                    .catch(e => {
                    client.release();
                    console.log(err.stack);
                })
            });

            var finalUser;
            var finalUserId;
            var targetDM = senderSlackID.slice(2,11);

            axios.post('https://slack.com/api/im.list', qs.stringify({
                token: config('POST_BOT_TOKEN'),

            })).then(function (resp){
                console.log(resp.data);
                for(var t = 0; t < resp.data.ims.length; t++){
                    console.log(t);
                    console.log(resp.data.ims[t].id);
                    if(targetDM==resp.data.ims[t].user){
                        finalUser = resp.data.ims[t].id;
                        finalUserId = resp.data.ims[t].user;
                        axios.post('https://slack.com/api/chat.postMessage', qs.stringify({
                            token: config('POST_BOT_TOKEN'),
                            channel: finalUser,
                            user:finalUserId,
                            as_user:true,
                            text: payload.user.id + " has accepted ID# " + taskNumber + ": " + jiraSummary,
                            color: GREEN,

                        })).then((result) => {
                                console.log('sendConfirmation: ', result.data);
                            }).catch((err) => {
                                console.log('sendConfirmation error: ', err);
                                console.error(err);
                            });
                    }
                }
            }).catch(function (err){
                console.log(err);
            });	
		});
	});
    
    function sendMessage(isError, title, text, color){
        if(isError){
            axios.post('https://slack.com/api/chat.postEphemeral', qs.stringify({
                token: config('OAUTH_TOKEN'),
                user: payload.user.id,
                channel: payload.channel.id,
                attachments: JSON.stringify([{
                    title: title,
                    color: color,
                    text: text,
                    callback_id: "acceptDialogHandlerMsg",
                }]),
            })).then((result) => {
                console.log('sendConfirmation: ', result.data);
            }).catch((err) => {
                console.log('sendConfirmation error: ', err);
                console.error(err);
            });
        } else {
            axios.post('https://slack.com/api/chat.postMessage', qs.stringify({
                token: config('OAUTH_TOKEN'),
                channel: payload.channel.id,
                attachments: JSON.stringify([{
                    title: title,
                    color: color,
                    text: text,
                    callback_id: "acceptDialogHandler",
                }]),
            })).then((result) => {
                console.log('sendConfirmation: ', result.data);
            }).catch((err) => {
                console.log('sendConfirmation error: ', err);
                console.error(err);
            });
        }
    }
}
module.exports = { pattern: /acceptDialogHandler/ig, handler: handler }