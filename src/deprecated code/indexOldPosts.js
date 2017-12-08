//const askCommand = require('./commands/ask');
//const accCommand = require('./commands/accept');
//const donCommand = require('./commands/done');
//const rejCommand = require('./commands/reject');
//const proCommand = require('./commands/progress');
//const forCommand = require('./commands/forward');
//const clarCommand = require('./commands/clarify');

//let bot = require('./bot');


//app.post('/commands/boneypants/ask', (req, res) => {
//  let payload = req.body;
//
//  if (!payload || payload.token !== config('STARBOT_COMMAND_TOKEN')) {
//    let err = 'BONES IS OUTTA CALCIUM';
//    console.log(err);
//    res.status(401).end(err);
//    return
//  }
//
//  let cmd = askCommand;
//  cmd.handler(payload, res)
//});
//
//app.post('/commands/boneypants/clarify', (req, res) => {
//  let payload = req.body;
//
//  if (!payload || payload.token !== config('STARBOT_COMMAND_TOKEN')) {
//    let err = 'BONES IS OUTTA CALCIUM';
//    console.log(err);
//    res.status(401).end(err);
//    return
//  }
//
//  let cmd = clarCommand;
//  cmd.handler(payload, res)
//});
//
//
//
//app.post('/commands/boneypants/accept', (req, res) => {
//  let payload = req.body;
//
//  if (!payload || payload.token !== config('STARBOT_COMMAND_TOKEN')) {
//    let err = 'BONES IS OUTTA CALCIUM';
//    console.log(err);
//    res.status(401).end(err);
//    return
//  }
//
//  let cmd = accCommand;
//  cmd.handler(payload, res)
//});
//
//app.post('/commands/boneypants/done', (req, res) => {
//  let payload = req.body;
//
//  if (!payload || payload.token !== config('STARBOT_COMMAND_TOKEN')) {
//    let err = 'BONES IS OUTTA CALCIUM';
//    console.log(err);
//    res.status(401).end(err);
//    return
//  }
//
//  let cmd = donCommand;
//  cmd.handler(payload, res)
//});
//
//app.post('/commands/boneypants/reject', (req, res) => {
//  let payload = req.body;
//
//  if (!payload || payload.token !== config('STARBOT_COMMAND_TOKEN')) {
//    let err = 'BONES IS OUTTA CALCIUM';
//    console.log(err);
//    res.status(401).end(err);
//    return
//  }
//	
//  let cmd = rejCommand;
//  cmd.handler(payload, res)
//});
//
//app.post('/commands/boneypants/progress', (req, res) => {
//  let payload = req.body;
//
//  if (!payload || payload.token !== config('STARBOT_COMMAND_TOKEN')) {
//    let err = 'BONES IS OUTTA CALCIUM';
//    console.log(err);
//    res.status(401).end(err);
//    return
//  }
//
//  let cmd = proCommand;
//  cmd.handler(payload, res)
//});
//
//app.post('/commands/boneypants/forward', (req, res) => {
//  let payload = req.body;
//
//  if (!payload || payload.token !== config('STARBOT_COMMAND_TOKEN')) {
//    let err = 'BONES IS OUTTA CALCIUM';
//    console.log(err);
//    res.status(401).end(err);
//    return
//  }
//
//  let cmd = forCommand;
//  cmd.handler(payload, res)
//});
//
//app.post('/commands/boneypants/reject', (req, res) => {
//  let payload = req.body
//
//  if (!payload || payload.token !== config('STARBOT_COMMAND_TOKEN')) {
//    let err = '✋  Star—what? An invalid slash token was provided\n' +
//              '   Is your Slack slash token correctly configured?'
//    console.log(err)
//    res.status(401).end(err)
//    return
//  }
//
//  let cmd = _.reduce(commands, (a, cmd) => {
//    return payload.text.match(cmd.pattern) ? cmd : a
//  }, rejCommand)
//
//  cmd.handler(payload, res)
//})


//part of final post
//  if (config('SLACK_TOKEN')) {
//    bot.listen({ token: config('SLACK_TOKEN') })
//  }
