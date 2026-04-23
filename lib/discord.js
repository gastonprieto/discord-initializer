require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');

function createClient() {
  return new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
  });
}

async function connectAndFetch() {
  const client = createClient();
  await client.login(process.env.DISCORD_TOKEN);
  await new Promise(resolve => client.once('ready', resolve));
  const guild = await client.guilds.fetch(process.env.GUILD_ID);
  await guild.members.fetch();
  return { client, guild };
}

function getDocentes(guild, members) {
  let docentesRole = null;
  for (const role of guild.roles.cache.values()) {
    if (role.name === 'Docentes') {
      docentesRole = role;
      break;
    }
  }
  if (!docentesRole) return [];
  return members.filter(m => m.roles.cache.has(docentesRole.id));
}

function getMembersToKick(guild, members) {
  let docentesRole = null;
  for (const role of guild.roles.cache.values()) {
    if (role.name === 'Docentes') {
      docentesRole = role;
      break;
    }
  }
  return members.filter(m => {
    if (m.user.bot) return false;
    if (docentesRole && m.roles.cache.has(docentesRole.id)) return false;
    return true;
  });
}

function getRolesToDelete(guild) {
  return [...guild.roles.cache.values()].filter(
    r => r.name !== '@everyone' && r.name !== 'Docentes' && !r.managed
  );
}

function getChannelsToDelete(guild) {
  return [...guild.channels.cache.values()];
}

module.exports = { createClient, connectAndFetch, getDocentes, getMembersToKick, getRolesToDelete, getChannelsToDelete };
