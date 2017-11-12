
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
const YELLOW = "ffcc00"

var dbURL = process.env.ELEPHANTSQL_URL

const handler = (payload, res) => {
    res.send('');
    var title = payload.submission.title;
    var desc = payload.submission.description;
    var receiver = payload.submission.receiver;
    var sender = "<@" + payload.user.id + ">";
    var text = "";
    var color = "";
    var sid = "";
    
    pg.connect(dbURL, function(err, client, done) {
        if(err) {
            console.log(err);
        }
        
        if(payload.submission.due){
            if(dateValidator.isValid(payload.submission.due, 'MMM d YYYY HH:mm')) {
                text = "Hey " + receiver + "! " + sender + " asked you to: \n" + desc + " by " + payload.submission.due
            } else {
                text = "Invalid Date!"
            }
        } else {
            text = "Hey " + receiver + "! " + sender + " asked you to: \n" + desc
        }

        client.query("INSERT INTO ASK_TABLE (RECEIVER_ID, SENDER_ID, REQ_DESC, TITLE, DUE_DATE) VALUES ($1, $2, $3, $4, $5) RETURNING serial_id", [receiver, sender, desc, title, payload.submission.due], function(err, result) {
            done();

            if(err) {
                console.log(err);
            }

            sid =  result.rows[0].serial_id;
            axios.post('https://slack.com/api/chat.postMessage', qs.stringify({
                token: config('OAUTH_TOKEN'),
                channel: payload.channel.id,
                //text: 'Request sent!',
                attachments: JSON.stringify([{
                    title: title,
                    //need to replace after validation completed
                    color: "#ffcc00",
                    text: text,
                    fallback: "Something went wrong :/",
                    callback_id: "askDialogHandler",
                    actions: [
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
                    ],
                }]),
            })).then((result) => {
                console.log('sendConfirmation: ', result.data);
            }).catch((err) => {
                console.log('sendConfirmation error: ', err);
                console.error(err);
            });
        });
    });
}
module.exports = { pattern: /askDialogHandler/ig, handler: handler }