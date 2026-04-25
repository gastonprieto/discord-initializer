const { Client, GatewayIntentBits } = require('discord.js');
const { debug } = require('./debug');

function createClient() {
  return new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
  });
}

async function connectAndFetch() {
  if (!process.env.DISCORD_TOKEN) throw new Error('DISCORD_TOKEN no está definido en .env');
  if (!process.env.GUILD_ID) throw new Error('GUILD_ID no está definido en .env');
  const client = createClient();
  debug('Iniciando login...');
  await Promise.race([
    (async () => {
      await client.login(process.env.DISCORD_TOKEN);
      await new Promise(resolve => client.once('ready', resolve));
    })(),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Login timeout: no se pudo conectar con Discord en 15 segundos')), 15000)
    ),
  ]);
  debug(`Bot listo: ${client.user.tag}`);
  debug(`Fetching guild ${process.env.GUILD_ID}...`);
  const guild = await client.guilds.fetch(process.env.GUILD_ID);
  debug(`Guild obtenida: ${guild.name}`);
  debug('Fetching members...');
  await guild.members.fetch();
  debug(`Members cargados: ${guild.members.cache.size}`);
  return { client, guild };
}

function getDocentesRole(guild) {
  for (const role of guild.roles.cache.values()) {
    if (role.name === 'Docentes') {
      return role;
    }
  }
  return null;
}

function getDocentes(guild, members) {
  const docentesRole = getDocentesRole(guild);
  if (!docentesRole) return [];
  return members.filter(m => m.roles.cache.has(docentesRole.id));
}

function getMembersToKick(guild, members) {
  const docentesRole = getDocentesRole(guild);
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
  const systemIds = new Set([
    guild.systemChannelId,
    guild.rulesChannelId,
    guild.publicUpdatesChannelId,
  ].filter(Boolean));
  return [...guild.channels.cache.values()].filter(c => !systemIds.has(c.id));
}

module.exports = { createClient, connectAndFetch, getDocentes, getMembersToKick, getRolesToDelete, getChannelsToDelete };
