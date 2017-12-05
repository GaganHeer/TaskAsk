'use strict';

const _ = require('lodash');
const config = require('../config');
const util = require('util');
const pg = require('pg');
const dbConfig = config('DB_CONFIG');
const axios = require("axios");
const qs = require('querystring');

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
	
	var channelName = payload.channel_name;
	var taskNumber = parseInt(payload.submission.task);;
	var isButton = false;

//	if(payload.hasOwnProperty('original_message')) {
//		console.log("BUTTON PRESSED TIME TO TRIM");
//		
//		taskNumber = parseInt(payload.original_message.text);
//		channelName = payload.channel.name;
//		isButton = true;
//	} else if(!onlyNumbers.test(payload.submission.task)) {
//        var wrongParamMsg = "Please enter the correct format /details [ID#] \n ex) /accept 24";
//        var wrongParamTitle = "*** ERROR ***";
//        createSendMsg(wrongParamTitle, wrongParamMsg, RED, ONLY_USER);
//	} else {
//		taskNumber = parseInt(payload.submission.task);
//		channelName = payload.channel_name;
//	}
	
	console.log("ERRORS: " + taskNumber);
	
	res.send('');
	pool.connect().then(client => {
		return client.query('SELECT * FROM ASK_TABLE WHERE SERIAL_ID = $1;', [taskNumber])
		.then(resp => {
			var taskNumberRow = resp.rows;
			if (taskNumberRow.length == 0) {
				let falseIDMsg = taskNumber + " is not a valid ID#";
				let falseIDTitle = "*** ERROR ***";
				createSendMsg(falseIDTitle, falseIDMsg, RED, ONLY_USER, payload);
			} else {
				pool.connect().then(client2 => {
					return client2.query('SELECT * FROM clarify_table WHERE serial_id = $1;', [taskNumber])
						.then(res => {
						client.release();
						client2.release();
						let detailTitle = 'Task: ' + taskNumber;
						createSendMsg(detailTitle, resp.rows[0], GREEN, IN_CHANNEL, payload, res);
					})
						.catch(e2 => {
						client.release();
						client2.release();
						console.log(e2.stack);
						createSendMsg("*** ERROR ***", e2.stack, RED, ONLY_USER, payload);
					})
				})
				.catch(err2 => {
					client2.release();
					console.log(err2.stack);
					createSendMsg("*** ERROR ***", err2.stack, RED, ONLY_USER, payload)
				});
			}
		})
		.catch(e => {
			client.release();
			console.log(e.stack);
			createSendMsg("*** ERROR ***", e2.stack, RED, ONLY_USER, payload);
		})
	})
	.catch(err => {
		client.release();
		createSendMsg("*** ERROR ***", err.stack, RED, ONLY_USER, payload);
	})

};
function createSendMsg(attachTitle, attachMsg, attachColor, respType, payload,  response=false) {
	var msgAttachment = [];
	var callback_id;

	if(response != false) {
		var actions;
		
		console.log("RECEIVER: " + attachMsg.receiver_id);
		console.log("MATCHER: " + "<@" + payload.user.id + ">");
		
		if(attachMsg.receiver_id === "<@" + payload.user.id + ">") {
			console.log("MATCH");
			actions = [{
				name: "clarify", 
				text: "Clarify",
				type: "button",
				value: attachMsg.serial_id,
			}]
		}
        
		msgAttachment.push({
			title: "Details",
			text: "*Task ID:* " + attachMsg.serial_id + "\n *Title:* " + attachMsg.title + "\n *Reciever:* " + attachMsg.receiver_id + " *Owner:* " + attachMsg.sender_id + "\n *Description:* " + attachMsg.req_desc + "\n *Due Date:* " + attachMsg.due_date,
			color: "#000000",
			callback_id: "askDialogHandler",
            mrkdwn_in: [
                "text"
            ],
			actions: actions,
		});
		
		for(var i = 0; i < response.rows.length; i++) {
			console.log("ANSEWR");
			console.log("ANSWER: " + response.rows[i].clar_answer);
				
			var stringManip = response.rows[i].clar_answer;
			
			if(((typeof stringManip).toString()) ===  "object") {
				console.log("ACTIVATED*************************************8");
			
				var sid = parseInt(response.rows[i].question_id);
				
                if(payload.user.id === response.rows[i].sender_id){
                    msgAttachment.push(
                        {
                            text: response.rows[i].clar_quest,
                            color: "#afafaf",
                            callback_id: "clarify_answer",
                            actions: [
                                {
                                    name: "answer",
                                    text: "Answer",
                                    type: "button",
                                    value: sid,
                                }
                            ],
                        }
				    );    
                } else {
                    msgAttachment.push(
                        {
                            text: response.rows[i].clar_quest,
                            color: "#afafaf",
                            callback_id: "clarify_answer",
                        }
				    );
                }
					
			} else {
				msgAttachment.push(
					{
						text: response.rows[i].clar_quest,
						color: "#afafaf"
					},
					{
						text: response.rows[i].clar_answer,
						color: "#000000",
					}
				);
			}
		}
//	} else if(isButton) {
//		var ogMsg = payload.original_message.attachments;
//		if(attachTitle != "*** ERROR ***") {
//			delete ogMsg[0].actions;
//		}
//		msgAttachment = [ogMsg[0], {
//			title: attachTitle,
//			text: attachMsg,
//			color: attachColor
//		}]
	} else {
		msgAttachment = [{
			title: attachTitle,
			text: attachMsg,
			color: attachColor
		}]
	}

	console.log("I GOT THIS FAR");

	var targetDM = payload.user.id;
	if(response === false){
		axios.post('https://slack.com/api/chat.postEphemeral', qs.stringify({
			token: config('OAUTH_TOKEN'),
			user: payload.user.id,
			channel: payload.channel.id,
			attachments: JSON.stringify(msgAttachment),
		})).then((result) => {
			//console.log('sendConfirmation: ', result.data); //#DEBUG CODE: UNCOMMENT FOR DEBUGGING PURPOSES ONLY
		}).catch((err) => {
			//console.log('sendConfirmation error: ', err); //#DEBUG CODE: UNCOMMENT FOR DEBUGGING PURPOSES ONLY
			//console.error(err); //#DEBUG CODE: UNCOMMENT FOR DEBUGGING PURPOSES ONLY
		});
	} else {
		console.log("WORKNIGAJDSKLJDLKS")
		axios.post('https://slack.com/api/chat.postEphemeral', qs.stringify({
			token: config('OAUTH_TOKEN'),
			user: payload.user.id,
			channel: payload.channel.id,
			attachments: JSON.stringify([{
				title: "Details sent! Please check your DM's with the bot"
			}]),
		})).then((result) => {
			//console.log('sendConfirmation: ', result.data); //#DEBUG CODE: UNCOMMENT FOR DEBUGGING PURPOSES ONLY
		}).catch((err) => {
			//console.log('sendConfirmation error: ', err); //#DEBUG CODE: UNCOMMENT FOR DEBUGGING PURPOSES ONLY
			//console.error(err); //#DEBUG CODE: UNCOMMENT FOR DEBUGGING PURPOSES ONLY
		});

		axios.post('https://slack.com/api/im.list', qs.stringify({
			token: config('POST_BOT_TOKEN'),

		})).then(function (resp){
			//console.log(resp.data); //#DEBUG CODE: UNCOMMENT FOR DEBUGGING PURPOSES ONLY
			for(var t = 0; t < resp.data.ims.length; t++){
//				console.log(t); //#DEBUG CODE: UNCOMMENT FOR DEBUGGING PURPOSES ONLY
//				console.log(resp.data.ims[t].id); //#DEBUG CODE: UNCOMMENT FOR DEBUGGING PURPOSES ONLY
				if(targetDM==resp.data.ims[t].user){
					
					var finalUser = resp.data.ims[t].id;
					var finalUserId = resp.data.ims[t].user;
					
					axios.post('https://slack.com/api/chat.postMessage', qs.stringify({
						token: config('POST_BOT_TOKEN'),
						channel: finalUser,
						user: finalUserId,
						as_user: true,
						attachments: JSON.stringify(msgAttachment),
					})).then((result) => {
						//console.log('sendConfirmation: ', result.data); //#DEBUG CODE: UNCOMMENT FOR DEBUGGING PURPOSES ONLY
					}).catch((err) => {
						//console.log('sendConfirmation error: ', err); //#DEBUG CODE: UNCOMMENT FOR DEBUGGING PURPOSES ONLY
						//console.error(err); //#DEBUG CODE: UNCOMMENT FOR DEBUGGING PURPOSES ONLY
					});
				}
			}
		}).catch(function (err){
			//console.log(err); //#DEBUG CODE: UNCOMMENT FOR DEBUGGING PURPOSES ONLY
		});
	}
	//
	//        const msgDefaults = {
	//            response_type: respType,
	//            username: 'TaskAsk',
	//        };
	//
	//        var msg =_.defaults(
	//            {
	//                channel: channelName,
	//                attachments: msgAttachment
	//            }, msgDefaults);
	//
	//        res.set('content-type', 'application/json');
	//        res.status(200).json(msg);
	//        return;
    }

module.exports = { pattern: /details/ig, handler: handler };