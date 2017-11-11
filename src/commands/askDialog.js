
'use strict'

const _ = require('lodash')
const config = require('../config')
const util = require('util')
const moment = require('moment')
const pg = require('pg')
const qs = require('querystring')
const axios = require('axios')
	
var dbURL = process.env.ELEPHANTSQL_URL
var correctIDStructure = /^<@.*[|].*>$/

const handler = (payload, res) => {
    
    const { token, text, trigger_id } = payload;
    
    if(correctIDStructure.test(text)){
        var receiverSplit = text.split("|");
        var receivingUserID = receiverSplit[0] + ">";
        
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
                hint: 'Uses a 24 hour clock || Format: MMM DD hh:mm || ex) Oct 29 21:30',
              },
              {
                label: 'Receiver',
                type: 'text',
                name: 'receiver',
                value: receivingUserID,
                hint: 'Do not change',
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
    } else {
        let attachments = [{
            title: "Incorrect Parameters",
            color: "#ff0000",
            text: "Please enter the correct format /askdialog [@User] \n ex) /askdialog @David"
		}]	
        
        const msgDefaults = {
		  response_type: 'ephemeral',
		  username: 'MrBoneyPantsGuy',
		  icon_emoji: config('ICON_EMOJI')
		}
        
        let msg = _.defaults({
		channel: payload.channel_name,
		attachments: attachments
	    }, msgDefaults)

        res.set('content-type', 'application/json')
        res.status(200).json(msg)
        return
    }
}
module.exports = { pattern: /askDialog/ig, handler: handler }