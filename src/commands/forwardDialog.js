
'use strict'

const _ = require('lodash')
const config = require('../config')
const util = require('util')
const moment = require('moment')
const pg = require('pg')
const qs = require('querystring')
const axios = require('axios')
	
var dbURL = process.env.ELEPHANTSQL_URL

const handler = (payload, res) => {
    
    console.log("PAYLOAD INSIDE FORWARD DIALOG-----" + util.inspect(payload, {showHidden: false, depth: null}))
    const { trigger_id } = payload;
    
    axios.post('https://slack.com/api/users.list', qs.stringify({
        token: config('OAUTH_TOKEN'),
    })).then((result) => {
        var resultList = result.data.members;
        var userList = [];
        var userListIndex = 0;
        //console.log("USERS------" + util.inspect(userList, {showHidden: false, depth: null}));
        
        for (var i = 0; i < resultList.length; i++) {
            if(resultList[i].is_bot == false){
                console.log(i + ": " + resultList[i].real_name);
                userList[userListIndex] = {label: resultList[i].real_name, value: resultList[i].id};
            }
		}
        
        /*var option = [
                            {
                                "label": "user1",
                                "value": "user1"
                            },
                            {
                                "label": "user2",
                                "value": "user2"
                            },
                        ]
        
        console.log("OPTIONS---------------" + util.inspect(option, {showHidden: false, depth: null}));
        console.log("OPTIONS2---------------" + option[0]);
        console.log("OPTIONS3---------------" + option[0].label);
        console.log("OPTIONS4---------------" + option[0].value);
        console.log("OPTIONS5---------------" + option[1].value);*/
        
        
        console.log(util.inspect(userList, {showHidden: false, depth: null}));
        console.log("GODFUCKINGDAMMITWORK")
        
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
                        "options": [
                            {
                                "label": "user1",
                                "value": "user1"
                            },
                            {
                                "label": "user2",
                                "value": "user2"
                            },
                        ]
                    },
                    {
                        label: 'Task#',
                        type: 'text',
                        name: 'task',
                        value: payload.actions[0].value,
                        hint: 'ID# of the task you are forwarding',
                    },
                ],
            }),
        };
        
        axios.post('https://slack.com/api/dialog.open', qs.stringify(dialog))
            .then((result) => {
                //console.log('dialog.open: ', result.data);
                res.send('');
            }).catch((err) => {
                console.log('dialog.open call failed: %o', err);
                res.sendStatus(500);
            });
        //console.log('sendConfirmation: ', result.data);
    }).catch((err) => {
        console.log('sendConfirmation error: ', err);
    });
    
    /*const dialog = {
      token: config('OAUTH_TOKEN'),
      trigger_id,
      dialog: JSON.stringify({
        title: 'Forward A Task',
        callback_id: 'forwardDialog',
        submit_label: 'Forward',
        elements: [
          {
            label: 'Receiever',
            type: 'text',
            name: 'receiver',
            hint: 'The person you want to forward this task to'
          },
          {
            label: 'Task#',
            type: 'text',
            name: 'task',
            value: payload.actions[0].value,
            hint: 'ID# of the task you are forwarding',
          },
        ],
      }),
    };*/
}
module.exports = { pattern: /forwardDialog/ig, handler: handler }