
'use strict';

const _ = require('lodash');
const config = require('../config');
const pg = require('pg');
const qs = require('querystring');
const axios = require('axios');
const PENDING_STATUS = "PENDING";
const RED = "#ff0000";
const dbConfig = config('DB_CONFIG');

var pool = new pg.Pool(dbConfig);

const handler = (payload, res) => {
    
    const { trigger_id } = payload;
    
    axios.post('https://slack.com/api/users.list', qs.stringify({
        token: config('OAUTH_TOKEN'),
    })).then((result) => {
        var pendingList = [];
        var userListIndex = 0;
        var receiver = "";
        var sid = "";
        var channel = "";
        let dbQ1 = "SELECT * FROM ASK_TABLE WHERE RECEIVER_ID = $1 AND STATUS = $2 ORDER BY SERIAL_ID DESC LIMIT 100;";
        
        if(payload.user_id){
            receiver = "<@" + payload.user_id + ">";
            channel = payload.channel_id
        } else {
            receiver = "<@" + payload.user.id + ">";
            sid = payload.actions[0].value;
            channel = payload.channel.id;
        }

        pool.connect().then(client => {
            return client.query(dbQ1, [receiver, PENDING_STATUS])
                .then(result => {
                    client.release();
                    if(result.rows.length == 0){
                        sendMessage("*** ERROR ***", "No pending requests to display", RED, channel, receiver);
                    } else {
                        for (let i = 0; i < result.rows.length; i++) {
                            pendingList[i] = {label: "ID# " + result.rows[i].serial_id + ": " + result.rows[i].title, value: result.rows[i].serial_id};
                        }

                        const dialog = {
                            token: config('OAUTH_TOKEN'),
                            trigger_id,
                            dialog: JSON.stringify({
                                title: 'Clarify A Task',
                                callback_id: 'clarifyDialog',
                                submit_label: 'Clarify',
                                elements: [
                                    {
                                        label: 'Task ID',
                                        type: 'select',
                                        name: 'ID',
                                        options: pendingList,
                                        value: sid,
                                    },
                                    {
                                        label: 'Question',
                                        type: 'textarea',
                                        name: 'Question',
                                    },
                                ]
                            })
                        };

                        axios.post('https://slack.com/api/dialog.open', qs.stringify(dialog))
                            .then((result) => {
//                                console.log('dialog.open: ', result.data); //#DEBUG CODE: UNCOMMENT FOR DEBUGGING PURPOSES ONLY
                                res.send('');
                            }).catch((err) => {
//                            sendMessage("*** ERROR ***", err, RED, channel, receiver); //#DEBUG CODE: UNCOMMENT FOR DEBUGGING PURPOSES ONLY
                            res.sendStatus(500);
                        });
                    }
                })
                .catch(err => {
				client.release();
                    sendMessage("*** ERROR ***", ""+err.stack, RED, channel, receiver);
                });
        }).catch(err => {
            sendMessage("*** ERROR ***", ""+err.stack, RED, channel, receiver);
        });

    }).catch((err) => {
        sendMessage("*** ERROR ***", err, RED);
    });
    
    function sendMessage(title, text, color, channel, receiver){
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
//            console.log('sendConfirmation: ', result.data); //#DEBUG CODE: UNCOMMENT FOR DEBUGGING PURPOSES ONLY
        }).catch((err) => {
//            console.log('sendConfirmation error: ', err); //#DEBUG CODE: UNCOMMENT FOR DEBUGGING PURPOSES ONLY
            console.error(err);
        });
    }
};
module.exports = { pattern: /clarifyDialog/ig, handler: handler };