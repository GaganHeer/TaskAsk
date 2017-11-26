
'use strict'

const _ = require('lodash')
const config = require('../config')
const util = require('util')
const pg = require('pg')
const qs = require('querystring')
const axios = require('axios')
	
var dbURL = process.env.ELEPHANTSQL_URL

const handler = (payload, res) => {
    
    const { token, text, trigger_id } = payload;
    
    axios.post('https://slack.com/api/users.list', qs.stringify({
        token: config('OAUTH_TOKEN'),
    })).then((result) => {
		//console.log(result.data); //#DEBUG CODE: UNCOMMENT FOR DEBUGGING PURPOSES ONLY
		//console.log(result.data.members); //#DEBUG CODE: UNCOMMENT FOR DEBUGGING PURPOSES ONLY
        var resultList = result.data.members;
        var userList = [];
        var userListIndex = 0;
        
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
            title: 'Request A Task',
            callback_id: 'askDialog',
            submit_label: 'Request',
            elements: [
              {
                label: 'Title',
                type: 'text',
                name: 'title',
                max_length: 15,
                hint: '15 characters or less'
              },
              {
                label: 'Description',
                type: 'textarea',
                name: 'description',
                max_length: 300,
                hint: '300 characters or less'
              },
              {
                label: 'Due Date',
                type: 'text',
                name: 'due',
                optional: true,
                hint: 'Uses a 24 hour clock || Format: MMM d YYYY hh:mm || ex) Oct 29 2017 21:30',
              },
              {
                "label": "Receiver",
                "type": "select",
                "name": "receiver",
                "options": userList,
              },
            ],
          }),
        };

        // open the dialog by calling dialogs.open method and sending the payload
        axios.post('https://slack.com/api/dialog.open', qs.stringify(dialog))
            .then((result) => {
                //console.log('dialog.open: ', result.data); //#DEBUG CODE: UNCOMMENT FOR DEBUGGING PURPOSES ONLY
                res.send('');
            }).catch((err) => {
                //console.log('dialog.open call failed: %o', err); //#DEBUG CODE: UNCOMMENT FOR DEBUGGING PURPOSES ONLY
                res.sendStatus(500);
            });
        //console.log('sendConfirmation: ', result.data); //#DEBUG CODE: UNCOMMENT FOR DEBUGGING PURPOSES ONLY
    }).catch((err) => {
        //console.log('sendConfirmation error: ', err); //#DEBUG CODE: UNCOMMENT FOR DEBUGGING PURPOSES ONLY
    });
}
module.exports = { pattern: /askDialog/ig, handler: handler }