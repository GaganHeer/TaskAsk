
'use strict'

const _ = require('lodash')
const config = require('../config')
const util = require('util')
const moment = require('moment')
const pg = require('pg')
const dbConfig = config('DB_CONFIG');
const qs = require('querystring')
const axios = require('axios')
const dateValidator = require('date-and-time')
const RED = "ff0000"
const YELLOW = "ffcc00"
const MAX_TITLE_LENGTH = 15;

var dbURL = process.env.ELEPHANTSQL_URL

var pool = new pg.Pool(dbConfig);

const handler = (payload, res) => {

    var finalUser;
    var finalUserId;
        
    var title = payload.submission.title;
    var desc = payload.submission.description;
    var receiver = "<@" + payload.submission.receiver + ">";
    var sender = "<@" + payload.user.id + ">";
    var sid = "";
    var buttons = "";
    
    if(title.length > MAX_TITLE_LENGTH) {
        res.send({
                    "errors": [{
                        "name": "title",
                        "error": "Must be 15 characters or less"
                    }]
                })
    } else {
		pool.connect().then(client => {
            if(payload.submission.due){
                var dueDate = new Date(payload.submission.due);
                var currentDate = new Date();
                currentDate.setHours(currentDate.getHours() - 8);

                //console.log(util.inspect(currentDate, {showHidden: false, depth: null})); //#DEBUG CODE: UNCOMMENT FOR DEBUGGING PURPOSES ONLY

                //Check if valid date format and that date hasn't already past
                if(dateValidator.isValid(payload.submission.due, 'MMM D YYYY H:mm') && (currentDate - dueDate) < 0) {
                    res.send('');
                    return client.query("INSERT INTO ASK_TABLE (RECEIVER_ID, SENDER_ID, REQ_DESC, TITLE, DUE_DATE) VALUES ($1, $2, $3, $4, $5) RETURNING *", [receiver, sender, desc, title, payload.submission.due])
					.then(resp => {
						client.release();
						sid =  resp.rows[0].serial_id;
						setButtons(sid);
						sendMessage(false, "Asked", "Task ID: " + sid + "\n Title: " + title + "\n Recipient: " + receiver + "\n Owner: " + sender + "\n Description: " + desc + "\n Due Date: " + payload.submission.due, YELLOW);
					})
					.catch(e => {
						client.release();
						sendMessage(true, "*** ERROR ***", "E1 " + e, RED);
					})
                } else {
                    res.send({
                        "errors": [{
                            "name": "due",
                            "error": "Invalid Date!"
                        }]
                    })
                }
            } else {
                res.send('');
                return client.query("INSERT INTO ASK_TABLE (RECEIVER_ID, SENDER_ID, REQ_DESC, TITLE) VALUES ($1, $2, $3, $4) RETURNING serial_id", [receiver, sender, desc, title])
				.then(resp => {
					client.release();
					sid =  resp.rows[0].serial_id;
					setButtons(sid);
					sendMessage(false, "Asked", "Task ID: " + sid + "\n Title: " + title + "\n Recipient: " + receiver + "\n Owner: " + sender + "\n Description: " + desc, YELLOW);
				})
				.catch(e => {
					client.release();
					sendMessage(true, "*** ERROR ***", "E2 " + e, RED);
				})
            }
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
    
    function sendMessage(isError, title, text, color){
        var targetDM = payload.submission.receiver;
        if(isError){
            axios.post('https://slack.com/api/chat.postEphemeral', qs.stringify({
                token: config('OAUTH_TOKEN'),
                user: payload.user.id,
                channel: payload.channel.id,
                attachments: JSON.stringify([{
                    title: title,
                    color: color,
                    text: text,
                    callback_id: "askDialogHandler",
                }]),
            })).then((result) => {
                //console.log('sendConfirmation: ', result.data); //#DEBUG CODE: UNCOMMENT FOR DEBUGGING PURPOSES ONLY
            }).catch((err) => {
                //console.log('sendConfirmation error: ', err); //#DEBUG CODE: UNCOMMENT FOR DEBUGGING PURPOSES ONLY
                //console.error(err); //#DEBUG CODE: UNCOMMENT FOR DEBUGGING PURPOSES ONLY
            });
        } else {
            axios.post('https://slack.com/api/chat.postMessage', qs.stringify({
                token: config('OAUTH_TOKEN'),
                channel: payload.channel.id,
                attachments: JSON.stringify([{
                    title: title,
                    color: color,
                    text: text,
                    callback_id: "askDialogHandler",
                    actions: buttons,
                }]),
            })).then((result) => {
                //console.log('sendConfirmation: ', result.data); //#DEBUG CODE: UNCOMMENT FOR DEBUGGING PURPOSES ONLY
            }).catch((err) => {
                //console.log('sendConfirmation error: ', err); //#DEBUG CODE: UNCOMMENT FOR DEBUGGING PURPOSES ONLY
                //console.error(err); //#DEBUG CODE: UNCOMMENT FOR DEBUGGING PURPOSES ONLY
            });

            axios.post('https://slack.com/api/im.list', qs.stringify({
                token: config('POST_BOT_TOKEN'),
                
            })).then(function (resp){
                //console.log(resp.data); //#DEBUG CODE: UNCOMMENT FOR DEBUGGING PURPOSES ONLY
                for(var t = 0; t < resp.data.ims.length; t++){
                    //console.log(t); //#DEBUG CODE: UNCOMMENT FOR DEBUGGING PURPOSES ONLY
                    //console.log(resp.data.ims[t].id); //#DEBUG CODE: UNCOMMENT FOR DEBUGGING PURPOSES ONLY
                    if(targetDM==resp.data.ims[t].user){
                        finalUser = resp.data.ims[t].id;
                        finalUserId = resp.data.ims[t].user;
                        axios.post('https://slack.com/api/chat.postMessage', qs.stringify({
                            token: config('POST_BOT_TOKEN'),
                            channel: finalUser,
                            user:finalUserId,
                            as_user:true,
                            attachments: JSON.stringify([
                              {
                                title: title,
                                color: color,
                                text: text,
                                callback_id: "askDialogHandler",
                                actions: buttons
                                
                              },
                            ]),
                          })).then((result) => {
                                //console.log('sendConfirmation: ', result.data); //#DEBUG CODE: UNCOMMENT FOR DEBUGGING PURPOSES ONLY
                              }).catch((err) => {
                                //console.log('sendConfirmation error: ', err); //#DEBUG CODE: UNCOMMENT FOR DEBUGGING PURPOSES ONLY
                                //console.error(err); //#DEBUG CODE: UNCOMMENT FOR DEBUGGING PURPOSES ONLY
                            });
                    }
                }
            }).catch(function (err){
                //console.log(err); //#DEBUG CODE: UNCOMMENT FOR DEBUGGING PURPOSES ONLY
            });
        }
    }
}
module.exports = { pattern: /askDialogHandler/ig, handler: handler }