
'use strict'

const _ = require('lodash')
const config = require('../config')
const util = require('util')
const pg = require('pg')
const qs = require('querystring')
const axios = require('axios')
const RED = "ff0000"
const REJECTED_STATUS = "REJECTED"

const dbConfig = config('DB_CONFIG');
var pool = new pg.Pool(dbConfig);

const handler = (payload, res) => {
    var sid = payload.submission.task;
    
    pool.connect().then(client => {
        client.query("UPDATE ASK_TABLE SET status = $1 WHERE SERIAL_ID = $2 RETURNING *", [REJECTED_STATUS, sid])
            .then(result => {
                client.release();
            
                var finalUser;
                var finalUserId;
                var targetDM = result.rows[0].sender_id.slice(2,11);

                axios.post('https://slack.com/api/im.list', qs.stringify({
                    token: config('POST_BOT_TOKEN'),

                })).then(function (resp){
                    //console.log(resp.data); //#DEBUG CODE: UNCOMMENT FOR DEBUGGING PURPOSES ONLY
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
                                attachments: JSON.stringify([{
                                    title: "Rejected",
                                    color: RED,
                                    text: "*Task ID:* " + sid + "\n *Title:* " + result.rows[0].title + "\n *Recipient:* " + result.rows[0].receiver_id + " *Owner:* " + result.rows[0].sender_id,
                                    mrkdwn_in: [
                                        "text"
                                    ],
                                }]),

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

                sendMessage("Rejected", "", RED);
                res.send('')
        }).catch(e => {
            client.release();
            sendMessage("*** ERROR ***", "" + e, RED);
        });
    }).catch((err) => {
        sendMessage("*** ERROR ***", "" + err, RED);
    });
    
    function sendMessage(title, text, color){
        axios.post('https://slack.com/api/chat.postEphemeral', qs.stringify({
            token: config('OAUTH_TOKEN'),
            user: payload.user.id,
            channel: payload.channel.id,
            attachments: JSON.stringify([{
                title: title,
                color: color,
                text: text,
            }]),
        })).then((result) => {
            //console.log('sendConfirmation: ', result.data); //#DEBUG CODE: UNCOMMENT FOR DEBUGGING PURPOSES ONLY
        }).catch((err) => {
            //console.log('sendConfirmation error: ', err); //#DEBUG CODE: UNCOMMENT FOR DEBUGGING PURPOSES ONLY
        });
    }
}
module.exports = { pattern: /rejectDialogHandler/ig, handler: handler }