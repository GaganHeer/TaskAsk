
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
    res.send('');
    var correctIDStructure = /^<@.*>$/;
    var title = payload.submission.title;
    var desc = payload.submission.description;
    var receiver = payload.submission.receiver;
    var sender = "<@" + payload.user.id + ">";
    var text = "";
    var color = "";
    var sid = "";
    var buttons = "";
    
    pg.connect(dbURL, function(err, client, done) {
        if(err) {
            console.log(err);
        }
        if(correctIDStructure.test(receiver)){
        
            if(payload.submission.due){
                let currentDate = new Date();
                let dueDate = new Date(payload.submission.due);
                if(dateValidator.isValid(payload.submission.due, 'MMM D YYYY H:mm') && (currentDate - dueDate) < 0) {
                    text = "Hey " + receiver + "! " + sender + " asked you to: \n" + desc + " by " + payload.submission.due
                    color = YELLOW
                    client.query("INSERT INTO ASK_TABLE (RECEIVER_ID, SENDER_ID, REQ_DESC, TITLE, DUE_DATE) VALUES ($1, $2, $3, $4, $5) RETURNING serial_id", [receiver, sender, desc, title, payload.submission.due], function(err, result) {
                        done();
                        if(err) {
                            console.log(err);
                        }
                        sid =  result.rows[0].serial_id;
                        setButtons(sid);
                        sendMessage(false);
                    })
                } else {
                    title = "*** ERROR ***"
                    text = "Invalid Date!"
                    buttons = ""
                    color = RED
                    sendMessage(true);
                }
            } else {
                text = "Hey " + receiver + "! " + sender + " asked you to: \n" + desc
                color = YELLOW
                client.query("INSERT INTO ASK_TABLE (RECEIVER_ID, SENDER_ID, REQ_DESC, TITLE) VALUES ($1, $2, $3, $4) RETURNING serial_id", [receiver, sender, desc, title], function(err, result) {
                    done();
                    if(err) {
                        console.log(err);
                    }
                    sid =  result.rows[0].serial_id;
                    setButtons(sid);
                    sendMessage(false);
                })
            }
        } else {
            title = "*** ERROR ***"
            text = "Invalid User ID"
            buttons = ""
            color = RED
            sendMessage(true);
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
                    }
                  ];
    }
    
    function sendMessage(isError){
        if(isError){
            axios.post('https://slack.com/api/chat.postEphemeral', qs.stringify({
                token: config('OAUTH_TOKEN'),
                user: sender,
                channel: payload.channel.name,
                //text: 'Request sent!',
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
                //text: 'Request sent!',
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