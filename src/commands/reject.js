'use strict'

const _ = require('lodash')
const config = require('../config')
const util = require('util')
const pg = require('pg')
const axios = require('axios')
const qs = require('querystring');
const REJECTED_STATUS = "REJECTED"
const PENDING_STATUS = "PENDING"
const RED = "ff0000"
const ONLY_USER = 'ephemeral'


var dbURL = process.env.ELEPHANTSQL_URL;
var onlyNumbers = /^[0-9]*$/

const msgDefaults = {
  response_type: 'in_channel',
  username: 'MrBoneyPantsGuy',
  icon_emoji: config('ICON_EMOJI')
}

const handler = (payload, res) => {
	
	var channelName;
    var rejectingUserID;
	var taskNumber;
	var isButton = false;
	
	if(payload.hasOwnProperty('original_message')) {
		console.log("BUTTON PRESSED TIME TO TRIM");
		
		taskNumber = parseInt(payload.original_message.text);
		rejectingUserID = "<@" + payload.user.id + ">";
		channelName = payload.channel.name;
		isButton = true;
	} else if(!onlyNumbers.test(payload.text)){
        var wrongParamMsg = "Please enter the correct format /accept [ID#] \n ex) /accept 24"
        var wrongParamTitle = "*** ERROR ***"
        createSendMsg(wrongParamTitle, wrongParamMsg, RED, ONLY_USER);
	} else {
		taskNumber = parseInt(payload.text);
		rejectingUserID = "<@" + payload.user_id + ">";
		channelName = payload.channel_name;
	}

	pg.connect(dbURL, function(err, client, done) {		
		if(err) {
			createSendMsg("*** ERROR ***", err, RED);
		}
		client.query("SELECT * FROM ASK_TABLE WHERE SERIAL_ID = $1", [taskNumber], function(err, selectResult){
			done();
			if(err){
				console.log(err);
			}
			var taskNumberRow = selectResult.rows;
			if(taskNumberRow.length == 0){
				var falseIDMsg = taskNumber + " is not a valid ID#";
				var falseIDTitle = "Invalid ID#";
				createSendMsg(falseIDTitle, falseIDMsg, RED);

			} else if (taskNumberRow[0].status !== PENDING_STATUS) {
				var notPendingMsg = rejectingUserID + " that task can't be rejected! it is currently [" + taskNumberRow[0].status + "]";
				var notPendingTitle = "Status not Pending";
				createSendMsg(notPendingTitle, notPendingMsg, RED);

			} else if(taskNumberRow[0].receiver_id != rejectingUserID){
				var invalidRejectMsg = rejectingUserID + " that task is assigned to " + taskNumberRow[0].receiver_id + " not you!";
				var invalidRejectTitle = "Invalid Reject";
				createSendMsg(invalidRejectTitle, invalidRejectMsg, RED);

			} else {
				client.query("UPDATE ASK_TABLE SET STATUS = $1 WHERE SERIAL_ID = $2", [REJECTED_STATUS, taskNumber], function(err, updateResult) {
					client.query("SELECT * FROM ASK_TABlE WHERE SERIAL_ID = $1", [taskNumber], function(err2, selectResult){
						done();
						if(err) {
							createSendMsg("*** ERROR ***", err, RED);
						}
						if(err2) {
							createSendMsg("*** ERROR ***", err2, RED);
						}
						taskNumberRow = selectResult.rows;
						var rejectMsg = taskNumberRow[0].sender_id + "! " + taskNumberRow[0].receiver_id + " has rejected ID#" + taskNumberRow[0].serial_id + " '" + taskNumberRow[0].req_desc + "'";
						var rejectTitle = "Task Rejected";
						createSendMsg(rejectTitle, rejectMsg, RED);
					});
				});
			}
		});

	    });

    
    
    function createSendMsg(attachTitle, attachMsg, attachColor, respType=channelName){
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
        
        var msg =_.defaults(
        {
            channel: respType,
            attachments: msgAttachment
        }, msgDefaults)

        res.set('content-type', 'application/json');
        res.status(200).json(msg);	
        return;
    }
}


module.exports = { pattern: /reject/ig, handler: handler }
