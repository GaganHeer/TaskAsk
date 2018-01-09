
'use strict'

const _ = require('lodash')
const config = require('../config')
const util = require('util')
const pg = require('pg')
const qs = require('querystring')
const axios = require('axios')
const JiraApi = require('jira').JiraApi;
const RED = "ff0000"
const BLUE = "33ccff"
const DONE_STATUS = "DONE"

const dbConfig = config('DB_CONFIG');
var pool = new pg.Pool(dbConfig);
const jira = new JiraApi('https', config('JIRA_HOST'), config('JIRA_PORT'), config('JIRA_USER'), config('JIRA_PWD'), 'latest');

var issueTransDone = {
    "transition": {
        "id": "31"   //"31" is the ID of the transition to "Done" status.
    }
};

const handler = (payload, res) => {
    res.send('')
    var jid = payload.submission.task;
    
        jira.transitionIssue(jid, issueTransDone, function (error, issueUpdate) { //changes the Jira Issue to "Done" status.
            if (error) {
                sendMessage("*** ERROR ***", error, RED);
            } else {
                //console.log("Jira Status change was a: " + JSON.stringify(issueUpdate)); //#DEBUG CODE: UNCOMMENT FOR DEBUGGING PURPOSES ONLY
                pool.connect().then(client => {
                    client.query("UPDATE ASK_TABLE SET status = $1, fin_date = NOW() WHERE jira_id = $2 RETURNING *", [DONE_STATUS, jid])
                        .then(result => {
                            client.release();
                            var finalUser;
                            var finalUserId;
                            var targetDM = result.rows[0].sender_id.slice(2,11);

                            axios.post('https://slack.com/api/im.list', qs.stringify({
                                token: config('POST_BOT_TOKEN'),

                            })).then(function (resp){
                                for(var t = 0; t < resp.data.ims.length; t++){
                                    //console.log(resp.data.ims[t].id); //#DEBUG CODE: UNCOMMENT FOR DEBUGGING PURPOSES ONLY
                                    if(targetDM==resp.data.ims[t].user){
                                        finalUser = resp.data.ims[t].id;
                                        finalUserId = resp.data.ims[t].user;
                                        axios.post('https://slack.com/api/chat.postMessage', qs.stringify({
                                            token: config('POST_BOT_TOKEN'),
                                            channel: finalUser,
                                            user:finalUserId,
                                            as_user:true,
                                            attachments: JSON.stringify([{
                                                title: "Done",
                                                color: BLUE,
                                                text: "*Task ID:* " + result.rows[0].serial_id + "\n *Title:* " + result.rows[0].title + "\n *Recipient:* " + result.rows[0].receiver_id + " *Owner:* " + result.rows[0].sender_id,
                                                mrkdwn_in: [
                                                    "text"
                                                ],
                                            }]),
                                        })).then((result) => {
                                            //console.log('sendConfirmation: ', result.data); //#DEBUG CODE: UNCOMMENT FOR DEBUGGING PURPOSES ONLY
                                        }).catch((err) => {
                                            //console.log('sendConfirmation error: ', err); //#DEBUG CODE: UNCOMMENT FOR DEBUGGING PURPOSES ONLY
											console.log(err);
                                        });
                                    }
                                }
                            }).catch(function (err){
                                console.log(err);
                            });
                            sendMessage("Done", "", BLUE);
                        }).catch(e => {
                            client.release();
                            sendMessage("*** ERROR ***", "" + e, RED);
                        })
                });
            }
        });
    
    function sendMessage(title, text, color){
        
        axios.post('https://slack.com/api/chat.postEphemeral', qs.stringify({
            token: config('OAUTH_TOKEN'),
            user: payload.user.id,
            channel: payload.channel.id,
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
module.exports = { pattern: /doneDialogHandler/ig, handler: handler }