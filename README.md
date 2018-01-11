# 🌟 Task Ask


Task Ask is a Slack App, BCIT Student Project in partnership with Ayogo Health Inc.  The App allows users to assign and track tasks through Slack.  

It is based on Starbot.

[Starbot](https://blog.heroku.com/how-to-deploy-your-slack-bots-to-heroku) 

### Contributers
* Brett Dixon:  [brettdixon1@gmail.com](brettdixon1@gmail.com)
* Tommy Do: [sudotommy@gmail.com](sudotommy@gmail.com)
* Sukhman Nijjer: [nijjersukhman@gmail.com](nijjersukhman@gmail.com)
* Gagandeep Heer: [gagandeeph29@gmail.com](gagandeeph29@gmail.com)
* Dylan Chew: [dylan.t.chew@gmail.com](dylan.t.chew@gmail.com)

### Slack Commands

#### /ask
![AskCommand](https://i.imgur.com/Hj24LyDh.png "Ask Command")
#### /accept
![AcceptCommand](https://i.imgur.com/iS3rIsMh.png "Accept Command")

### Installation and Operation

We recommend running Node 8.9.0 or higher.  Run `npm install` to install all relevant node modules.

Also before running you must setup your App in the Slack API and create a PostgreSQL database.  Once these are ready you will have to provide the relevant variables through either your server Environment Variables or by hardcoding them into `./src/config.js`.  If you do decide to hardcode your variables you should add `./src/config.js` to the `.gitignore` file.  This will prevent your sensitive credentials from being exposed to the public on your Git Repository.

Once all of this is complete you can run the app through `node ./src/index.js`.

### Postgres SQL Tables
#### Ask Table
create table ask_table (serial_id serial not null primary key, sender_id varchar(20) not null, receiver_id varchar(20) not null, 
status varchar(10) default 'PENDING', jira_id varchar(10), title varchar(35), req_desc varchar(300), req_date timestamp default now(), fin_date timestamp, due_date timestamp);

#### Clarify Table
create table clarify_table (serial_id serial not null references ask_table (serial_id) on delete cascade, 
clar_quest varchar(150), question_id serial primary key, clar_answer varchar(150), q_date timestamp);

#### User Table
create table user_table (f_name varchar(25), l_name varchar(25), slack_id varchar(25), email varchar(30), 
jira_name varchar(50));
