
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
        res.send('')
        client.query("UPDATE ASK_TABLE SET RECEIVER_ID = $1 WHERE SERIAL_ID = $2 RETURNING *", [receiver, taskNumber])
            .then(result => {
                client.release();

                var taskNumberRow = result.rows;
                setButtons(taskNumber);
                var text;
                var finalUser;
                var finalUserId;
                var receivertargetDM = taskNumberRow[0].receiver_id.slice(2,11);
                var sendertargetDM = taskNumberRow[0].sender_id.slice(2,11);
                
                if(result.rows[0].due_date != null) {
                    var stringDate = result.rows[0].due_date.toString();
                    var due = stringDate.slice(4,21)
                    text = "*Task ID:* " + taskNumber + "\n *Title:* " + result.rows[0].title + "\n *Recipient:* " + result.rows[0].receiver_id +  " *Forwarder:* " + forwarder + " *Owner:* " + result.rows[0].sender_id + "\n *Description:* " + result.rows[0].req_desc + "\n *Due Date:* " + due;
                } else {
                    text = "*Task ID:* " + taskNumber + "\n *Title:* " + result.rows[0].title + "\n *Recipient:* " + result.rows[0].receiver_id +  " *Forwarder:* " + forwarder + " *Owner:* " + result.rows[0].sender_id + "\n *Description:* " + result.rows[0].req_desc;
                }

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
                                    text: text,
                                    callback_id: "askDialogHandler",
                                    mrkdwn_in: [
                                        "text"
                                    ],
                                    actions: buttons
                                  },
                                ]),
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
                                    text: "*Task ID:* " + taskNumber + "\n *Title:* " + result.rows[0].title + "\n *Recipient:* " + result.rows[0].receiver_id +  " *Forwarder:* " + forwarder + " *Owner:* " + result.rows[0].sender_id,
                                    mrkdwn_in: [
                                        "text"
                                    ],
                                  },
                                ]),
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
                sendMessage("Forwarded", "", ORANGE);
        })
		.catch((e) => {
			client.release();
			sendMessage("*** ERROR ***", "" + err, RED);
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
                    },
                    {
                        name: "clarify", 
                        text: "Clarify",
                        type: "button",
                        value: sid,
                    }
                  ];
    }
}
module.exports = { pattern: /forwardDialogHandler/ig, handler: handler }