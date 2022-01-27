require('console-stamp')(console, {
	format: ':date(yyyy/mm/dd HH:MM:ss.l)'
} );
require('dotenv').config();
const vars = require('./vars.js');
const prefix = require('./modules/prefix.js');
const reset = require('./modules/reset.js');
const countdown = require('./modules/countdown.js');
const welcome = require('./modules/welcome.js');

vars.client.once('ready', () => {
    console.log('[INIT] Ready!');
});

//client.login(process.env.TOKEN); Using .json token while I fix Docker issues.
vars.client.login(vars.config.token);

var lockcd = new Object(); //dumb, but gets the job done

/* Commands
TODO: 	Upgrade to Slash Commands
		Improve handler with command files */
vars.client.on('message', async message => {
	/* Admins & Mods */
	const modRole = message.guild.roles.cache.find(role => role.name == "Mods");
	const adminRole = message.guild.roles.cache.find(role => role.name == "Admin");
	const modMembers = message.guild.members.cache.filter(member => member.roles.cache.find(role => role == modRole)).map(member => member.user.id);
	const adminMembers = message.guild.members.cache.filter(member => member.roles.cache.find(role => role == adminRole)).map(member => member.user.id);

	/* GET OR INITIALIZE POINTS/REACTION LEADERBOARDS */
	let guildPoints = vars.points[message.guild.id];
	if (typeof guildPoints == 'undefined') {
		vars.points[message.guild.id] = new Object() ; 
		guildPoints = vars.points[message.guild.id];
		try { vars.fs.writeFileSync('./leaderboards/points.json', JSON.stringify(vars.points)); }
		catch(err) { console.error(err); }
	}
	let guildRT = vars.reactionTimes[message.guild.id];
	if (typeof guildRT == 'undefined') {
		vars.reactionTimes[message.guild.id] = new Object(); 
		guildRT = vars.reactionTimes[message.guild.id];
		try { vars.fs.writeFileSync('./leaderboards/reactionTimes.json', JSON.stringify(vars.reactionTimes)); }
		catch(err) { console.error(err); }
	}

	/* FILTERS */
	message.mentions.users.sweep(user => user.bot); //cannot reference bots for commands!

	/* GET GUILD PREFIX */
	let guildPrefix = prefix.getGuildPrefix(message, vars.config);

	const whocalls = message.author;
	
	if (!message.content.startsWith(guildPrefix) || whocalls.bot) return;

	const args = message.content.slice(guildPrefix.length).trim().split(' ');
	const command = args.shift().toLowerCase();

	/* NEW PREFIX COMMAND */
	if ((command == 'p' || command == 'prefix')) {
		prefix.setGuildPrefix(args, message, guildPrefix, modMembers, adminMembers);
	}
	/* RESET COMMAND */ 
	if ((command == 'reset' || command == 'r') && args.length == 0 && (lockcd[message.channel.id] === false || typeof lockcd[message.channel.id] == 'undefined')) {
		reset.resetLeaderboard(message, modMembers, adminMembers, lockcd);
	}
	/* COUNTDOWN COMMAND */ 
	if ((command == 'cd' || command == 'countdown') && (lockcd[message.channel.id] === false || typeof lockcd[message.channel.id] == 'undefined') ) {
		countdown.initiateCountdown(message, args, lockcd);
	}
	/* WELCOME POINTS COMMAND */ 
	else if (command == 'welcomepoints' || command == 'wp'){
		welcome.getWelcomePointsLB(message, args, guildPoints, guildRT);
	} else if (command == 'help' || command == 'h'){
		message.reply(sendHelp(whocalls, guildPrefix));
	}
});

/* Welcome Points */
vars.client.on("guildMemberAdd", async member => {
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
		const guildPoints = vars.points[m.guild.id];
		const guildRT = vars.reactionTimes[m.guild.id];
		const answertime = new Date();
		const deltatime = answertime - jointime;
		let dtstring = `${deltatime > 1000 ? (deltatime % 60000 / 1000).toFixed(vars.rstDecimal)+'s' : deltatime+'ms'}`;
		console.log(`[WP][${m.guild.name}(${m.guild.id})] ${m.author.username} was the first to welcome ${member.user.username}! They scored a welcome point!`);
		if (guildPoints[m.author.id] === undefined || guildPoints[m.author.id] == 0){
			vars.points[m.guild.id][m.author.id] = 1;
		} else {
			vars.points[m.guild.id][m.author.id] += 1;
		}
		if (guildRT[m.author.id] === undefined){
			vars.reactionTimes[m.guild.id][m.author.id] = deltatime;
			dtstring = dtstring+' (New PB!)';
		} else if (guildRT[m.author.id] > deltatime) {
			vars.reactionTimes[m.guild.id][m.author.id] = deltatime;
			dtstring += ' (New PB!)';
		}
		m.reply(`+1 welcome point! [Response time: ${dtstring}]`);
		collector.stop('welcomed');
		try {
			vars.fs.writeFileSync('./leaderboards/points.json', JSON.stringify(vars.points));
			vars.fs.writeFileSync('./leaderboards//reactionTimes.json', JSON.stringify(vars.reactionTimes));
		} catch (err) {
			console.error(err)
		}
	});
});

vars.client.on("guildCreate", async guild => {
	console.log(`[NEW SERVER]bot was invited to a new server ${guild.name}(${guild.id})`)
	try {
		const welcomeChannel = await guild.systemChannel;
		welcomeChannel.send(sendHelp('new', '!'));
	} catch(err) {
		console.log(`[NEW SERVER]${guild.name}(${guild.id}) doesn't have a systemChannel!`)
	}
})

const sendHelp = (whocalls, guildPrefix) => {
	const embed = new Discord.MessageEmbed()
		.setTitle(`WelcomeBot's List of Commands`)
		.setDescription(`Welcome points are awarded to the first user to greet a new member joining the server with a message starting with: \n - Welcome\n - Greetings\n - Salutations\n\n Commands have a short version indicated with <angle brackets>, with optional arguments in [square brackets]. If only one argument from a group of arguments {arg1 | arg2} is allowed it will be indicated with {curly brackets}. If the argument is a keyword it will be indicated with "quotation marks".`)
		.addField(`countdown<cd> [TIME] [@User(s)]`, `Starts a countdown. If no users are mentioned the TIME argument is mandatory. TIME can only be in the range {3...10} and if omitted will default to 5. If any user is mentioned in the command the countdown will only start once all mentioned users have declared they're ready.\n\nExamples:\n"${guildPrefix}cd 5" will start counting down from 5.\n\n "${guildPrefix}cd @UserA @UserB" will ask UserA and UserB for confirmation via reactions before starting counting down from 5.`)
		.addField(`welcomepoints<wp> [ {"me" | "rt" | @User | POSITION} ]`, `Welcome points leaderboard. If you use the command without arguments it shows you the top 25. If you mention a User or use {"me" | POSITION} as an argument it will show said user's info. If "rt" is used as an argument it will show a list of the fastest welcomes.\n\nExamples:\n"${guildPrefix}wp @${whocalls.username}" shows you ${whocalls.username}'s points, fastest reaction and position in the leaderboard.\n\n"${guildPrefix}wp 42" shows you the 42nd place in the leaderboard.`);
	if ( typeof whocalls == 'string' && whocalls === 'new') return embed;
	embed.setFooter(`Request by ${whocalls.tag}`, whocalls.displayAvatarURL());
	return embed;
}
