
'use strict';

const _ = require('lodash');
const config = require('../config');
const util = require('util');
const moment = require('moment');
const pg = require('pg');
const JiraApi = require('jira').JiraApi;
const qs = require('querystring');
const axios = require('axios');
const dateValidator = require('date-and-time');
const RED = "#ff0000";
const GREEN = "#33cc33";
const PENDING_STATUS = "PENDING";

const dbConfig = config('DB_CONFIG');
var pool = new pg.Pool(dbConfig);
const jira = new JiraApi('https', config('JIRA_HOST'), config('JIRA_PORT'), config('JIRA_USER'), config('JIRA_PWD'), 'latest');
var onlyNumbers = /^[0-9]*$/;   //regEx to test task id.

const handler = (payload, res) => {
    var finalUser;
    var finalUserId;

    var channelName = payload.channel_name;
    var qid = payload.submission.questionID;
    var answer = payload.submission.answer;
    var dueDate;
    if (payload.submission.dueDate) {
        dueDate = new Date(payload.submission.dueDate)
    }
    var currentDate = new Date();
    currentDate.setHours(currentDate.getHours() - 8);
    var taskID;
    var jiraKey;
    var jiraAssingee;
    var jiraDesc;
    var jiraSummary;
    var jiraIssue;
    var senderSlackName;
    var receiverSlackName;
    var targetDM;
    var question;

    let buttons;
    let dbQ1 = "UPDATE clarify_table SET clar_answer = $1 WHERE question_id = $2 RETURNING serial_id, clar_quest;";
    let dbQ3 = "SELECT * FROM ask_table INNER JOIN clarify_table ON (ask_table.serial_id = clarify_table.serial_id) WHERE ask_table.serial_id = $1;";
    let dbQ4 = "SELECT * FROM user_table WHERE slack_id = $1 OR slack_id = $2";
    let dbQ5 = "UPDATE ask_table SET due_date = $1 WHERE serial_id = $2;";

    let dateValid = false;
    if (dueDate) {  //checking for valid due date, only if due date exists.
        dateValid = dateValidator.isValid(payload.submission.dueDate, 'MMM D YYYY H:mm') && (currentDate - dueDate) < 0;
    }

    if (dateValid || dueDate == null){
        if (answer.length <= 200) {
            if (onlyNumbers.test(qid)){
                pool.connect().then(client => {
                    return client.query(dbQ1, [answer, qid])
                        .then(result => {
                            client.release();
                            taskID = result.rows[0].serial_id;
                            question = result.rows[0].clar_quest;
                            pool.connect().then(client2 => {
                                return client2.query(dbQ3, [taskID])
                                    .then(result2 => {
                                        client2.release();
                                        jiraKey = result2.rows[0].jira_id;
                                        jiraSummary = result2.rows[0].title;
                                        let receiverSlackID = result2.rows[0].receiver_id;
                                        targetDM = receiverSlackID.slice(2,11);
                                        let senderSlackID = result2.rows[0].sender_id;
                                        let baseDesc = result2.rows[0].req_desc;
                                        let questions = [];
                                        let answers = [];
                                        let taskDueDate = result2.rows[0].due_date
                                        for (let i=0; i<result2.rows.length; i++) {
                                            questions.push(result2.rows[i].clar_quest);
                                            answers.push(result2.rows[i].clar_answer);
                                        }

                                        if (jiraKey) {
                                            pool.connect().then(client3 => {
                                                return client3.query(dbQ4, [receiverSlackID, senderSlackID])
                                                    .then(result3 => {
                                                        client3.release();
                                                        //console.log("Log 1: "+ result3.rows[0].f_name); //#DEBUG CODE: UNCOMMENT FOR DEBUGGING PURPOSES ONLY
                                                        for (let i=0; i<result3.rows.length; i++){
                                                            if (result3.rows[i].slack_id == senderSlackID){
                                                                senderSlackName = result3.rows[i].f_name +' '+ result3.rows[i].l_name;
                                                            }
                                                            if (result3.rows[i].slack_id == receiverSlackID){
                                                                receiverSlackName = result3.rows[i].f_name +' '+ result3.rows[i].l_name;
                                                                jiraAssingee = result3.rows[i].jira_name;
                                                            }
                                                        }

                                                        jiraDesc = 'Assigned by: '+ senderSlackName +'\n\n'+'Assigned to: '+ receiverSlackName +'\n\n'+ baseDesc;
                                                        for (let i=0; i<questions.length; i++){
                                                            jiraDesc += '\n\nQuestion:\n'+ questions[i] + '\nAnswer:\n'+ answers[i];
                                                        }
                                                        jiraIssue = {
                                                            "update": {
                                                                "description": jiraDesc,
                                                                "duedate": dueDate
                                                            }
                                                        };
                                                        jira.updateIssue(jiraKey, jiraIssue, function (jiraErr, issueUpdate) {
                                                            if (jiraErr) {
                                                                //console.log(jiraErr); //#DEBUG CODE: UNCOMMENT FOR DEBUGGING PURPOSES ONLY
                                                                return(jiraErr);
                                                            } else {
                                                                //console.log("Jira update was a: "+ JSON.stringify(issueUpdate)); //#DEBUG CODE: UNCOMMENT FOR DEBUGGING PURPOSES ONLY
                                                                pool.connect().then(client4 => {
                                                                    return client4.query(dbQ5, [dueDate, taskID])
                                                                        .then(result4 => {
                                                                            client4.release();
                                                                            setButtons(taskID);
                                                                            let taskSum = "*Task ID:* " + taskID+ "\n *Title:* " + jiraSummary + "\n *Recipient:* " + receiverSlackID + " *Owner:* " + senderSlackID;
                                                                            if (dueDate) {  //checking for valid due date, only if due date exists.
                                                                                if(dateValidator.isValid(payload.submission.dueDate, 'MMM D YYYY H:mm') && (currentDate - dueDate) < 0) {
                                                                                    if(taskDueDate != null){
                                                                                        if(taskDueDate - dueDate != 0) {
                                                                                            taskSum = taskSum + "\n *New Due Date:* " + payload.submission.dueDate
                                                                                        }
                                                                                    } else {
                                                                                        taskSum = taskSum + "\n *New Due Date:* " + payload.submission.dueDate   
                                                                                    }
                                                                                } else {
                                                                                    res.send({
                                                                                        "errors": [{
                                                                                            "name": "dueDate",
                                                                                            "error": "Invalid Date!"
                                                                                        }]
                                                                                    })
                                                                                }
                                                                            }
                                                                        res.send('');
                                                                            let build = taskSum +"\n *Question:* "+ question +"\n *Answer:* "+ answer;
                                                                            sendMessage(false, "Question Answered: ", build, GREEN);
                                                                        })
                                                                        .catch(err4 => {
                                                                            client4.release();
                                                                            //console.log(err4.stack); //#DEBUG CODE: UNCOMMENT FOR DEBUGGING PURPOSES ONLY
                                                                            sendMessage(true, "*** ERROR ***", ""+err4.stack, RED);
                                                                        })
                                                                })

                                                            }
                                                        })
                                                    })
                                                    .catch(err3 => {
                                                        client3.release();
                                                        //console.log(err3.stack); //#DEBUG CODE: UNCOMMENT FOR DEBUGGING PURPOSES ONLY
                                                        sendMessage(true, "*** ERROR ***", ""+err3.stack, RED);
                                                    });
                                            });

                                        } else {
                                            pool.connect().then(client4 => {
                                                return client4.query(dbQ5, [dueDate, taskID])
                                                    .then(result4 => {
                                                        client4.release();
                                                        setButtons(taskID);
                                                        let taskSum = "*Task ID:* " + taskID+ "\n Title: " + jiraSummary + "\n Recipient: " + receiverSlackID + " Owner: " + senderSlackID;
                                                        if (dueDate) {  //checking for valid due date, only if due date exists.
                                                            if(dateValidator.isValid(payload.submission.dueDate, 'MMM D YYYY H:mm') && (currentDate - dueDate) < 0) {
                                                                if(taskDueDate != null){
                                                                    if(taskDueDate - dueDate != 0) {
                                                                        taskSum = taskSum + "\n New Due Date: " + payload.submission.dueDate
                                                                    }
                                                                } else {
                                                                    taskSum = taskSum + "\n New Due Date: " + payload.submission.dueDate   
                                                                }
                                                            } else {
                                                                res.send({
                                                                    "errors": [{
                                                                        "name": "dueDate",
                                                                        "error": "Invalid Date!"
                                                                    }]
                                                                })
                                                            }
                                                        }
                                                        res.send('');
                                                        let build = taskSum +"\n Question: "+ question +"\n Answer: "+ answer;
                                                        sendMessage(false, "Question Answered: ", build, GREEN);
                                                    })
                                                    .catch(err4 => {
                                                        client4.release();
                                                        //console.log(err4.stack); //#DEBUG CODE: UNCOMMENT FOR DEBUGGING PURPOSES ONLY
                                                        sendMessage(true, "*** ERROR ***", ""+err4.stack, RED);
                                                    })
                                            })
                                        }
                                    })
                                    .catch(err2 => {
                                        client2.release();
                                        //console.log(err2.stack); //#DEBUG CODE: UNCOMMENT FOR DEBUGGING PURPOSES ONLY
                                        sendMessage(true, "*** ERROR ***", ""+err2.stack, RED);
                                    })
                            })
                        })
                        .catch(err => {
                            client.release();
                            //console.log(err.stack); //#DEBUG CODE: UNCOMMENT FOR DEBUGGING PURPOSES ONLY
                            sendMessage(true, "*** ERROR ***", ""+err.stack, RED);
                        });
                });
            } else {
                res.send({
                    "errors": [{
                        "name": "questionID",
                        "error": "Question ID: '"+qid+"'" + " no longer exists."
                    }]
                })
            }
        } else {
            res.send({
                "errors": [{
                    "name": "answer",
                    "error": "Sorry your answer can only be 200 characters long."
                }]
            })
        }
    } else {
        res.send({
            "errors": [{
                "name": "dueDate",
                "error": "Passed or Incorrect Date"
            }]
        })
    }

    function setButtons(sid){
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
                    callback_id: "answerDialogHandler",
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
                user: payload.user.id,
                channel: payload.channel.id,
                attachments: JSON.stringify([{
                    title: "Answer Sent",
                    color: color
                }]),
            })).then((result) => {
                console.log('sendConfirmation: ', result.data);
            }).catch((err) => {
                console.log('sendConfirmation error: ', err);
                console.error(err);
            });

            axios.post('https://slack.com/api/im.list', qs.stringify({
                token: config('POST_BOT_TOKEN'),

            })).then(function (resp){
                for(var t = 0; t < resp.data.ims.length; t++){
                    if(targetDM == resp.data.ims[t].user){
                        finalUser = resp.data.ims[t].id;
                        finalUserId = resp.data.ims[t].user;
                        axios.post('https://slack.com/api/chat.postMessage', qs.stringify({
                            token: config('POST_BOT_TOKEN'),
                            channel: finalUser,
                            user:finalUserId,
                            as_user:true,
                            attachments: JSON.stringify([
                                {
                                    title: title,
                                    color: color,
                                    text: text,
                                    callback_id: "askDialogHandler",
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
        }
    }

};
module.exports = { pattern: /answerDialogHandler/ig, handler: handler };