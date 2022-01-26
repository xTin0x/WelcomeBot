const vars = require('../vars.js');

/* RESET WP/RT LEADERBOARDS */
exports.resetLeaderboard = async (msg, mods, admins, lockcd) => {
  const whocalls = msg.author;
  if (!mods.includes(whocalls.id) && !admins.includes(whocalls.id)) {
    console.log(`Leaderboard reset denied for ${whocalls.username}. They must be have the Mods or Admin role to reset the leaderboard`);
    return;
  }
  console.log(`[RESET][${msg.guild.name}(${msg.guild.id})] ${whocalls.username} requested a leaderboard reset`);  
  /* GET OR INITIALIZE OVERALL & CURRENT SEASON POINTS/REACTION LEADERBOARDS */
  let seasonPoints = vars.points[msg.guild.id];
  if (typeof seasonPoints == 'undefined') {
    vars.points[msg.guild.id] = new Object();
    seasonPoints = vars.points[msg.guild.id];
    try { vars.fs.writeFileSync('./leaderboards/points.json', JSON.stringify(vars.points)); }
    catch(err) { console.error(err); }
  }

  let pointsOverall = vars.overallPoints[msg.guild.id];
  if (typeof pointsOverall == 'undefined') {
    vars.overallPoints[msg.guild.id] = new Object() ; 
    pointsOverall = vars.overallPoints[msg.guild.id];
    try { vars.fs.writeFileSync('./leaderboards/pointsOverall.json', JSON.stringify(vars.overallPoints)); }
    catch(err) { console.error(err); }
  }

  let seasonRT = vars.reactionTimes[msg.guild.id];
  if (typeof seasonRT == 'undefined') {
    vars.reactionTimes[msg.guild.id] = new Object(); 
    seasonRT = vars.reactionTimes[msg.guild.id];
    try { vars.fs.writeFileSync('./leaderboards/reactionTimes.json', JSON.stringify(vars.reactionTimes)); }
    catch(err) { console.error(err); }
  }

  let reactionTimesOverall = vars.overallRT[msg.guild.id];
  if (typeof reactionTimesOverall == 'undefined') {
    vars.overallRT[msg.guild.id] = new Object(); 
    reactionTimesOverall = vars.overallRT[msg.guild.id];
    try { vars.fs.writeFileSync('./leaderboards/reactionTimesOverall.json', JSON.stringify(vars.overallRT)); }
    catch(err) { console.error(err); }
  }
  
  const embed = new vars.Discord.MessageEmbed()
    .setTitle('LEADERBOARD RESET')
    .setDescription(`Are you sure you want to reset this season's leaderboard?`)
    .addField(`React with`, `🥇 to reset Welcome Points\n\n⌛ to reset Reaction Times\n\n🏆 to reset both\n\n🛑 to cancel`)
    .addField(`\u200B`, `Welcome points scored by new/existing users will be added to the overall leaderboard\n\nReaction times scored by new users and times scored by existing users that beat their previous PB will also be added to the overall leaderboard`)
    .setFooter(`Request by ${whocalls.tag}`, whocalls.displayAvatarURL());

  const readyFilter = (r, user) => (
    r.emoji.name === '🥇' ||
    r.emoji.name === '⌛' ||
    r.emoji.name === '🏆' ||
    r.emoji.name === '🛑'
    ) && user.id === whocalls.id;

  let readyMsg = await msg.channel.send(embed);
  readyMsg.react('🥇');
  readyMsg.react('⌛');
  readyMsg.react('🏆');
  readyMsg.react('🛑');
  const readyCollector = readyMsg.createReactionCollector(readyFilter, {time:60000, dispose:true});

  readyCollector.on('collect', async (r,user) => {
    let description = '';

    if (r.emoji.name === '🛑') {
      console.log(`[RESET][${msg.guild.name}(${msg.guild.id})] ${whocalls.username} cancelled leaderboard reset`);
      description = `Leaderboard reset cancelled...`
      readyCollector.stop(`${user.username} cancelled`);
      embed.setTitle('LEADERBOARD RESET')
      .setDescription(description);
      embed.fields = null;
      readyMsg.delete();
      readyMsg = await msg.channel.send(embed);
      setTimeout(() => {
        readyMsg.delete();
      }, 5000);
      return;
    } else if (r.emoji.name === '🥇') {
      console.log(`[RESET][${msg.guild.name}(${msg.guild.id})] ${whocalls.username} requested to reset the WP leaderboard`);
      resetWelcomePoints(msg, seasonPoints, readyMsg, embed);    
      description = `WP leaderboard successfully reset`;
    } else if (r.emoji.name === '⌛') {
      console.log(`[RESET][${msg.guild.name}(${msg.guild.id})] ${whocalls.username} requested to reset the RT leaderboard`);
      resetReactionTimes(msg, seasonRT, readyMsg, embed);
      description = `RT leaderboard successfully reset`;
    } else if (r.emoji.name === '🏆') {
      console.log(`[RESET][${msg.guild.name}(${msg.guild.id})] ${whocalls.username} requested to reset WP & RT leaderboards`);
      resetWelcomePoints(msg, seasonPoints, readyMsg, embed);
      resetReactionTimes(msg, seasonRT, readyMsg, embed);
      description = `WP & RT leaderboards successfully reset`;
    }

    console.log(`[RESET][${msg.guild.name}(${msg.guild.id})] WP & RT leaderboards successfully reset`);
    embed.setTitle('LEADERBOARD RESET')
    .setDescription(description);
    embed.fields = null;
    readyMsg.delete();
    readyMsg = await msg.channel.send(embed);
  });
  
  readyCollector.on('end', async (collected, reason) => {
    if (reason.includes('time')){
      console.log(`[RESET][${msg.guild.name}(${msg.guild.id})] decision to reset leaderboards timed out`);
      console.log(`[RESET][${msg.guild.name}(${msg.guild.id})] ${whocalls} didn't answer within 60 seconds`)
      embed.setTitle('RESET CANCELLED')
      .setDescription(`${whocalls} didn't react. Reset cancelled...`);
      readyMsg.delete();
      readyMsg = await msg.channel.send(embed);
      setTimeout(() => {
        readyMsg.delete();
      }, 5000);
      lockcd[msg.channel.id] = false;
    }
  });
};

/* Add points scored this season by new users season to the overall WP leaderboard
   Points scored by existing users are added to their total on the overall WP leaderboard */
const resetWelcomePoints = async (msg, seasonPoints, readyMsg, embed) => {
  vars.points[msg.guild.id] = new Object();

  for ( let [usr, pts] of Object.entries(seasonPoints) ) {
    if (!(usr in Object(vars.overallPoints[msg.guild.id]))) {
      console.log(`[RESET][${msg.guild.name}(${msg.guild.id})] ${usr}'s points added to the overall WP leaderboard`);
      vars.overallPoints[msg.guild.id][usr] = pts;
    } else if (pts !== 0) {	
      console.log(`[RESET][${msg.guild.name}(${msg.guild.id})] ${usr}'s points from this season have been added to the overall WP leaderboard`);					
      vars.overallPoints[[msg.guild.id]][usr] += pts;
    }
  }
  try {
    vars.fs.writeFileSync('./leaderboards/pointsOverall.json', JSON.stringify(vars.overallPoints));
    vars.fs.writeFileSync('./leaderboards/points.json', JSON.stringify(vars.points))
  } catch(err) { console.error(err); }
}

/* Add reaction times scored this season by new users season to the overall RT leaderboard
   Points scored by existing users are added to their total on the overall RT leaderboard */
const resetReactionTimes = async (msg, seasonRT, readyMsg, embed) => {
  vars.reactionTimes[msg.guild.id] = new Object();

  // Add reaction times scored this season by new users season to the overall RT leaderboard
  // Reaction times scored by existing users that are faster than their overall times are updated in the overall RT leaderboard
  for ( let [usr, time] of Object.entries(seasonRT)) {
    if (!(usr in Object(vars.overallRT[msg.guild.id]))) {
      console.log(`[RESET][${msg.guild.name}(${msg.guild.id})] ${usr} best response time added to the overall RT leaderboard`);
      vars.overallRT[msg.guild.id][usr] = time;
    } else if (seasonRT[usr] < vars.overallRT[msg.guild.id][usr]) {
      console.log(`[RESET][${msg.guild.name}(${msg.guild.id})] ${usr}'s best response time has been updated with this season's PB in the overall RT leaderboard`);
    }
  }
  try {
    vars.fs.writeFileSync('./leaderboards/reactionTimesOverall.json', JSON.stringify(vars.overallRT));    
    vars.fs.writeFileSync('./leaderboards/reactionTimes.json', JSON.stringify(vars.reactionTimes));
  }
  catch(err) { console.error(err); }
}
