
'use strict';

const _ = require('lodash');
const config = require('../config');
const qs = require('querystring');
const axios = require('axios');
const pg = require('pg');

const dbConfig = config('DB_CONFIG');
var pool = new pg.Pool(dbConfig);
var onlyNumbers = /^[0-9]*$/;   //regEx to test task id.



const handler = (payload, res) => {
    var channelName = payload.channel_name;
    var askingUserID = "<@" + payload.user_id + ">";
    var taskNumber = payload.submission.task;
    var buttons;
    var col = "";

    var build = "";

    if (onlyNumbers.test(taskNumber)){
        pool.connect().then(client => {
            client.query('SELECT * FROM ask_table WHERE serial_id = $1;', [taskNumber])
                .then(result => {
                    client.release();
                    console.log("I'm here boy: "+ result.rows[0].serial_id);
                    if (result.rows.length < 0) { //checking to make sure the task wasn't deleted while executing the command.
                        res.send({
                            "errors": [{
                                "name": "task",
                                "error": "'"+taskNumber+"'" + " no longer exists, sorry for the inconvenience."
                            }]
                        })
                    } else {
                        let resp = result.rows[0];
                        build = resp.receiver_id +',  '+ resp.sender_id+' would like to know the progress of Task ID: '+ resp.serial_id +' - '+ resp.title;
                        res.send('');
                        setButtons(taskNumber, resp.status);
                        sendMessage(false, "Status Update: ", build, col);
                    }
                })
                .catch(err => {
                    client.release();
                    console.log(err.stack);
                    sendMessage(true, "*** ERROR ***", err.stack, "#ff0000");
                })
        })
    }

    function setButtons(sid, status){
        if (status === "PENDING") {
            col = "ffcc00";
            buttons = [
                {
                    name: "accept",
                    text: "Accept",
                    type: "button",
                    value: sid,
                    style: "primary",
                    "confirm": {
                        "title": "Are you sure?",
                        "text": "You are about to accept this, are you sure?",
                        "ok_text": "Yes",
                        "dismiss_text": "No"
                    }
                },
                {
                    name: "reject",
                    text: "Reject",
                    type: "button",
                    value: sid,
                    style: "danger",
                    "confirm": {
                        "title": "Are you sure?",
                        "text": "You are about to reject this, are you sure?",
                        "ok_text": "Yes",
                        "dismiss_text": "No"
                    }
                }
            ];
        } else if (status === "ACCEPTED") {
            col = "#33cc33";
            buttons = [
                {
                    name: "doneBut",
                    text: "Done",
                    type: "button",
                    value: sid,
                    style: "primary",
                    "confirm": {
                        "title": "Are you sure?",
                        "text": "You are about to indicate this task is done.  Are you sure?",
                        "ok_text": "Yes",
                        "dismiss_text": "No"
                    }
                }
            ]
        } else if (status === "REJECTED") {
            col = "#ff0000"
        } else if (status === "DONE") {
            col = "#33ccff"
        }
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
                    fallback: "Something went wrong :/",
                    callback_id: "progressDialogHandler",
                }]),
            })).then((result) => {
                console.log('sendConfirmation: ', result.data);
            }).catch((err) => {
                console.log('sendConfirmation error: ', err);
                console.error(err);
            });
        } else {
            axios.post('https://slack.com/api/chat.postMessage', qs.stringify({
                token: config('OAUTH_TOKEN'),
                channel: payload.channel.id,
                attachments: JSON.stringify([{
                    title: title,
                    color: color,
                    text: text,
                    // fallback: "Something went wrong :/",
                    callback_id: "progress_buttons",
                    actions: buttons
                }]),
            })).then((result) => {
                console.log('sendConfirmation: ', result.data);
            }).catch((err) => {
                console.log('sendConfirmation error: ', err);
                console.error(err);
            });
        }
    }

};
module.exports = { pattern: /progressDialogHandler/ig, handler: handler };