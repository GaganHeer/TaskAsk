
'use strict';

const _ = require('lodash');
const config = require('../config');
const util = require('util');
const pg = require('pg');
const dbConfig = config('DB_CONFIG');

var pool = new pg.Pool(dbConfig);

const handler = (payload, res) => {
	if (payload.text === "") {
		send("*** ERROR ***", "No progress number provided", "#ff0000", "ephemeral");
	}
    pool.connect().then(client => {
        return client.query("SELECT * FROM ASK_TABLE WHERE SERIAL_ID = $1 AND (SENDER_ID = $2 OR RECEIVER_ID = $2)", [payload.text, "<@" + payload.user_id + ">"])
            .then(result => {
                var resp = "temp";
                client.release();
                if (result.rows.length == 0) {
                    send("*** ERROR ***", "This ID does not exist", "#ff0000", "ephemeral");
                }
                else {
                    resp = result.rows[0];
                    console.log(resp);

                    var col = "";
                    var actions;
                    if (resp.status === "PENDING") {
                        col = "ffcc00";
                        actions = [
                            {
                                name: "accept",
                                text: "Accept",
                                type: "button",
                                value: payload.text,
                                style: "primary",
                                "confirm": {
                                    "title": "Are you sure?",
                                    "text": "You are about to accept this, are you sure?",
                                    "ok_text": "Yes",
                                    "dismiss_text": "No"
                                }
                            },
                            {
                                name: "reject",
                                text: "Reject",
                                type: "button",
                                value: payload.text,
                                style: "danger",
                                "confirm": {
                                    "title": "Are you sure?",
                                    "text": "You are about to reject this, are you sure?",
                                    "ok_text": "Yes",
                                    "dismiss_text": "No"
                                }
                            }
                        ];
                    } else if (resp.status === "ACCEPTED") {
                        col = "#33cc33";
                        actions = [
                            {
                                name: "doneBut",
                                text: "Done",
                                type: "button",
                                value: payload.text,
                                style: "primary",
                                "confirm": {
                                    "title": "Are you sure?",
                                    "text": "You are about to indicate this task is done.  Are you sure?",
                                    "ok_text": "Yes",
                                    "dismiss_text": "No"
                                }
                            }
                        ]
                    } else if (resp.status === "REJECTED") {
                        col = "#ff0000"
                    } else if (resp.status === "DONE") {
                        col = "#33ccff"
                    }

                    var temp = send("Status Update: ", resp, col, "in_channel", actions);

                }
            })
            .catch(err => {
                send("*** ERROR ***", err, "#ff0000", "ephemeral");
            });
    });

    function send(title, data, color, resp_type, actions=null) {
		
		const msgDefaults = {
		    response_type: resp_type,
		    username: 'MrBoneyPantsGuy',
		    icon_emoji: config('ICON_EMOJI')
		};
		
        var build = "";
		console.log(data);
		if(!(title === "*** ERROR ***")) {
			console.log("I'M DOING THIS NOW");
			
			build = build + "Hey " + data.receiver_id + ", " + data.sender_id + " would like a status update on Task ID: " + data.serial_id + " - " + data.req_desc + "\n";
		} else {
			build = data;
		}


        let attachments = [
            {
                title: title,
                text: build,
				color: color,
				callback_id: "progress_buttons",
				fallback: "Something went wrong :/",
				actions: actions
            }
        ];


        var msg = _.defaults({
            channel: payload.channel_name,
            attachments: attachments
        }, msgDefaults);
        
        res.set('content-type', 'application/json');
        res.status(200).json(msg);
    }
}

module.exports = { pattern: /progress/ig, handler: handler };
