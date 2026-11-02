require('dotenv').config();
const { select, confirm } = require('@inquirer/prompts');
const { connectAndFetch, getCategories, getCategoryChannels, getCategoryRoles } = require('./lib/discord');
const { checkBotPermissions } = require('./lib/permissions');
const { debug } = require('./lib/debug');

const isDryRun = process.argv.includes('--dry-run');

let client;

async function main() {
  if (isDryRun) console.log('[DRY RUN] No changes will be made.\n');

  const { client: c, guild } = await connectAndFetch();
  client = c;

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

  console.log(`\nCategoría a eliminar: ${category.name}`);
  console.log(`Canales a eliminar: ${channels.length}`);
  channels.forEach(ch => console.log(`  - ${ch.name}`));
  console.log(`Roles a eliminar: ${roles.length}`);
  roles.forEach(r => console.log(`  - ${r.name}`));
  console.log('No se expulsa a ningún miembro.');

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
