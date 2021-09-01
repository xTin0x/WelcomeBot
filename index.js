require('dotenv').config();
const Discord = require('discord.js');
const client = new Discord.Client();
const points = require('./points.json');
const reactionTimes = require('./reactionTimes.json')
const fs = require('fs');

const prefix = process.env.PREFIX;

client.once('ready', () => {
  console.log('[INIT]Ready!');
});

client.login(process.env.TOKEN);

var lockcd = false //dumb, but gets the job done

/* Commands
TODO: 	Upgrade to Slash Commands
		Improve handler with command files */
client.on('message', async message => {
	const whocalls = message.author;
	if (!message.content.startsWith(prefix) || whocalls.bot) return;

	const args = message.content.slice(prefix.length).trim().split(' ');
	const command = args.shift().toLowerCase();

	if ((command == 'cd' || command == 'countdown') && lockcd == false) {
		if (args.length < 1) {
			message.channel.send("Incorrect number of arguments.");
			return;
		} else if (message.mentions.users.size < 1){ 
			lockcd = true;
			let left = parseTimeArg(args[0]);
			countdown(left, message.channel);
			return;
		} else {
			lockcd = true;
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
			console.log(`[CD]mention countdown ON STAND BY with ${left} as time`);
			console.log(`[CD]waiting for ${participants.map(user => user.username).join(', ')} to react on countdown confirmation`)

			readyCollector.on('collect', async (r,user) => {
				if (r.emoji.name === '👎') {
					console.log(`[CD]${user.username} is NOT READY`);
					readyCollector.stop(`${user.username} is NOT READY`);
					embed.setTitle('COUNTDOWN CANCELLED')
					.setDescription(`${user.username} is NOT READY. Countdown cancelled...`)
					readyMsg.delete();
					readyMsg = await message.channel.send(embed);
					setTimeout(() => {
						readyMsg.delete();
					}, 5000);
					lockcd = false;
					return;
				} else {
					console.log(`[CD]${user.username} is READY`);
				}

				if (readyCollector.users.equals(participants) && r.emoji.name != '👎') {
					embed.setTitle('COUNTDOWN STARTING')
					.setDescription('All participants are ready!\nGood Luck!');
					readyMsg.delete();
					readyMsg = await message.channel.send(embed);

					countdown(left, message.channel);
					return;
				}
			});
			readyCollector.on('remove', async (r,user) => {
				console.log(`[CD]${user.username} is NO LONGER READY`)
			});
			readyCollector.on('end', async (collected, reason) => {
				if (reason.includes('time')){
					console.log(`[CD]countdown TIMED OUT`);
					const noAnswers = readyCollector.users.difference(participants).map(user => user.username);
					console.log(`[CD]${noAnswers.join(', ')} didn't answer within 60 seconds`)
					embed.setTitle('COUNTDOWN CANCELLED')
					.setDescription(`${noAnswers.join(', ')} didn't react. Countdown cancelled...`);
					readyMsg.delete();
					readyMsg = await message.channel.send(embed);
					setTimeout(() => {
						readyMsg.delete();
					}, 5000);
					lockcd = false;
				}
			});
		}
	} else if (command == 'welcomepoints' || command == 'wp'){
		// sort point db into array []
		const sortedLB = Object.entries(points)
			.sort(([,x],[,y]) => y-x);

		// base embed
		const embed = new Discord.MessageEmbed()
		.setTitle('Welcome Points Leaderboard')
		.setFooter(`Request by ${whocalls.tag}`, whocalls.displayAvatarURL());

		// send top25 (or less if not enough entries) if no arguments
		if (args.length == 0){
			console.log(`[WP]${whocalls.username} queried top welcomers`);
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
				embed.addField(`🔸${getPlacementString(i+1)} ${whoisname}`, `${sortedLB[i][1]} points`, true);
			}

			message.reply(embed);
		} else if (args.length > 1) {
			// ONLY ONE MENTION ALLOWED FOR QUERY
			console.log('[WP]too many args');
			return;
		} else if (args[0] == 'reaction' || args[0] == 'rt'){
			console.log(`[WP]${whocalls.username} queried fastest welcomers`);
			let maxentries = 0;
			const sortedRT = Object.entries(reactionTimes)
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
				embed.addField(`🔸${getPlacementString(i+1)} ${whoisname}`, `${sortedRT[i][1]} ms`, true);
			}

			message.reply(embed);
		} else if (args[0] == 'me') {
			console.log(`[WP]${whocalls.username} queried their welcome points info`);
			let pointsstr = '0 points';
			if(points[whocalls.id]) {
				pointsstr = points[whocalls.id] + ' points'
			}

			let posstr = 'Not on the leaderboard';
			if (sortedLB.findIndex(entry => entry[0] == whocalls.id)) {
				posstr = `${getPlacementString(sortedLB.findIndex(entry => entry[0] == whocalls.id)+1)} place`;
			}

			let rtstr = 'No reaction time registered';
			if (reactionTimes[whocalls.id]) { 
				rtstr = reactionTimes[whocalls.id]+'ms'
			}

			embed.setDescription(`Your welcome points`)
			embed.addField(pointsstr,posstr)
			embed.addField(`Fastest Welcome`,rtstr)

			message.reply(embed);
		} else if (message.mentions.users.size == 1) {
			let who = message.mentions.users.first();
			console.log(`[WP]${whocalls.username} queried ${who.usename}'s welcome points info`);

			let pointsstr = '0 points';
			if(points[who.id]) {
				pointsstr = points[who.id] + ' points'
			}

			let posstr = 'Not on the leaderboard';
			if (sortedLB.findIndex(entry => entry[0] == who.id)) {
				posstr = `${getPlacementString(sortedLB.findIndex(entry => entry[0] == who.id)+1)} place`;
			}

			let rtstr = 'No reaction time registered';
			if (reactionTimes[who.id]) { 
				rtstr = reactionTimes[who.id]+'ms'
			}

			embed.setDescription(`${who.username}'s welcome points`)
			embed.addField(pointsstr,posstr)
			embed.addField(`Fastest Welcome`,rtstr)

			message.reply(embed);
		} else if (parseInt(args[0]) > 0) {
			const pos = parseInt(args[0]);
			console.log(`[WP]${whocalls.username} queried pos. ${pos} on the WP leaderboard`);
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
				if (reactionTimes[sortedLB[pos-1][0]]) { 
					rtstr = reactionTimes[sortedLB[pos-1][0]]+'ms'
				}

				embed.setDescription(`${whoisname}'s welcome points`)
				embed.addField(pointsstr,posstr)
				embed.addField(`Fastest Welcome`,rtstr)

				message.reply(embed);
			}
		}
	} else if (command == 'help' || command == 'h'){
		const embed = new Discord.MessageEmbed()
		.setTitle(`MGSRBot's List of Commands`)
		.setDescription(`Commands have a short version indicated with <angle brackets>, with optional arguments in [square brackets]. If only one argument from a group of arguments {arg1 | arg2} is allowed it will be indicated with {curly brackets}. If the argument is a keyword it will be indicated with "quotation marks".`)
		.setFooter(`Request by ${whocalls.tag}`, whocalls.displayAvatarURL())
		.addField(`countdown<cd> [TIME] [@User(s)]`, `Starts a countdown. If no users are mentioned the TIME argument is mandatory. TIME can only be in the range {3...10} and if omitted will default to 5. If any user is mentioned in the command the countdown will only start once all mentioned users have declared they're ready.\n\nExamples:\n"${prefix}cd 5" will start counting down from 5.\n\n "${prefix}cd @UserA @UserB" will ask UserA and UserB for confirmation via reactions before starting counting down from 5.`)
		.addField(`welcomepoints<wp> [ {"me" | "rt" | @User | POSITION} ]`, `Welcome points leaderboard. If you use the command without arguments it shows you the top 25. If you mention a User or use {"me" | POSITION} as an argument it will show said user's info. If "rt" is used as an argument it will show a list of the fastest welcomes.\n\nExamples:\n"${prefix}wp @${whocalls.username}" shows you ${whocalls.username}'s points, fastest reaction and position in the leaderboard.\n\n"${prefix}wp 42" shows you the 42nd place in the leaderboard.`);
		message.reply(embed);
	}
});

/* Welcome Points */
client.on("guildMemberAdd", member => {
	const welcomeChannel = member.guild.systemChannel;
	let jointime = new Date();
	console.log(`[WP]${member.user.username} just joined the server, waiting for welcome message...`);

	const filter = m => m.content.toLowerCase().startsWith('welcome') 
	|| m.content.toLowerCase().startsWith('greetings')
	|| m.content.toLowerCase().startsWith('salutations')
	|| m.content === `What's crack-a-lackin' my homie`
	|| m.content == `https://c.tenor.com/Qy5sUxL5phgAAAAM/forest-gump-wave.gif`;

	const collector = welcomeChannel.createMessageCollector(filter);

	collector.on('collect', m => {
		let answertime = new Date();
		let deltatime = answertime - jointime;
		let dtstring = deltatime + 'ms';
		console.log(`[WP]${m.author.username} was the first to welcome ${member.user.username}! They scored a welcome point!`);
		if (!points[m.author.id]){
			points[m.author.id] = 1;
		} else {
			points[m.author.id] += 1;
		}
		if (!reactionTimes[m.author.id]){
			reactionTimes[m.author.id] = deltatime;
			dtstring = dtstring+' (New PB!)';
		} else if (reactionTimes[m.author.id] > deltatime) {
			reactionTimes[m.author.id] = deltatime;
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

function countdown(time, channel){
	let left = time;
	console.log(`[CD]countdown STARTED with ${left} as time`);
	let countdown = setInterval(function(){
			if (left > 0){
				channel.send(left);
				left = left - 1;
			}
			else if (left == 0){
				channel.send('GO!');
				lockcd = false;
				console.log('[CD]countdown ENDED')
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

/* Thanks Carigs <3 
https://github.com/mcarigs */
function getPlacementString(pos){
    let i = pos % 10, j = pos % 100;
    if (i == 1 && j != 11) { return `${pos}st`; }
    if (i == 2 && j != 12) { return `${pos}nd`; }
    if (i == 3 && j != 13) { return `${pos}rd`; }
    return `${pos}th`;
}