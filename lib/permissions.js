const { PermissionsBitField } = require('discord.js');

function checkBotPermissions(guild, requiredPerms) {
  const botPerms = guild.members.me.permissions;
  return requiredPerms.filter(perm => !botPerms.has(PermissionsBitField.Flags[perm]));
}

module.exports = { checkBotPermissions };
