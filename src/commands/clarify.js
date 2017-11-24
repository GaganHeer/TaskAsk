'use strict'

const _ = require('lodash')
const config = require('../config')
const util = require('util')
const pg = require('pg')
const REJECT_STATUS = "REJECTED"
const DONE_STATUS = "DONE"
const PURPLE = "#755990"
const qs = require('querystring');
const axios = require('axios');

var dbURL = process.env.ELEPHANTSQL_URL || "postgres://jxdszhdu:HhgxHHy4W-JTlNcQsOi9TWUzEJA0kcod@elmer.db.elephantsql.com:5432/jxdszhdu";


const msgDefaults = {
    response_type: 'in_channel',
    username: 'MrBoneyPantsGuy',
    icon_emoji: config('ICON_EMOJI')
}

var outMsg="not working ";
const handler = (payload, res) => {
    
    var charCheck = /^<@.*[|].*>$/;
	var params = payload.text.split(" ");
    if(params.length < 2) {
		var invalidFormat = "You must provide a valid Task ID and a question to calrify \n FORMAT: /clarify [taskID] [Question]";
        test(invalidFormat, PURPLE);
	}
	
    else{
    
    pg.connect(dbURL, function(err, client, done) {
        done();
        
        var params = payload.text.split(" ");
        client.query("SELECT * FROM ASK_TABLE WHERE SERIAL_ID = $1", [params[0]], function(err, result) {
            var resp = "temp";
            done();
            if(err) {
                console.log(err);
            }

            var task = result.rows;
            if(task[0].status == REJECT_STATUS){
                var invalidClarify = "Rejected Task cannot be clarified";
                test(invalidClarify, PURPLE);
            }
            else if(task[0].status == DONE_STATUS){
                var invalidClarify = "Finished Task cannot be clarified";
                test(invalidClarify, PURPLE);
            }
          
    
    
   
           else{
            var params = payload.text.split(" ");
			var request = "";
			for (var i = 1; i < params.length; i++) {
				request = request + params[i] + " ";
			}

			client.query("INSERT INTO CLARIFY_TABLE (SERIAL_ID, CLAR_QUEST) VALUES ($1, $2)", [params[0], request], function(err, inResult) {
                client.query("SELECT * FROM ASK_TABLE WHERE SERIAL_ID = $1", [params[0]], function(err, result){
                    done();
				    if(err) {
					   console.log(err);
				    }
               //console.log(result);
                   var task = result.rows;

                   //Dm

                    var finalUser;
                    var finalUserId;
                    var targetDM = task[0].sender_id.slice(2,11);


                    axios.post('https://slack.com/api/im.list', qs.stringify({
                        token: config('POST_BOT_TOKEN'),

                    })).then(function (resp){
                        console.log(resp.data);
                        for(var t = 0; t < resp.data.ims.length; t++){
                            console.log(t);
                            console.log(resp.data.ims[t].id);
                            if(targetDM==resp.data.ims[t].user){
                                finalUser = resp.data.ims[t].id;
                                finalUserId = resp.data.ims[t].user;
                                axios.post('https://slack.com/api/chat.postMessage', qs.stringify({
                                    token: config('POST_BOT_TOKEN'),
                                    channel: finalUser,
                                    user:finalUserId,
                                    as_user:true,
                                    text: task[0].receiver_id+": needs clarification on TASK: "+task[0].serial_id,

                                })).then((resulttt) => {
                                    console.log('sendConfirmation: ', resulttt.data);
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

                   outMsg =  "Hey "+task[0].sender_id+","+"<@" + payload.user_id + ">"+" "+"needs clarification on TASK - "+" "+ task[0].req_desc+" \n QUESTION: "+ request;
                   test(outMsg, PURPLE);

                    


                })
				
			});
         }
    });  
                
    });

    }

    function test(msgTest, testColor) {
        
        


        let attachments2 = [
            {
                title: "Clarification needed:",
                text: msgTest,
                color: testColor
                
            }
        ];


        var msg = _.defaults({
            channel: payload.channel_name,
            attachments: attachments2
        }, msgDefaults);
        
      
         
        res.set('content-type', 'application/json')
		res.status(200).json(msg)
		return;

    }
}

module.exports = { pattern: /clarify/ig, handler: handler }
