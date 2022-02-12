const vars = require('../vars.js');

/* SET NEW GUILD PREFIX */
exports.setGuildPrefix = async (args, msg, valid, mods, admins) => {
  const whocalls = msg.author;
  if (!mods.includes(whocalls.id) && !admins.includes(whocalls.id)) {
    console.log(`Prefix change denied for ${whocalls.username}. They must be have the Mods or Admin role to change the bot command prefix`);
    return;
  }
  if (args.length != 1) {
    msg.reply('Invalid number of arguments (max: 1).')
  } else if (valid.test(args[0])) {
    const embed = new vars.Discord.MessageEmbed()
    .setTitle('PREFIX CONFIGURATION')
    .setDescription(`Are you sure you want to change this bot's command prefix to:`)
    .addField(`${args[0]}`, `👍 to confirm. 👎 to cancel.`)
    .setFooter(`Request by ${whocalls.tag}`, whocalls.displayAvatarURL());

    let readyMsg = await msg.channel.send(embed);

    readyMsg.react('👍');
    readyMsg.react('👎');

    const readyFilter = (r, user) => (r.emoji.name === '👍' || r.emoji.name === '👎') && user.id === whocalls.id;
    const readyCollector = readyMsg.createReactionCollector(readyFilter, {time:60000, dispose:true});

    console.log(`[GUILD_CONFIG][${msg.guild.name}(${msg.guild.id})] attempting to change prefix to ${args[0]}`);

    readyCollector.on('collect', async (r,user) => {
      if (r.emoji.name === '👎') {
        console.log(`[GUILD_CONFIG][${msg.guild.name}(${msg.guild.id})] cancelled prefix change`);
        readyCollector.stop(`${user.username} cancelled`);
        embed.setTitle('PREFIX CONFIGURATION')
        .setDescription(`Prefix change cancelled...`);
        delete embed.fields[0];
        readyMsg.delete();
        readyMsg = await msg.channel.send(embed);
        setTimeout(() => {
          readyMsg.delete();
        }, 5000);
        return;
      } else {
        console.log(`[GUILD_CONFIG][${msg.guild.name}(${msg.guild.id})] prefix succesfully changed to ${args[0]}`);
        vars.config.prefix[msg.guild.id] = args[0];
        process.env.PREFIX = args[0];
	try { vars.fs.writeFileSync('./config.json', JSON.stringify(vars.config)); }
        catch(err) { console.error(err); }
        embed.setTitle('PREFIX CONFIGURATION')
        .setDescription('Prefix succesfully changed to: ');
        embed.fields[0].value = '👍';
        readyMsg.delete();
        readyMsg = await msg.channel.send(embed);
      }
      try { vars.fs.writeFileSync('./config.json', JSON.stringify(vars.config)); }
      catch(err) { console.error(err); }
    });
  } else msg.reply('Invalid character for command prefix.')
}
