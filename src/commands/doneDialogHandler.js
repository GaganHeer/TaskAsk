
'use strict'

const _ = require('lodash')
const config = require('../config')
const util = require('util')
const moment = require('moment')
const pg = require('pg')
const qs = require('querystring')
const axios = require('axios')
const JiraApi = require('jira').JiraApi;
const RED = "ff0000"
const GREEN = "33cc33"
const DONE_STATUS = "DONE"

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
        done();
        jira.transitionIssue(jid, issueTransDone, function (error, issueUpdate) { //changes the Jira Issue to "Done" status.
            if (error) {
                sendMessage(true, "*** ERROR ***", error, RED);
                //return(error);
            } else {
                console.log("Jira Status change was a: " + JSON.stringify(issueUpdate));
                pg.connect(dbURL, function(err, client, done) {
                    done();
                    client.query("UPDATE ASK_TABLE SET status = $1, fin_date = NOW() WHERE jira_id = $2 RETURNING *", [DONE_STATUS, jid], function(err, result) {
                        if(err) {
                            sendMessage(true, "*** ERROR ***", err, RED);
                        }

                        
                       //Dm

                        var finalUser;
                        var finalUserId;
                        var targetDM = result.rows[0].sender_id.slice(2,11);


                        axios.post('https://slack.com/api/im.list', qs.stringify({
                            token: config('POST_BOT_TOKEN'),

                        })).then(function (resp){
                            console.log(resp.data);
                            for(var t = 0; t < resp.data.ims.length; t++){
                                console.log(t);
                                console.log(resp.data.ims[t].id);
                                if(targetDM==resp.data.ims[t].user){
                                    finalUser = resp.data.ims[t].id;
                                    finalUserId = resp.data.ims[t].user;
                                    axios.post('https://slack.com/api/chat.postMessage', qs.stringify({
                                        token: config('POST_BOT_TOKEN'),
                                        channel: finalUser,
                                        user:finalUserId,
                                        as_user:true,
                                        text: result.rows[0].sender_id+": Done TASK: "+result.rows[0].serial_id,

                                    })).then((resulttt) => {
                                        console.log('sendConfirmation: ', resulttt.data);
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
                        
                        sendMessage(false, "Done", "You have completed ID# " + result.rows[0].serial_id + ": " + result.rows[0].title, GREEN);
                        res.send('')
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
                    callback_id: "doneDialogHandlerMsg",
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
                    callback_id: "doneDialogHandler",
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
module.exports = { pattern: /doneDialogHandler/ig, handler: handler }