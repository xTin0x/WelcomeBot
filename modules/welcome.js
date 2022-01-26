const vars = require('../vars.js');

exports.getWelcomePointsLB = async (msg, args, guildPoints, guildRT) => {
  const whocalls = msg.author;

  // sort point & response time db into array []
  const sortedLB = Object.entries(guildPoints)
    .sort(([,x],[,y]) => y-x);

  const sortedRT = Object.entries(guildRT)
    .sort(([,x],[,y]) => x-y);

  // base embed
  const embed = new vars.Discord.MessageEmbed()
    .setTitle('Welcome Points Leaderboard')
    .setFooter(`Request by ${whocalls.tag}`, whocalls.displayAvatarURL());

  // send top25 (or less if not enough entries) if no arguments
  if (args.length == 0){
    console.log(`[WP][${msg.guild.name}(${msg.guild.id})] ${whocalls.username} queried top welcomers`);
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
        const whois = await vars.client.users.fetch(sortedLB[i][0]);
        whoisname = whois.username;
      } catch (err) {
      }
      embed.addField(`${getPlacementString(i+1)} ${whoisname}`, `${getPointString(sortedLB[i][1])}`, true);
    }

    msg.reply(embed);
  } else if (args.length > 1) {
    // ONLY ONE MENTION ALLOWED FOR QUERY
    console.log(`[WP][${msg.guild.name}(${msg.guild.id})] too many args`);
    return;
  } else if (args[0] == 'reaction' || args[0] == 'rt'){
    console.log(`[WP][${msg.guild.name}(${msg.guild.id})] ${whocalls.username} queried fastest welcomers`);
    let maxentries = 0;
    embed.setDescription('⚡ Fastest Welcomes ⚡');

    if (sortedRT.length < 25){
      maxentries = sortedRT.length;
    } else {
      maxentries = 25;
    }
    for (var i = 0; i < maxentries; i++) {
      let whoisname = 'Unknown';
      try {
        const whois = await vars.client.users.fetch(sortedRT[i][0]);
        whoisname = whois.username;
      } catch (err) {
      }
      embed.addField(`${getPlacementString(i+1)} ${whoisname}`, `${sortedRT[i][1] > 1000 ? (sortedRT[i][1] % 60000 / 1000).toFixed(vars.rstDecimal)+'s' : sortedRT[i][1]+'ms'}`, true);
    }

    msg.reply(embed);
  } else if (args[0] == 'me') {
    console.log(`[WP][${msg.guild.name}(${msg.guild.id})] ${whocalls.username} queried their welcome points info`);
    let pointsstr = '0 points';
    if (guildPoints[whocalls.id]) {
      pointsstr = `${getPointString(guildPoints[whocalls.id])}`;
    }

    let posstr, nextposstr = 'Not on the leaderboard';
    let nextPosUser = 'unknown [not in server]';
    let nextPos, nextPosPoints, pointsNeeded = 0;
    if (sortedLB.findIndex(entry => entry[0] == whocalls.id) != -1) {
      posstr = `${getPlacementString(sortedLB.findIndex(entry => entry[0] == whocalls.id)+1)} place`;

      // Determine who is one place above the requested user on the WP leaderboard
      // and how many points are needed to take their place
      nextPos = sortedLB.findIndex(entry => entry[0] == whocalls.id);
      if (nextPos != 0 && typeof nextPos != 'undefined') {
        nextposstr = `${getPlacementString(nextPos).replace('🔸', '')} place`;
        nextPosId = await vars.client.users.fetch(sortedLB[nextPos-1][0]);
        nextPosUser = nextPosId.username;
        nextPosPoints = sortedLB[nextPos-1][1];
        pointsNeeded = nextPosPoints - guildPoints[whocalls.id] + 1;
      }
    }

    let rtstr = 'No reaction time registered';
    if (guildRT[whocalls.id]) {
      rtstr = `${guildRT[whocalls.id] > 1000 ? (guildRT[whocalls.id] % 60000 / 1000).toFixed(vars.rstDecimal)+'s' : guildRT[whocalls.id]+'ms'}`;
      // Determine who is one place above the requested user on the RT leaderboard
      // and how much faster they need to be to take their place
      nextRstPos = sortedRT.findIndex(entry => entry[0] == whocalls.id);
      if (nextRstPos != 0 && typeof nextRstPos != 'undefined') {
        rstPosStr = `${getPlacementString(nextRstPos).replace('🔸', '')} place`;
        nextRstPosId = await vars.client.users.fetch(sortedRT[nextRstPos-1][0]);
        nextRstPosUser = nextRstPosId.username;
        nextRstPosMs = sortedRT[nextRstPos-1][1];
        timeDifference = guildRT[whocalls.id] - nextRstPosMs + 1;
      }
    }

    embed.setDescription(`Your welcome points`)
    embed.addField(pointsstr,posstr, true)
    if (nextPos != 0 && typeof nextPos != 'undefined') {
      embed.addField(`Next Position (WP)`, `${nextposstr} held by ${nextPosUser} with ${getPointString(nextPosPoints)}\nYou need ${getPointString(pointsNeeded)} to take their place`, true)
              embed.addField('\u200B', '\u200B')
    }
    embed.addField(`Fastest Welcome`,`${rtstr} - ${getPlacementString(nextRstPos+1).replace('🔸', '') + ' place'}`, true)
          if (nextRstPos != 0 && typeof nextRstPos != 'undefined') {
              embed.addField(`Next Position (RT)`, `${rstPosStr} held by ${nextRstPosUser} with ${nextRstPosMs > 1000 ? (nextRstPosMs % 60000 / 1000).toFixed(vars.rstDecimal)+'s' : nextRstPosMs+'ms'}\nYou need to improve by ${timeDifference > 1000 ? (timeDifference % 60000 / 1000).toFixed(vars.rstDecimal)+'s' : timeDifference+'ms'} to take their place`, true)
          }

    msg.reply(embed);
  } else if (msg.mentions.users.size == 1) {
    let who = msg.mentions.users.first();
    console.log(`[WP][${msg.guild.name}(${msg.guild.id})] ${whocalls.username} queried ${who.username}'s welcome points info`);

    let pointsstr = '0 points';
    if (guildPoints[who.id]) {
      pointsstr = `${getPointString(guildPoints[who.id])}`;
    }

    let posstr, nextposstr = 'Not on the leaderboard';
    let nextPosUser = 'unknown [not in server]';
    let nextPos, nextPosPoints, pointsNeeded = 0;
    if (sortedLB.findIndex(entry => entry[0] == who.id) != -1) {
      posstr = `${getPlacementString(sortedLB.findIndex(entry => entry[0] == who.id)+1)} place`;

      // Determine who is one place above the requested user on the WP leaderboard
      // and how many points are needed to take their place
      nextPos = sortedLB.findIndex(entry => entry[0] == who.id);
      if (nextPos != 0 && typeof nextPos != 'undefined') {
        nextposstr = `${getPlacementString(nextPos).replace('🔸', '')} place`;
        nextPosId = await vars.client.users.fetch(sortedLB[nextPos-1][0]);
        nextPosUser = nextPosId.username;
        nextPosPoints = sortedLB[nextPos-1][1];
        pointsNeeded = nextPosPoints - guildPoints[who.id] + 1;
      }
    }

    let rtstr = 'No reaction time registered';
    if (guildRT[who.id]) { 
      rtstr = `${guildRT[who.id] > 1000 ? (guildRT[who.id] % 60000 / 1000).toFixed(vars.rstDecimal)+'s' : guildRT[who.id]+'ms'}`;
      // Determine who is one place above the requested user on the RT leaderboard
      // and how much faster they need to be to take their place
              nextRstPos = sortedRT.findIndex(entry => entry[0] == who.id);
              if (nextRstPos != 0 && typeof nextRstPos != 'undefined') {
        rstPosStr = `${getPlacementString(nextRstPos).replace('🔸', '')} place`;
        nextRstPosId = await vars.client.users.fetch(sortedRT[nextRstPos-1][0]);
        nextRstPosUser = nextRstPosId.username;
        nextRstPosMs = sortedRT[nextRstPos-1][1];
        timeDifference = guildRT[who.id] - nextRstPosMs + 1;
      }
    }

    embed.setDescription(`${who.username}'s welcome points`)
    embed.addField(pointsstr,posstr, true)
    if (nextPos != 0 && typeof nextPos != 'undefined') {
      embed.addField(`Next Position (WP)`, `${nextposstr} held by ${nextPosUser} with ${getPointString(nextPosPoints)}\n${who.username} needs ${getPointString(pointsNeeded)} to take their place`, true)
      embed.addField('\u200B', '\u200B')
    }
    embed.addField(`Fastest Welcome`,`${rtstr} - ${getPlacementString(nextRstPos+1).replace('🔸', '') + ' place'}`, true)
          if (nextRstPos != 0 && typeof nextRstPos != 'undefined') {
              embed.addField(`Next Position (RT)`, `${rstPosStr} held by ${nextRstPosUser} with ${nextRstPosMs > 1000 ? (nextRstPosMs % 60000 / 1000).toFixed(vars.rstDecimal)+'s' : nextRstPosMs+'ms'}\n${who.username} needs to improve by ${timeDifference > 1000 ? (timeDifference % 60000 / 1000).toFixed(vars.rstDecimal)+'s' : timeDifference+'ms'} to take their place`, true)
          }
    msg.reply(embed);
  } else if (parseInt(args[0]) > 0) {
    const pos = parseInt(args[0]);
    console.log(`[WP][${msg.guild.name}(${msg.guild.id})] ${whocalls.username} queried pos. ${pos} on the WP leaderboard`);
    if (pos > sortedLB.length) {
      console.log('[WP]query outside of range')
      msg.reply(`This leaderboard only has ${sortedLB.length} entries, try with a number lower than that.`)
      return;
    } else {
      let whoisname = 'unknown [not in server]';
      try {
        whois = await msg.guild.members.fetch(sortedLB[pos-1][0]);
        whoisname = whois.user.username;
      } catch (err) {
      }
      let pointsstr = `${getPointString(sortedLB[pos-1][1])}`;
      let posstr = `${getPlacementString(pos)} place`;
      let nextposstr = 'Not on the leaderboard';
      let nextPosUser = 'unknown [not in server]';
      let nextPos, nextPosPoints, pointsNeeded = 0;

      // Determine who is one place above the requested user on the WP leaderboard
      // and how many points are needed to take their place
      nextPos = sortedLB.findIndex(entry => entry[0] == whois.id);
      if (nextPos != 0 && typeof nextPos != 'undefined') {
        nextposstr = `${getPlacementString(nextPos).replace('🔸', '')} place`;
        nextPosId = await vars.client.users.fetch(sortedLB[nextPos-1][0]);
        nextPosUser = nextPosId.username;
        nextPosPoints = sortedLB[nextPos-1][1];
        pointsNeeded = nextPosPoints - guildPoints[whois.id] + 1;
      }

      let rtstr = 'No reaction time registered';
      if (guildRT[sortedLB[pos-1][0]]) { 
      rtstr = `${guildRT[sortedLB[pos-1][0]] > 1000 ? (guildRT[sortedLB[pos-1][0]] % 60000 / 1000).toFixed(vars.rstDecimal)+'s' : guildRT[sortedLB[pos-1][0]]+'ms'}`;
      // Determine who is one place above the requested user on the RT leaderboard
      // and how much faster they need to be to take their place
      nextRstPos = sortedRT.findIndex(entry => entry[0] == whois.id);
      if (nextRstPos != 0 && typeof nextRstPos != 'undefined') {
        rstPosStr = `${getPlacementString(nextRstPos).replace('🔸', '')} place`;
        nextRstPosId = await vars.client.users.fetch(sortedRT[nextRstPos-1][0]);
      nextRstPosUser = nextRstPosId.username;
        nextRstPosMs = sortedRT[nextRstPos-1][1];
        timeDifference = guildRT[whois.id] - nextRstPosMs + 1;
        }
      }

      embed.setDescription(`${whoisname}'s welcome points`)
      embed.addField(pointsstr,posstr, true)
      if (nextPos != 0 && typeof nextPos != 'undefined') {
        embed.addField(`Next Position (WP)`, `${nextposstr} held by ${nextPosUser} with ${getPointString(nextPosPoints)}\n${whoisname} needs ${getPointString(pointsNeeded)} to take their place`, true)
        embed.addField('\u200B', '\u200B')
      }
      embed.addField(`Fastest Welcome`, `${rtstr} - ${getPlacementString(nextRstPos+1).replace('🔸', '') + ' place'}`, true)
              if (nextRstPos != 0 && typeof nextRstPos != 'undefined') {
                  embed.addField(`Next Position (RT)`, `${rstPosStr} held by ${nextRstPosUser} with ${nextRstPosMs > 1000 ? (nextRstPosMs % 60000 / 1000).toFixed(vars.rstDecimal)+'s' : nextRstPosMs+'ms'}\n${whoisname} needs to improve by ${timeDifference > 1000 ? (timeDifference % 60000 / 1000).toFixed(vars.rstDecimal)+'s' : timeDifference+'ms'} to take their place`, true)
              }
      msg.reply(embed);
    }
  }
}

const getPlacementString = (pos) => {
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

// This deals with displaying singular/plural point values properly in the leaderboard content 
const getPointString = (pts) => {
	return `${pts} ${pts == 1 ? 'point' : 'points'}`; 
}
