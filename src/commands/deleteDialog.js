
'use strict';

const _ = require('lodash');
const config = require('../config');
const util = require('util');
const moment = require('moment');
const pg = require('pg');
const qs = require('querystring');
const axios = require('axios');
const dbConfig = config('DB_CONFIG');
	
var dbURL = process.env.ELEPHANTSQL_URL;
var pool = new pg.Pool(dbConfig);
var tasks = [];

const ALLOWED_STATUS = ["PENDING", "REJECTED"];

const handler = (payload, res) => {
    
    const { trigger_id } = payload;
    var deletingUserID = "<@" + payload.user_id + ">";


    pool.connect().then(client => {
        return client.query('SELECT * FROM ASK_TABLE WHERE SENDER_ID = $1;', [deletingUserID])
            .then(result => {
                client.release();

                if (result.rows.length > 0){
                    for (let i=0; i<result.rows.length; i++){
                        if (ALLOWED_STATUS.includes(result.rows[i].status)) {
                            let temp = 'Task:' + result.rows[i].serial_id +' - '+result.rows[i].title;
                            tasks.push({label: temp, value: result.rows[i].serial_id});
                        }
                    }
                    if (tasks.length == 0) {
                        tasks.push({label:'No deletable tasks found.', value: null});
                    }
                } else {
                    tasks.push({label:'No deletable tasks found.', value: null});
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
                                label: "Task ID and Title",
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
                        console.log('dialog.open: ', result.data);
                        res.send('');
                    }).catch((err) => {
                    console.log('dialog.open call failed: %o', err);
                    res.sendStatus(500);
                });
                console.log('sendConfirmation: ', result.data);

            })
    }).catch((err) => {
        console.log('sendConfirmation error: ', err);
    });
};
module.exports = { pattern: /deleteDialog/ig, handler: handler };