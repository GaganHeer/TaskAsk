
'use strict'

const _ = require('lodash')
const config = require('../config')
const util = require('util')
const moment = require('moment')
const pg = require('pg')
const qs = require('querystring')
const axios = require('axios')
const PENDING_STATUS = "PENDING";
const RED = "ff0000"
	
var dbURL = process.env.ELEPHANTSQL_URL

const handler = (payload, res) => {
    
    const { trigger_id } = payload;
    var pendingList = [];
    var receiver = "<@" + payload.user_id + ">";
    var channel = payload.channel_id
    pg.connect(dbURL, function(err, client, done) {
        if(err) {
            sendMessage("*** ERROR ***", err, RED);
        }
        client.query("SELECT * FROM ASK_TABLE WHERE RECEIVER_ID = $1 AND STATUS = $2 ORDER BY SERIAL_ID DESC LIMIT 100", [receiver, PENDING_STATUS], function(err, result) {
            done();
            if(err) {
                sendMessage("*** ERROR ***", err, RED);
            }
            if (result.rows.length > 0){
                for (var i = 0; i < result.rows.length; i++) {
                    pendingList[i] = {label: "ID# " + result.rows[i].serial_id + ": " + result.rows[i].title, value: result.rows[i].serial_id};
                }
                const dialog = {
                    token: config('OAUTH_TOKEN'),
                    trigger_id,
                    dialog: JSON.stringify({
                        title: 'Accept a Task',
                        callback_id: 'acceptDialog',
                        submit_label: 'Accept',
                        elements: [
                            {
                                "label": "Pending Tasks",
                                "type": "select",
                                "name": "task",
                                "options": pendingList,
                            },
                        ],
                    }),
                };
                axios.post('https://slack.com/api/dialog.open', qs.stringify(dialog))
                .then((result) => {
                    console.log('dialog.open: ', result.data);
                    res.send('');
                }).catch((err) => {
                    sendMessage("*** ERROR ***", err, RED);
                    res.sendStatus(500);
                });
            } else {
                sendMessage("*** ERROR ***", "No pending tasks to display", RED)
            }
        })
    });
    
    function sendMessage(title, text, color){
        axios.post('https://slack.com/api/chat.postEphemeral', qs.stringify({
            token: config('OAUTH_TOKEN'),
            user: payload.user_id,
            channel: channel,
            attachments: JSON.stringify([{
                title: title,
                color: color,
                text: text,
                callback_id: "acceptDialogMsg",
            }]),
        })).then((result) => {
            console.log('sendConfirmation: ', result.data);
        }).catch((err) => {
            console.log('sendConfirmation error: ', err);
            console.error(err);
        });
    }
}
module.exports = { pattern: /acceptDialog/ig, handler: handler }