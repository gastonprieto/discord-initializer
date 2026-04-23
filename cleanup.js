require('dotenv').config();
const { confirm } = require('@inquirer/prompts');
const { connectAndFetch, getMembersToKick, getRolesToDelete, getChannelsToDelete } = require('./lib/discord');
const { checkBotPermissions } = require('./lib/permissions');

const isDryRun = process.argv.includes('--dry-run');

async function main() {
  if (isDryRun) console.log('[DRY RUN] No changes will be made.\n');

  const { client, guild } = await connectAndFetch();
  const members = [...guild.members.cache.values()];

  const missingPerms = checkBotPermissions(guild, ['KickMembers', 'ManageRoles', 'ManageChannels']);
  if (missingPerms.length > 0) {
    console.error(`El bot no tiene los permisos necesarios: ${missingPerms.join(', ')}`);
    client.destroy();
    process.exit(1);
  }

  const toKick = getMembersToKick(guild, members);
  const toDeleteRoles = getRolesToDelete(guild);
  const toDeleteChannels = getChannelsToDelete(guild);

  console.log(`Miembros a expulsar: ${toKick.length}`);
  toKick.forEach(m => console.log(`  - ${m.displayName}`));
  console.log(`Roles a eliminar: ${toDeleteRoles.length}`);
  toDeleteRoles.forEach(r => console.log(`  - ${r.name}`));
  console.log(`Canales/categorías a eliminar: ${toDeleteChannels.length}`);
  toDeleteChannels.forEach(c => console.log(`  - ${c.name}`));

  if (isDryRun) {
    client.destroy();
    return;
  }

  const confirmed = await confirm({ message: '¿Confirmar limpieza del servidor?' });
  if (!confirmed) {
    console.log('Cancelado.');
    client.destroy();
    return;
  }

  for (const member of toKick) {
    try {
      await member.kick('Reinicio de cuatrimestre');
      console.log(`Expulsado: ${member.displayName}`);
    } catch (err) {
      console.error(`Error al expulsar ${member.displayName}: ${err.message}`);
    }
  }

  for (const channel of toDeleteChannels) {
    try {
      await channel.delete();
      console.log(`Canal eliminado: ${channel.name}`);
    } catch (err) {
      console.error(`Error al eliminar canal ${channel.name}: ${err.message}`);
    }
  }

  for (const role of toDeleteRoles) {
    try {
      await role.delete();
      console.log(`Rol eliminado: ${role.name}`);
    } catch (err) {
      console.error(`Error al eliminar rol ${role.name}: ${err.message}`);
    }
  }

  console.log('\nLimpieza completa.');
  client.destroy();
}

main().catch(err => {
  console.error('Error fatal:', err.message);
  process.exit(1);
});
