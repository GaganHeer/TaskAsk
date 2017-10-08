
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
			var resp = "temp";
			done();
			if(err) {
				console.log(err);
			}
			console.log(result.rows.REQ_DESC);
			resp = result.rows;
			
//			console.log("****************");
//			console.log("****************");
//			console.log("****************");
//			console.log(resp);
//			console.log("****************");
//			console.log("****************");
//			console.log("****************");
			
			let attachments2 = [
				{
					title: attachments[0].title,
					text: resp.REQ_DESC
				}
			]
			
//			console.log("****************");
//			console.log("****************");
//			console.log("****************");
////			console.log(resp);
//			console.log(attachments2);
//			console.log("****************");
//			console.log("****************");
//			console.log("****************");
//			
  			var temp = send(resp);	
			
			var z = util.inspect(temp, {showHidden: false, depth: null});

			
			console.log("TEMP: " + z);
			
	  		res.set('content-type', 'application/json')
	  		res.status(200).json(temp)
	  		return
		});
		
	});
	


	function send(data) {
		var x = util.inspect(data, {showHidden: false, depth: null});
		console.log("DATA: " + x);
		
		let attachments2 = [
			{
				title: attachments[0].title,
				text: x
			}
		]
		
		console.log("ATTACHMENTS: " + attachments2);
		
		var msg = _.defaults({
	  	  channel: payload.channel_name,
	  	  attachments: attachments2
	  	}, msgDefaults)
	  	
		var y = util.inspect(msg, {showHidden: false, depth: null});
		
		console.log("MESSAGE: " + y)
		
		return(msg);
	}
}

module.exports = { pattern: /summary/ig, handler: handler }
