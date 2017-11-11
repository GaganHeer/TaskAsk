		var unpacked = util.inspect(data, {showHidden: false, depth: null});
		var unpackedSend = util.inspect(sendData, {showHidden: false, depth: null});
		console.log("*****************");
		console.log("RESP: " + unpacked);
		console.log("*****************");
		console.log("*****************");
		console.log("SENDRESP: " + unpackedSend);
		console.log("*****************");
		console.log("DATA: " + x);
		
		var pend = "";
		var sendPend = "";
		var rej = "";
		var sendRej = "";
		var acc = "";
		var sendAcc = "";
		var done = "";
		var sendDone = "";

		for (var i = 0; i < data.length; i++) {
			var stat = data[i].status;
			if(stat === "PENDING") {
				pend = pend + data[i].sender_id + " asked you to: " + data[i].req_desc + " on " + data[i].req_date + " (ID: " + data[i].serial_id + ") \n";	
			} else if (stat === "REJECTED") {
				rej = rej + data[i].sender_id + " asked you to: " + data[i].req_desc + " on " + data[i].req_date + " (ID: " + data[i].serial_id + ") \n";		
			} else if (stat === "ACCEPTED") {
				acc = acc + data[i].sender_id + " asked you to: " + data[i].req_desc + " on " + data[i].req_date + " (ID: " + data[i].serial_id + ") \n";		
			} else if (stat === "DONE") {
				done = done + data[i].sender_id + " asked you to: " + data[i].req_desc + " on " + data[i].req_date + " (ID: " + data[i].serial_id + ") \n";		
			} else {
				console.log("ERR AT: " + data[i]);
			}
		}
		for (var i = 0; i < sendData.length; i++) {			
			var stat = sendData[i].status;
			if (stat === "PENDING") {
				sendPend = sendPend + "You asked: " + sendData[i].receiver_id + " to: " + sendData[i].req_desc + " on " + sendData[i].req_date + " (ID: " + sendData[i].serial_id + ") \n";		
			} else if (stat === "REJECTED") {
				sendRej = sendRej + "You asked: " + sendData[i].receiver_id + " to: " + sendData[i].req_desc + " on " + sendData[i].req_date + " (ID: " + sendData[i].serial_id + ") \n";		
			} else if (stat === "ACCEPTED") {
				sendAcc = sendAcc + "You asked: " + sendData[i].receiver_id + " to: " + sendData[i].req_desc + " on " + sendData[i].req_date + " (ID: " + sendData[i].serial_id + ") \n";		
			} else if (stat === "DONE") {
				sendDone = sendDone + "You asked: " + sendData[i].receiver_id + " to: " + sendData[i].req_desc + " on " + sendData[i].req_date + " (ID: " + sendData[i].serial_id + ") \n";		
			} else {
				console.log("ERR AT: " + sendData[i]);
			}
		}
		
		var errMsg = "There isn't anything here!";
		var items = [pend, rej, acc, done, sendPend, sendRej, sendAcc, sendDone];
		
		for(var i = 0; i < items.length; i++) {
			if(items[i] === "") {
				items[i] = errMsg;
			}
		}