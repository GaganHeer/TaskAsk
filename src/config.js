'use strict';

const dotenv = require('dotenv');
const ENV = process.env.NODE_ENV || 'development';

if (ENV === 'development') dotenv.load();

const config = {
  ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
  PROXY_URI: process.env.PROXY_URI,
  WEBHOOK_URL: process.env.WEBHOOK_URL,
  STARBOT_COMMAND_TOKEN: process.env.STARBOT_COMMAND_TOKEN,
  OAUTH_TOKEN: process.env.OAUTH_TOKEN,
  POST_BOT_TOKEN: process.env.POST_BOT_TOKEN,
  SLACK_TOKEN: process.env.SLACK_TOKEN,
  ICON_EMOJI: ':stars:',
  JIRA_HOST: process.env.JIRA_HOST,
  JIRA_PORT: 443,
  JIRA_USER: process.env.JIRA_USER,
  JIRA_PWD: process.env.JIRA_PWD,
  DB_URL:  process.env.ELEPHANT_SQL,
  DB_CONFIG: {
    user: process.env.DB_USER,
    database: process.env.DB_USER,   //for ElephantSQL the user and database are the same.
    password: process.env.DB_PWD,
    host: process.env.DB_HOST,
    port: 5432,   //This is the default for ElephantSQL
    max: 5,
    idleTimeoutMillis: 3000
  }
};

module.exports = (key) => {
  if (!key) return config;

  return config[key]
}
