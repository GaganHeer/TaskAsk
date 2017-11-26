
'use strict'

const _ = require('lodash')
const config = require('../config')
const util = require('util')
const pg = require('pg')
const qs = require('querystring')
const axios = require('axios')
const ACCEPTED_STATUS = "ACCEPTED";
const RED = "ff0000"
	
var dbURL = process.env.ELEPHANTSQL_URL

const handler = (payload, res) => {
    
    const { trigger_id } = payload;
    var acceptedList = [];
    var receiver = "<@" + payload.user_id + ">";
    var channel = payload.channel_id;
    pg.connect(dbURL, function(err, client, done) {
        if(err) {
            sendMessage("*** ERROR ***", err, RED);
        }
        client.query("SELECT * FROM ASK_TABLE WHERE RECEIVER_ID = $1 AND STATUS = $2 ORDER BY SERIAL_ID DESC LIMIT 100", [receiver, ACCEPTED_STATUS], function(err, result) {
            done();
            if(err) {
                sendMessage("*** ERROR ***", err, RED);
            }
            if (result.rows.length > 0){
                for (var i = 0; i < result.rows.length; i++) {
                    acceptedList[i] = {label: "ID# " + result.rows[i].serial_id + ": " + result.rows[i].title, value: result.rows[i].jira_id};
                }
                const dialog = {
                    token: config('OAUTH_TOKEN'),
                    trigger_id,
                    dialog: JSON.stringify({
                        title: 'Mark a task as done',
                        callback_id: 'doneDialog',
                        submit_label: 'Done',
                        elements: [
                            {
                                "label": "Accepted Tasks",
                                "type": "select",
                                "name": "task",
                                "options": acceptedList,
                            },
                        ],
                    }),
                };
                axios.post('https://slack.com/api/dialog.open', qs.stringify(dialog))
                .then((result) => {
                    //console.log('dialog.open: ', result.data); //#DEBUG CODE: UNCOMMENT FOR DEBUGGING PURPOSES ONLY
                    res.send('');
                }).catch((err) => {
                    //console.log(err); //#DEBUG CODE: UNCOMMENT FOR DEBUGGING PURPOSES ONLY
                    res.sendStatus(500);
                });
            } else {
                sendMessage("*** ERROR ***", "No accepted tasks to display", RED)
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
            }]),
        })).then((result) => {
            //console.log('sendConfirmation: ', result.data); //#DEBUG CODE: UNCOMMENT FOR DEBUGGING PURPOSES ONLY
        }).catch((err) => {
            //console.log('sendConfirmation error: ', err); //#DEBUG CODE: UNCOMMENT FOR DEBUGGING PURPOSES ONLY
        });
    }
}
module.exports = { pattern: /doneDialog/ig, handler: handler }