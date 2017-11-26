
'use strict'

const _ = require('lodash')
const config = require('../config')
const util = require('util')
const pg = require('pg')
const qs = require('querystring')
const axios = require('axios')
const PENDING_STATUS = "PENDING";
const RED = "ff0000"
	
const dbConfig = config('DB_CONFIG');
var pool = new pg.Pool(dbConfig);

const handler = (payload, res) => {
    
    const { trigger_id } = payload;
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
    
    axios.post('https://slack.com/api/users.list', qs.stringify({
        token: config('OAUTH_TOKEN'),
    })).then((result) => {
        var resultList = result.data.members;
        
        pool.connect().then(client => {
            client.query("SELECT * FROM ASK_TABLE WHERE RECEIVER_ID = $1 AND STATUS = $2 ORDER BY SERIAL_ID DESC LIMIT 100", [receiver, PENDING_STATUS])
                .then(result => {
                    client.release();
                
                    if(result.rows.length <= 0){
                        console.log("IM ERE")
                        console.log(receiver);
                        console.log(channel);
                        
                        sendMessage("*** ERROR ***", "No pending requests to display", RED);
                    } else {
                        console.log("CONFIRM ELSE")
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
                                //console.log('dialog.open: ', result.data); //#DEBUG CODE: UNCOMMENT FOR DEBUGGING PURPOSES ONLY
                                res.send('');
                            }).catch((err) => {
                                //console.log(err); //#DEBUG CODE: UNCOMMENT FOR DEBUGGING PURPOSES ONLY
                                res.sendStatus(500);
                            });
                    }
                }).catch((err) => {
                    sendMessage("*** ERROR ***", "" + err, RED);
                });
        })
    }).catch((err) => {
        sendMessage("*** ERROR ***", "" + err, RED);
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
            }]),
        })).then((result) => {
            res.send('');
            //console.log('sendConfirmation: ', result.data); //#DEBUG CODE: UNCOMMENT FOR DEBUGGING PURPOSES ONLY
        }).catch((err) => {
            //console.log('sendConfirmation error: ', err); //#DEBUG CODE: UNCOMMENT FOR DEBUGGING PURPOSES ONLY
        });
    }
}
module.exports = { pattern: /forwardDialog/ig, handler: handler }