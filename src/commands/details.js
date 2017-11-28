'use strict';

const _ = require('lodash');
const config = require('../config');
const util = require('util');
const pg = require('pg');
const dbConfig = config('DB_CONFIG');

const PENDING_STATUS = "PENDING";
const REJECTED_STATUS = "REJECTED";
const ALLOWED_STATUS = ["PENDING", "REJECTED"];
const RED = "ff0000";
const GREEN = "33cc33";
const IN_CHANNEL = 'in_channel';
const ONLY_USER = 'ephemeral';

var pool = new pg.Pool(dbConfig);
var onlyNumbers = /^[0-9]*$/;   //regEx to test task id.

const handler = (payload, res) => {
//    var channelName = payload.channel_name;
//    var deletingUserID = "<@" + payload.user_id + ">";
	var channelName;
	var taskNumber;
	var isButton = false;

	if(payload.hasOwnProperty('original_message')) {
		console.log("BUTTON PRESSED TIME TO TRIM");
		
		taskNumber = parseInt(payload.original_message.text);
		channelName = payload.channel.name;
		isButton = true;
	} else if(!onlyNumbers.test(payload.submission.task)) {
        var wrongParamMsg = "Please enter the correct format /details [ID#] \n ex) /accept 24";
        var wrongParamTitle = "*** ERROR ***";
        createSendMsg(wrongParamTitle, wrongParamMsg, RED, ONLY_USER);
	} else {
		taskNumber = parseInt(payload.submission.task);
		channelName = payload.channel_name;
	}
	
	pool.connect().then(client => {
		return client.query('SELECT * FROM ASK_TABLE WHERE SERIAL_ID = $1;', [taskNumber])
		.then(resp => {
			client.release();
			var taskNumberRow = resp.rows;
			if (taskNumberRow.length == 0) {
				let falseIDMsg = taskNumber + " is not a valid ID#";
				let falseIDTitle = "*** ERROR ***";
				createSendMsg(falseIDTitle, falseIDMsg, RED, ONLY_USER);
			} else {
				pool.connect().then(client => {
					return client.query('SELECT * FROM clarify_table WHERE serial_id = $1;', [taskNumber])
						.then(response => {
						let detailTitle = 'Task: ' + taskNumber;
						createSendMsg(detailTitle, resp.rows[0], GREEN, IN_CHANNEL, response);
					})
						.catch(e => {
						client.release();
						console.log(e.stack);
						createSendMsg("*** ERROR ***", e.stack, RED, ONLY_USER);
					})
				});
			}
		})
		.catch(e => {
			client.release();
			console.log(e.stack);
			createSendMsg("*** ERROR ***", e.stack, RED, ONLY_USER);
		})
	});

    function createSendMsg(attachTitle, attachMsg, attachColor, respType, response=false){
		var msgAttachment;
		
		if(response != false) {
			msgAttachment = [];
			msgAttachment.push({
				title: attachTitle,
				text: attachMsg.req_desc + "\nTo: " + attachMsg.receiver_id + "\nFrom: " + attachMsg.sender_id,
				color: "#000000",
			});
			var color = "#000000";
			for(var i = 0; i < response.rows.length; i++) {
				if(color === "#000000") {
					color = "#afafaf"
					console.log('WHITE')
				} else if (color === "#afafaf") {
					color = "#000000"
					console.log("BLACK")
				}
				console.log(color)
				msgAttachment.push({
					text: response.rows[i].clar_quest,
					color: color
				});
			}
		} else if(isButton) {
			var ogMsg = payload.original_message.attachments;
			if(attachTitle != "*** ERROR ***") {
				delete ogMsg[0].actions;
			}
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
        };

        var msg =_.defaults(
            {
                channel: channelName,
                attachments: msgAttachment
            }, msgDefaults);

        res.set('content-type', 'application/json');
        res.status(200).json(msg);
        return;
    }
};

module.exports = { pattern: /delete/ig, handler: handler };