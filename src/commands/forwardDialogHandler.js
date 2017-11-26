
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

var dbURL = process.env.ELEPHANTSQL_URL

const handler = (payload, res) => {
    var title = payload.submission.title;
    var desc = payload.submission.description;
    var forwarder = "<@" + payload.user.id + ">";
    var taskNumber = payload.submission.task;
    var receiver = "<@" + payload.submission.receiver + ">";
    
    pg.connect(dbURL, function(err, client, done) {
        if(err) {
            sendMessage(true, "*** ERROR ***", err, RED);
        }
        client.query("SELECT * FROM ASK_TABLE WHERE SERIAL_ID = $1", [taskNumber], function (err, result) {
            done();
            if(err) {
                sendMessage(true, "*** ERROR ***", err, RED);
            }
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
                client.query("UPDATE ASK_TABLE SET RECEIVER_ID = $1 WHERE SERIAL_ID = $2 RETURNING *", [receiver, taskNumber], function(err, result) {
                        done();
                        if(err) {
                            sendMessage(true, "*** ERROR ***", err, RED);
                        }
                        
                        taskNumberRow = result.rows;
                        var finalUser;
                        var finalUserId;
                        var targetDM = taskNumberRow[0].receiver_id.slice(2,11);
                        
                        //DM to the new receiver of the task
                        axios.post('https://slack.com/api/im.list', qs.stringify({
                            token: config('POST_BOT_TOKEN'),
                        })).then(function (resp){
                            //console.log(resp.data); //#DEBUG CODE: UNCOMMENT FOR DEBUGGING PURPOSES ONLY
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
                        
                        //DM to the owner of the task
                        /*axios.post('https://slack.com/api/im.list', qs.stringify({
                            token: config('POST_BOT_TOKEN'),
                        })).then(function (resp){
                            //console.log(resp.data); //#DEBUG CODE: UNCOMMENT FOR DEBUGGING PURPOSES ONLY
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
                                        text: 'Forwarded by :' + taskNumberRow[0].receiver_id, 
                                        attachments: JSON.stringify([
                                          {
                                            title: "Forward",
                                            color: 'ffcc00'
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
                        });*/
                        
                        sendMessage("Forwarded", "", ORANGE);
                    
                });
            }
        });
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
}
module.exports = { pattern: /forwardDialogHandler/ig, handler: handler }