
'use strict'

const _ = require('lodash')
const config = require('../config')
const util = require('util')
const pg = require('pg')
const qs = require('querystring')
const axios = require('axios')
const dateValidator = require('date-and-time')
const RED = "ff0000"
const ORANGE = "#ffa500"
const PENDING_STATUS = "PENDING"

const dbConfig = config('DB_CONFIG');
var pool = new pg.Pool(dbConfig);

const handler = (payload, res) => {
    var title = payload.submission.title;
    var desc = payload.submission.description;
    var forwarder = "<@" + payload.user.id + ">";
    var taskNumber = payload.submission.task;
    var receiver = "<@" + payload.submission.receiver + ">";
    var buttons = "";
    
    pool.connect().then(client => {
        client.query("SELECT * FROM ASK_TABLE WHERE SERIAL_ID = $1", [taskNumber])
            .then(result => {
                client.release();
            
                var taskNumberRow = result.rows;
                if(taskNumberRow.length == 0){
                    res.send({
                        "errors": [{
                            "name": "task",
                            "error": taskNumber + " is not a valid ID#"
                        }]
                    })
                } else if(!(taskNumberRow[0].receiver_id === forwarder || taskNumberRow[0].sender_id === forwarder)){
                    res.send({
                        "errors": [{
                            "name": "task",
                            "error": "You haven't sent or received this request so you can't forward it"
                        }]
                    })
                } else if (taskNumberRow[0].status !== PENDING_STATUS) {
                    res.send({
                        "errors": [{
                            "name": "task",
                            "error": "That task can't be forwarded! it is currently [" + taskNumberRow[0].status + "]"
                        }]
                    })
                } else {
                    res.send('')
                    client.query("UPDATE ASK_TABLE SET RECEIVER_ID = $1 WHERE SERIAL_ID = $2 RETURNING *", [receiver, taskNumber])
                        .then(result => {
                            client.release();
                        
                            taskNumberRow = result.rows;
                            setButtons(taskNumber);
                            var finalUser;
                            var finalUserId;
                            var receivertargetDM = taskNumberRow[0].receiver_id.slice(2,11);
                            var sendertargetDM = taskNumberRow[0].sender_id.slice(2,11);

                            //DM to the new receiver of the task
                            axios.post('https://slack.com/api/im.list', qs.stringify({
                                token: config('POST_BOT_TOKEN'),
                            })).then(function (resp){
                                for(var t = 0; t < resp.data.ims.length; t++){
                                    //console.log(resp.data.ims[t].id); //#DEBUG CODE: UNCOMMENT FOR DEBUGGING PURPOSES ONLY
                                    if(receivertargetDM==resp.data.ims[t].user){
                                        finalUser = resp.data.ims[t].id;
                                        finalUserId = resp.data.ims[t].user;
                                        axios.post('https://slack.com/api/chat.postMessage', qs.stringify({
                                            token: config('POST_BOT_TOKEN'),
                                            channel: finalUser,
                                            user:finalUserId,
                                            as_user:true,
                                            attachments: JSON.stringify([
                                              {
                                                title: "Forwarded",
                                                color: ORANGE,
                                                text: "Task ID: " + taskNumber + "\n Title: " + result.rows[0].title + "\n Recipient: " + result.rows[0].receiver_id +  " Forwarder: " + forwarder + " Owner: " + result.rows[0].sender_id,
                                                callback_id: "askDialogHandler",
                                                actions: buttons
                                              },
                                            ]),
                                        })).then((result) => {
                                            //console.log('sendConfirmation: ', result.data); //#DEBUG CODE: UNCOMMENT FOR DEBUGGING PURPOSES ONLY
                                        }).catch((err) => {
                                            //console.log('sendConfirmation error: ', err); //#DEBUG CODE: UNCOMMENT FOR DEBUGGING PURPOSES ONLY
                                        });
                                    }
                                }
                            }).catch(function (err){
                                //console.log(err); //#DEBUG CODE: UNCOMMENT FOR DEBUGGING PURPOSES ONLY
                            });

                            //DM to the owner of the task
                            axios.post('https://slack.com/api/im.list', qs.stringify({
                                token: config('POST_BOT_TOKEN'),
                            })).then(function (resp){
                                //console.log(resp.data); //#DEBUG CODE: UNCOMMENT FOR DEBUGGING PURPOSES ONLY
                                for(var t = 0; t < resp.data.ims.length; t++){
                                    //console.log(resp.data.ims[t].id); //#DEBUG CODE: UNCOMMENT FOR DEBUGGING PURPOSES ONLY
                                    if(sendertargetDM==resp.data.ims[t].user){
                                        finalUser = resp.data.ims[t].id;
                                        finalUserId = resp.data.ims[t].user;
                                        axios.post('https://slack.com/api/chat.postMessage', qs.stringify({
                                            token: config('POST_BOT_TOKEN'),
                                            channel: finalUser,
                                            user:finalUserId,
                                            as_user:true,                                        
                                            attachments: JSON.stringify([
                                              {
                                                title: "Forwarded",
                                                color: ORANGE,
                                                text: "Task ID: " + taskNumber + "\n Title: " + result.rows[0].title + "\n Recipient: " + result.rows[0].receiver_id +  " Forwarder: " + forwarder + " Owner: " + result.rows[0].sender_id,
                                                callback_id: "forwardDialogMsg",
                                              },
                                            ]),
                                        })).then((result) => {
                                            //console.log('sendConfirmation: ', result.data); //#DEBUG CODE: UNCOMMENT FOR DEBUGGING PURPOSES ONLY
                                        }).catch((err) => {
                                            //console.log('sendConfirmation error: ', err); //#DEBUG CODE: UNCOMMENT FOR DEBUGGING PURPOSES ONLY
                                        });
                                    }
                                }
                            }).catch(function (err){
                                //console.log(err); //#DEBUG CODE: UNCOMMENT FOR DEBUGGING PURPOSES ONLY
                            });
                            sendMessage("Forwarded", "", ORANGE);
                    });
                }
        });
    }).catch((err) => {
        sendMessage("*** ERROR ***", "" + err, RED);
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
                callback_id: "forwardDialogHandlerMsg",
            }]),
        })).then((result) => {
            //console.log('sendConfirmation: ', result.data); //#DEBUG CODE: UNCOMMENT FOR DEBUGGING PURPOSES ONLY
        }).catch((err) => {
            //console.log('sendConfirmation error: ', err); //#DEBUG CODE: UNCOMMENT FOR DEBUGGING PURPOSES ONLY
        });
    }
    
    function setButtons(sid){
        buttons = [
                    {
                        name: "accept",
                        text: "Accept",
                        type: "button",
                        value: sid,
                        style: "primary",
                        "confirm": {
                            "title": "Are you sure?",
                            "text": "You are about to accept this, are you sure?",
                            "ok_text": "Yes",
                            "dismiss_text": "No"
                        }
                    },
                    {
                        name: "reject", 
                        text: "Reject",
                        type: "button",
                        value: sid,
                        style: "danger",
                        "confirm": {
                            "title": "Are you sure?",
                            "text": "You are about to reject this, are you sure?",
                            "ok_text": "Yes",
                            "dismiss_text": "No"
                        }
                    },
                    {
                        name: "forward", 
                        text: "Forward",
                        type: "button",
                        value: sid,
                        "confirm": {
                            "title": "Are you sure?",
                            "text": "You are about to forward this, are you sure?",
                            "ok_text": "Yes",
                            "dismiss_text": "No"
                        }
                    },
                    {
                        name: "clarify", 
                        text: "Clarify",
                        type: "button",
                        value: sid,
                        "confirm": {
                            "title": "Are you sure?",
                            "text": "You are about to clarify this, are you sure?",
                            "ok_text": "Yes",
                            "dismiss_text": "No"
                        }
                    }
                  ];
    }
}
module.exports = { pattern: /forwardDialogHandler/ig, handler: handler }