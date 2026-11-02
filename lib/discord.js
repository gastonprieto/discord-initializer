const { Client, GatewayIntentBits, ChannelType, OverwriteType } = require('discord.js');
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
  debug('Fetching channels...');
  await guild.channels.fetch();
  debug(`Channels cargados: ${guild.channels.cache.size}`);
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

function getCategories(guild) {
  return [...guild.channels.cache.values()].filter(c => c.type === ChannelType.GuildCategory);
}

function getCategoryChannels(guild, categoryId) {
  return [...guild.channels.cache.values()].filter(c => c.parentId === categoryId);
}

// Roles with an overwrite on the category's channels that aren't used anywhere else
function getCategoryRoles(guild, categoryId) {
  const roleIdsIn = channels => new Set(channels.flatMap(c =>
    [...c.permissionOverwrites.cache.values()].filter(o => o.type === OverwriteType.Role).map(o => o.id)
  ));
  const categoryChannelIds = new Set([categoryId, ...getCategoryChannels(guild, categoryId).map(c => c.id)]);
  const allChannels = [...guild.channels.cache.values()];
  const insideIds = roleIdsIn(allChannels.filter(c => categoryChannelIds.has(c.id) && c.id !== categoryId));
  const outsideIds = roleIdsIn(allChannels.filter(c => !categoryChannelIds.has(c.id)));
  return getRolesToDelete(guild).filter(r => insideIds.has(r.id) && !outsideIds.has(r.id));
}

// Members with a category role; those who also have another team role are kept so they don't lose their other course
function getCategoryMembersToKick(guild, members, categoryRoles) {
  const categoryRoleIds = new Set(categoryRoles.map(r => r.id));
  const otherRoleIds = new Set(getRolesToDelete(guild).map(r => r.id).filter(id => !categoryRoleIds.has(id)));
  const toKick = [];
  const kept = [];
  for (const member of getMembersToKick(guild, members)) {
    const memberRoleIds = [...member.roles.cache.keys()];
    if (!memberRoleIds.some(id => categoryRoleIds.has(id))) continue;
    if (memberRoleIds.some(id => otherRoleIds.has(id))) kept.push(member);
    else toKick.push(member);
  }
  return { toKick, kept };
}

module.exports = {
  createClient, connectAndFetch, getDocentes, getMembersToKick, getRolesToDelete, getChannelsToDelete,
  getCategories, getCategoryChannels, getCategoryRoles, getCategoryMembersToKick,
};
