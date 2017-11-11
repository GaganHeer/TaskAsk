var taskNumber = parseInt(payload.actions[0].value);
		var pressedUser = "<@" + payload.user.id + ">";
        var jiraKey;
        var jiraAssingee;
        var jiraDesc;
        var jiraSummary;
        var jiraIssue;
        var senderSlackName;
        var receiverSlackName;
        var issueTransAccept = {
            "transition": {
                "id": "21"   //"21" is the ID of the transition to "In Progress" status.
            }
        };
		
		pg.connect(dbURL, function(err, client, done) {
			if(err) {
				let attachments = [ogMsg[0],
					{
						title: "***ERROR***",
						color: "#ff0000",
						text: err
					}
				]
				returnToIndex(attachments, payload, false);
			}
			client.query("SELECT * FROM ASK_TABLE WHERE SERIAL_ID = $1 AND RECEIVER_ID = $2 AND STATUS = $3", [taskNumber, pressedUser, PENDING_STATUS], function(err, result) {
				if(err) {
					let attachments = [ogMsg[0],
					{
						title: "***ERROR***",
						color: "#ff0000",
						text: err
					}
				]
				returnToIndex(attachments, payload, false);
				}
				if (result.rows.length == 0) {
					let attachments = [ogMsg[0], 
						{
							title: "***ERROR***",
							color: "#ff0000",
							text: "This either doesn't belong to you or isn't marked as pending!"
						}
					]	
					returnToIndex(attachments, payload, false);
				}
				else {
                    jiraSummary = result.rows[0].sender_id +' '+result.rows[0].req_date;
                    let receiverSlackID = result.rows[0].receiver_id;
                    let senderSlackID = result.rows[0].sender_id;
                    let baseDesc = result.rows[0].req_desc;
                    pool.connect().then(client => {
                        return client.query('SELECT * FROM user_table WHERE slack_id = $1 OR slack_id = $2', [receiverSlackID, senderSlackID])
                            .then(res => {
                                client.release();
                                console.log("Log 1: "+ res.rows[0].f_name);
                                for (let i=0; i<res.rows.length; i++){
                                    if (res.rows[i].slack_id == senderSlackID){
                                        senderSlackName = res.rows[i].f_name +' '+ res.rows[i].l_name;
                                    }
                                    if (res.rows[i].slack_id == receiverSlackID){
                                        receiverSlackName = res.rows[i].f_name +' '+ res.rows[i].l_name;
                                        jiraAssingee = res.rows[i].jira_name;
                                    }
                                }
                                jiraDesc = 'Assigned by: '+ senderSlackName +'\n\n'+'Assigned to: '+ receiverSlackName +'\n\n'+ baseDesc;
                                jiraIssue = {
                                    "fields": {
                                        "project": {
                                            "id": "13100"  //TASK PROJECT ID
                                        },
                                        "summary": jiraSummary,
                                        "issuetype": {
                                            "id": "3"  //'Task' issue type
                                        },
                                        "assignee": {
                                            "name": jiraAssingee
                                        },
                                        "description": jiraDesc,
                                        "customfield_10100": [{  //Custom Field for Review Type.
                                            "id": "10103"  //All slack task will not require review.
                                        }]
                                    }
                                };
                                console.log("Log 2 :"+ jiraIssue);
                                jira.addNewIssue(jiraIssue, function (error, issue){
                                    if (error){
                                        console.log(error);
                                        return(error);
                                    } else {
                                        console.log('Console log 3, Jira Key: ' + issue.key);
                                        jiraKey = issue.key;
                                        console.log('Console log 4: '+ jiraKey);
                                        jira.transitionIssue(jiraKey, issueTransAccept, function (err, issueUpdate) {  //Changes the Issue's Status to In Progress
                                            if (err) {
                                                console.log(err);
                                                return(err);
                                            } else {
                                                console.log("Console log 5, Jira Status change was a: "+ JSON.stringify(issueUpdate));
                                                client.query("UPDATE ASK_TABLE SET STATUS = $1, JIRA_ID = $2 WHERE SERIAL_ID = $3", [ACCEPTED_STATUS, jiraKey, taskNumber], function(err, upResult) {
                                                    done();
                                                    if(err) {
                                                        console.log(err);
                                                    }

                                                    delete ogMsg[0].actions;

                                                    let attachments = [ogMsg[0],
                                                        {
                                                            title: "Accepted!",
                                                            color: "#33cc33",
                                                            text: jiraKey + " has been accepted!"
                                                        }
                                                    ];
                                                    returnToIndex(attachments, payload, true);
                                                });
                                            }
                                        });
                                    }
                                });
                            })
                            .catch(e => {
                                client.release();
                                console.log(err.stack);
                            })
                    });

				}
			})
		})
		
		
		
		
		
		var taskNumber = parseInt(payload.actions[0].value);
		var pressedUser = "<@" + payload.user.id + ">";
		
		pg.connect(dbURL, function(err, client, done) {
			if(err) {
				let attachments = [ogMsg[0],
					{
						title: "***ERROR***",
						color: "#ff0000",
						text: err
					}
				];
				returnToIndex(attachments, payload, false);
			}
			client.query("SELECT * FROM ASK_TABLE WHERE receiver_id = $1 AND serial_id = $2 AND status = $3", [pressedUser, taskNumber, ACCEPTED_STATUS], function(err, result) {
				if (err) {
					let attachments = [ogMsg[0],
						{
							title: "***ERROR***",
							color: "#ff0000",
							text: err
						}
					];
					returnToIndex(attachments, payload, false);
				}
				if (result.rows.length == 0) {
					let attachments = [ogMsg[0],
						{
							title: "***ERROR***",
							color: "#ff0000",
							text: "This either doesn't belong to you or isn't marked as pending!"
						}
					];
					returnToIndex(attachments, payload, false);
				}
				else {
                    let jiraKey = result.rows[0].jira_id;
                    let issueTransDone = {
                        "transition": {
                            "id": "31"   //"31" is the ID of the transition to "Done" status.
                        }
                    };
                    jira.transitionIssue(jiraKey, issueTransDone, function (error, issueUpdate) { //changes the Jira Issue to "Done" status.
                        if (error) {
                            console.log(error);
                            return(error);
                        } else {
                            console.log("Jira Status change was a: "+ JSON.stringify(issueUpdate));
                            client.query("UPDATE ASK_TABLE SET STATUS = $1 WHERE SERIAL_ID = $2", [DONE_STATUS, taskNumber], function(err, upResult) {
                                done();
                                if(err) {
                                    console.log(err);
                                }

                                delete ogMsg[0].actions;

                                let attachments = [ogMsg[0],
                                    {
                                        title: "Done!",
                                        color: "#33ccff",
                                        text: jiraKey + " has been marked as Done!"
                                    }
                                ];
                                returnToIndex(attachments, payload, true);
                            });
                        }
                    });
				}
			});			 
		});
		
		
		
		
		
		
		
		
		
		
		
		
		
		
		var taskNumber = parseInt(payload.actions[0].value);
		var pressedUser = "<@" + payload.user.id + ">";
		
		pg.connect(dbURL, function(err, client, done) {
			if(err) {
				let attachments = [ogMsg[0],
					{
						title: "***ERROR***",
						color: "#ff0000",
						text: err
					}
				];
				returnToIndex(attachments, payload, false);
			}
			client.query("SELECT * FROM ASK_TABLE WHERE SERIAL_ID = $1 AND RECEIVER_ID = $2 AND STATUS = $3", [taskNumber, pressedUser, PENDING_STATUS], function(err, result) {
				if(err) {
					let attachments = [ogMsg[0],
					{
						title: "***ERROR***",
						color: "#ff0000",
						text: err
					}
				];
				returnToIndex(attachments, payload, false);
				}
				if (result.rows.length == 0) {
					let attachments = [ogMsg[0],
						{
							title: "***ERROR***",
							color: "#ff0000",
							text: "This either doesn't belong to you or isn't marked as pending!"
						}
					];
					returnToIndex(attachments, payload, false);
				}
				else {
					client.query("UPDATE ASK_TABLE SET STATUS = $1 WHERE SERIAL_ID = $2", [REJECTED_STATUS, taskNumber], function(err, upResult) {
						done();
						if(err) {
							console.log(err);
						}
						
						delete ogMsg[0].actions;
						
						let attachments = [ogMsg[0],
							{
								title: "Rejected!",
								color: "#ff0000",
								text: "Task ID: " + taskNumber + " has been Rejected!" 
							}
						];
						returnToIndex(attachments, payload, true);
					})
				}
			})
		})