const { PermissionsBitField } = require('discord.js');

function checkBotPermissions(guild, requiredPerms) {
  const botPerms = guild.members.me.permissions;
  return requiredPerms.filter(perm => {
    const flag = PermissionsBitField.Flags[perm];
    if (flag === undefined) throw new Error(`Permiso desconocido: ${perm}`);
    return !botPerms.has(flag);
  });
}

module.exports = { checkBotPermissions };
