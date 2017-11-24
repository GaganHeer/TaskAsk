
'use strict'

const _ = require('lodash')
const config = require('../config')
const util = require('util')
const moment = require('moment')
const pg = require('pg')
const qs = require('querystring')
const axios = require('axios')
const RED = "ff0000"
const REJECTED_STATUS = "REJECTED"

var dbURL = process.env.ELEPHANTSQL_URL;
const dbConfig = config('DB_CONFIG');
var pool = new pg.Pool(dbConfig);

const handler = (payload, res) => {
    var sid = payload.submission.task;
    
    pg.connect(dbURL, function(err, client, done){
        client.query("UPDATE ASK_TABLE SET status = $1 WHERE SERIAL_ID = $2 RETURNING *", [REJECTED_STATUS, sid], function(err, result) {
            done();
            if(err) {
                sendMessage(true, "*** ERROR ***", err, RED);
            }
            sendMessage(false, "Reject", "You have rejected ID# " + result.rows[0].serial_id + ": " + result.rows[0].title, RED);
            res.send('')
        });
    })
    
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
                    callback_id: "doneDialogHandlerMsg",
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
                    callback_id: "doneDialogHandler",
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
module.exports = { pattern: /rejectDialogHandler/ig, handler: handler }