'use strict';

const _ = require('lodash');
const config = require('../config');
const util = require('util');
const pg = require('pg');
const JiraApi = require('jira').JiraApi;
const ACCEPTED_STATUS = "ACCEPTED";
const PENDING_STATUS = "PENDING";
const RED = "ff0000";
const GREEN = "33cc33";
const IN_CHANNEL = 'in_channel';
const ONLY_USER = 'ephemeral';

var dbURL = process.env.ELEPHANTSQL_URL;
var onlyNumbers = /^[0-9]*$/;
const dbConfig = config('DB_CONFIG');
var pool = new pg.Pool(dbConfig);
const jira = new JiraApi('https', config('JIRA_HOST'), config('JIRA_PORT'), config('JIRA_USER'), config('JIRA_PWD'), 'latest');

var jiraKey;
var jiraAssingee;
var jiraDesc;
var jiraSummary;
var jiraIssue;
var senderSlackName;
var receiverSlackName;

var issueTrans = {
    "transition": {
        "id": "21"   //"21" is the ID of the transition to "In Progress" status.
    }
};

const handler = (payload, res) => {
    
    var channelName;
    var acceptingUserID;
	var taskNumber;
	var isButton = false;
	
    if(payload.hasOwnProperty('original_message')) {
		console.log("BUTTON PRESSED TIME TO TRIM");
		
		taskNumber = parseInt(payload.original_message.text);
		acceptingUserID = "<@" + payload.user.id + ">";
		channelName = payload.channel.name;
		isButton = true;
	} else if(!onlyNumbers.test(payload.text)){
        var wrongParamMsg = "Please enter the correct format /accept [ID#] \n ex) /accept 24"
        var wrongParamTitle = "*** ERROR ***"
        createSendMsg(wrongParamTitle, wrongParamMsg, RED, ONLY_USER);
	} else {
		taskNumber = parseInt(payload.text);
		acceptingUserID = "<@" + payload.user_id + ">";
		channelName = payload.channel_name;
	}
	
	pg.connect(dbURL, function(err, client, done) {		
		if(err) {
			createSendMsg("*** ERROR ***", err, RED, ONLY_USER);
		}
		client.query("SELECT * FROM ASK_TABLE WHERE SERIAL_ID = $1", [taskNumber], function(err, selectResult){
			done();
			if(err){
				createSendMsg("*** ERROR ***", err, RED, ONLY_USER);
			}
			var taskNumberRow = selectResult.rows;
			if(taskNumberRow.length == 0){
				var falseIDMsg = taskNumber + " is not a valid ID#";
				var falseIDTitle = "*** ERROR ***";
				createSendMsg(falseIDTitle, falseIDMsg, RED, ONLY_USER);

			} else if (taskNumberRow[0].status !== PENDING_STATUS) {
				var notPendingMsg = acceptingUserID + " that task can't be accepted! it is currently [" + taskNumberRow[0].status + "]";
				var notPendingTitle = "*** ERROR ***";
				createSendMsg(notPendingTitle, notPendingMsg, RED, ONLY_USER);

			} else if(taskNumberRow[0].receiver_id != acceptingUserID){
				var invalidAcceptMsg = acceptingUserID + " that task is assigned to " + taskNumberRow[0].receiver_id + " not you!";
				var invalidAcceptTitle = "*** ERROR ***";
				createSendMsg(invalidAcceptTitle, invalidAcceptMsg, RED, ONLY_USER);

			} else {
				jiraSummary = selectResult.rows[0].sender_id +' '+selectResult.rows[0].req_date;
				let receiverSlackID = selectResult.rows[0].receiver_id;
				let senderSlackID = selectResult.rows[0].sender_id;
				let baseDesc = selectResult.rows[0].req_desc;
				pool.connect().then(client => {
					return client.query('SELECT * FROM user_table WHERE slack_id = $1 OR slack_id = $2', [receiverSlackID, senderSlackID])
						.then(res => {
						client.release();
						console.log("Log 1: "+ res.rows[0].f_name);
						for (let i=0; i<res.rows.length; i++){
							if (res.rows[i].slack_id == senderSlackID){
								senderSlackName = res.rows[i].f_name +' '+ res.rows[i].l_name;
							}
							if (res.rows[i].slack_id == receiverSlackID){
								receiverSlackName = res.rows[i].f_name +' '+ res.rows[i].l_name;
								jiraAssingee = res.rows[i].jira_name;
							}
						}
						jiraDesc = 'Assigned by: '+ senderSlackName +'\n\n'+'Assigned to: '+ receiverSlackName +'\n\n'+ baseDesc;
						jiraIssue = {
							"fields": {
								"project": {
									"id": "13100"  //TASK PROJECT ID
								},
								"summary": jiraSummary,
								"issuetype": {
									"id": "3"  //'Task' issue type
								},
								"assignee": {
									"name": jiraAssingee
								},
								"description": jiraDesc,
								"customfield_10100": [{  //Custom Field for Review Type.
									"id": "10103"  //All slack task will not require review.
								}]
							}
						};
						console.log("Log 2 :"+ jiraIssue);
						jira.addNewIssue(jiraIssue, function (error, issue){
							if (error){
								console.log(error);
								return(error);
							} else {
								console.log('Console log 3, Jira Key: ' + issue.key);
								jiraKey = issue.key;
								console.log('Console log 4: '+ jiraKey);
								jira.transitionIssue(jiraKey, issueTrans, function (err, issueUpdate) {  //Changes the Issue's Status to In Progress
									if (err) {
										console.log(err);
										return(err);
									} else {
										console.log("Console log 5, Jira Status change was a: "+ JSON.stringify(issueUpdate));
										client.query("UPDATE ASK_TABLE SET STATUS = $1, JIRA_ID = $2 WHERE SERIAL_ID = $3", [ACCEPTED_STATUS, jiraKey, taskNumber], function (err, updateResult) {
											client.query("SELECT * FROM ASK_TABLE WHERE SERIAL_ID = $1", [taskNumber], function (err2, selectResult) {
												done();
												if(err) {
													createSendMsg("*** ERROR ***", err, RED, ONLY_USER);
												}
												if(err2) {
													createSendMsg("*** ERROR ***", err2, RED, ONLY_USER);
												}
												taskNumberRow = selectResult.rows;
												var acceptMsg = taskNumberRow[0].sender_id + "! " + taskNumberRow[0].receiver_id + " has accepted " + taskNumberRow[0].jira_id + " '" + taskNumberRow[0].req_desc + "'";
												var acceptTitle = "Task Accepted";
												createSendMsg(acceptTitle, acceptMsg, GREEN, IN_CHANNEL);
											});
										});
									}
								});
							}
						});
					})
						.catch(e => {
						client.release();
						console.log(err.stack);
					})
				});
			}
		});
	});

    function createSendMsg(attachTitle, attachMsg, attachColor, respType){
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
        
        const msgDefaults = {
          response_type: respType,
          username: 'TaskAsk',
        }
        
        var msg =_.defaults(
        {
            channel: channelName,
            attachments: msgAttachment
        }, msgDefaults)

        res.set('content-type', 'application/json');
        res.status(200).json(msg);	
        return;
    }
}

module.exports = { pattern: /accept/ig, handler: handler }
