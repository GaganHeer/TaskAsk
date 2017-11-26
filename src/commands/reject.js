'use strict'

const _ = require('lodash')
const config = require('../config')
const util = require('util')
const pg = require('pg')
const axios = require('axios')
const qs = require('querystring');
const REJECTED_STATUS = "REJECTED"
const PENDING_STATUS = "PENDING"
const RED = "ff0000"
const ONLY_USER = 'ephemeral'


const dbConfig = config('DB_CONFIG');
var pool = new pg.Pool(dbConfig);
var onlyNumbers = /^[0-9]*$/

const msgDefaults = {
  response_type: 'in_channel',
  username: 'MrBoneyPantsGuy',
  icon_emoji: config('ICON_EMOJI')
}

const handler = (payload, res) => {
	
	var channelName;
    var rejectingUserID;
	var taskNumber;
	var isButton = false;
	
	if(payload.hasOwnProperty('original_message')) {
		//console.log("BUTTON PRESSED TIME TO TRIM"); //#DEBUG CODE: UNCOMMENT FOR DEBUGGING PURPOSES ONLY
		
		taskNumber = parseInt(payload.original_message.text);
		rejectingUserID = "<@" + payload.user.id + ">";
		channelName = payload.channel.name;
		isButton = true;
	} else if(!onlyNumbers.test(payload.text)){
        var wrongParamMsg = "Please enter the correct format /accept [ID#] \n ex) /accept 24"
        var wrongParamTitle = "*** ERROR ***"
        createSendMsg(wrongParamTitle, wrongParamMsg, RED, ONLY_USER);
	} else {
		taskNumber = parseInt(payload.text);
		rejectingUserID = "<@" + payload.user_id + ">";
		channelName = payload.channel_name;
	}

	pool.connect().then(client => {
		client.query("SELECT * FROM ASK_TABLE WHERE SERIAL_ID = $1", [taskNumber])
			.then(result => {
                var taskNumberRow = selectResult.rows;
                if(taskNumberRow.length == 0){
                    var falseIDMsg = taskNumber + " is not a valid ID#";
                    var falseIDTitle = "Invalid ID#";
                    createSendMsg(falseIDTitle, falseIDMsg, RED);

                } else if (taskNumberRow[0].status !== PENDING_STATUS) {
                    var notPendingMsg = rejectingUserID + " that task can't be rejected! it is currently [" + taskNumberRow[0].status + "]";
                    var notPendingTitle = "Status not Pending";
                    createSendMsg(notPendingTitle, notPendingMsg, RED);

                } else if(taskNumberRow[0].receiver_id != rejectingUserID){
                    var invalidRejectMsg = rejectingUserID + " that task is assigned to " + taskNumberRow[0].receiver_id + " not you!";
                    var invalidRejectTitle = "Invalid Reject";
                    createSendMsg(invalidRejectTitle, invalidRejectMsg, RED);

                } else {
                    client.query("UPDATE ASK_TABLE SET STATUS = $1 WHERE SERIAL_ID = $2 RETURNING *", [REJECTED_STATUS, taskNumber])
                        .then(result => {
                            client.release();
                            taskNumberRow = updateResult.rows;
                            createSendMsg("Rejected", "", RED);

                            //Dm

                            var finalUser;
                            var finalUserId;
                            var targetDM = taskNumberRow[0].sender_id.slice(2,11);

                            axios.post('https://slack.com/api/im.list', qs.stringify({
                                token: config('POST_BOT_TOKEN'),

                            })).then(function (resp){
                                for(var t = 0; t < resp.data.ims.length; t++){
                                    //console.log(resp.data.ims[t].id); //#DEBUG CODE: UNCOMMENT FOR DEBUGGING PURPOSES ONLY
                                    if(targetDM==resp.data.ims[t].user){
                                        finalUser = resp.data.ims[t].id;
                                        finalUserId = resp.data.ims[t].user;
                                        axios.post('https://slack.com/api/chat.postMessage', qs.stringify({
                                            token: config('POST_BOT_TOKEN'),
                                            channel: finalUser,
                                            user:finalUserId,
                                            as_user:true,
                                            text: "Rejected by: "+taskNumberRow[0].receiver_id,

                                        })).then((result) => {
                                            //console.log('sendConfirmation: ', result.data); //#DEBUG CODE: UNCOMMENT FOR DEBUGGING PURPOSES ONLY
                                        }).catch((err) => {
                                            //console.log('sendConfirmation error: ', err); //#DEBUG CODE: UNCOMMENT FOR DEBUGGING PURPOSES ONLY
                                        });
                                    }
                                }
                            }).catch(function (err){
                                //console.log(err); //#DEBUG CODE: UNCOMMENT FOR DEBUGGING PURPOSES ONLY
                            });

                            //End of DM
                        
                    }).catch((err) => {
                        client.release();
                        //console.log('sendConfirmation error: ', err); //#DEBUG CODE: UNCOMMENT FOR DEBUGGING PURPOSES ONLY
                    });
                }
		    }).catch((err) => {
                client.release();
                //console.log('sendConfirmation error: ', err); //#DEBUG CODE: UNCOMMENT FOR DEBUGGING PURPOSES ONLY
            });

    }).catch((err) => {
        //console.log('sendConfirmation error: ', err); //#DEBUG CODE: UNCOMMENT FOR DEBUGGING PURPOSES ONLY
    });

    
    
    function createSendMsg(attachTitle, attachMsg, attachColor, respType=channelName){
        var msgAttachment;
		
        if(isButton) {
			var ogMsg = payload.original_message.attachments;
			delete ogMsg[0].actions;
			msgAttachment = [ogMsg[0], {
        	    title: attachTitle,
        	    text: attachMsg,
        	    color: attachColor
        	}]
		} else {
        	msgAttachment = [{
        	    title: attachTitle,
        	    text: attachMsg,
        	    color: attachColor
        	}]
		}
        
        var msg =_.defaults(
        {
            channel: respType,
            attachments: msgAttachment
        }, msgDefaults)

        res.set('content-type', 'application/json');
        res.status(200).json(msg);	
        return;
    }
}


module.exports = { pattern: /reject/ig, handler: handler }
