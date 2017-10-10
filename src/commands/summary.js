
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

let attachments = [
	{
		title: 'Bones here!'
	}
]

const handler = (payload, res) => {
	pg.connect(dbURL, function(err, client, done) {		
		if(err) {
			console.log(err);
		}
		client.query("SELECT * FROM ASK_TABLE WHERE RECEIVER_ID = $1", ["<@" + payload.user_id + ">"], function(err, result) {
			client.query("SELECT * FROM ASK_TABlE WHERE SENDER_ID = $1", ["<@" + payload.user_id + ">"], function(errSend, resultSend){
				var resp = "temp";
				var sendResp = "temp";
				done();
				if(err) {
					console.log(err);
				}
				if(errSend) {
					console.log(errSend);
				}
//				console.log(result.rows.REQ_DESC);
				resp = result.rows;
				sendResp = resultSend.rows;
				
  				var temp = send(resp, sendResp);	
				
				var z = util.inspect(temp, {showHidden: false, depth: null});
	
				
				console.log("TEMP: " + z);
				
		  		res.set('content-type', 'application/json')
		  		res.status(200).json(temp)	
		  		return
			});
		});
		
	});
	


	function send(data, sendData) {
		var unpacked = util.inspect(data, {showHidden: false, depth: null});
		var unpackedSend = util.inspect(sendData, {showHidden: false, depth: null});
//		console.log("DATA: " + x);
		
		var build = "";
		var buildSend = "";
		for (var i = 0; i < data.length; i++) {
			build = build + data[i].sender_id + " asked you to: " + data[i].req_desc + " on " + data[i].req_date + " (ID: " + data[i].serial_id + ") \n";
		}
		for (var i = 0; i < sendData.length; i++) {
			buildSend = buildSend + "You have asked: " + sendData[i].receiver_id + " to: " + sendData[i].req_desc + " on " + sendData[i].req_date + " (ID: " + sendData[i].serial_id + " \n";
		}
		
		
		let attachments2 = [
			{
				title: attachments[0].title
			},
			{
				title: "Current Pending Requests sent by your peers:",
				text: build
			},
			{
				title: "Current Pending Requests that you have made:",
				text: buildSend
			}
		]
		
//		console.log("ATTACHMENTS: " + attachments2);
		
		var msg = _.defaults({
	  	  channel: payload.channel_name,
	  	  attachments: attachments2
	  	}, msgDefaults)
	  	
//		var y = util.inspect(msg, {showHidden: false, depth: null});
		
//		console.log("MESSAGE: " + y)
		
		return(msg);
	}
}

module.exports = { pattern: /summary/ig, handler: handler }
