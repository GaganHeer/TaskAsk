
'use strict';

const _ = require('lodash');
const config = require('../config');
const util = require('util');
const pg = require('pg');
const qs = require('querystring');
const axios = require('axios');
const RED = "ff0000"
const dbConfig = config('DB_CONFIG');
	
var pool = new pg.Pool(dbConfig);
var tasks = [];

const ALLOWED_STATUS = ["PENDING", "REJECTED"];

const handler = (payload, res) => {
    console.log("BYEBYR")
    const { trigger_id } = payload;
    var deletingUserID = "<@" + payload.user_id + ">";

    pool.connect().then(client => {
        client.query('SELECT * FROM ASK_TABLE WHERE SENDER_ID = $1 ORDER BY SERIAL_ID DESC LIMIT 100', [deletingUserID])
            .then(result => {
                client.release();

                if (result.rows.length > 0){
                    for (let i=0; i<result.rows.length; i++){
                        if (ALLOWED_STATUS.includes(result.rows[i].status)) {
                            let temp = 'ID#' + result.rows[i].serial_id +': '+result.rows[i].title;
                            tasks.push({label: temp, value: result.rows[i].serial_id});
                        }
                    }
                    
                    const dialog = {
                        token: config('OAUTH_TOKEN'),
                        trigger_id,
                        dialog: JSON.stringify({
                            title: 'Delete A Task',
                            callback_id: 'deleteDialog',
                            submit_label: 'Delete',
                            elements: [
                                {
                                    label: "Pending and Rejected Tasks",
                                    type: "select",
                                    name: "taskLabel",
                                    options: tasks,
                                },
                                {
                                    label: 'Task# Confirmation',
                                    type: 'text',
                                    name: 'task',
                                    hint: 'Please type the ID# of the task you are deleting to confirm you choice.',
                                },
                            ],
                        }),
                    };

                    axios.post('https://slack.com/api/dialog.open', qs.stringify(dialog))
                        .then((result) => {
                            //console.log('dialog.open: ', result.data); //#DEBUG CODE: UNCOMMENT FOR DEBUGGING PURPOSES ONLY
                            res.send('');
                        }).catch((err) => {
                            //console.log('dialog.open call failed: %o', err); //#DEBUG CODE: UNCOMMENT FOR DEBUGGING PURPOSES ONLY
                            res.sendStatus(500);
                        });
                        //console.log('sendConfirmation: ', result.data); //#DEBUG CODE: UNCOMMENT FOR DEBUGGING PURPOSES ONLY
                } else {
                    sendMessage("*** ERROR ***", "No deleteable tasks to display", RED)
                }
            })
    }).catch((err) => {
        //console.log('sendConfirmation error: ', err); //#DEBUG CODE: UNCOMMENT FOR DEBUGGING PURPOSES ONLY
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
            console.log('sendConfirmation error: ', err);
            //console.error(err); //#DEBUG CODE: UNCOMMENT FOR DEBUGGING PURPOSES ONLY
        });
    }
};
module.exports = { pattern: /deleteDialog/ig, handler: handler };