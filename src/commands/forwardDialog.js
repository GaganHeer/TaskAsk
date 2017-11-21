
'use strict'

const _ = require('lodash')
const config = require('../config')
const util = require('util')
const moment = require('moment')
const pg = require('pg')
const qs = require('querystring')
const axios = require('axios')
const PENDING_STATUS = "PENDING";
	
var dbURL = process.env.ELEPHANTSQL_URL

const handler = (payload, res) => {
    
    const { trigger_id } = payload;
    var receiver = "<@" + payload.user.id + ">";
    
    console.log("FORWARD DIALOG PAYLOAD" + util.inspect(payload, {showHidden: false, depth: null}));
    
    axios.post('https://slack.com/api/users.list', qs.stringify({
        token: config('OAUTH_TOKEN'),
    })).then((result) => {
        var resultList = result.data.members;
        var pendingList = [];
        var userList = [];
        var userListIndex = 0;
        
        pg.connect(dbURL, function(err, client, done) {
            if(err) {
                console.log("*** ERROR ***" + err);
            }
            client.query("SELECT * FROM ASK_TABLE WHERE RECEIVER_ID = $1 AND STATUS = $2", [receiver, PENDING_STATUS], function(err, result) {
                done();
                if(err) {
                    console.log("*** ERROR ***" + err);
                }
                
                for (var i = 0; i < result.rows.length; i++) {
                    pendingList[i] = {label: "ID# " + result.rows[i].serial_id + ": " + result.rows[i].receiver, value: result.rows[i].serial_id};
                }

                for (var i = 0; i < resultList.length; i++) {
                    if(resultList[i].is_bot == false){
                        userList[userListIndex] = {label: resultList[i].real_name, value: resultList[i].id};
                        userListIndex++;
                    }
                }       
                
                const dialog = {
                    token: config('OAUTH_TOKEN'),
                    trigger_id,
                    dialog: JSON.stringify({
                        title: 'Forward A Task',
                        callback_id: 'forwardDialog',
                        submit_label: 'Forward',
                        elements: [
                            {
                                "label": "Receiver",
                                "type": "select",
                                "name": "receiver",
                                "options": userList,
                            },
                            {
                                label: 'Task#',
                                type: 'select',
                                name: 'task',
                                options: pendingList,
                                value: payload.actions[0].value,
                                hint: 'The task you are forwarding',
                            },
                        ],
                    }),
                };

                axios.post('https://slack.com/api/dialog.open', qs.stringify(dialog))
                    .then((result) => {
                        console.log('dialog.open: ', result.data);
                        res.send('');
                    }).catch((err) => {
                        console.log('dialog.open call failed: %o', err);
                        res.sendStatus(500);
                    });
                //console.log('sendConfirmation: ', result.data);
            })
        })
    }).catch((err) => {
        console.log('sendConfirmation error: ', err);
    });
}
module.exports = { pattern: /forwardDialog/ig, handler: handler }