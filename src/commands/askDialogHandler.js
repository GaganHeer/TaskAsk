
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
const YELLOW = "ffcc00"

var dbURL = process.env.ELEPHANTSQL_URL

const handler = (payload, res) => {
        
    var title = payload.submission.title;
    var desc = payload.submission.description;
    var receiver = "<@" + payload.submission.receiver + ">";
    var sender = "<@" + payload.user.id + ">";
    var sid = "";
    var buttons = "";
    
    pg.connect(dbURL, function(err, client, done) {
        if(err) {
            sendMessage(true, "*** ERROR ***", err, RED);
        }
        
        if(payload.submission.due){
            var dueDate = new Date(payload.submission.due);
            var offset = -8;
            var currentDate = new Date( new Date().getTime() + offset * 3600 * 1000).toUTCString().replace( / GMT$/, "" )
            
            console.log(util.inspect(currentDate, {showHidden: false, depth: null}));
            
            //Check if valid date format and that date hasn't already past
            if(dateValidator.isValid(payload.submission.due, 'MMM D YYYY H:mm') && (currentDate - dueDate) < 0) {
                res.send('');
                client.query("INSERT INTO ASK_TABLE (RECEIVER_ID, SENDER_ID, REQ_DESC, TITLE, DUE_DATE) VALUES ($1, $2, $3, $4, $5) RETURNING serial_id", [receiver, sender, desc, title, payload.submission.due], function(err, result) {
                    done();
                    if(err) {
                        sendMessage(true, "*** ERROR ***", err, RED);
                    }
                    sid =  result.rows[0].serial_id;
                    setButtons(sid);
                    sendMessage(false, title, "Hey " + receiver + "! " + sender + " asked you to: \n" + desc + " by " + payload.submission.due, YELLOW);
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
            client.query("INSERT INTO ASK_TABLE (RECEIVER_ID, SENDER_ID, REQ_DESC, TITLE) VALUES ($1, $2, $3, $4) RETURNING serial_id", [receiver, sender, desc, title], function(err, result) {
                done();
                if(err) {
                    sendMessage(true, "*** ERROR ***", err, RED);
                }
                sid =  result.rows[0].serial_id;
                setButtons(sid);
                sendMessage(false, title, "Hey " + receiver + "! " + sender + " asked you to: \n" + desc, YELLOW);
            })
        }
    });
            
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
                    }
                  ];
    }
    
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
                    actions: buttons,
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
module.exports = { pattern: /askDialogHandler/ig, handler: handler }