
'use strict'

const _ = require('lodash');
const config = require('../config');
const util = require('util');
const pg = require('pg');
const qs = require('querystring');
const axios = require('axios');

const handler = (payload, res) => {

	let attachments2 = [
		{
			pretext: "*RECEIVED REQUESTS*",
            mrkdwn: true
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
			],
            mrkdwn_in: [
                "pretext"
            ],
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
			pretext: "*SENT REQUESTS*"
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
			text: "Use /details for more information and options"
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
	return
}

module.exports = { pattern: /summary/ig, handler: handler }
