
'use strict'

const _ = require('lodash')
const config = require('../config')
const util = require('util')
const pg = require('pg')
const qs = require('querystring');
const axios = require('axios');

var dbURL = process.env.ELEPHANTSQL_URL || "postgres://jxdszhdu:HhgxHHy4W-JTlNcQsOi9TWUzEJA0kcod@elmer.db.elephantsql.com:5432/jxdszhdu";

const msgDefaults = {
  response_type: 'in_channel',
  username: 'MrBoneyPantsGuy',
  icon_emoji: config('ICON_EMOJI')
}

const handler = (payload, res) => {
	
//	console.log("*****************");
//	console.log("USER: " + payload.user_id);  null})); //#DEBUG CODE: UNCOMMENT FOR DEBUGGING PURPOSES ONLY
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
	
	//		console.log("ATTACHMENTS: " + attachments2);  null})); //#DEBUG CODE: UNCOMMENT FOR DEBUGGING PURPOSES ONLY
	

    //Dm

    var finalUser;
    var finalUserId;
    var targetDM = payload.user_id;


    axios.post('https://slack.com/api/im.list', qs.stringify({
        token: config('POST_BOT_TOKEN'),

    })).then(function (resp){
        console.log(resp.data);
        for(let t = 0; t < resp.data.ims.length; t++){
            console.log(t);
            console.log(resp.data.ims[t].id);
            if(targetDM == resp.data.ims[t].user){
                finalUser = resp.data.ims[t].id;
                finalUserId = resp.data.ims[t].user;
                axios.post('https://slack.com/api/chat.postMessage', qs.stringify({
                    token: config('POST_BOT_TOKEN'),
                    channel: finalUser,
                    user:finalUserId,
                    as_user:true,
                    attachments: JSON.stringify(attachments2),

                })).then((resulttt) => {
                    console.log('sendConfirmation: ', resulttt.data);
                    res.send('');
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

	// var msg = _.defaults({
	// 	channel: payload.channel_name,
	// }, msgDefaults)
	
	// res.set('content-type', 'application/json')
	// res.status(200).json('')
	return
}

module.exports = { pattern: /summary/ig, handler: handler }
