# Discord Initializer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Two Node.js CLI scripts to clean up and set up a Discord server's structure at the start of each academic period.

**Architecture:** `cleanup.js` kicks members and deletes all roles/channels; `setup.js` interactively creates categories, channels, and team roles for a selected course. Both share a Discord client module in `lib/discord.js` and support `--dry-run`.

**Tech Stack:** Node.js 18+, discord.js v14, @inquirer/prompts, dotenv, Jest

---

## File Map

| File | Responsibility |
|------|---------------|
| `package.json` | Dependencies and npm scripts |
| `.env.example` | Token/guild ID template |
| `.gitignore` | Ignore `.env` and `node_modules` |
| `lib/discord.js` | Discord client factory + helper functions |
| `lib/permissions.js` | Permission checking logic |
| `cleanup.js` | Script 1: kick members, delete roles/channels |
| `setup.js` | Script 2: interactive setup of course structure |
| `tests/lib/discord.test.js` | Unit tests for helpers |
| `tests/lib/permissions.test.js` | Unit tests for permission checks |

---

### Task 1: Project setup

**Files:**
- Create: `package.json`
- Create: `.env.example`
- Create: `.gitignore`

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "discord-initializer",
  "version": "1.0.0",
  "type": "commonjs",
  "scripts": {
    "cleanup": "node cleanup.js",
    "setup": "node setup.js",
    "test": "jest"
  },
  "dependencies": {
    "@inquirer/prompts": "^7.1.0",
    "discord.js": "^14.16.0",
    "dotenv": "^16.4.0"
  },
  "devDependencies": {
    "jest": "^29.7.0"
  }
}
```

- [ ] **Step 2: Create `.env.example`**

```
DISCORD_TOKEN=your_bot_token_here
GUILD_ID=your_server_id_here
```

- [ ] **Step 3: Create `.gitignore`**

```
node_modules/
.env
```

- [ ] **Step 4: Install dependencies**

Run: `npm install`
Expected: `node_modules/` created, no errors.

- [ ] **Step 5: Commit**

```bash
git add package.json .env.example .gitignore
git commit -m "chore: project setup with dependencies"
```

---

### Task 2: Shared Discord helpers (`lib/discord.js`)

**Files:**
- Create: `lib/discord.js`
- Create: `tests/lib/discord.test.js`

- [ ] **Step 1: Write failing tests**

Create `tests/lib/discord.test.js`:

```js
const { getDocentes, getMembersToKick, getRolesToDelete, getChannelsToDelete } = require('../../lib/discord');

describe('getDocentes', () => {
  it('returns members who have the Docentes role', () => {
    const docentesRole = { id: 'role-docentes', name: 'Docentes' };
    const members = [
      { id: '1', displayName: 'Alice', roles: { cache: new Map([['role-docentes', docentesRole]]) } },
      { id: '2', displayName: 'Bob', roles: { cache: new Map() } },
    ];
    const guild = { roles: { cache: new Map([['role-docentes', docentesRole]]) } };
    expect(getDocentes(guild, members)).toEqual([members[0]]);
  });

  it('returns empty array when no Docentes role exists in guild', () => {
    const members = [
      { id: '1', displayName: 'Alice', roles: { cache: new Map() } },
    ];
    const guild = { roles: { cache: new Map() } };
    expect(getDocentes(guild, members)).toEqual([]);
  });
});

describe('getMembersToKick', () => {
  it('excludes members with Docentes role and bots', () => {
    const docentesRole = { id: 'role-docentes', name: 'Docentes' };
    const members = [
      { id: '1', displayName: 'Alice', user: { bot: false }, roles: { cache: new Map([['role-docentes', docentesRole]]) } },
      { id: '2', displayName: 'Bob', user: { bot: false }, roles: { cache: new Map() } },
      { id: '3', displayName: 'BotUser', user: { bot: true }, roles: { cache: new Map() } },
    ];
    const guild = { roles: { cache: new Map([['role-docentes', docentesRole]]) } };
    const result = getMembersToKick(guild, members);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('2');
  });
});

describe('getRolesToDelete', () => {
  it('excludes @everyone and Docentes roles', () => {
    const roles = [
      { id: '1', name: '@everyone', managed: false },
      { id: '2', name: 'Docentes', managed: false },
      { id: '3', name: 'Equipo 1', managed: false },
      { id: '4', name: 'ManagedRole', managed: true },
    ];
    const guild = { roles: { cache: new Map(roles.map(r => [r.id, r])) } };
    const result = getRolesToDelete(guild);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Equipo 1');
  });
});

describe('getChannelsToDelete', () => {
  it('returns all channels and categories', () => {
    const channels = [
      { id: '1', name: 'general', type: 0 },
      { id: '2', name: 'Diseño', type: 4 },
    ];
    const guild = { channels: { cache: new Map(channels.map(c => [c.id, c])) } };
    const result = getChannelsToDelete(guild);
    expect(result).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/lib/discord.test.js`
Expected: FAIL — `Cannot find module '../../lib/discord'`

- [ ] **Step 3: Create `lib/discord.js`**

```js
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
  const docentesRole = guild.roles.cache.find(r => r.name === 'Docentes');
  if (!docentesRole) return [];
  return members.filter(m => m.roles.cache.has(docentesRole.id));
}

function getMembersToKick(guild, members) {
  const docentesRole = guild.roles.cache.find(r => r.name === 'Docentes');
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- tests/lib/discord.test.js`
Expected: PASS — 4 test suites passing.

- [ ] **Step 5: Commit**

```bash
git add lib/discord.js tests/lib/discord.test.js
git commit -m "feat(lib): add shared Discord helpers with tests"
```

---

### Task 3: Permission checking (`lib/permissions.js`)

**Files:**
- Create: `lib/permissions.js`
- Create: `tests/lib/permissions.test.js`

- [ ] **Step 1: Write failing tests**

Create `tests/lib/permissions.test.js`:

```js
const { checkBotPermissions } = require('../../lib/permissions');
const { PermissionsBitField } = require('discord.js');

describe('checkBotPermissions', () => {
  function makeGuild(permBits) {
    return {
      members: {
        me: {
          permissions: new PermissionsBitField(permBits),
        },
      },
    };
  }

  it('returns missing permissions when bot lacks them', () => {
    const guild = makeGuild(PermissionsBitField.Flags.SendMessages);
    const missing = checkBotPermissions(guild, ['KickMembers', 'ManageRoles', 'ManageChannels']);
    expect(missing).toContain('KickMembers');
    expect(missing).toContain('ManageRoles');
    expect(missing).toContain('ManageChannels');
  });

  it('returns empty array when bot has all required permissions', () => {
    const guild = makeGuild(
      PermissionsBitField.Flags.KickMembers |
      PermissionsBitField.Flags.ManageRoles |
      PermissionsBitField.Flags.ManageChannels
    );
    const missing = checkBotPermissions(guild, ['KickMembers', 'ManageRoles', 'ManageChannels']);
    expect(missing).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/lib/permissions.test.js`
Expected: FAIL — `Cannot find module '../../lib/permissions'`

- [ ] **Step 3: Create `lib/permissions.js`**

```js
const { PermissionsBitField } = require('discord.js');

function checkBotPermissions(guild, requiredPerms) {
  const botPerms = guild.members.me.permissions;
  return requiredPerms.filter(perm => !botPerms.has(PermissionsBitField.Flags[perm]));
}

module.exports = { checkBotPermissions };
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- tests/lib/permissions.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/permissions.js tests/lib/permissions.test.js
git commit -m "feat(lib): add bot permission checker with tests"
```

---

### Task 4: `cleanup.js`

**Files:**
- Create: `cleanup.js`

- [ ] **Step 1: Create `cleanup.js`**

```js
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
```

- [ ] **Step 2: Verify script can be invoked in dry-run mode**

Set up a real `.env` with your bot token and guild ID, then run:
```bash
node cleanup.js --dry-run
```
Expected: prints list of members/roles/channels that would be affected, exits without making changes.

- [ ] **Step 3: Commit**

```bash
git add cleanup.js
git commit -m "feat: add cleanup script with dry-run support"
```

---

### Task 5: `setup.js`

**Files:**
- Create: `setup.js`

- [ ] **Step 1: Create `setup.js`**

```js
require('dotenv').config();
const { select, number } = require('@inquirer/prompts');
const { ChannelType, PermissionsBitField } = require('discord.js');
const { connectAndFetch, getDocentes } = require('./lib/discord');
const { checkBotPermissions } = require('./lib/permissions');

const isDryRun = process.argv.includes('--dry-run');

async function main() {
  if (isDryRun) console.log('[DRY RUN] No changes will be made.\n');

  const { client, guild } = await connectAndFetch();
  const members = [...guild.members.cache.values()];

  const missingPerms = checkBotPermissions(guild, ['ManageRoles', 'ManageChannels']);
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

  const teamCount = await number({
    message: '¿Cuántos equipos tendrá la materia?',
    min: 1,
  });

  const channelType = await select({
    message: '¿Qué tipo de canales crear para los equipos?',
    choices: [
      { name: 'Solo texto (default)', value: 'text' },
      { name: 'Solo voz', value: 'voice' },
      { name: 'Texto y voz', value: 'both' },
    ],
    default: 'text',
  });

  const categoryName = `${course}-${docente.displayName}`;
  const teamNames = Array.from({ length: teamCount }, (_, i) => `Equipo ${i + 1}`);
  const teamChannelNames = Array.from({ length: teamCount }, (_, i) => `equipo-${i + 1}`);

  console.log(`\nSe creará la siguiente estructura:`);
  console.log(`  Categoría: ${categoryName}`);
  console.log(`  Canal: lobby (texto, visible para todos)`);
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
    const role = await guild.roles.create({ name: teamName });
    createdRoles[teamName] = role;
    console.log(`Rol creado: ${teamName}`);
  }

  // Create category — deny @everyone VIEW_CHANNEL so team channels are private by default
  const category = await guild.channels.create({
    name: categoryName,
    type: ChannelType.GuildCategory,
    permissionOverwrites: [
      { id: everyoneRole.id, deny: [PermissionsBitField.Flags.ViewChannel] },
      ...(docentesRole ? [{ id: docentesRole.id, allow: [PermissionsBitField.Flags.ViewChannel] }] : []),
    ],
  });
  console.log(`Categoría creada: ${categoryName}`);

  // Create lobby — visible to everyone (override the category deny)
  await guild.channels.create({
    name: 'lobby',
    type: ChannelType.GuildText,
    parent: category.id,
    permissionOverwrites: [
      { id: everyoneRole.id, allow: [PermissionsBitField.Flags.ViewChannel] },
    ],
  });
  console.log('Canal creado: lobby');

  // Create team channels
  for (let i = 0; i < teamCount; i++) {
    const teamRole = createdRoles[teamNames[i]];
    const overwrites = [
      { id: teamRole.id, allow: [PermissionsBitField.Flags.ViewChannel] },
    ];

    if (channelType === 'text' || channelType === 'both') {
      await guild.channels.create({
        name: teamChannelNames[i],
        type: ChannelType.GuildText,
        parent: category.id,
        permissionOverwrites: overwrites,
      });
      console.log(`Canal de texto creado: ${teamChannelNames[i]}`);
    }

    if (channelType === 'voice' || channelType === 'both') {
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
  process.exit(1);
});
```

- [ ] **Step 2: Verify script can be invoked in dry-run mode**

With a real `.env` configured, run:
```bash
node setup.js --dry-run
```
Expected: interactive prompts appear, after answering prints the full structure that would be created, exits without making changes.

- [ ] **Step 3: Commit**

```bash
git add setup.js
git commit -m "feat: add setup script with interactive prompts and dry-run support"
```

---

### Task 6: Run full test suite and smoke test

- [ ] **Step 1: Run all tests**

Run: `npm test`
Expected: all tests pass.

- [ ] **Step 2: Smoke test cleanup in dry-run**

```bash
node cleanup.js --dry-run
```
Expected: lists members, roles, and channels that would be affected. No API writes.

- [ ] **Step 3: Smoke test setup in dry-run**

```bash
node setup.js --dry-run
```
Expected: prompts for course, docente, team count, channel type — then prints the structure. No API writes.

- [ ] **Step 4: Final commit**

```bash
git add .
git commit -m "test: verify all scripts work end-to-end in dry-run"
```
