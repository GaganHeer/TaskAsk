
'use strict';

const _ = require('lodash');
const config = require('../config');
const util = require('util');
const moment = require('moment');
const pg = require('pg');
const JiraApi = require('jira').JiraApi;
	
var dbURL = process.env.ELEPHANTSQL_URL;
const dbConfig = config('DB_CONFIG');
var pool = new pg.Pool(dbConfig);
const jira = new JiraApi('https', config('JIRA_HOST'), config('JIRA_PORT'), config('JIRA_USER'), config('JIRA_PWD'), 'latest');

const handler = (payload, res) => {
	const ACCEPTED_STATUS = "ACCEPTED";
	const REJECTED_STATUS = "REJECTED";
	const PENDING_STATUS = "PENDING";
	const DONE_STATUS = "DONE";
	let ogMsg = payload.original_message.attachments;
	
	//#####################################################
	//#####################################################
	//############## --- MAIN HANDLER --- #################
	//#####################################################
	//#####################################################
	if(payload.actions[0].name === "accept") {
//		console.log("ACCEPT COMMAND"); //#DEBUG CODE: UNCOMMENT FOR DEBUGGING PURPOSES ONLY
		acceptCMD(payload);			
	}
	
	if(payload.actions[0].name === "reject") {
//		console.log("REJECT COMMAND"); //#DEBUG CODE: UNCOMMENT FOR DEBUGGING PURPOSES ONLY
		rejectCMD(payload);
	}
	
	if(payload.actions[0].name === 'doneBut') {
//		console.log("DONE COMMAND"); //#DEBUG CODE: UNCOMMENT FOR DEBUGGING PURPOSES ONLY
		doneCMD(payload);
	}
	
	var summaryActions = ["pend", "rej", "acc", "done", "sendPend", "sendRej", "sendAcc", "sendDone"];
	
	if(summaryActions.indexOf(payload.actions[0].name) >= 0) {
//		console.log("SUMMARY COMMAND"); //#DEBUG CODE: UNCOMMENT FOR DEBUGGING PURPOSES ONLY
		summaryCMD(payload);
	}
	
	//#####################################################
	//#####################################################
	//############# --- SEND TO SLACK --- #################
	//#####################################################
	//#####################################################
	function returnToIndex(attach, payload) {
		const msgDefaults = {
		  response_type: 'in_channel',
		  username: 'MrBoneyPantsGuy',
		  icon_emoji: config('ICON_EMOJI')
		};
				
		let msg = _.defaults({
			channel: payload.channel_name,
			attachments: attach
		}, msgDefaults);
		
		res.set('content-type', 'application/json');
		res.status(200).json(msg);
		return;
	}

	//#####################################################
	//#####################################################
	//############ --- SUMMARY HANDLER --- ################
	//#####################################################
	//#####################################################
	function summaryCMD(payload) {
		pool.connect().then(client => {
			return client.query("SELECT * FROM ASK_TABLE WHERE RECEIVER_ID = $1 ORDER BY SERIAL_ID DESC", ["<@" + payload.user.id + ">"])
				.then(result => {
				pool.connect().then(client2 => {
					return client2.query("SELECT * FROM ASK_TABlE WHERE SENDER_ID = $1 ORDER BY SERIAL_ID DESC", ["<@" + payload.user.id + ">"])
						.then(resultSend => {
						client.release();
						client2.release();
						
						var resp = "temp";
						var sendResp = "temp";
						
						resp = result.rows;
						sendResp = resultSend.rows;

						send(resp, sendResp);
					}).catch(e => {
						client.release();
						client2.release();
						sendError(e.stack);
					})
				}).catch(er => {
					client.release();
					client2.release();
					sendError(er.stack);
				})
			}).catch(err => {
				client.release();
				sendError(err.stack);
			})
		}).catch(error => {
			client.release();
			sendError(error.stack);
		});
		
		function sendError(errMsg) {
			let attachments = [ogMsg[0],
							   {
								   title: "***ERROR***",
								   color: "#ff0000",
								   text: errMsg
							   }
							  ];
			returnToIndex(attachments, payload, false);
		}
		
		function send(data, sendData) {
//			console.log("MESSAGE: " + util.inspect(payload, {showHidden: false, depth: null})); //#DEBUG CODE: UNCOMMENT FOR DEBUGGING PURPOSES ONLY

			var pend = "";
			var sendPend = "";
			var rej = "";
			var sendRej = "";
			var acc = "";
			var sendAcc = "";
			var done = "";
			var sendDone = "";

			for (var i = 0; i < data.length; i++) {
				var stat = data[i].status;
				if(stat === "PENDING") {
					pend = pend + "Task: " + data[i].serial_id + " --> " + data[i].title + "\n";	
				} else if (stat === "REJECTED") {
					rej = rej + "Task: " + data[i].serial_id + " --> " + data[i].title + "\n";	
				} else if (stat === "ACCEPTED") {
					acc = acc + "Task: " + data[i].serial_id + " --> " + data[i].title + "\n";	
				} else if (stat === "DONE") {
					done = done + "Task: " + data[i].serial_id + " --> " + data[i].title + "\n";			
				} else {
//					console.log("ERR AT: " + data[i]); //#DEBUG CODE: UNCOMMENT FOR DEBUGGING PURPOSES ONLY
				}
			}
			for (var i = 0; i < sendData.length; i++) {			
				var stat = sendData[i].status;
				if (stat === "PENDING") {
					sendPend = sendPend + "Task: " + sendData[i].serial_id + " --> " +  sendData[i].title + "\n";			
				} else if (stat === "REJECTED") {
					sendRej = sendRej + "Task: " + sendData[i].serial_id + " --> " +  sendData[i].title + "\n";			
				} else if (stat === "ACCEPTED") {
					sendAcc = sendAcc + "Task: " + sendData[i].serial_id + " --> " +  sendData[i].title + "\n";			
				} else if (stat === "DONE") {
					sendDone = sendDone + "Task: " + sendData[i].serial_id + " --> " +  sendData[i].title + "\n";		
				} else {
//					console.log("ERR AT: " + sendData[i]); //#DEBUG CODE: UNCOMMENT FOR DEBUGGING PURPOSES ONLY
				}
			}

			var errMsg = "There isn't anything here!";
			var items = [pend, rej, acc, done, sendPend, sendRej, sendAcc, sendDone];
			if(pend === "") {pend = errMsg}
			if(rej === "") {rej = errMsg}
			if(acc === "") {acc = errMsg}
			if(done === "") {done = errMsg}
			if(sendPend === "") {sendPend = errMsg}
			if(sendRej === "") {sendRej = errMsg}
			if(sendAcc === "") {sendAcc = errMsg}
			if(sendDone === "") {sendDone = errMsg}


			for (var i = 0; i < ogMsg.length; i++) {			
//				console.log("YEAH"); //#DEBUG CODE: UNCOMMENT FOR DEBUGGING PURPOSES ONLY
					if(ogMsg[i].hasOwnProperty('callback_id')) {
//					console.log("MATCH AT: " + ogMsg[i]); //#DEBUG CODE: UNCOMMENT FOR DEBUGGING PURPOSES ONLY
					if(payload.actions[0].name === ogMsg[i].actions[0].name) {
//						console.log("MATCH2 AT: " + ogMsg[i].actions[0].name); //#DEBUG CODE: UNCOMMENT FOR DEBUGGING PURPOSES ONLY

						var items = {
							"pend": pend,
							"rej": rej,
							"acc": acc,
							"done": done,
							"sendPend": sendPend,
							"sendRej": sendRej,
							"sendAcc": sendAcc,
							"sendDone": sendDone
						};

						ogMsg[i]["text"] = items[ogMsg[i].actions[0].name];

						delete ogMsg[i].actions;
						delete ogMsg[i].callback_id;

						returnToIndex(ogMsg, payload);
					}
				}
			}
		}
	}
	
	//#####################################################
	//#####################################################
	//############# --- ACCEPT HANDLER --- ################
	//#####################################################
	//#####################################################
	function acceptCMD(payload) {
		let cmd = require('./accept');
		cmd.handler(payload, res);
	}
	
	//#####################################################
	//#####################################################
	//############# --- REJECT HANDLER --- ################
	//#####################################################
	//#####################################################
	function rejectCMD(payload) {
		let cmd = require('./reject');
		cmd.handler(payload, res);
	}
	
	//#####################################################
	//#####################################################
	//############## --- DONE HANDLER --- #################
	//#####################################################
	//#####################################################
	function doneCMD(payload) {
		let cmd = require('./done');
		cmd.handler(payload, res);
	}
};

module.exports = { pattern: /testcmd/ig, handler: handler };
