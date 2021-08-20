const config = require('./config.json');
const Discord = require('discord.js');
const client = new Discord.Client();
const points = require('./points.json');
const reactionTimes = require('./reactionTimes.json')
const fs = require('fs');

const prefix = config.prefix;
var welcomeChannel;
var debugChannel;

client.once('ready', async () => {
  welcomeChannel = await client.channels.fetch('1234...'); //replace 1234... with the #general channel id
  console.log('Ready!');
});

client.login(config.token);

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
		if (args.length != 1) {
			message.channel.send("Incorrect number of arguments.\n Correct Usage: ```!cd 5``` counts down from 5.");
			return;
		}

		else { 
			lockcd = true;
			var left = parseInt(args[0]);
			console.log(`cd started with ${left} as arg`);
			// COUNTDOWN RANGE: 3 to 5 seconds
			if (left > 5) { left=5; }
			else if (left < 3) { left = 3; }
			else if (!(left >=3 || left <=5)) { left = 3; }
			var countdown = setInterval(function(){
					if (left > 0){
						message.channel.send(left);
						left = left - 1;
					}
					else if (left == 0){
						message.channel.send('GO!');
						lockcd = false;
						console.log('cd ended')
						clearInterval(countdown);
					}
			},1000);
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
		if (args.length === 0){
			let maxentries = 0;
			embed.setDescription(`🏆 Top Welcomers 🏆`)
			if (sortedLB.length < 25){
				maxentries = sortedLB.length;
			} else {
				maxentries = 25;
			}
			for (let i = 0; i < maxentries; i++) {
				var whoisname = 'Unknown [not in server]';
				try {
					const whois = await message.guild.members.fetch(sortedLB[i][0]);
					whoisname = whois.user.username;
				} catch (err) {
				}
				embed.addField(`🔸${i+1} ${whoisname}`, `${sortedLB[i][1]} points`, true);
			}

			message.reply(embed);
		} else if (args.length > 1) {
			// ONLY ONE MENTION ALLOWED FOR QUERY
			console.log('too many args');
			return;
		} else if (args[0] == 'reaction' || args[0] == 'rt'){
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
				let whoisname = 'unknown [not in server]';
				try {
					const whois = await message.guild.members.fetch(sortedRT[i][0]);
					whoisname = whois.user.username;
				} catch (err) {
				}
				embed.addField(`🔸${i+1} ${whoisname}`, `${sortedRT[i][1]} ms`, true);
			}

			message.reply(embed);
		} else if (args[0] == 'me') {
			let pointsstr = '0 points';
			if(points[whocalls.id]) {
				pointsstr = points[whocalls.id] + ' points'
			}

			let posstr = 'Not on the leaderboard';
			if (sortedLB.findIndex(entry => entry[0] == whocalls.id)) {
				posstr = (sortedLB.findIndex(entry => entry[0] == whocalls.id)+1) + '° place';
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
			if (pos > sortedLB.length) {
				console.log('query outside of range')
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

				let posstr = pos + '° place';

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
		.setDescription(`Commands have a short version indicated in <angle brackets>, with optional arguments in [square brackets]`)
		.setFooter(`Request by ${whocalls.tag}`, whocalls.displayAvatarURL())
		.addField(`countdown <cd> n`, `Starts a countdown.\n\nExample: ${prefix}cd 5`)
		.addField(`welcomepoints <wp> [me][@User]`, `Welcome points leaderboard.\nIf you use the command without arguments it shows you the top 10. If you mention a User or use "me" as an argument it shows the points that specific user has.\n\nExample: ${prefix}wp @${whocalls.username}`);
		message.reply(embed);
	}
});

/* Welcome Points */
client.on("guildMemberAdd", member => {
	let jointime = new Date();
	console.log(`${member.user.username} just joined the server, waiting for welcome message...`);

	const filter = m => m.content.toLowerCase().startsWith('welcome') 
	|| m.content.toLowerCase().startsWith('greetings')
	|| m.content.toLowerCase().startsWith('salutations')
	|| m.content === `What's crack-a-lackin' my homie`
	|| m.content == `https://c.tenor.com/Qy5sUxL5phgAAAAM/forest-gump-wave.gif`;

	const collector = welcomeChannel.createMessageCollector(filter);
	const debugcollector = debugChannel.createMessageCollector(filter);

	collector.on('collect', m => {
		let answertime = new Date();
		let deltatime = answertime - jointime;
		let dtstring = deltatime + 'ms';
		console.log(`${m.author.username} was the first to welcome ${member.user.username}! They scored a welcome point!`);
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

/* DEBUG */
	
});

function getPlacementString(place) {
	// get last digit of the placement
	let lastDigit = place.substr(place.length - 1, place.length);
	if (lastDigit === 1) {
		return `${place}st`;
	} else if (lastDigit === 2) {
		return `${place}nd`;
	} else if (lastDigit === 3) {
		return `${place}rd`;
	}
	return `${place}th`;
}