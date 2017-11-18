
'use strict'

const _ = require('lodash')
const config = require('../config')
const util = require('util')
const moment = require('moment')
const pg = require('pg')
const qs = require('querystring')
const axios = require('axios')
const dateValidator = require('date-and-time')
const RED = "ff0000"
const GREEN = "33cc33"
const PENDING_STATUS = "PENDING"

var dbURL = process.env.ELEPHANTSQL_URL;
const dbConfig = config('DB_CONFIG');
var pool = new pg.Pool(dbConfig);
const jira = new JiraApi('https', config('JIRA_HOST'), config('JIRA_PORT'), config('JIRA_USER'), config('JIRA_PWD'), 'latest');

var issueTransDone = {
    "transition": {
        "id": "31"   //"31" is the ID of the transition to "Done" status.
    }
};

const handler = (payload, res) => {
    var jid = payload.submission.task;
    
    pg.connect(dbURL, function(err, client, done){
        jira.transitionIssue(jid, issueTransDone, function (error, issueUpdate) { //changes the Jira Issue to "Done" status.
            if (error) {
                sendMessage(true, "*** ERROR ***", error, RED);
                //return(error);
            } else {
                console.log("Jira Status change was a: "+ JSON.stringify(issueUpdate));
                pg.connect(dbURL, function(err, client, done) {
                    client.query("UPDATE ASK_TABLE SET status = 'DONE', fin_date = NOW() WHERE jira_id = $1 RETURNING *", [jid], function(err, result) {
                        if(err) {
                            title = "*** ERROR ***";
                            sendMessage(true, "*** ERROR ***", err, RED);
                        }
                        console.log("TITLE-------" + result.rows[0].title);
                        sendMessage(false, "Done", "The following task is now done: " + result.rows[0].title, GREEN);
                    });
                });
            }
        });
	});
    
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
                    callback_id: "askDialogHandler",
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
                    fallback: "Something went wrong :/",
                    callback_id: "askDialogHandler",
                }]),
            })).then((result) => {
                console.log('sendConfirmation: ', result.data);
            }).catch((err) => {
                console.log('sendConfirmation error: ', err);
                console.error(err);
            });
        }
    }
}
module.exports = { pattern: /forwardDialogHandler/ig, handler: handler }