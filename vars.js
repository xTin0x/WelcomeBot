const Discord = require('discord.js');
const config = require('./config.json');
const fs = require('fs');
const prefix = config.prefix;

exports.Discord = Discord;
exports.client = new Discord.Client();
exports.config = config;
exports.fs = fs;
exports.prefix = prefix;
exports.rstDecimal = 2; // Response time accuracy

exports.points = require('./leaderboards/points.json');
exports.reactionTimes = require('./leaderboards/reactionTimes.json');
exports.overallPoints = require('./leaderboards/pointsOverall.json');
exports.overallRT = require('./leaderboards/reactionTimesOverall.json');
