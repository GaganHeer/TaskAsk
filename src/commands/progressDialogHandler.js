
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

	if (taskNumber == null) {
		res.send({
			"errors": [{
				"name": "task",
				"error": "No tasks were found"
			}]
		})
	}
	
    if (onlyNumbers.test(taskNumber)){
        pool.connect().then(client => {
            client.query('SELECT * FROM ask_table WHERE serial_id = $1;', [taskNumber])
                .then(result => {
                    client.release();
//                    console.log("I'm here: "+ result.rows[0].serial_id); //#DEBUG CODE: UNCOMMENT FOR DEBUGGING PURPOSES ONLY
                    if (result.rows.length < 0) { //checking to make sure the task wasn't deleted while executing the command.
                        res.send({
                            "errors": [{
                                "name": "task",
                                "error": "'"+taskNumber+"'" + " no longer exists, sorry for the inconvenience."
                            }]
                        })
                    } else {
                        let resp = result.rows[0];
                        build = ""
                        res.send('');
                        setButtons(taskNumber, resp.status);
                        sendMessage(false, "Progress Update Requested ", build, col);

                        //Dm

                        var finalUser;
                        var finalUserId;
                        var targetDM = resp.receiver_id.slice(2,11);


                        axios.post('https://slack.com/api/im.list', qs.stringify({
                            token: config('POST_BOT_TOKEN'),

                        })).then(function (resp2){
                            for(var t = 0; t < resp2.data.ims.length; t++){
                                var text;
                                if(result.rows[0].due_date != null) {
                                    var stringDate = resp.due_date.toString();
                                    var due = stringDate.slice(4,21)
                                    text = "Task ID: " + taskNumber + "\n Title: " + resp.title + "\n Recipient: " + resp.receiver_id + " Owner: " + resp.sender_id + "\n Description: " + resp.req_desc + "\n Due Date: " + due;
                                } else {
                                    text = "Task ID: " + taskNumber + "\n Title: " + resp.title + "\n Recipient: " + resp.receiver_id + " Owner: " + resp.sender_id + "\n Description: " + resp.req_desc;
                                }

                                if(targetDM==resp2.data.ims[t].user){
                                    finalUser = resp2.data.ims[t].id;
                                    finalUserId = resp2.data.ims[t].user;
                                    axios.post('https://slack.com/api/chat.postMessage', qs.stringify({
                                        token: config('POST_BOT_TOKEN'),
                                        channel: finalUser,
                                        user:finalUserId,
                                        as_user:true,
                                        attachments: JSON.stringify([
                                        {   
                                            title: "Progress Update Requested",
                                            text: text,
                                            color: col,
                                            callback_id: "progress_buttons",
                                            actions: buttons
                                            
                                        },
                                        ]),
                                        

                                    })).then((result) => {
                                        console.log('sendConfirmation: ', result.data);
                                    }).catch((err) => {
                                        console.log('sendConfirmation error: ', err);
                                        console.error(err);
                                    });
                                }
                            }
                        }).catch(function (err){
                            console.log(err);
                        });

                        //End of DM
                    }
                })
                .catch(err => {
                    client.release();
//                    console.log(err.stack); //#DEBUG CODE: UNCOMMENT FOR DEBUGGING PURPOSES ONLY
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
                },
                {
                    name: "forward",
                    text: "Forward",
                    type: "button",
                    value: sid,
                },
                {
                    name: "clarify",
                    text: "Clarify",
                    type: "button",
                    value: sid,
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
                    callback_id: "progressDialogHandler",
                }]),
            })).then((result) => {
                console.log('sendConfirmation: ', result.data);
            }).catch((err) => {
                console.log('sendConfirmation error: ', err);
                console.error(err);
            });
        } else {
            axios.post('https://slack.com/api/chat.postEphemeral', qs.stringify({
                token: config('OAUTH_TOKEN'),
                channel: payload.channel.id,
                user: payload.user.id,
                attachments: JSON.stringify([{
                    title: title,
                    color: color,
                    text: text,
                    
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