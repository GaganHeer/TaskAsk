
'use strict'

const _ = require('lodash')
const config = require('../config')
const util = require('util')
const pg = require('pg')

var dbURL = process.env.ELEPHANTSQL_URL || "postgres://jxdszhdu:HhgxHHy4W-JTlNcQsOi9TWUzEJA0kcod@elmer.db.elephantsql.com:5432/jxdszhdu";

const msgDefaults = {
  response_type: 'in_channel',
  username: 'MrBoneyPantsGuy',
  icon_emoji: config('ICON_EMOJI')
}

const handler = (payload, res) => {
	
//	console.log("*****************");
//	console.log("USER: " + payload.user_id);
//	console.log("*****************");

	let attachments2 = [
		{
			title: "Bones here!",
		},
		{
			pretext: "Current Pending Requests sent by your peers:"
		},
		{
			title: "PENDING TASKS",
			color: "#ffcc00",
			callback_id: "ask_buttons",
			actions: [
				{
					name: "pend",
					text: "Expand",
					type: "button"
				}
			]
		},
		{
			title: "ACCEPTED TASKS",
			color: "#33cc33",
			callback_id: "ask_buttons",
			actions: [
				{
					name: "acc",
					text: "Expand",
					type: "button"
				}
			]
		},
		{
			title: "REJECTED TASKS",
			color: "#ff0000",
			callback_id: "ask_buttons",
			actions: [
				{
					name: "rej",
					text: "Expand",
					type: "button"
				}
			]
		},
		{
			title: "FINISHED TASKS",
			color: "#33ccff",
			callback_id: "ask_buttons",
			actions: [
				{
					name: "done",
					text: "Expand",
					type: "button"
				}
			]
		},
		{
			pretext: "Current Pending Requests that you have made:"
		},
		{
			title: "PENDING TASKS",
			color: "#ffcc00",
			callback_id: "ask_buttons",
			actions: [
				{
					name: "sendPend",
					text: "Expand",
					type: "button"
				}
			]
		},
		{
			title: "ACCEPTED TASKS",
			color: "#33cc33",
			callback_id: "ask_buttons",
			actions: [
				{
					name: "sendAcc",
					text: "Expand",
					type: "button"
				}
			]
		},
		{
			title: "REJECTED TASKS",
			color: "#ff0000",
			callback_id: "ask_buttons",
			actions: [
				{
					name: "sendRej",
					text: "Expand",
					type: "button"
				}
			]
		},
		{
			title: "FINISHED TASKS",
			color: "#33ccff",
			callback_id: "ask_buttons",
			actions: [
				{
					name: "sendDone",
					text: "Expand",
					type: "button"
				}
			]
		},
		{
			text: "Use /progress [id] for more information and options"
		}
	]
	
	//		console.log("ATTACHMENTS: " + attachments2);
	
	var msg = _.defaults({
		channel: payload.channel_name,
		attachments: attachments2
	}, msgDefaults)
	
	res.set('content-type', 'application/json')
	res.status(200).json(msg)
	return
}

module.exports = { pattern: /summary/ig, handler: handler }
