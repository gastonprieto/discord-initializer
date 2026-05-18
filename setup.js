require('dotenv').config();
const { select, input } = require('@inquirer/prompts');
const { ChannelType, PermissionsBitField } = require('discord.js');
const { connectAndFetch, getDocentes } = require('./lib/discord');
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

  const course = await select({
    message: '¿Qué materia inicializar?',
    choices: [
      { name: 'Diseño', value: 'diseño' },
      { name: 'Desarrollo', value: 'desarrollo' },
    ],
  });

  const docentes = getDocentes(guild, members);
  if (docentes.length === 0) {
    console.error('No se encontraron miembros con el rol Docentes en el servidor.');
    client.destroy();
    process.exit(1);
  }

  const docente = await select({
    message: '¿Qué docente tiene esta materia?',
    choices: docentes.map(m => ({ name: m.displayName, value: m })),
  });

  const teamNumbersRaw = await input({
    message: '¿Qué números de equipo crear? (separados por coma, ej: 1, 3, 5)',
    validate: v => /^[\d\s,]+$/.test(v) && v.trim().length > 0 || 'Ingresá números separados por coma',
  });

  const teamNumbers = teamNumbersRaw.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));

  const channelType = await select({
    message: '¿Qué tipo de canales crear para los equipos?',
    choices: [
      { name: 'Solo texto (default)', value: 'text' },
      { name: 'Solo voz', value: 'voice' },
      { name: 'Texto y voz', value: 'both' },
    ],
    default: 'text',
  });

  const firstName = docente.displayName.split(' ')[0].toLowerCase();
  const categoryName = `${course}-${firstName}`;
  const teamNames = teamNumbers.map(n => `${course}-equipo-${n}`);
  const teamChannelNames = teamNames;

  console.log(`\nSe creará la siguiente estructura:`);
  console.log(`  Categoría: ${categoryName}`);
  teamChannelNames.forEach((ch, i) => {
    const types = channelType === 'both' ? 'texto + voz' : channelType === 'voice' ? 'voz' : 'texto';
    console.log(`  Canal: ${ch} (${types}, solo ${teamNames[i]})`);
  });
  teamNames.forEach(t => console.log(`  Rol: ${t}`));

  if (isDryRun) {
    client.destroy();
    return;
  }

  const everyoneRole = guild.roles.everyone;
  const docentesRole = guild.roles.cache.find(r => r.name === 'Docentes');

  // Create team roles
  const createdRoles = {};
  for (const teamName of teamNames) {
    debug(`Creando rol ${teamName}...`);
    const role = await guild.roles.create({ name: teamName });
    createdRoles[teamName] = role;
    debug(`Rol creado con id ${role.id}`);
    console.log(`Rol creado: ${teamName}`);
  }

  // Create category — deny @everyone VIEW_CHANNEL so team channels are private by default
  debug(`Creando categoría ${categoryName}...`);
  const category = await guild.channels.create({
    name: categoryName,
    type: ChannelType.GuildCategory,
    permissionOverwrites: [
      { id: everyoneRole.id, deny: [PermissionsBitField.Flags.ViewChannel] },
      ...(docentesRole ? [{ id: docentesRole.id, allow: [PermissionsBitField.Flags.ViewChannel] }] : []),
    ],
  });
  debug(`Categoría creada con id ${category.id}`);
  console.log(`Categoría creada: ${categoryName}`);

  // Create team channels
  for (let i = 0; i < teamNames.length; i++) {
    const teamRole = createdRoles[teamNames[i]];
    const overwrites = [
      { id: everyoneRole.id, deny: [PermissionsBitField.Flags.ViewChannel] },
      { id: teamRole.id, allow: [PermissionsBitField.Flags.ViewChannel] },
    ];

    if (channelType === 'text' || channelType === 'both') {
      debug(`Creando canal de texto ${teamChannelNames[i]}...`);
      await guild.channels.create({
        name: teamChannelNames[i],
        type: ChannelType.GuildText,
        parent: category.id,
        permissionOverwrites: overwrites,
      });
      console.log(`Canal de texto creado: ${teamChannelNames[i]}`);
    }

    if (channelType === 'voice' || channelType === 'both') {
      debug(`Creando canal de voz ${teamChannelNames[i]}...`);
      await guild.channels.create({
        name: teamChannelNames[i],
        type: ChannelType.GuildVoice,
        parent: category.id,
        permissionOverwrites: overwrites,
      });
      console.log(`Canal de voz creado: ${teamChannelNames[i]}`);
    }
  }

  console.log('\nConfiguración completa.');
  client.destroy();
}

main().catch(err => {
  console.error('Error fatal:', err.message);
  if (client) client.destroy();
  process.exit(1);
});
