require('console-stamp')(console, {
	format: ':date(yyyy/mm/dd HH:MM:ss.l)'
} );
require('dotenv').config();
const Discord = require('discord.js');
const client = new Discord.Client();
const config = require('./config.json')
const points = require('./points.json');
const reactionTimes = require('./reactionTimes.json')
const fs = require('fs');
const prefix = config.prefix;

if (process.env.ENABLE_METRICS == true || config.enable_metrics == true) {
	const express = require('express');
	const PORT = 5000;
	const app = express();
	const Prometheus = require('prom-client');

	// Metrics configuration
	const collectDefaultMetrics = Prometheus.collectDefaultMetrics;
	collectDefaultMetrics({ timeout: 5000 });
	app.get('/metrics', async (req, res) => {
	    res.set('Content-Type', Prometheus.register.contentType)
	    res.end(await Prometheus.register.metrics())
	})
	app.listen(PORT);
	console.log(`Metrics endpoint running at localhost:5000/metrics`);
}

client.once('ready', () => {
  console.log('[INIT] Ready!');
});

//client.login(process.env.TOKEN); Using .json token while I fix Docker issues.
client.login(config.token);

var lockcd = new Object(); //dumb, but gets the job done

/* Commands
TODO: 	Upgrade to Slash Commands
		Improve handler with command files */
client.on('message', async message => {
	/* FILTERS */
	message.mentions.users.sweep(user => user.bot); //cannot reference bots for commands!

	/* GET GUILD PREFIX */
	let guildPrefix = prefix[message.guild.id];
	if (typeof guildPrefix == 'undefined') {
		config.prefix[message.guild.id] = "!" ; 
		guildPrefix = prefix[message.guild.id];
		try { fs.writeFileSync('./config.json', JSON.stringify(config)); }
		catch(err) { console.error(err); }
	}

	const whocalls = message.author;
	
	if (!message.content.startsWith(guildPrefix) || whocalls.bot) return;

	const args = message.content.slice(guildPrefix.length).trim().split(' ');
	const command = args.shift().toLowerCase();
	/* NEW PREFIX COMMAND */
	if ((command == 'p' || command == 'prefix')) {
		if (args.length != 1) {
			message.reply('Invalid number of arguments (max: 1).')
		} else {
			const embed = new Discord.MessageEmbed()
			.setTitle('PREFIX CONFIGURATION')
			.setDescription(`Are you sure you want to change this bot's command prefix to:`)
			.addField(`${args[0]}`, `👍 to confirm. 👎 to cancel.`)
			.setFooter(`Request by ${whocalls.tag}`, whocalls.displayAvatarURL());

			let readyMsg = await message.channel.send(embed);

			readyMsg.react('👍');
			readyMsg.react('👎');

			const readyFilter = (r, user) => (r.emoji.name === '👍' || r.emoji.name === '👎') && user.id === whocalls.id;
			const readyCollector = readyMsg.createReactionCollector(readyFilter, {time:60000, dispose:true});

			console.log(`[GUILD_CONFIG][${message.guild.name}(${message.guild.id})] attempting to change prefix to ${args[0]}`);

			readyCollector.on('collect', async (r,user) => {
				if (r.emoji.name === '👎') {
					console.log(`[GUILD_CONFIG][${message.guild.name}(${message.guild.id})] cancelled prefix change`);
					readyCollector.stop(`${user.username} cancelled`);
					embed.setTitle('PREFIX CONFIGURATION')
					.setDescription(`Prefix change cancelled...`);
					delete embed.fields[0];
					readyMsg.delete();
					readyMsg = await message.channel.send(embed);
					setTimeout(() => {
						readyMsg.delete();
					}, 5000);
					return;
				} else {
					console.log(`[GUILD_CONFIG][${message.guild.name}(${message.guild.id})] prefix succesfully changed to ${args[0]}`);
					config.prefix[message.guild.id] = args[0];
					try { fs.writeFileSync('./config.json', JSON.stringify(config)); }
					catch(err) { console.error(err); }
					embed.setTitle('PREFIX CONFIGURATION')
					.setDescription('Prefix succesfully changed to: ');
					embed.fields[0].value = '👍';
					readyMsg.delete();
					readyMsg = await message.channel.send(embed);
				}
			});
		}
		config.prefix[message.guild.id] = "!" ; 
		guildPrefix = prefix[message.guild.id];
		try { fs.writeFileSync('./config.json', JSON.stringify(config)); }
		catch(err) { console.error(err); }
	}

	/* COUNTDOWN COMMAND */ 
	if ((command == 'cd' || command == 'countdown') &&(lockcd[message.channel.id] === false || typeof lockcd[message.channel.id] == 'undefined') ) {
		/* NO ARGS (DEFAULT CD OF 5 SECONDS */ 
		if (args.length < 1) {
			lockcd[message.channel.id] = true;
			const left = parseTimeArg(5);
			countdown(left,message);
			return;
		} 
		/* NO MENTIONED USERS (CD: ARG OR DEFAULT 5)*/
		else if (message.mentions.users.size < 1) { 
			lockcd[message.channel.id] = true;
			let left = parseTimeArg(args[0]);
			countdown(left, message);
			return;
		} 
		/* MENTIONED USERS (CD: ARG OR DEFAULT 5) */
		else {
			lockcd[message.channel.id] = true;
			const participants = message.mentions.users;
			// base embed
			const embed = new Discord.MessageEmbed()
			.setTitle('READY?')
			.setDescription('Countdown ready.\nOnce all participants react with 👍 countdown will start.\nReact with 👎 to cancel the countdown.\nIf any participant fails to send a reaction within 1 minute, the countdown will be cancelled.')
			.setFooter(`Request by ${whocalls.tag}`, whocalls.displayAvatarURL());

			let readyMsg = await message.channel.send(embed);

			readyMsg.react('👍');
			readyMsg.react('👎');

			const readyFilter = (r, user) => (r.emoji.name === '👍' || r.emoji.name === '👎') && participants.has(user.id);
			const readyCollector = readyMsg.createReactionCollector(readyFilter, {time:60000, dispose:true});

			let left = parseTimeArg(args[0]);
			console.log(`[CD][${message.guild.name}(${message.guild.id})] mention countdown ON STAND BY with ${left} as time`);
			console.log(`[CD][${message.guild.name}(${message.guild.id})] waiting for ${participants.map(user => user.username).join(', ')} to react on countdown confirmation`)

			readyCollector.on('collect', async (r,user) => {
				if (r.emoji.name === '👎') {
					console.log(`[CD][${message.guild.name}(${message.guild.id})] ${user.username} is NOT READY`);
					readyCollector.stop(`${user.username} is NOT READY`);
					embed.setTitle('COUNTDOWN CANCELLED')
					.setDescription(`${user.username} is NOT READY. Countdown cancelled...`)
					readyMsg.delete();
					readyMsg = await message.channel.send(embed);
					setTimeout(() => {
						readyMsg.delete();
					}, 5000);
					lockcd[message.channel.id] = false;
					return;
				} else {
					console.log(`[CD][${message.guild.name}(${message.guild.id})] ${user.username} is READY`);
				}
				readyCollector.users.sweep(user => user.bot);

				if (readyCollector.users.equals(participants) && r.emoji.name != '👎') {
					embed.setTitle('COUNTDOWN STARTING')
					.setDescription('All participants are ready!\nGood Luck!');
					readyMsg.delete();
					readyMsg = await message.channel.send(embed);

					countdown(left, message);
					return;
				}
			});
			readyCollector.on('remove', async (r,user) => {
				console.log(`[CD][${message.guild.name}(${message.guild.id})] ${user.username} is NO LONGER READY`)
			});
			readyCollector.on('end', async (collected, reason) => {
				if (reason.includes('time')){
					console.log(`[CD][${message.guild.name}(${message.guild.id})] countdown TIMED OUT`);
					const noAnswers = readyCollector.users.difference(participants).map(user => user.username);
					console.log(`[CD][${message.guild.name}(${message.guild.id})] ${noAnswers.join(', ')} didn't answer within 60 seconds`)
					embed.setTitle('COUNTDOWN CANCELLED')
					.setDescription(`${noAnswers.join(', ')} didn't react. Countdown cancelled...`);
					readyMsg.delete();
					readyMsg = await message.channel.send(embed);
					setTimeout(() => {
						readyMsg.delete();
					}, 5000);
					lockcd[message.channel.id] = false;
				}
			});
		}
	} 
	/* WELCOME POINTS COMMAND */ 
	else if (command == 'welcomepoints' || command == 'wp'){
		/* GET OR INITIALIZE POINTS/REACTION LEADERBOARDS */
		let guildPoints = points[message.guild.id];
		if (typeof guildPoints == 'undefined') {
			points[message.guild.id] = new Object() ; 
			guildPoints = points[message.guild.id];
			try { fs.writeFileSync('./points.json', JSON.stringify(points)); }
			catch(err) { console.error(err); };
		}
		let guildRT = reactionTimes[message.guild.id];
		if (typeof guildRT == 'undefined') {
			reactionTimes[message.guild.id] = new Object() ; 
			guildRT = reactionTimes[message.guild.id];
			try { fs.writeFileSync('./reactionTimes.json', JSON.stringify(reactionTimes)); }
			catch(err) { console.error(err); }
		}

		// sort point db into array []
		const sortedLB = Object.entries(guildPoints)
			.sort(([,x],[,y]) => y-x);

		// base embed
		const embed = new Discord.MessageEmbed()
		.setTitle('Welcome Points Leaderboard')
		.setFooter(`Request by ${whocalls.tag}`, whocalls.displayAvatarURL());

		// send top25 (or less if not enough entries) if no arguments
		if (args.length == 0){
			console.log(`[WP][${message.guild.name}(${message.guild.id})] ${whocalls.username} queried top welcomers`);
			let maxentries = 0;
			embed.setDescription(`🏆 Top Welcomers 🏆`)
			if (sortedLB.length < 25){
				maxentries = sortedLB.length;
			} else {
				maxentries = 25;
			}
			for (let i = 0; i < maxentries; i++) {
				let whoisname = 'Unknown';
				try {
					//const whois = await message.guild.members.fetch(sortedLB[i][0]);
					const whois = await client.users.fetch(sortedLB[i][0]);
					whoisname = whois.username;
				} catch (err) {
				}
				embed.addField(`${getPlacementString(i+1)} ${whoisname}`, `${sortedLB[i][1]} points`, true);
			}

			message.reply(embed);
		} else if (args.length > 1) {
			// ONLY ONE MENTION ALLOWED FOR QUERY
			console.log(`[WP][${message.guild.name}(${message.guild.id})] too many args`);
			return;
		} else if (args[0] == 'reaction' || args[0] == 'rt'){
			console.log(`[WP][${message.guild.name}(${message.guild.id})] ${whocalls.username} queried fastest welcomers`);
			let maxentries = 0;
			const sortedRT = Object.entries(guildRT)
			.sort(([,x],[,y]) => x-y);

			embed.setDescription('⚡ Fastest Welcomes ⚡');

			if (sortedRT.length < 25){
				maxentries = sortedRT.length;
			} else {
				maxentries = 25;
			}
			for (var i = 0; i < maxentries; i++) {
				let whoisname = 'Unknown';
				try {
					const whois = await client.users.fetch(sortedRT[i][0]);
					whoisname = whois.username;
				} catch (err) {
				}
				embed.addField(`${getPlacementString(i+1)} ${whoisname}`, `${sortedRT[i][1]} ms`, true);
			}

			message.reply(embed);
		} else if (args[0] == 'me') {
			console.log(`[WP][${message.guild.name}(${message.guild.id})] ${whocalls.username} queried their welcome points info`);
			let pointsstr = '0 points';
			if(guildPoints[whocalls.id]) {
				pointsstr = guildPoints[whocalls.id] + ' points'
			}

			let posstr = 'Not on the leaderboard';
			if (sortedLB.findIndex(entry => entry[0] == whocalls.id) != -1) {
				posstr = `${getPlacementString(sortedLB.findIndex(entry => entry[0] == whocalls.id)+1)} place`;
			}

			let rtstr = 'No reaction time registered';
			if (guildRT[whocalls.id]) { 
				rtstr = guildRT[whocalls.id]+'ms'
			}

			embed.setDescription(`Your welcome points`)
			embed.addField(pointsstr,posstr)
			embed.addField(`Fastest Welcome`,rtstr)

			message.reply(embed);
		} else if (message.mentions.users.size == 1) {
			let who = message.mentions.users.first();
			console.log(`[WP][${message.guild.name}(${message.guild.id})] ${whocalls.username} queried ${who.username}'s welcome points info`);

			let pointsstr = '0 points';
			if(guildPoints[who.id]) {
				pointsstr = guildPoints[who.id] + ' points'
			}

			let posstr = 'Not on the leaderboard';
			if (sortedLB.findIndex(entry => entry[0] == who.id) != -1) {
				posstr = `${getPlacementString(sortedLB.findIndex(entry => entry[0] == who.id)+1)} place`;
			}

			let rtstr = 'No reaction time registered';
			if (guildRT[who.id]) { 
				rtstr = guildRT[who.id]+'ms'
			}

			embed.setDescription(`${who.username}'s welcome points`)
			embed.addField(pointsstr,posstr)
			embed.addField(`Fastest Welcome`,rtstr)

			message.reply(embed);
		} else if (parseInt(args[0]) > 0) {
			const pos = parseInt(args[0]);
			console.log(`[WP][${message.guild.name}(${message.guild.id})] ${whocalls.username} queried pos. ${pos} on the WP leaderboard`);
			if (pos > sortedLB.length) {
				console.log('[WP]query outside of range')
				message.reply(`This leaderboard only has ${sortedLB.length} entries, try with a number lower than that.`)
				return;
			} else {
				let whoisname = 'unknown [not in server]';
				try {
					const whois = await message.guild.members.fetch(sortedLB[pos-1][0]);
					whoisname = whois.user.username;
				} catch (err) {
				}
				let pointsstr = sortedLB[pos-1][1]+' points';

				let posstr = `${getPlacementString(pos)} place`;

				let rtstr = 'No reaction time registered';
				if (guildRT[sortedLB[pos-1][0]]) { 
					rtstr = guildRT[sortedLB[pos-1][0]]+'ms'
				}

				embed.setDescription(`${whoisname}'s welcome points`)
				embed.addField(pointsstr,posstr)
				embed.addField(`Fastest Welcome`,rtstr)

				message.reply(embed);
			}
		}
	} else if (command == 'help' || command == 'h'){
		message.reply(sendHelp(whocalls, guildPrefix));
	}
});

/* Welcome Points */
client.on("guildMemberAdd", async member => {
	const welcomeChannel = await member.guild.systemChannel;
	if (welcomeChannel === null){
		return;
	}
	const jointime = new Date();
	console.log(`[WP][${member.guild.name}(${member.guild.id})] ${member.user.username} just joined the server, waiting for welcome message...`);

	const filter = m => m.content.toLowerCase().startsWith('welcome') 
	|| m.content.toLowerCase().startsWith('greetings')
	|| m.content.toLowerCase().startsWith('salutations')
	|| m.content === `What's crack-a-lackin' my homie`
	|| m.content == `https://c.tenor.com/Qy5sUxL5phgAAAAM/forest-gump-wave.gif`;

	const collector = welcomeChannel.createMessageCollector(filter,  {time:43200000});

	collector.on('collect', async m => {
		const guildPoints = points[m.guild.id];
		const guildRT = reactionTimes[m.guild.id];
		const answertime = new Date();
		const deltatime = answertime - jointime;
		let dtstring = deltatime + 'ms';
		console.log(`[WP][${m.guild.name}(${m.guild.id})] ${m.author.username} was the first to welcome ${member.user.username}! They scored a welcome point!`);
		if (guildPoints[m.author.id] === undefined || guildPoints[m.author.id] == 0){
			points[m.guild.id][m.author.id] = 1;
		} else {
			points[m.guild.id][m.author.id] += 1;
		}
		if (guildRT[m.author.id] === undefined){
			reactionTimes[m.guild.id][m.author.id] = deltatime;
			dtstring = dtstring+' (New PB!)';
		} else if (guildRT[m.author.id] > deltatime) {
			reactionTimes[m.guild.id][m.author.id] = deltatime;
			dtstring += ' (New PB!)';
		}
		m.reply(`+1 welcome point! [Response time: ${dtstring}]`);
		collector.stop('welcomed');
		try {
			fs.writeFileSync('./points.json', JSON.stringify(points));
			fs.writeFileSync('./reactionTimes.json', JSON.stringify(reactionTimes));
		} catch (err) {
			console.error(err)
		}
	});
});

client.on("guildCreate", async guild => {
	console.log(`[NEW SERVER]bot was invited to a new server ${guild.name}(${guild.id})`)
	try {
		const welcomeChannel = await guild.systemChannel;
		welcomeChannel.send(sendHelp('new', '!'));
	} catch(err) {
		console.log(`[NEW SERVER]${guild.name}(${guild.id}) doesn't have a systemChannel!`)
	}
})

function countdown(time, message){
	let left = time;
	let channel = message.channel;
	console.log(`[CD][${message.guild.name}(${message.guild.id})] countdown STARTED with ${left} as time`);
	let countdown = setInterval(function(){
			if (left > 0){
				channel.send(left);
				left = left - 1;
			}
			else if (left == 0){
				channel.send('GO!');
				lockcd[channel.id] = false;
				console.log(`[CD][${message.guild.name}(${message.guild.id})] countdown ENDED`)
				clearInterval(countdown);
			}
	},1000);
}

function parseTimeArg(time){
	let left = parseInt(time);
	// COUNTDOWN RANGE: 3 to 5 seconds
	if (left > 10) { left=10; }
	else if (left < 3) { left = 3; }
	else if (!(left >=3 || left <=10)) { left = 5; }
	return left;
}

function sendHelp(whocalls, guildPrefix) {
	const embed = new Discord.MessageEmbed()
		.setTitle(`WelcomeBot's List of Commands`)
		.setDescription(`Welcome points are awarded to the first user to greet a new member joining the server with a message starting with: \n - Welcome\n - Greetings\n - Salutations\n\n Commands have a short version indicated with <angle brackets>, with optional arguments in [square brackets]. If only one argument from a group of arguments {arg1 | arg2} is allowed it will be indicated with {curly brackets}. If the argument is a keyword it will be indicated with "quotation marks".`)
		.addField(`countdown<cd> [TIME] [@User(s)]`, `Starts a countdown. If no users are mentioned the TIME argument is mandatory. TIME can only be in the range {3...10} and if omitted will default to 5. If any user is mentioned in the command the countdown will only start once all mentioned users have declared they're ready.\n\nExamples:\n"${guildPrefix}cd 5" will start counting down from 5.\n\n "${guildPrefix}cd @UserA @UserB" will ask UserA and UserB for confirmation via reactions before starting counting down from 5.`)
		.addField(`welcomepoints<wp> [ {"me" | "rt" | @User | POSITION} ]`, `Welcome points leaderboard. If you use the command without arguments it shows you the top 25. If you mention a User or use {"me" | POSITION} as an argument it will show said user's info. If "rt" is used as an argument it will show a list of the fastest welcomes.\n\nExamples:\n"${guildPrefix}wp @${whocalls.username}" shows you ${whocalls.username}'s points, fastest reaction and position in the leaderboard.\n\n"${guildPrefix}wp 42" shows you the 42nd place in the leaderboard.`);
	if ( typeof whocalls == 'string' && whocalls === 'new') return embed;
	embed.setFooter(`Request by ${whocalls.tag}`, whocalls.displayAvatarURL());
	return embed;
}

/* Thanks Carigs <3 
https://github.com/mcarigs */
function getPlacementString(pos){
    let i = pos % 10, j = pos % 100;
    if (i == 1 && j != 11) { 
    	if (pos == 1) return `🟡 ${pos}st`;
    	else return `🔸${pos}st`; }
    if (i == 2 && j != 12) { 
    	if (pos == 2) return `⚪ ${pos}nd`; 
    	else return `🔸${pos}nd`; }
    if (i == 3 && j != 13) {
    	if (pos == 3) return `🟤 ${pos}rd`; 
    	else return `🔸${pos}rd`; }
    return `🔸${pos}th`;
}