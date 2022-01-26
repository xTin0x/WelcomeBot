const vars = require('../vars.js');

exports.initiateCountdown = async (msg, args, lockcd) => {
  const whocalls = msg.author;
  
  /* NO ARGS (DEFAULT CD OF 5 SECONDS */ 
  if (args.length < 1) {
    lockcd[msg.channel.id] = true;
    const left = parseTimeArg(5);
    countdown(left, msg, lockcd);
    return;
  } 
  /* NO MENTIONED USERS (CD: ARG OR DEFAULT 5)*/
  else if (msg.mentions.users.size < 1) { 
    lockcd[msg.channel.id] = true;
    let left = parseTimeArg(args[0]);
    countdown(left, msg, lockcd);
    return;
  } 
  /* MENTIONED USERS (CD: ARG OR DEFAULT 5) */
  else {
    lockcd[msg.channel.id] = true;
    const participants = msg.mentions.users;
    // base embed
    const embed = new vars.Discord.MessageEmbed()
    .setTitle('READY?')
    .setDescription('Countdown ready.\nOnce all participants react with 👍 countdown will start.\nReact with 👎 to cancel the countdown.\nIf any participant fails to send a reaction within 1 minute, the countdown will be cancelled.')
    .setFooter(`Request by ${whocalls.tag}`, whocalls.displayAvatarURL());

    let readyMsg = await msg.channel.send(embed);

    readyMsg.react('👍');
    readyMsg.react('👎');

    const readyFilter = (r, user) => (r.emoji.name === '👍' || r.emoji.name === '👎') && participants.has(user.id);
    const readyCollector = readyMsg.createReactionCollector(readyFilter, {time:60000, dispose:true});

    let left = parseTimeArg(args[0]);
    console.log(`[CD][${msg.guild.name}(${msg.guild.id})] mention countdown ON STAND BY with ${left} as time`);
    console.log(`[CD][${msg.guild.name}(${msg.guild.id})] waiting for ${participants.map(user => user.username).join(', ')} to react on countdown confirmation`)

    readyCollector.on('collect', async (r,user) => {
      if (r.emoji.name === '👎') {
        console.log(`[CD][${msg.guild.name}(${msg.guild.id})] ${user.username} is NOT READY`);
        readyCollector.stop(`${user.username} is NOT READY`);
        embed.setTitle('COUNTDOWN CANCELLED')
        .setDescription(`${user.username} is NOT READY. Countdown cancelled...`)
        readyMsg.delete();
        readyMsg = await msg.channel.send(embed);
        setTimeout(() => {
          readyMsg.delete();
        }, 5000);
        lockcd[msg.channel.id] = false;
        return;
      } else {
        console.log(`[CD][${msg.guild.name}(${msg.guild.id})] ${user.username} is READY`);
      }
      readyCollector.users.sweep(user => user.bot);

      if (readyCollector.users.equals(participants) && r.emoji.name != '👎') {
        embed.setTitle('COUNTDOWN STARTING')
        .setDescription('All participants are ready!\nGood Luck!');
        readyMsg.delete();
        readyMsg = await msg.channel.send(embed);

        countdown(left, msg, lockcd);
        return;
      }
    });
    readyCollector.on('remove', async (r,user) => {
      console.log(`[CD][${msg.guild.name}(${msg.guild.id})] ${user.username} is NO LONGER READY`)
    });
    readyCollector.on('end', async (collected, reason) => {
      if (reason.includes('time')){
        console.log(`[CD][${msg.guild.name}(${msg.guild.id})] countdown TIMED OUT`);
        const noAnswers = readyCollector.users.difference(participants).map(user => user.username);
        console.log(`[CD][${msg.guild.name}(${msg.guild.id})] ${noAnswers.join(', ')} didn't answer within 60 seconds`)
        embed.setTitle('COUNTDOWN CANCELLED')
        .setDescription(`${noAnswers.join(', ')} didn't react. Countdown cancelled...`);
        readyMsg.delete();
        readyMsg = await msg.channel.send(embed);
        setTimeout(() => {
          readyMsg.delete();
        }, 5000);
        lockcd[msg.channel.id] = false;
      }
    });
  }
}

const parseTimeArg = (time) => {
	let left = parseInt(time);
	// COUNTDOWN RANGE: 3 to 5 seconds
	if (left > 10) { left=10; }
	else if (left < 3) { left = 3; }
	else if (!(left >=3 || left <=10)) { left = 5; }
	return left;
}

const countdown = (time, msg, lockcd) => {
	let left = time;
	let channel = msg.channel;
	console.log(`[CD][${msg.guild.name}(${msg.guild.id})] countdown STARTED with ${left} as time`);
	let cd = setInterval(function(){
			if (left > 0){
				channel.send(left);
				left = left - 1;
			}
			else if (left == 0){
				channel.send('GO!');
				lockcd[channel.id] = false;
				console.log(`[CD][${msg.guild.name}(${msg.guild.id})] countdown ENDED`)
				clearInterval(cd);
			}
	},1000);
}
