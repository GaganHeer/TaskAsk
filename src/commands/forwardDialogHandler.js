
'use strict'

const _ = require('lodash')
const config = require('../config')
const util = require('util')
const moment = require('moment')
const pg = require('pg')
const qs = require('querystring')
const axios = require('axios')
const dateValidator = require('date-and-time')
const RED = "ff0000"
const GREEN = "33cc33"
const PENDING_STATUS = "PENDING"

var dbURL = process.env.ELEPHANTSQL_URL

const handler = (payload, res) => {
    var title = payload.submission.title;
    var desc = payload.submission.description;
    var forwarder = "<@" + payload.user.id + ">";
    var taskNumber = payload.submission.task;
    var sid = "";
    var receiver = "<@" + payload.submission.receiver + ">";
    console.log(receiver);
    console.log(forwarder);
    
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
                //sendMessage(true, "*** ERROR ***", taskNumber + " is not a valid ID#", RED);
            } else if(!(taskNumberRow[0].receiver_id === forwarder || taskNumberRow[0].sender_id === forwarder)){
                //sendMessage(true, "*** ERROR ***", "You can't forward this request only " + taskNumberRow[0].receiver_id + " and " + taskNumberRow[0].sender_id + " are allowed to", RED);
                res.send({
                    "errors": [{
                        "name": "task",
                        "error": "You haven't sent or received this request you can't forward it"
                    }]
                })
            } else if (taskNumberRow[0].status !== PENDING_STATUS) {
                res.send({
                    "errors": [{
                        "name": "task",
                        "error": "That task can't be forwarded! it is currently [" + taskNumberRow[0].status + "]"
                    }]
                })
                //sendMessage(true, "*** ERROR ***", forwarder + " that task can't be forwarded! it is currently [" + taskNumberRow[0].status + "]", RED);
            } else {
                res.send('')
                client.query("UPDATE ASK_TABLE SET RECEIVER_ID = $1 WHERE SERIAL_ID = $2", [receiver, taskNumber], function(err, updateResult) {
                    client.query("SELECT * FROM ASK_TABlE WHERE SERIAL_ID = $1", [taskNumber], function(err2, selectResult){
                        done();
                        if(err2) {
                            sendMessage(true, "*** ERROR ***", err2, RED);
                        }
                    if(err) {
                        sendMessage(true, "*** ERROR ***", err, RED);
                    }
                        taskNumberRow = selectResult.rows;
                        sendMessage(false, "Forwarded task: " + taskNumberRow[0].title, "Hey " + receiver + "! " + forwarder + " has forwarded ID#" + taskNumber + " '" + taskNumberRow[0].req_desc + "' to you", GREEN);
                    });
                });
            }
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
                    fallback: "Something went wrong :/",
                    callback_id: "askDialogHandler",
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
                    fallback: "Something went wrong :/",
                    callback_id: "askDialogHandler",
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
module.exports = { pattern: /forwardDialogHandler/ig, handler: handler }