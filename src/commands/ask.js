
'use strict'

const _ = require('lodash')
const config = require('../config')
const util = require('util')
const moment = require('moment')
const pg = require('pg')

const qs = require('querystring')
const axios = require('axios')
//var dbConfig = {
//    user: 'jxdszhdu',
//    database: 'jxdszhdu',
//    password: 'HhgxHHy4W-JTlNcQsOi9TWUzEJA0kcod',
//    host: 'stampy.db.elephantsql.com',
//    port: 5432,
//    max: 4,
//    idleTimeoutMillis: 30000
//};

//var pool = pg.Pool(dbConfig);
	
var dbURL = process.env.ELEPHANTSQL_URL;

const handler = (payload, res) => {

	console.log(payload.user_id);
	var finalUser;
	var finalUserId;

	console.log(payload.text.slice(2,11));
	var targetDM = payload.text.slice(2,11);
	
	var regMent = /^<@.*[|].*>$/;
	var params = payload.text.split(" ");
	
	if(params.length < 2 || !regMent.test(params[0])) {
		buildMessage(false, "***ERROR*** \n You must provide a mention (@user) and description \n FORMAT: /ask [@user] [Description (140 characters)]", "#ff0000", "ephemeral");
	}
	
	else {
		var request = "";
		for (var i = 1; i < params.length; i++) {
			request = request + params[i] + " ";
		}

		pg.connect(dbURL, function(err, client, done) {
			var params = payload.text.split(" ");
			var request = "";
			
			for (var i = 1; i < params.length; i++) {
				request = request + params[i] + " ";
			}
			
			if(err) {
				console.log(err);
				buildMessage(false, "***ERROR*** \n PSQL returned error: \n" + err, "#ff0000", "ephemeral");
			}
			
			var receiverSplit = params[0].split("|");
			var receiver = receiverSplit[0] + ">";
			
			client.query("INSERT INTO ASK_TABLE (RECEIVER_ID, SENDER_ID, REQ_DESC) VALUES ($1, $2, $3) RETURNING serial_id", [receiver, "<@" + payload.user_id + ">", request], function(err, result) {
				done();
				
				if(err) {
					console.log(err);
					buildMessage(false, "***ERROR*** \n PSQL returned error: \n" + err, "#ff0000", "ephemeral");
				}
				
				var sid =  result.rows[0].serial_id;
				
				buildMessage(true, "Hey " + params[0] + "! <@" + payload.user_id + "> " + " asked you to: \n" + request, "#ffcc00", "in_channel", sid);
				
			});
		});
	}
	
	
	function buildMessage(success, text, color, resp_type, sid) {
		
		const msgDefaults = {
		  response_type: resp_type,
		  username: 'MrBoneyPantsGuy',
		  icon_emoji: config('ICON_EMOJI')
		}
		
		let attachments = [
			{
				title: "Bones Here!",
				color: color,
				text: text,
			}
		]	

		if(success) {

			axios.post('https://slack.com/api/im.list', qs.stringify({
			    token: process.env.POST_BOT_TOKEN,
			    
			})).then(function (resp){
				console.log(resp.data);
				for(var t = 0; t < resp.data.ims.length; t++){
					console.log(t);
					console.log(resp.data.ims[t].id);
					if(targetDM==resp.data.ims[t].user){
						finalUser = resp.data.ims[t].id;
						finalUserId = resp.data.ims[t].user;
						axios.post('https://slack.com/api/chat.postEphemeral', qs.stringify({
						    token: process.env.POST_BOT_TOKEN,
						    channel: finalUser,
						    user:finalUserId,
						    as_user:true,
						    text: 'Request sent by <@'+payload.user_id+">",
						    attachments: JSON.stringify([
						      {
						        title: request,
						        color: 'ffcc00'
						        
						      },
						    ]),
						  })).then((result) => {
						        console.log('sendConfirmation: ', result.data);
						      }).catch((err) => {
						        console.log('sendConfirmation error: ', err);
						        console.error(err);
						    });
					}
				}
			}).catch(function (err){
				console.log(err);
			});
			
			attachments = [
				{
					title: attachments[0].title,
					color: attachments[0].color,
					text: attachments[0].text,
					callback_id: "ask_buttons",
					fallback: "Something went wrong :/",
					actions: [
					{
						name: "accept",
						text: "Accept",
						type: "button",
						value: sid,
						style: "primary",
						"confirm": {
							"title": "Are you sure?",
							"text": "You are about to accept this, are you sure?",
							"ok_text": "Yes",
							"dismiss_text": "No"
						}
					},
					{
						name: "reject", 
						text: "Reject",
						type: "button",
						value: sid,
						style: "danger",
						"confirm": {
							"title": "Are you sure?",
							"text": "You are about to accept this, are you sure?",
							"ok_text": "Yes",
							"dismiss_text": "No"
						}
					}
				]
				}
			]
		}
	  let msg = _.defaults({
		channel: payload.channel_name,
		attachments: attachments
	  }, msgDefaults)

	  res.set('content-type', 'application/json')
	  res.status(200).json(msg)
	  return
	}
}

module.exports = { pattern: /ask/ig, handler: handler }
