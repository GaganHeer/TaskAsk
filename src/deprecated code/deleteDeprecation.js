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
    var channelName = payload.channel_name;
    var deletingUserID = "<@" + payload.user_id + ">";

	if(payload.hasOwnProperty('original_message')) {
		console.log("BUTTON PRESSED TIME TO TRIM");
		
		taskNumber = parseInt(payload.original_message.text);
		deletingUserID = "<@" + payload.user.id + ">";
		channelName = payload.channel.name;
		isButton = true;
	} else if(!onlyNumbers.test(payload.text)) {
        var wrongParamMsg = "Please enter the correct format /delete [ID#] \n ex) /accept 24"
        var wrongParamTitle = "*** ERROR ***"
        createSendMsg(wrongParamTitle, wrongParamMsg, RED, ONLY_USER);
	} else {
		taskNumber = parseInt(payload.text);
		deletingUserID = "<@" + payload.user_id + ">";
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
			} else if (!ALLOWED_STATUS.includes(taskNumberRow[0].status)) {
				let notPendRejMsg = deletingUserID + " that task can't be deleted! it is currently [" + taskNumberRow[0].status + "]";
				let notPendRejTitle = "*** ERROR ***";
				createSendMsg(notPendRejTitle, notPendRejMsg, RED, ONLY_USER);
				
			} else if(taskNumberRow[0].sender_id != deletingUserID) {
				let invalidAcceptMsg = deletingUserID + " that task is assigned by " + taskNumberRow[0].sender_id + " not you!";
				let invalidAcceptTitle = "*** ERROR ***";
				createSendMsg(invalidAcceptTitle, invalidAcceptMsg, RED, ONLY_USER);
			} else {
				pool.connect().then(client => {
					return client.query('DELETE FROM ask_table WHERE serial_id = $1;', [taskNumber])
						.then(response => {
						let deleteMsg = 'Task: '+ taskNumber +' Successfully Deleted';
						let deleteTitle = 'Task Deleted';
						createSendMsg(deleteTitle, deleteMsg, GREEN, IN_CHANNEL);
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

    function createSendMsg(attachTitle, attachMsg, attachColor, respType){

        let msgAttachment = [{
            title: attachTitle,
            text: attachMsg,
            color: attachColor
        }];

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