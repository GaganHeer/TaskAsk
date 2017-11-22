'use strict'

const _ = require('lodash')
const config = require('../config')
const util = require('util')
const moment = require('moment')
const pg = require('pg')
const qs = require('querystring')
const axios = require('axios')
const REJECT_STATUS = "REJECTED"
const DONE_STATUS = "DONE"
const PURPLE = "#755990"
const RED = "ff0000"


var dbURL = process.env.ELEPHANTSQL_URL

const handler = (payload, res) => {
        
    
    var desc = payload.submission.Question;
    var receiver = "<@" + payload.submission.receiver + ">";
    var sender = "<@" + payload.user.id + ">";
    var sid = "";
    var buttons = "";
    var taskNumber = payload.submission.ID;
    var clarID = "<@" + payload.user.id + ">";

    
    
       
        
        pg.connect(dbURL, function(err, client, done) {
        done();
             if(err) {
            sendMessage(true, "*** ERROR ***", err, RED);
        }
            
            client.query("SELECT * FROM ASK_TABLE WHERE SERIAL_ID = $1", [taskNumber], function(err, result) {
                done();
                if(err) {
                    test(true, "*** ERROR ***", err, RED);
                }

                var task = result.rows;
                if(task[0].status == REJECT_STATUS){
                var invalidClarify = "Rejected Task cannot be clarified";
                test(true, invalidClarify, RED);
                }
                else if(task[0].status == DONE_STATUS){
                var invalidClarify = "Finished Task cannot be clarified";
                test(true, invalidClarify, RED);
                }
          
    
    
   
        else {
            res.send('');
            client.query("INSERT INTO CLARIFY_TABLE (SERIAL_ID, CLAR_QUEST) VALUES ($1, $2)", [taskNumber, desc], function(err, inResult) {
                client.query("SELECT * FROM ASK_TABLE WHERE SERIAL_ID = $1", [taskNumber], function(err, result){
                    done();
				    if(err) {
                    sendMessage(true, "*** ERROR ***", err, RED);
                    }
                    //console.log(result);
                    var outMsg = "";
                    var task = result.rows;
                    outMsg =  "Hey "+task[0].sender_id+"," +clarID+"  "+"needs clarification on TASK - "+" "+ task[0].req_desc+" \n QUESTION: "+ desc;
                    test(false, outMsg, PURPLE);

                })
				
			});
            
        }
    })
 });
                                                                          
                                                                        
        
    function test(isError, msg, color){
        if(isError){
            axios.post('https://slack.com/api/chat.postEphemeral', qs.stringify({
                token: config('OAUTH_TOKEN'),
                user: payload.user.id,
                channel: payload.channel.id,
                attachments: JSON.stringify([{
                    color: color,
                    text: msg,
                    fallback: "Something went wrong :/",
                    callback_id: "askDialogHandler",
                }]),
            })).then((result) => {
                console.log('sendConfirmation: ', result.data);
            }).catch((err) => {
                console.log('sendConfirmation error: ', err);
                console.error(err);
            });
        } else {
            axios.post('https://slack.com/api/chat.postMessage', qs.stringify({
                token: config('OAUTH_TOKEN'),
                channel: payload.channel.id,
                attachments: JSON.stringify([{
                    color: color,
                    text: msg,
                    fallback: "Something went wrong :/",
                    callback_id: "askDialogHandler",
                }]),
            })).then((result) => {
                console.log('sendConfirmation: ', result.data);
            }).catch((err) => {
                console.log('sendConfirmation error: ', err);
                console.error(err);
            });
        }
    }
}
module.exports = { pattern: /clarifyDialogHandler/ig, handler: handler }