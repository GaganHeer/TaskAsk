
'use strict'

const _ = require('lodash')
const config = require('../config')
const util = require('util')
const pg = require('pg')

var dbURL = process.env.ELEPHANTSQL_URL || "postgres://jxdszhdu:HhgxHHy4W-JTlNcQsOi9TWUzEJA0kcod@elmer.db.elephantsql.com:5432/jxdszhdu";

var acceptingUserID = ""

const msgDefaults = {
  response_type: 'in_channel',
  username: 'MrBoneyPantsGuy',
  //icon_emoji: config('ICON_EMOJI')
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
        
        acceptingUserID = "<@" + payload.user_id + ">";
        var acceptID = parseInt(payload.text);
        
        client.query("SELECT * FROM ASK_TABLE WHERE SERIAL_ID = $1", [acceptID], function(error, response){
            done();
            if(error){
                console.log(error);
            }
            var findRecieverID = response.rows;
            if(findRecieverID[0].receiver_id != acceptingUserID){
                
                var invalidAcceptMsg = "You can't accept a task that isn't assigned to you! Reciever: " + findRecieverID[0].receiver_id + " Accepter: " + acceptingUserID;
                
                let attachments3 = [
                    {
                        title: attachments[0].title
                    },
                    {
                        title: "Invalid Accept:",
                        text: invalidAcceptMsg
                    }
		        ]
                var noMatch =_.defaults({
                channel: payload.channel_name,
                attachments: attachments3
	  	        }, msgDefaults)
                
                res.set('content-type', 'application/json')
		  		res.status(200).json(noMatch)	
		  		return
                
            } else {
                client.query("UPDATE ASK_TABLE SET STATUS = $1 WHERE SERIAL_ID = $2", ["ACCEPTED", acceptID], function(err, result) {
                    client.query("SELECT * FROM ASK_TABlE WHERE SERIAL_ID = $1", [acceptID], function(errSend, resultSend){
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

                        var temp = send(sendResp);	

                        var z = util.inspect(temp, {showHidden: false, depth: null});


                        console.log("TEMP: " + z);

                        res.set('content-type', 'application/json')
                        res.status(200).json(temp)	
                        return
			         });
		        });
            }
        });
		
	});
	


	function send(sendData) {
		//var unpacked = util.inspect(data, {showHidden: false, depth: null});
		var unpackedSend = util.inspect(sendData, {showHidden: false, depth: null});
//		console.log("DATA: " + x);
		
		//var build = ""; 
        var buildSend = "Hey " + sendData[0].sender_id + "! " + sendData[0].receiver_id + " has accepted task#" + sendData[0].serial_id + " '" + sendData[0].req_desc + "'";

		/*for (var i = 0; i < sendData.length; i++) {
			buildSend = buildSend + "You have asked: " + sendData[i].receiver_id + " to: " + sendData[i].req_desc + " on " + sendData[i].req_date + " (ID: " + sendData[i].serial_id + " \n";
		}
		*/
		
		let attachments2 = [
			{
				title: attachments[0].title
			},
			{
				title: "Task Accepted:",
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

module.exports = { pattern: /accept/ig, handler: handler }
