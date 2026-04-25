require('dotenv').config();
const { confirm } = require('@inquirer/prompts');
const { ChannelType } = require('discord.js');
const { connectAndFetch, getMembersToKick, getRolesToDelete, getChannelsToDelete } = require('./lib/discord');
const { checkBotPermissions } = require('./lib/permissions');
const { debug } = require('./lib/debug');

const isDryRun = process.argv.includes('--dry-run');

let client;

async function main() {
  if (isDryRun) console.log('[DRY RUN] No changes will be made.\n');

  const { client: c, guild } = await connectAndFetch();
  client = c;
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
  console.log('Canal a crear: lobby');

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
      debug(`Expulsando ${member.displayName} (${member.id})...`);
      await member.kick('Reinicio de cuatrimestre');
      console.log(`Expulsado: ${member.displayName}`);
    } catch (err) {
      console.error(`Error al expulsar ${member.displayName}: ${err.message}`);
    }
  }

  for (const channel of toDeleteChannels) {
    try {
      debug(`Eliminando canal ${channel.name} (${channel.id})...`);
      await channel.delete();
      console.log(`Canal eliminado: ${channel.name}`);
    } catch (err) {
      console.error(`Error al eliminar canal ${channel.name}: ${err.message}`);
    }
  }

  for (const role of toDeleteRoles) {
    try {
      debug(`Eliminando rol ${role.name} (${role.id})...`);
      await role.delete();
      console.log(`Rol eliminado: ${role.name}`);
    } catch (err) {
      console.error(`Error al eliminar rol ${role.name}: ${err.message}`);
    }
  }

  debug('Creando canal lobby...');
  const lobby = await guild.channels.create({
    name: 'lobby',
    type: ChannelType.GuildText,
  });
  console.log('Canal creado: lobby');

  const welcomeMessage = await lobby.send(
    '👋 **¡Bienvenido/a al servidor!**\n\n' +
    'Para que podamos darte acceso a los canales de tu equipo, seguí estos dos pasos:\n\n' +
    '**1️⃣ Cambiá tu alias** en este servidor a tu **nombre y apellido completo**\n' +
    '*(clic derecho en tu nombre → Editar apodo del servidor)*\n\n' +
    '**2️⃣ Escribí en este canal:**\n' +
    '> `materia - grupo - listo`\n' +
    '> *Ejemplo: `Diseño - Equipo 3 - listo`*\n\n' +
    'En cuanto lo hagas, te asignamos el rol y ya podés ver los canales de tu equipo. ✅\n\n' +
    '¡Cualquier duda, no dudes en preguntar acá! 😊'
  );
  await welcomeMessage.pin();
  console.log('Mensaje de bienvenida enviado y pinneado en lobby.');

  console.log('\nLimpieza completa.');
  client.destroy();
}

main().catch(err => {
  console.error('Error fatal:', err.message);
  if (client) client.destroy();
  process.exit(1);
});
