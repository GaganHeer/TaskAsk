'use strict'

const _ = require('lodash')
const config = require('../config')
const util = require('util')
const moment = require('moment')
const pg = require('pg')
const qs = require('querystring')
const axios = require('axios')
	
var dbURL = process.env.ELEPHANTSQL_URL
var correctIDStructure = /[^0-9]/

const handler = (payload, res) => {
    
    const {trigger_id } = payload;
        
        const dialog = {
          token: config('OAUTH_TOKEN'),
          trigger_id,
          dialog: JSON.stringify({
            title: 'Clarify A Task',
            callback_id: 'clarifyDialog',
            submit_label: 'Request',
            elements: [
              {
                label: 'Question',
                type: 'textarea',
                name: 'Question',
              },
              {
                label: 'Task ID',
                type: 'text',
                name: 'ID',
                value: payload.actions[0].value,
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
    /*} else {
        let attachments = [{
            title: "Incorrect Parameters",
            color: "#ff0000",
            text: "Please enter the correct format /clarifyDialog TaskID \n ex) /clarifyDialog 123"
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
    }*/
}
module.exports = { pattern: /clarifyDialog/ig, handler: handler }