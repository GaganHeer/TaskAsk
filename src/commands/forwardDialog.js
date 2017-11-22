
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
    
    axios.post('https://slack.com/api/users.list', qs.stringify({
        token: config('OAUTH_TOKEN'),
    })).then((result) => {
        var resultList = result.data.members;
        var pendingList = [];
        var userList = [];
        var userListIndex = 0;
        var receiver = "";
        var sid = ""
        var channel = ""
        
        if(payload.user_id){
            receiver = "<@" + payload.user_id + ">";
            channel = payload.channel_id
        } else {
            receiver = "<@" + payload.user.id + ">";
            sid = payload.actions[0].value
            channel = payload.channel.id
        }
        
        pg.connect(dbURL, function(err, client, done) {
            if(err) {
                sendMessage("*** ERROR ***", err, RED);
            }
            client.query("SELECT * FROM ASK_TABLE WHERE RECEIVER_ID = $1 AND STATUS = $2 ORDER BY SERIAL_ID DESC LIMIT 100", [receiver, PENDING_STATUS], function(err, result) {
                done();
                if(err) {
                    sendMessage("*** ERROR ***", err, RED);
                }
                
                if(result.rows.length == 0){
                    sendMessage("*** ERROR ***", "No pending requests to display", RED);
                } else {
                
                    for (var i = 0; i < result.rows.length; i++) {
                        pendingList[i] = {label: "ID# " + result.rows[i].serial_id + ": " + result.rows[i].title, value: result.rows[i].serial_id};
                    }

                    for (var i = 0; i < resultList.length; i++) {
                        if(resultList[i].is_bot == false){
                            userList[userListIndex] = {label: resultList[i].real_name, value: resultList[i].id};
                            userListIndex++;
                        }
                    }       

                    const dialog = {
                        token: config('OAUTH_TOKEN'),
                        trigger_id,
                        dialog: JSON.stringify({
                            title: 'Forward A Task',
                            callback_id: 'forwardDialog',
                            submit_label: 'Forward',
                            elements: [
                                {
                                    "label": "Receiver",
                                    "type": "select",
                                    "name": "receiver",
                                    "options": userList,
                                },
                                {
                                    label: 'Task',
                                    type: 'select',
                                    name: 'task',
                                    options: pendingList,
                                    value: sid,
                                    hint: 'The task you are forwarding',
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
                }
            })
        })
    }).catch((err) => {
        sendMessage("*** ERROR ***", err, RED);
    });
    
    function sendMessage(title, text, color){
        axios.post('https://slack.com/api/chat.postEphemeral', qs.stringify({
            token: config('OAUTH_TOKEN'),
            user: receiver,
            channel: channel,
            attachments: JSON.stringify([{
                title: title,
                color: color,
                text: text,
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
module.exports = { pattern: /forwardDialog/ig, handler: handler }