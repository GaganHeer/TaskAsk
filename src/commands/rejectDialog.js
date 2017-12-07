
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
    var receiver = "<@" + payload.user_id + ">";
    var channel = payload.channel_id
    pool.connect().then(client => {
        client.query("SELECT * FROM ASK_TABLE WHERE RECEIVER_ID = $1 AND STATUS = $2 ORDER BY SERIAL_ID DESC LIMIT 100", [receiver, PENDING_STATUS])
            .then(result => {
                client.release();
            
            if (result.rows.length > 0){
                for (var i = 0; i < result.rows.length; i++) {
                    pendingList[i] = {label: "ID# " + result.rows[i].serial_id + ": " + result.rows[i].title, value: result.rows[i].serial_id};
                }
                const dialog = {
                    token: config('OAUTH_TOKEN'),
                    trigger_id,
                    dialog: JSON.stringify({
                        title: 'Reject a Task',
                        callback_id: 'rejectDialog',
                        submit_label: 'Reject',
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
                    res.send('');
                    //console.log('dialog.open: ', result.data); //#DEBUG CODE: UNCOMMENT FOR DEBUGGING PURPOSES ONLY
                }).catch((err) => {
                    //console.log(err); //#DEBUG CODE: UNCOMMENT FOR DEBUGGING PURPOSES ONLY
                    res.sendStatus(500);
                });
            } else {
                sendMessage("*** ERROR ***", "No pending tasks to display", RED)
            }
        }).catch(e => {
            client.release();
            sendMessage("*** ERROR ***", "" + e, RED);
        })
    }).catch((err) => {
        sendMessage("*** ERROR ***", "" + err, RED);
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
            res.send('');
            //console.log('sendConfirmation: ', result.data); //#DEBUG CODE: UNCOMMENT FOR DEBUGGING PURPOSES ONLY
        }).catch((err) => {
            //console.log('sendConfirmation error: ', err); //#DEBUG CODE: UNCOMMENT FOR DEBUGGING PURPOSES ONLY
			console.log(err);
        });
    }
}
module.exports = { pattern: /rejectDialog/ig, handler: handler }