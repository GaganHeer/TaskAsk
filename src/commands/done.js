'use strict';

const _ = require('lodash');
const config = require('../config');
const util = require('util');
const moment = require('moment');
const pg = require('pg');
const JiraApi = require('jira').JiraApi;
var onlyNumbers = /^[0-9]*$/;
var charCheck = /[^0-9]/;

	
var dbURL = process.env.ELEPHANTSQL_URL;
const dbConfig = config('DB_CONFIG');
var pool = new pg.Pool(dbConfig);
const jira = new JiraApi('https', config('JIRA_HOST'), config('JIRA_PORT'), config('JIRA_USER'), config('JIRA_PWD'), 'latest');


const msgDefaults = {
  response_type: 'ephemeral',
  username: 'MrBoneyPantsGuy'
 
};

var outMsg = "not working" ;
var msgColor = "#ff0000";
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
		console.log("BUTTON PRESSED TIME TO TRIM");
		
		taskNumber = parseInt(payload.original_message.text);
		doneUserID = "<@" + payload.user.id + ">";
		channelName = payload.channel.name;
		isButton = true;
	} else if(!onlyNumbers.test(payload.text)){
        title = "*** ERROR ***";
		outMsg = "Invalid value. Please enter a integer.";
		msgColor = "#ff0000";
		doneOut(title, outMsg, msgColor);
	} else {
		taskNumber = parseInt(payload.text);
		doneUserID = "<@" + payload.user_id + ">";
		channelName = payload.channel_name;
	}
	
	outMsg="test";
	pg.connect(dbURL, function(err, client, done){
		client.query("SELECT * FROM ASK_TABLE WHERE receiver_id = $1 AND serial_id = $2 AND status = $3", [doneUserID, taskNumber, "ACCEPTED"], function(err, result) {

			if(err) {
				title = "*** ERROR ***";
				doneOut(title ,err, msgColor);
			}

			if (result.rows.length == 0){
				title = "*** ERROR ***";
				outMsg = "Whoops. Please enter an Accepted task that belongs to you.";
				msgColor = "#ff0000";

				doneOut(title, outMsg, msgColor);
			} else {
				jiraKey = result.rows[0].jira_id;
				jira.transitionIssue(jiraKey, issueTransDone, function (error, issueUpdate) { //changes the Jira Issue to "Done" status.
					if (error) {
						console.log(error);
						return(error);
					} else {
						console.log("Jira Status change was a: "+ JSON.stringify(issueUpdate));
						pg.connect(dbURL, function(err, client, done) {
							client.query("UPDATE ASK_TABLE SET status = 'DONE', fin_date = NOW() WHERE receiver_id = $1 AND serial_id = $2 AND status =$3", [doneUserID, taskNumber, "ACCEPTED"], function(err2, result2) {
								if(err) {
									title = "*** ERROR ***";
									doneOut(title, err, msgColor);
								}

								outMsg = "The following task is now done: " + jiraKey;
								msgColor = "#33ccff";

								doneOut(title, outMsg, msgColor);
							});
						});
					}
				});
			}
			done();
		});
	});

	function doneOut(attachTitle, attachMsg, attachColor, respType=payload.channel_name) {
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
		    channel: payload.channel_name,
		    attachments: msgAttachment
		    }, msgDefaults)
		  
		res.set('content-type', 'application/json')
		res.status(200).json(msg)
		return;
	}

	
	
}

module.exports = { pattern: /done/ig, handler: handler }
