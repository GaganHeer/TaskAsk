const express = require("express");
const port = process.env.PORT || 3000;
const path = require("path");
const bodyParser = require("body-parser");
const session = require ("express-session");

var app = express();
const server = require("http").createServer(app);
var io = require("socket.io")(server);

//import the restaurant class
const Credential = require("./credentials");
//initialize credential class
const credentials = new Credential();

server.listen(port, function(err){
    if (err) {
        console.log(err);
        return false;
    }

    console.log("Server is running on port " + port);
    console.log("Welcome to TaskAsk Server.");
    console.log(credentials.slackToken);
});