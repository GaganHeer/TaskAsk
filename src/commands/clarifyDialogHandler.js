'use strict';

const _ = require('lodash');
const config = require('../config');
const pg = require('pg');
const qs = require('querystring');
const axios = require('axios');
const REJECTED_STATUS = "REJECTED";
const ACCEPTED_STATUS = "REJECTED";
const DONE_STATUS = "DONE";
const PURPLE = "#755990";
const RED = "#ff0000";


var dbURL = process.env.ELEPHANTSQL_URL;
const dbConfig = config('DB_CONFIG');
var pool = new pg.Pool(dbConfig);

const handler = (payload, res) => {
        
    
    var desc = payload.submission.Question;
    var receiver = "<@" + payload.submission.receiver + ">";
    var sender = "<@" + payload.user.id + ">";
    var sid = "";
    var buttons = "";
    var taskNumber = payload.submission.ID;
    var clarID = "<@" + payload.user.id + ">";

    let dbQ1 = "SELECT * FROM ASK_TABLE WHERE SERIAL_ID = $1";
    let dbQ2 = "INSERT INTO CLARIFY_TABLE (SERIAL_ID, CLAR_QUEST) VALUES ($1, $2);";
    let dbQ3 = "SELECT * FROM ask_table INNER JOIN clarify_table ON (ask_table.serial_id = clarify_table.serial_id) " +
        "WHERE ask_table.serial_id = $1 ORDER BY clarify_table.question_id DESC;";  //shows all the questions and puts the latest one on top.

    pool.connect().then(client => {
        return client.query(dbQ1, [taskNumber])
            .then(result => {
                var task = result.rows;
                let invalidClarify;
                if(task[0].status == REJECTED_STATUS){
                    invalidClarify = "Rejected Tasks can't be clarified";
                    sendMessage(true, "*** ERROR ***", invalidClarify, RED);
                } else if(task[0].status == DONE_STATUS){
                    invalidClarify = "Done Tasks can't be clarified";
                    sendMessage(true, "*** ERROR ***", invalidClarify, RED);
                } else if(task[0].status == ACCEPTED_STATUS){
                    invalidClarify = "Accepted Tasks can't be clarified";
                    sendMessage(true, "*** ERROR ***", invalidClarify, RED);
                } else {
                    res.send('');
                    client.query(dbQ2, [taskNumber, desc])
                        .then(result1 => {
                            client.query(dbQ3, [taskNumber])
                                .then(result2 => {
                                    client.release();
                                    sid = result2.rows[0].question_id;
                                    setButtons(sid);
                                    var task = result2.rows;

                                    //Dm
                                    var finalUser;
                                    var finalUserId;
                                    var targetDM = task[0].sender_id.slice(2,11);

                                    axios.post('https://slack.com/api/im.list', qs.stringify({
                                        token: config('POST_BOT_TOKEN'),
                                    })).then(function (resp){
                                        console.log(resp.data);
                                        for(let t = 0; t < resp.data.ims.length; t++){
//                                            console.log(t); //#DEBUG CODE: UNCOMMENT FOR DEBUGGING PURPOSES ONLY
//                                            console.log(resp.data.ims[t].id); //#DEBUG CODE: UNCOMMENT FOR DEBUGGING PURPOSES ONLY
                                            if(targetDM == resp.data.ims[t].user){
                                                finalUser = resp.data.ims[t].id;
                                                finalUserId = resp.data.ims[t].user;
                                                axios.post('https://slack.com/api/chat.postMessage', qs.stringify({
                                                    token: config('POST_BOT_TOKEN'),
                                                    channel: finalUser,
                                                    user:finalUserId,
                                                    as_user:true,
                                                    attachments: JSON.stringify([
                                                        {
                                                            title: "Clarification Needed",
                                                            color: PURPLE,
                                                            text: "*Task ID:* " + task[0].serial_id + "\n *Title:* " + task[0].title + "\n *Recipient:* " + task[0].receiver_id + " *Owner:* " + task[0].sender_id + "\n *Question:* " + desc,
                                                            callback_id: "clarify_answer",
                                                            mrkdwn_in: [
                                                                "text"
                                                            ],
                                                            actions: buttons
                                                        }]),
                                                })).then((result) => {
//                                                    console.log('sendConfirmation: ', result.data); //#DEBUG CODE: UNCOMMENT FOR DEBUGGING PURPOSES ONLY
                                                }).catch((err) => {
//                                                    console.log('sendConfirmation error: ', err); //#DEBUG CODE: UNCOMMENT FOR DEBUGGING PURPOSES ONLY
                                                    console.error(err);
                                                });
                                            }
                                        }
                                    }).catch(function (err){
                                        console.log(err);
                                    });
                                    //End of DM
                                    sendMessage(false, "Clarification Requested", '', PURPLE);
                                })
                                .catch(err2 => {
									client.release();
                                    sendMessage(true, "*** ERROR ***", ''+err2.stack, RED);
                                });
                        })
                        .catch(err1 => {
							client.release();
                            sendMessage(true, "*** ERROR ***", ''+err1.stack, RED);
                        });
                }
            })
            .catch(err => {
				client.release();
                sendMessage(true, "*** ERROR ***", ''+err.stack, RED);
            })
    }).catch(err => {
        sendMessage(true, "*** ERROR ***", ''+err.stack, RED);
    });

    function setButtons(sid){
       buttons = [
           {
                name: "answer",
                text: "Answer",
                type: "button",
                value: sid,
           }
       ]
    }
        
    function sendMessage(isError, title, msg, color){
        if(isError){
            axios.post('https://slack.com/api/chat.postEphemeral', qs.stringify({
                token: config('OAUTH_TOKEN'),
                user: payload.user.id,
                channel: payload.channel.id,
                attachments: JSON.stringify([{
                    color: color,
                    title: title,
                    text: msg,
                    callback_id: "askDialogHandler",
                    actions: buttons
                }]),
            })).then((result) => {
//                console.log('sendConfirmation: ', result.data); //#DEBUG CODE: UNCOMMENT FOR DEBUGGING PURPOSES ONLY
            }).catch((err) => {
//                console.log('sendConfirmation error: ', err); //#DEBUG CODE: UNCOMMENT FOR DEBUGGING PURPOSES ONLY
                console.error(err);
            });
        } else {
            axios.post('https://slack.com/api/chat.postEphemeral', qs.stringify({
                token: config('OAUTH_TOKEN'),
                user: payload.user.id,
                channel: payload.channel.id,
                attachments: JSON.stringify([{
                    color: color,
                    title: title
                }]),
            })).then((result) => {
//                console.log('sendConfirmation: ', result.data); //#DEBUG CODE: UNCOMMENT FOR DEBUGGING PURPOSES ONLY
            }).catch((err) => {
//                console.log('sendConfirmation error: ', err); //#DEBUG CODE: UNCOMMENT FOR DEBUGGING PURPOSES ONLY
                console.error(err);
            });
        }
    }
};
module.exports = { pattern: /clarifyDialogHandler/ig, handler: handler };