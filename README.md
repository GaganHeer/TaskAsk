# 🌟 Task Ask


[![js-standard-style](https://cdn.rawgit.com/feross/standard/master/badge.svg)](https://github.com/feross/standard)

Task Ask is a Slack App, BCIT Student Project in partnership with Ayogo Health Inc.  The App allows users to assign and track tasks through Slack.  It is based on Starbot.


[Starbot](https://blog.heroku.com/how-to-deploy-your-slack-bots-to-heroku) 

If you have questions email Brett Dixon at:  [brettdixon1@gmail.com](brettdixon1@gmail.com)

### Supported `/slash` commands

Task Ask supports the following "Slash" commands.

- `/ask <Reciever> <Task Description>` - Requests the Reciever to perform a task. 
- `/accept <Task ID>` - Accepts the task requested by a sender.
- `/reject <Task ID> <Rejection Reason>` - Rejects a task with a reason.
- `/done <Task ID>` - Indicates the task has been completed.
- `/progress <Task ID>` - Asks for a status of a task from the person it was assigned to.
- `/summary` - Returns a list of task assigned to and by the user and some basic stats about the user.


### Install

```shell
$ npm install
```
