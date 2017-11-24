
'use strict'

const _ = require('lodash')
const config = require('../config')
const util = require('util')
const pg = require('pg')
const PENDING_STATUS = "PENDING"
const RED = "ff0000"
const GREEN = "33cc33"
const IN_CHANNEL = 'in_channel';
const ONLY_USER = 'ephemeral'

const qs = require('querystring');
const axios = require('axios');

var dbURL = process.env.ELEPHANTSQL_URL;
var onlyNumbers = /^[0-9]*$/
var correctIDStructure = /^<@.*[|].*>$/

const handler = (payload, res) => {

    var finalUser;
    var finalUserId;

    var payloadParams = payload.text.split(" ");
    var channelName = payload.channel_name;
    var forwardingUserID = "<@" + payload.user_id + ">";   
    
    if(payloadParams.length != 2 || !correctIDStructure.test(payloadParams[0]) || !onlyNumbers.test(payloadParams[1])) {
        var wrongParamsMsg = "Please enter the correct format /forward [@User] [ID#] \n ex) /forward @David 24";
        var wrongParamsTitle = "Incorrect Parameters";
		createSendMsg(wrongParamsTitle, wrongParamsMsg, RED, ONLY_USER);
        
	} else {
        var taskNumber = payloadParams[1];
        var receiverSplit = payloadParams[0].split("|");
        var receivingUserID = receiverSplit[0] + ">";
    
        pg.connect(dbURL, function(err, client, done) {		
        if(err) {
            console.log(err);
        }
            client.query("SELECT * FROM ASK_TABLE WHERE SERIAL_ID = $1", [taskNumber], function(err, selectResult){
                done();
                if(err){
                    console.log(err);
                }
                var taskNumberRow = selectResult.rows;
                
                if(taskNumberRow.length == 0){
                    var falseIDMsg = taskNumber + " is not a valid ID#";
                    var falseIDTitle = "Invalid ID#";
                    createSendMsg(falseIDTitle, falseIDMsg, RED, ONLY_USER);
                
                } else if(!(taskNumberRow[0].receiver_id === forwardingUserID || taskNumberRow[0].sender_id === forwardingUserID)){
                    var wrongUserMsg = "You can't forward this request only " + taskNumberRow[0].receiver_id + " and " + taskNumberRow[0].sender_id + " are allowed to";
                    var wrongUserTitle = "User not associated with task";
                    createSendMsg(wrongUserTitle, wrongUserMsg, RED, ONLY_USER);
                
                } else if (taskNumberRow[0].status !== PENDING_STATUS) {
                    var notPendingMsg = forwardingUserID + " that task can't be forwarded! it is currently [" + taskNumberRow[0].status + "]";
                    var notPendingTitle = "Status not Pending";
                    createSendMsg(notPendingTitle, notPendingMsg, RED, ONLY_USER);
                
                } else {
                    client.query("UPDATE ASK_TABLE SET RECEIVER_ID = $1 WHERE SERIAL_ID = $2", [receivingUserID, taskNumber], function(err, updateResult) {
                        client.query("SELECT * FROM ASK_TABlE WHERE SERIAL_ID = $1", [taskNumber], function(err, selectResult){
                            done();
                            if(err) {
                                console.log(err);
                            }
                            if(err) {
                                console.log(err);
                            }
                            taskNumberRow = selectResult.rows;

                            var targetDM = taskNumberRow[0].receiver_id.slice(2,11);
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
                                            text: 'Forwarded by <@'+payload.user_id+">",
                                            attachments: JSON.stringify([
                                              {
                                                title: "Forward",
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


                            var forwardMsg = forwardingUserID + " you have forwarded ID#" + taskNumber + " '" + taskNumberRow[0].req_desc + "' to " + receivingUserID;
                            var forwardTitle = "Task Forwarded";
                            createSendMsg(forwardTitle, forwardMsg, GREEN, IN_CHANNEL);
                        });
                    });
                }
            });
        });


    }
    
    function createSendMsg(attachTitle, attachMsg, attachColor, respType){
        
        let msgAttachment = [{
            title: attachTitle,
            text: attachMsg,
            color: attachColor
        }]
        
        const msgDefaults = {
          response_type: respType,
          username: 'TaskAsk',
        }
        
        var msg =_.defaults(
        {
            channel: channelName,
            attachments: msgAttachment
        }, msgDefaults)

        res.set('content-type', 'application/json');
        res.status(200).json(msg);	
        return;
    }
}

module.exports = { pattern: /forward/ig, handler: handler }
