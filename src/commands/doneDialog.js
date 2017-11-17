
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
    
    const { trigger_id } = payload;
    var acceptedList = [];
    var receiver = "<@" + payload.user_id + ">";
    pg.connect(dbURL, function(err, client, done) {
        if(err) {
            console.log("*** ERROR ***" + err);
        }
        client.query("SELECT * FROM ASK_TABLE WHERE RECEIVER_ID = $1 AND STATUS = $2", [receiver, ACCEPTED_STATUS], function(err, result) {
            done();
            if(err) {
                console.log("*** ERROR ***" + err);
            }
            for (var i = 0; i < result.rows.length; i++) {
                acceptedList[i] = {label: "ID# " + result.rows[i].serial_id + ": " + result.rows[i].title, value: result.rows[i].serial_id};
		    }
            console.log("LENGTH" + result.rows.length);
            console.log(result.rows[0].serial_id);
            console.log(result.rows[1].serial_id);
        })
    });
    
    const dialog = {
        token: config('OAUTH_TOKEN'),
        trigger_id,
        dialog: JSON.stringify({
            title: 'Mark a task as done',
            callback_id: 'doneDialog',
            submit_label: 'Done',
            elements: [
                {
                    "label": "Tasks",
                    "type": "select",
                    "name": "task",
                    "options": acceptedList,
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
}
module.exports = { pattern: /doneDialog/ig, handler: handler }