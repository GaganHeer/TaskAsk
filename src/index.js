
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
const askCommand = require('./commands/ask');
const sumCommand = require('./commands/summary');
const accCommand = require('./commands/accept');
const donCommand = require('./commands/done');
const rejCommand = require('./commands/reject');
const proCommand = require('./commands/progress');
const forCommand = require('./commands/forward');
const delCommand = require('./commands/delete');
const clarCommand = require('./commands/clarify')
const buttonHandler = require('./commands/buttonHandler');
const deleteDialog = require('./commands/deleteDialog');
const deleteDialogHandler = require('./commands/deleteDialogHandler');
const askDialog = require('./commands/askDialog')
const askDialogHandler = require('./commands/askDialogHandler')
const forwardDialog = require('./commands/forwardDialog')
const forwardDialogHandler = require('./commands/forwardDialogHandler')
const clarifyDialog = require('./commands/clarifyDialog')
const clarifyDialogHandler = require('./commands/clarifyDialogHandler')
const progressDialog = require('./commands/progressDialog');
const progressDialogHandler = require('./commands/progressDialogHandler');
const doneDialog = require('./commands/doneDialog')
const doneDialogHandler = require('./commands/doneDialogHandler')
const rejectDialog = require('./commands/rejectDialog')
const rejectDialogHandler = require('./commands/rejectDialogHandler')

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

app.post('/commands/boneypants/interactiveComponent', (req, res) => {
    let payload = JSON.parse(req.body.payload);
    
    if(payload.callback_id === 'askDialog'){
        //console.log("ITS HERE-------------" + util.inspect(payload.actions, {showHidden: false, depth: null}));
        //console.log(payload.submission.title);
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
        var cmd = buttonHandler;
    } else if (payload.callback_id === 'rejectDialog') {
        var cmd = rejectDialogHandler;
    }
    cmd.handler(payload, res)
}); 

app.post('/commands/boneypants/askdialog', (req, res) => {
    let payload = req.body

    if (!payload || payload.token !== config('STARBOT_COMMAND_TOKEN')) {
        let err = '✋  Star—what? An invalid slash token was provided\n' +
            '   Is your Slack slash token correctly configured?'
        console.log(err)
        res.status(401).end(err)
        return
    }
    let cmd = askDialog;
    cmd.handler(payload, res)
})

app.post('/commands/boneypants/rejectdialog', (req, res) => {
    let payload = req.body

    if (!payload || payload.token !== config('STARBOT_COMMAND_TOKEN')) {
        let err = '✋  Star—what? An invalid slash token was provided\n' +
            '   Is your Slack slash token correctly configured?'
        console.log(err)
        res.status(401).end(err)
        return
    }
    let cmd = rejectDialog;
    cmd.handler(payload, res)
})

app.post('/commands/boneypants/forwarddialog', (req, res) => {
    let payload = req.body
    
    if (!payload || payload.token !== config('STARBOT_COMMAND_TOKEN')) {
    let err = '✋  Star—what? An invalid slash token was provided\n' +
              '   Is your Slack slash token correctly configured?'
    console.log(err)
    res.status(401).end(err)
    return
    }
    let cmd = forwardDialog;
	cmd.handler(payload, res)
})

app.post('/commands/boneypants/donedialog', (req, res) => {
    let payload = req.body
    
    if (!payload || payload.token !== config('STARBOT_COMMAND_TOKEN')) {
    let err = '✋  Star—what? An invalid slash token was provided\n' +
              '   Is your Slack slash token correctly configured?'
    console.log(err)
    res.status(401).end(err)
    return
    }
    let cmd = doneDialog;
	cmd.handler(payload, res)
})

app.post('/commands/boneypants/clarifydialog', (req, res) => {
    let payload = req.body
    
    if (!payload || payload.token !== config('STARBOT_COMMAND_TOKEN')) {
    let err = '✋  Star—what? An invalid slash token was provided\n' +
              '   Is your Slack slash token correctly configured?'
    console.log(err)
    res.status(401).end(err)
    return
    }
    let cmd = clarifyDialog;
	cmd.handler(payload, res)
})

app.post('/commands/boneypants/deletedialog', (req, res) => {
    let payload = req.body;

    if (!payload || payload.token !== config('STARBOT_COMMAND_TOKEN')) {
        let err = '✋  Star—what? An invalid slash token was provided\n' +
            '   Is your Slack slash token correctly configured?';
        console.log(err);
        res.status(401).end(err);
        return
    }
    let cmd = deleteDialog;
    cmd.handler(payload, res);
});

app.post('/commands/boneypants/progressdialog', (req, res) => {
    let payload = req.body;

    if (!payload || payload.token !== config('STARBOT_COMMAND_TOKEN')) {
        let err = '✋  Star—what? An invalid slash token was provided\n' +
            '   Is your Slack slash token correctly configured?';
        console.log(err);
        res.status(401).end(err);
        return
    }
    let cmd = progressDialog;
    cmd.handler(payload, res);
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

app.post('/commands/boneypants/clarify', (req, res) => {
  let payload = req.body;

  if (!payload || payload.token !== config('STARBOT_COMMAND_TOKEN')) {
    let err = 'BONES IS OUTTA CALCIUM';
    console.log(err);
    res.status(401).end(err);
    return
  }

  let cmd = clarCommand;
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

app.post('/commands/boneypants/reject', (req, res) => {
  let payload = req.body

  if (!payload || payload.token !== config('STARBOT_COMMAND_TOKEN')) {
    let err = '✋  Star—what? An invalid slash token was provided\n' +
              '   Is your Slack slash token correctly configured?'
    console.log(err)
    res.status(401).end(err)
    return
  }

  let cmd = _.reduce(commands, (a, cmd) => {
    return payload.text.match(cmd.pattern) ? cmd : a
  }, rejCommand)

  cmd.handler(payload, res)
})

app.listen(config('PORT'), (err) => {
  if (err) throw err;

  console.log(`\n🚀  Starbot LIVES on PORT ${config('PORT')} 🚀`);

  if (config('SLACK_TOKEN')) {
    console.log(`🤖  beep boop: @starbot is real-time\n`);
    bot.listen({ token: config('SLACK_TOKEN') })
  }
});