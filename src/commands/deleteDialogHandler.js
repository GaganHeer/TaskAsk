
'use strict';

const _ = require('lodash');
const config = require('../config');
const util = require('util');
const pg = require('pg');
const qs = require('querystring');
const axios = require('axios');
const RED = "ff0000";
const GREEN = "33cc33";
const PENDING_STATUS = "PENDING";

const dbConfig = config('DB_CONFIG');
var pool = new pg.Pool(dbConfig);
var onlyNumbers = /^[0-9]*$/;   //regEx to test task id.

const handler = (payload, res) => {
    var channelName = payload.channel_name;
    var deletingUserID = "<@" + payload.user_id + ">";
    var taskNumber = payload.submission.task;
    var sid = payload.submission.taskLabel;

    if (onlyNumbers.test(taskNumber) && (sid == taskNumber)){
        pool.connect().then(client => {
            return client.query('DELETE FROM ask_table WHERE serial_id = $1;', [taskNumber])
                .then(result => {
                    client.release();
                    let deleteMsg = 'Task: ' + taskNumber + ' Successfully Deleted';
                    let deleteTitle = 'Task Deleted';
                    res.send('');
                    sendMessage(false, deleteTitle, deleteMsg, GREEN);
                })
                .catch(err => {
                    client.release();
                    sendMessage(true, "*** ERROR ***", "" + err.stack, RED);
                });
        });
    } else {
        res.send({
            "errors": [{
                "name": "task",
                "error": "'"+taskNumber+"'" + " does not match the Task ID you selected."
            }]
        })
    }

    function sendMessage(isError, title, text, color){
        if(isError){
            axios.post('https://slack.com/api/chat.postEphemeral', qs.stringify({
                token: config('OAUTH_TOKEN'),
                user: payload.user.id,
                channel: payload.channel.id,
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
        } else {
            axios.post('https://slack.com/api/chat.postMessage', qs.stringify({
                token: config('OAUTH_TOKEN'),
                channel: payload.channel.id,
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

};
module.exports = { pattern: /deleteDialogHandler/ig, handler: handler };