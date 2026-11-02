require('dotenv').config();
const { select, confirm } = require('@inquirer/prompts');
const { connectAndFetch, getCategories, getCategoryChannels, getCategoryRoles, getCategoryMembersToKick } = require('./lib/discord');
const { checkBotPermissions } = require('./lib/permissions');
const { debug } = require('./lib/debug');

const isDryRun = process.argv.includes('--dry-run');

let client;

async function main() {
  if (isDryRun) console.log('[DRY RUN] No changes will be made.\n');

  const { client: c, guild } = await connectAndFetch();
  client = c;
  const members = [...guild.members.cache.values()];

  const missingPerms = checkBotPermissions(guild, ['Administrator']);
  if (missingPerms.length > 0) {
    console.error(`El bot no tiene los permisos necesarios: ${missingPerms.join(', ')}`);
    client.destroy();
    process.exit(1);
  }

  const categories = getCategories(guild);
  if (categories.length === 0) {
    console.error('No hay categorías en el servidor.');
    client.destroy();
    process.exit(1);
  }

  const category = await select({
    message: '¿Qué categoría borrar?',
    choices: categories.map(cat => ({ name: cat.name, value: cat })),
  });

  const channels = getCategoryChannels(guild, category.id);
  const roles = getCategoryRoles(guild, category.id);
  const { toKick, kept } = getCategoryMembersToKick(guild, members, roles);

  console.log(`\nCategoría a eliminar: ${category.name}`);
  console.log(`Canales a eliminar: ${channels.length}`);
  channels.forEach(ch => console.log(`  - ${ch.name}`));
  console.log(`Roles a eliminar: ${roles.length}`);
  roles.forEach(r => console.log(`  - ${r.name}`));
  console.log(`Miembros a expulsar: ${toKick.length}`);
  toKick.forEach(m => console.log(`  - ${m.displayName}`));
  if (kept.length > 0) {
    console.log(`Miembros que no se expulsan porque tienen equipo en otra categoría: ${kept.length}`);
    kept.forEach(m => console.log(`  - ${m.displayName}`));
  }

  if (isDryRun) {
    client.destroy();
    return;
  }

  const confirmed = await confirm({ message: `¿Confirmar borrado de ${category.name}?` });
  if (!confirmed) {
    console.log('Cancelado.');
    client.destroy();
    return;
  }

  for (const member of toKick) {
    try {
      debug(`Expulsando ${member.displayName} (${member.id})...`);
      await member.kick(`Borrado de la categoría ${category.name}`);
      console.log(`Expulsado: ${member.displayName}`);
    } catch (err) {
      console.error(`Error al expulsar ${member.displayName}: ${err.message}`);
    }
  }

  for (const channel of [...channels, category]) {
    try {
      debug(`Eliminando canal ${channel.name} (${channel.id})...`);
      await channel.delete();
      console.log(`Canal eliminado: ${channel.name}`);
    } catch (err) {
      console.error(`Error al eliminar canal ${channel.name}: ${err.message}`);
    }
  }

  for (const role of roles) {
    try {
      debug(`Eliminando rol ${role.name} (${role.id})...`);
      await role.delete();
      console.log(`Rol eliminado: ${role.name}`);
    } catch (err) {
      console.error(`Error al eliminar rol ${role.name}: ${err.message}`);
    }
  }

  console.log('\nBorrado completo.');
  client.destroy();
}

main().catch(err => {
  console.error('Error fatal:', err.message);
  if (client) client.destroy();
  process.exit(1);
});
