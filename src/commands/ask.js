
'use strict'

const _ = require('lodash')
const config = require('../config')
const util = require('util')
const moment = require('moment')
const pg = require('pg')

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
	
var dbURL = process.env.ELEPHANTSQL_URL || "postgres://jxdszhdu:HhgxHHy4W-JTlNcQsOi9TWUzEJA0kcod@elmer.db.elephantsql.com:5432/jxdszhdu";

const msgDefaults = {
  response_type: 'in_channel',
  username: 'MrBoneyPantsGuy',
  icon_emoji: config('ICON_EMOJI')
}


let attachments = [
	{
		title: 'Bones here!'
	}
]

const handler = (payload, res) => {

	var params = payload.text.split(" ");
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
		}
		var receiverSplit = params[0].split("|");
		var receiver = "<@" + receiverSplit[0] + ">";
		client.query("INSERT INTO ASK_TABLE (RECEIVER_ID, SENDER_ID, REQ_DESC) VALUES ($1, $2, $3)", [receiver, "<@" + payload.user_id + ">", request], function(err, result) {
			done();
			if(err) {
				console.log(err);
			}
			console.log(result);
		});
	});

	
	
	let attachments2 = [
		{
			title: attachments[0].title,
			text: "Hey " + params[0] + "! <@" + payload.user_id + "> " + " asked you to: \n" + request
		}
	]
	
	//
//let attachments = [
//  {
//    title: 'Starbot will help you find the hippest repos on GitHub',
//    color: '#2FA44F',
//    text: '`/starbot repos` returns hip repos \n`/starbot javascript` returns hip JavaScript repos',
//    mrkdwn_in: ['text']
//  },
//  {
//    title: 'Configuring Starbot',
//    color: '#E3E4E6',
//    text: '`/starbot help` ... you\'re lookin at it! \n',
//    mrkdwn_in: ['text']
//  }
//]

//	var x = util.inspect(payload, {showHidden: false, depth: null});
//  let attachments2 = [
//	  {
//		  title: attachments[0].title,
//		  text: x
//	  }
//  ]

	
//	let attachments2 = [
//		{
//			text: "<@" + payload.user_id + "|" + payload.user_name + "> \n <@" + payload.user_id + "> \n TEST"
//		}
//	]
	
	
	
//	var time = moment().format('MMMM Do YYYY, h:mm:ss a');
//	var data = [payload.user_id, payload.user_name, request, time];
//	var out = params[0];
//	for (var i = 0; i < data.length; i++) {
//		out = out + data[0] + ",\n";
//	}
	

  let msg = _.defaults({
    channel: payload.channel_name,
    attachments: attachments2
  }, msgDefaults)
  
  res.set('content-type', 'application/json')
  res.status(200).json(msg)
  return
}

module.exports = { pattern: /ask/ig, handler: handler }
