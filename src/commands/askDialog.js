
'use strict'

const _ = require('lodash')
const config = require('../config')
const util = require('util')
const moment = require('moment')
const pg = require('pg')
const qs = require('querystring')
const axios = require('axios')
const ACCEPTED_STATUS = "ACCEPTED";
	
var dbURL = process.env.ELEPHANTSQL_URL

const handler = (payload, res) => {
    
    const { token, text, trigger_id } = payload;
    
    axios.post('https://slack.com/api/users.list', qs.stringify({
        token: config('OAUTH_TOKEN'),
    })).then((result) => {
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
                console.log('dialog.open: ', result.data);
                res.send('');
            }).catch((err) => {
                console.log('dialog.open call failed: %o', err);
                res.sendStatus(500);
            });
        console.log('sendConfirmation: ', result.data);
    }).catch((err) => {
        console.log('sendConfirmation error: ', err);
    });
}
module.exports = { pattern: /askDialog/ig, handler: handler }