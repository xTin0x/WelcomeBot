const Discord = require('discord.js');
const fs = require('fs');
const config = require('./config.json');

exports.Discord = Discord;
exports.client = new Discord.Client();
exports.fs = fs;
exports.config = config;
exports.rstDecimal = 2; // Response time accuracy

exports.points = require('./leaderboards/points.json');
exports.reactionTimes = require('./leaderboards/reactionTimes.json');
exports.overallPoints = require('./leaderboards/pointsOverall.json');
exports.overallRT = require('./leaderboards/reactionTimesOverall.json');
