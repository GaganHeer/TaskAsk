
'use strict';

const _ = require('lodash');
const config = require('../config');
const pg = require('pg');
const qs = require('querystring');
const axios = require('axios');
const RED = "#ff0000";
const dbConfig = config('DB_CONFIG');

var pool = new pg.Pool(dbConfig);


const ALLOWED_STATUS = ["PENDING", "REJECTED", "ACCEPTED"];

const handler = (payload, res) => {
    
    const { trigger_id } = payload;
    let qID = payload.actions[0].value;
    console.log("Question ID: "+ qID);
    let dbQ1 = "SELECT clar_quest, clar_answer, title, to_char(due_date, 'Mon DD YYYY HH24:MI') as due_date FROM ask_table INNER JOIN clarify_table ON (ask_table.serial_id = clarify_table.serial_id) WHERE question_id = $1;";
    let dueDate = '';
    let cleanDate;
    let dateParts;
    let question = '';
    let taskTitle = '';
    let answer = '';


    pool.connect().then(client => {
        return client.query(dbQ1, [qID])
            .then(result => {
                client.release();
                question = result.rows[0].clar_quest;
                answer = result.rows[0].clar_answer;
                dueDate = result.rows[0].due_date;
                taskTitle = result.rows[0].title;
                if (dueDate) {
                    dateParts = dueDate.split(" ");
                    if (dateParts[1][0] === '0'){
                        dateParts[1] = dateParts[1][1];  //if the Day text starts with zero, the zero is removed.
                    }
                    if(dateParts[3][0] === '0'){
                        dateParts[3] = dateParts[3][1] + dateParts[3][2] + dateParts[3][3] + dateParts[3][4];  //if the Day text starts with zero, the zero is removed.
                    }
                    cleanDate =  dateParts.join(" ");
                }

                const dialog = {
                    token: config('OAUTH_TOKEN'),
                    trigger_id,
                    dialog: JSON.stringify({
                        title: 'Answer a Question',
                        callback_id: 'answerDialog',
                        submit_label: 'Answer',
                        elements: [
                            {
                                label: taskTitle,
                                type: 'text',
                                name: "question",
                                value: question,
                            },
                            {
                                label: "Question ID",
                                type: 'select',
                                name: "questionID",
                                value: qID,
                                options: [{
                                    label: "Question ID: "+ qID,
                                    value: qID
                                }]
                            },
                            {
                                label: 'Answer:',
                                type: 'textarea',
                                name: 'answer',
                                value: answer,
                                max_length: 150
                            },
                            {
                                label: 'Due Date:',
                                type: 'text',
                                name: 'dueDate',
                                value: cleanDate,
                                optional: true,
                                hint: 'Only Change if your task requires a new Due Date.  Uses a 24 hour clock || Format: MMM d YYYY hh:mm || ex) Oct 29 2017 21:30'
                            }
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
            .catch(err => {
                sendMessage("*** ERROR ***", ""+err.stack, RED, payload.channel.id, payload.user.id);
            });
    }).catch(err => {
        sendMessage("*** ERROR ***", ""+err.stack, RED, payload.channel.id, payload.user.id);
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
            console.log('sendConfirmation: ', result.data);
        }).catch((err) => {
            console.log('sendConfirmation error: ', err);
            console.error(err);
        });
    }
};
module.exports = { pattern: /answerDialog/ig, handler: handler };