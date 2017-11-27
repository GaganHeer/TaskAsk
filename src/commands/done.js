'use strict';

const _ = require('lodash');
const config = require('../config');
const util = require('util');
const moment = require('moment');
const pg = require('pg');
const JiraApi = require('jira').JiraApi;
var onlyNumbers = /^[0-9]*$/;
var charCheck = /[^0-9]/;
const BLUE = "33ccff"
const RED = "ff0000"

const qs = require('querystring');
const axios = require('axios');

const dbConfig = config('DB_CONFIG');
var pool = new pg.Pool(dbConfig);
const jira = new JiraApi('https', config('JIRA_HOST'), config('JIRA_PORT'), config('JIRA_USER'), config('JIRA_PWD'), 'latest');


var outMsg = "not working" ;
var title = "Done!";
var jiraKey;

var issueTransDone = {
    "transition": {
        "id": "31"   //"31" is the ID of the transition to "Done" status.
    }
};

const handler = (payload, res) => {		
	var channelName;
    var doneUserID;
	var taskNumber;
	var isButton = false;
	
    if(payload.hasOwnProperty('original_message')) {
		//console.log("BUTTON PRESSED TIME TO TRIM"); //#DEBUG CODE: UNCOMMENT FOR DEBUGGING PURPOSES ONLY
		
		taskNumber = parseInt(payload.original_message.text);
		doneUserID = "<@" + payload.user.id + ">";
		channelName = payload.channel.name;
		isButton = true;
	} else if(!onlyNumbers.test(payload.text)){
        title = "*** ERROR ***";
		outMsg = "Invalid value. Please enter a integer.";
		doneOut(title, outMsg, RED);
	} else {
		taskNumber = parseInt(payload.text);
		doneUserID = "<@" + payload.user_id + ">";
		channelName = payload.channel_name;
	}
	
	pool.connect().then(client => {
		client.query("SELECT * FROM ASK_TABLE WHERE receiver_id = $1 AND serial_id = $2 AND status = $3", [doneUserID, taskNumber, "ACCEPTED"])
            .then(result => {
                client.release();
                if (result.rows.length == 0){
                    title = "*** ERROR ***";
                    outMsg = "Please enter an Accepted task that belongs to you.";
                    doneOut(title, outMsg, RED);
                } else {
                    jiraKey = result.rows[0].jira_id;
                    jira.transitionIssue(jiraKey, issueTransDone, function (error, issueUpdate) { //changes the Jira Issue to "Done" status.
                        if (error) {
                            //console.log(error); //#DEBUG CODE: UNCOMMENT FOR DEBUGGING PURPOSES ONLY
                        } else {
                            //console.log("Jira Status change was a: "+ JSON.stringify(issueUpdate)); //#DEBUG CODE: UNCOMMENT FOR DEBUGGING PURPOSES ONLY
                            pool.connect().then(client => {
                                client.query("UPDATE ASK_TABLE SET status = 'DONE', fin_date = NOW() WHERE receiver_id = $1 AND serial_id = $2 AND status =$3 RETURNING *", [doneUserID, taskNumber, "ACCEPTED"])
                                    .then(result2 => {
                                        client.release();
                                        doneOut("Done", "", BLUE);
                                        
                                        var finalUser;
                                        var finalUserId;
                                        var targetDM = result2.rows[0].sender_id.slice(2,11);
                                    
                                        axios.post('https://slack.com/api/im.list', qs.stringify({
                                            token: config('POST_BOT_TOKEN'),
                                            
                                        })).then(function (resp){
                                            for(var t = 0; t < resp.data.ims.length; t++){
                                                //console.log(resp.data.ims[t].id); //#DEBUG CODE: UNCOMMENT FOR DEBUGGING PURPOSES ONLY
                                                if(targetDM==resp.data.ims[t].user){
                                                    finalUser = resp.data.ims[t].id;
                                                    finalUserId = resp.data.ims[t].user;
                                                    axios.post('https://slack.com/api/chat.postMessage', qs.stringify({
                                                        token: config('POST_BOT_TOKEN'),
                                                        channel: finalUser,
                                                        user:finalUserId,
                                                        as_user:true,
                                                        attachments: JSON.stringify([{
                                                            title: "Done",
                                                            color: BLUE,
                                                            text: "Task ID: " + result2.rows[0].serial_id + "\n Title: " + result2.rows[0].title + "\n Recipient: " + result2.rows[0].receiver_id + " Owner: " + result2.rows[0].sender_id,
                                                        }]),
                                                    })).then((result) => {
                                                        //console.log('sendConfirmation: ', result.data); //#DEBUG CODE: UNCOMMENT FOR DEBUGGING PURPOSES ONLY
                                                    }).catch((err) => {
                                                        //console.log('sendConfirmation error: ', err); //#DEBUG CODE: UNCOMMENT FOR DEBUGGING PURPOSES ONLY
                                                    });
                                                }
                                            }
                                        }).catch(function (err){
                                            //console.log(err); //#DEBUG CODE: UNCOMMENT FOR DEBUGGING PURPOSES ONLY
                                        });
                                    }).catch(e => {
                                        client.release();
                                        sendMessage("*** ERROR ***", "" + e, RED);
                                    });
                            }).catch(e => {
                                sendMessage("*** ERROR ***", "" + e, RED);
                            });                            
                        }
                    });
                }
		}).catch(e => {
            client.release();
            sendMessage("*** ERROR ***", "" + e, RED);
        });
	}).catch(e => {
        sendMessage("*** ERROR ***", "" + e, RED);
    })

	function doneOut(attachTitle, attachMsg, attachColor, respType=channelName) {
		var msgAttachment;
		
        if(isButton) {
			var ogMsg = payload.original_message.attachments;
			delete ogMsg[0].actions;
			msgAttachment = [ogMsg[0], {
        	    title: attachTitle,
        	    text: attachMsg,
        	    color: attachColor
        	}]
		} else {
        	msgAttachment = [{
        	    title: attachTitle,
        	    text: attachMsg,
        	    color: attachColor
        	}]
		}
	
		let msg = _.defaults({
		    channel: respType,
		    attachments: msgAttachment
		    })
		  
		res.set('content-type', 'application/json')
		res.status(200).json(msg)
		return;
	}
}

module.exports = { pattern: /done/ig, handler: handler }
