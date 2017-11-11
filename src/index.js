
'use strict';

const express = require('express');
const proxy = require('express-http-proxy');
const bodyParser = require('body-parser');
const util = require('util');
const _ = require('lodash');

const config = require('./config');
const commands = require('./commands');
const askCommand = require('./commands/ask');
const sumCommand = require('./commands/summary');
const accCommand = require('./commands/accept');
const donCommand = require('./commands/done');
const rejCommand = require('./commands/reject');
const proCommand = require('./commands/progress');
const buttonHandler = require('./commands/buttonHandler');
const forCommand = require('./commands/forward');
const delCommand = require('./commands/delete');

let bot = require('./bot');

let app = express();

if (config('PROXY_URI')) {
  app.use(proxy(config('PROXY_URI'), {
    forwardPath: (req, res) => { return require('url').parse(req.url).path }
  }))
}

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/', (req, res) => { res.send('\n 👋 🌍 \n') });

app.post('/commands/boneypants/button_handler', (req, res) => {
    var payload = JSON.parse(req.body.payload);
	
	payload.original_message.text = payload.actions[0].value;
	
	console.log(payload.token);
	
	console.log(!payload);

 	if (!payload || payload.token !== config('STARBOT_COMMAND_TOKEN')) {
		let err = 'BONES IS OUTTA CALCIUM';
		console.log(err);
		res.status(401).end(err);
    	return
  	}
	
	//debug code. 	
	//	console.log("ACTIONS: " + util.inspect(payload.actions, {showHidden: false, depth: null}));
	//	console.log("NAME: " + payload.actions[0].name);
	//	console.log("ACCEPT");

	let cmd = buttonHandler;
	cmd.handler(payload, res)	
});

app.post('/commands/boneypants/ask', (req, res) => {
  let payload = req.body;

  if (!payload || payload.token !== config('STARBOT_COMMAND_TOKEN')) {
    let err = 'BONES IS OUTTA CALCIUM';
    console.log(err);
    res.status(401).end(err);
    return
  }

  let cmd = askCommand;
  cmd.handler(payload, res)
});

app.post('/commands/boneypants/summary', (req, res) => {
  let payload = req.body;

  if (!payload || payload.token !== config('STARBOT_COMMAND_TOKEN')) {
    let err = 'BONES IS OUTTA CALCIUM';
    console.log(err);
    res.status(401).end(err);
    return
  }

  let cmd = sumCommand;
  cmd.handler(payload, res)
});

app.post('/commands/boneypants/accept', (req, res) => {
  let payload = req.body;

  if (!payload || payload.token !== config('STARBOT_COMMAND_TOKEN')) {
    let err = 'BONES IS OUTTA CALCIUM';
    console.log(err);
    res.status(401).end(err);
    return
  }

  let cmd = accCommand;
  cmd.handler(payload, res)
});

app.post('/commands/boneypants/done', (req, res) => {
  let payload = req.body;

  if (!payload || payload.token !== config('STARBOT_COMMAND_TOKEN')) {
    let err = 'BONES IS OUTTA CALCIUM';
    console.log(err);
    res.status(401).end(err);
    return
  }

  let cmd = donCommand;
  cmd.handler(payload, res)
});

app.post('/commands/boneypants/reject', (req, res) => {
  let payload = req.body;

  if (!payload || payload.token !== config('STARBOT_COMMAND_TOKEN')) {
    let err = 'BONES IS OUTTA CALCIUM';
    console.log(err);
    res.status(401).end(err);
    return
  }
	
  let cmd = rejCommand;
  cmd.handler(payload, res)
});

app.post('/commands/boneypants/progress', (req, res) => {
  let payload = req.body;

  if (!payload || payload.token !== config('STARBOT_COMMAND_TOKEN')) {
    let err = 'BONES IS OUTTA CALCIUM';
    console.log(err);
    res.status(401).end(err);
    return
  }

  let cmd = proCommand;
  cmd.handler(payload, res)
});

app.post('/commands/boneypants/forward', (req, res) => {
  let payload = req.body;

  if (!payload || payload.token !== config('STARBOT_COMMAND_TOKEN')) {
    let err = 'BONES IS OUTTA CALCIUM';
    console.log(err);
    res.status(401).end(err);
    return
  }

  let cmd = forCommand;
  cmd.handler(payload, res)
});

app.post('/commands/boneypants/delete', (req, res) => {
    let payload = req.body;

    if (!payload || payload.token !== config('STARBOT_COMMAND_TOKEN')) {
        let err = 'BONES IS OUTTA CALCIUM';
        console.log(err);
        res.status(401).end(err);
        return
    }

    let cmd = delCommand;
    cmd.handler(payload, res)
});

app.listen(config('PORT'), (err) => {
  if (err) throw err;

  console.log(`\n🚀  Starbot LIVES on PORT ${config('PORT')} 🚀`);

  if (config('SLACK_TOKEN')) {
    console.log(`🤖  beep boop: @starbot is real-time\n`);
    bot.listen({ token: config('SLACK_TOKEN') })
  }
});