
'use strict';

const express = require('express');
const proxy = require('express-http-proxy');
const bodyParser = require('body-parser');
const util = require('util');
const _ = require('lodash');
const qs = require('querystring');
const axios = require('axios');

const config = require('./config');
const commands = require('./commands');
const sumCommand = require('./commands/summary');
const buttonHandler = require('./commands/buttonHandler');
const deleteDialog = require('./commands/deleteDialog');
const deleteDialogHandler = require('./commands/deleteDialogHandler');
const askDialog = require('./commands/askDialog');
const askDialogHandler = require('./commands/askDialogHandler');
const forwardDialog = require('./commands/forwardDialog');
const forwardDialogHandler = require('./commands/forwardDialogHandler');
const clarifyDialog = require('./commands/clarifyDialog');
const clarifyDialogHandler = require('./commands/clarifyDialogHandler');
const progressDialog = require('./commands/progressDialog');
const progressDialogHandler = require('./commands/progressDialogHandler');
const doneDialog = require('./commands/doneDialog');
const doneDialogHandler = require('./commands/doneDialogHandler');
const rejectDialog = require('./commands/rejectDialog');
const rejectDialogHandler = require('./commands/rejectDialogHandler');
const acceptDialog = require('./commands/acceptDialog');
const acceptDialogHandler = require('./commands/acceptDialogHandler');
const detCommand = require('./commands/detailsDialogHandler');
const answerDialog = require('./commands/answerDialog');
const answerDialogHandler = require('./commands/answerDialogHandler');
const detailsDialog = require('./commands/detailsDialog');

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

app.post('/commands/interactiveComponent', (req, res) => {
    let payload = JSON.parse(req.body.payload);
    
    if(payload.callback_id === 'askDialog'){
        var cmd = askDialogHandler;
    } else if (payload.callback_id === 'askDialogHandler'){
        payload.original_message.text = payload.actions[0].value;
        var cmd = buttonHandler;
        if(payload.actions[0].name === "forward"){
            var cmd = forwardDialog
        } else if (payload.actions[0].name === "clarify") {
            var cmd = clarifyDialog;
        }
    } else if(payload.callback_id === 'forwardDialog'){
        var cmd = forwardDialogHandler
    } else if (payload.callback_id === 'ask_buttons') {
       payload.original_message.text = payload.actions[0].value;
       var cmd = buttonHandler
    } else if(payload.callback_id === 'doneDialog') {
        var cmd = doneDialogHandler
    } else if(payload.callback_id === 'clarifyDialog'){
        var cmd = clarifyDialogHandler
    } else if (payload.callback_id === 'delete') {
        var cmd = deleteDialog;
    } else if (payload.callback_id === 'deleteDialog'){
        var cmd = deleteDialogHandler;
    } else if (payload.callback_id === 'progress') {
        var cmd = progressDialog;
    } else if (payload.callback_id === 'progressDialog'){
        var cmd = progressDialogHandler;
    } else if (payload.callback_id === 'progress_buttons') {
        payload.original_message.text = payload.actions[0].value;
        var cmd = buttonHandler;
        if(payload.actions[0].name === "forward"){
            var cmd = forwardDialog
        } else if (payload.actions[0].name === "clarify") {
            var cmd = clarifyDialog;
        }
    } else if (payload.callback_id === 'answer') {
        var cmd = answerDialog;
    } else if (payload.callback_id === 'answerDialog') {
        var cmd = answerDialogHandler;
    } else if (payload.callback_id === 'answer_buttons') {
        payload.original_message.text = payload.actions[0].value;
        var cmd = buttonHandler;
    } else if (payload.callback_id === 'rejectDialog') {
        var cmd = rejectDialogHandler;
    } else if (payload.callback_id === 'acceptDialog') {
        var cmd = acceptDialogHandler;
    } else if (payload.callback_id === 'clarify_answer') {
        var cmd = answerDialog;
    } else if (payload.callback_id === 'details') {
        var cmd = detailsDialog;
    } else if (payload.callback_id === 'detailsDialog') {
        var cmd = detCommand;
    }
    cmd.handler(payload, res)
}); 

app.post('/commands/summary', (req, res) => {
  let payload = req.body;

  if (!payload || payload.token !== config('BOT_COMMAND_TOKEN')) {
    let err = '*** ERROR *** \n error in summary post. This is usually caused by a incorrect parameter but this should never be seen. If you do see this, please report this to IT Support.';
    console.log(err);
    res.status(401).end(err);
    return
  }

  let cmd = sumCommand;
  cmd.handler(payload, res)
});
app.post('/commands/ask', (req, res) => {
    let payload = req.body

    if (!payload || payload.token !== config('BOT_COMMAND_TOKEN')) {
        let err = '*** ERROR *** \n error in summary post. This is usually caused by a incorrect parameter but this should never be seen. If you do see this, please report this to IT Support.';
        console.log(err)
        res.status(401).end(err)
        return
    }
    let cmd = askDialog;
    cmd.handler(payload, res)
});

app.post('/commands/details', (req, res) => {
    let payload = req.body

    if (!payload || payload.token !== config('BOT_COMMAND_TOKEN')) {
        let err = '*** ERROR *** \n error in summary post. This is usually caused by a incorrect parameter but this should never be seen. If you do see this, please report this to IT Support.';
        console.log(err)
        res.status(401).end(err)
        return
    }
    let cmd = detailsDialog;
    cmd.handler(payload, res)
})

app.post('/commands/reject', (req, res) => {
    let payload = req.body

    if (!payload || payload.token !== config('BOT_COMMAND_TOKEN')) {
        let err = '*** ERROR *** \n error in summary post. This is usually caused by a incorrect parameter but this should never be seen. If you do see this, please report this to IT Support.';
        console.log(err)
        res.status(401).end(err)
        return
    }
    let cmd = rejectDialog;
    cmd.handler(payload, res)
})

app.post('/commands/accept', (req, res) => {
    let payload = req.body

    if (!payload || payload.token !== config('BOT_COMMAND_TOKEN')) {
        let err = '*** ERROR *** \n error in summary post. This is usually caused by a incorrect parameter but this should never be seen. If you do see this, please report this to IT Support.';
        console.log(err)
        res.status(401).end(err)
        return
    }
    let cmd = acceptDialog;
    cmd.handler(payload, res)
})

app.post('/commands/forward', (req, res) => {
    let payload = req.body
    
    if (!payload || payload.token !== config('BOT_COMMAND_TOKEN')) {
		let err = '*** ERROR *** \n error in summary post. This is usually caused by a incorrect parameter but this should never be seen. If you do see this, please report this to IT Support.';
		console.log(err)
		res.status(401).end(err)
		return
    }
    let cmd = forwardDialog;
	cmd.handler(payload, res)
})

app.post('/commands/done', (req, res) => {
    let payload = req.body
    
    if (!payload || payload.token !== config('BOT_COMMAND_TOKEN')) {
		let err = '*** ERROR *** \n error in summary post. This is usually caused by a incorrect parameter but this should never be seen. If you do see this, please report this to IT Support.';
		console.log(err)
		res.status(401).end(err)
		return
    }
    let cmd = doneDialog;
	cmd.handler(payload, res)
})

app.post('/commands/clarify', (req, res) => {
    let payload = req.body
    
    if (!payload || payload.token !== config('BOT_COMMAND_TOKEN')) {
		let err = '*** ERROR *** \n error in summary post. This is usually caused by a incorrect parameter but this should never be seen. If you do see this, please report this to IT Support.';
		console.log(err)
		res.status(401).end(err)
		return
    }
    let cmd = clarifyDialog;
	cmd.handler(payload, res)
})

app.post('/commands/delete', (req, res) => {
    let payload = req.body;

    if (!payload || payload.token !== config('BOT_COMMAND_TOKEN')) {
        let err = '*** ERROR *** \n error in summary post. This is usually caused by a incorrect parameter but this should never be seen. If you do see this, please report this to IT Support.';
        console.log(err);
        res.status(401).end(err);
        return
    }
    let cmd = deleteDialog;
    cmd.handler(payload, res);
});

app.post('/commands/progress', (req, res) => {
    let payload = req.body;

    if (!payload || payload.token !== config('BOT_COMMAND_TOKEN')) {
        let err = '*** ERROR *** \n error in summary post. This is usually caused by a incorrect parameter but this should never be seen. If you do see this, please report this to IT Support.';
        console.log(err);
        res.status(401).end(err);
        return
    }
    let cmd = progressDialog;
    cmd.handler(payload, res);
});

app.post('/commands/answer', (req, res) => {
    let payload = req.body;

    if (!payload || payload.token !== config('BOT_COMMAND_TOKEN')) {
        let err = '*** ERROR *** \n error in summary post. This is usually caused by a incorrect parameter but this should never be seen. If you do see this, please report this to IT Support.';
        console.log(err);
        res.status(401).end(err);
        return
    }
    let cmd = answerDialog;
    cmd.handler(payload, res);
});

app.listen(config('PORT'), (err) => {
  if (err) throw err;

  console.log(`\n Bot opened on port: ${config('PORT')}`);

  if (config('SLACK_TOKEN')) {
    bot.listen({ token: config('SLACK_TOKEN') })
  }
});