
'use strict';

const _ = require('lodash');
const config = require('../config');
const pg = require('pg');
const qs = require('querystring');
const axios = require('axios');
const RED = "#ff0000";
const PENDING_STATUS = "PENDING";
const REJECTED_STATUS = "REJECTED";
const dbConfig = config('DB_CONFIG');
	
var pool = new pg.Pool(dbConfig);


const handler = (payload, res) => {
    const { trigger_id } = payload;
    var userID = "<@" + payload.user_id + ">";
    let tasks = [];

    pool.connect().then(client => {
        client.query('SELECT * FROM ASK_TABLE WHERE SENDER_ID = $1 OR RECEIVER_ID = $1 ORDER BY SERIAL_ID DESC LIMIT 100', [userID])
            .then(result => {
                client.release();
                if (result.rows.length > 0){
                    for (let i=0; i<result.rows.length; i++){
                        let temp = 'ID# ' + result.rows[i].serial_id +': '+result.rows[i].title;
                        tasks.push({label: temp, value: result.rows[i].serial_id});
                    }
                    
                    const dialog = {
                        token: config('OAUTH_TOKEN'),
                        trigger_id,
                        dialog: JSON.stringify({
                            title: 'Get Details of a Task',
                            callback_id: 'detailsDialog',
                            submit_label: 'Submit',
                            elements: [
                                {
                                    label: "Relevant Tasks for You",
                                    type: "select",
                                    name: "task",
                                    options: tasks,
                                }
                            ],
                        }),
                    };
                    axios.post('https://slack.com/api/dialog.open', qs.stringify(dialog))
                        .then((result) => {
//                            console.log('dialog.open: ', result.data); //#DEBUG CODE: UNCOMMENT FOR DEBUGGING PURPOSES ONLY
                            res.send('');
                        }).catch((err) => {
//                            console.log('dialog.open call failed: %o', err); //#DEBUG CODE: UNCOMMENT FOR DEBUGGING PURPOSES ONLY
                            res.sendStatus(500);
                        });
                        //console.log('sendConfirmation: ', result.data); //#DEBUG CODE: UNCOMMENT FOR DEBUGGING PURPOSES ONLY
                } else {
                    sendMessage("*** ERROR ***", "No tasks assigned by or to you.", RED);
                    res.send('');
                }
            }).catch((err) => {
				client.release();
                sendMessage("*** ERROR ***", ""+err.stack, RED);
            });
    }).catch((err) => {
        sendMessage("*** ERROR ***", ""+err.stack, RED);
    });
    
    function sendMessage(title, text, color){
        axios.post('https://slack.com/api/chat.postEphemeral', qs.stringify({
            token: config('OAUTH_TOKEN'),
            user: payload.user_id,
            channel: payload.channel_id,
            attachments: JSON.stringify([{
                title: title,
                color: color,
                text: text,
            }]),
        })).then((result) => {
            //console.log('sendConfirmation: ', result.data); //#DEBUG CODE: UNCOMMENT FOR DEBUGGING PURPOSES ONLY
        }).catch((err) => {
//            console.log('sendConfirmation error: ', err); //#DEBUG CODE: UNCOMMENT FOR DEBUGGING PURPOSES ONLY
            console.error(err); 
        });
    }
};
module.exports = { pattern: /detailsDialog/ig, handler: handler };