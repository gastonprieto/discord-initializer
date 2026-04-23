# Discord Initializer — Design Spec

**Date:** 2026-04-22

## Context

Script de Node.js para inicializar el servidor de Discord al comienzo de cada cuatrimestre o año. Hay dos materias: `diseño` (anual) y `desarrollo` (cuatrimestral). Los docentes tienen el rol `Docentes` en el servidor y nunca son expulsados.

---

## Architecture

Two standalone scripts, no server or background process. The bot authenticates via token, performs REST operations, and exits.

```
discord-initializer/
├── cleanup.js        # Script 1: kicks members, deletes roles and channels
├── setup.js          # Script 2: creates categories, channels, and team roles
├── lib/
│   └── discord.js    # Shared Discord client and helper functions
├── .env              # DISCORD_TOKEN, GUILD_ID
└── package.json
```

**Dependencies:**
- `discord.js` — Discord REST API client
- `@inquirer/prompts` — interactive CLI (arrow key selection, confirmations)
- `dotenv` — load token from `.env`

Both scripts support a `--dry-run` flag that prints all intended actions without executing them.

---

## Script 1: `cleanup.js`

**Purpose:** Reset the server between course periods.

**Steps:**
1. Connect to the guild via bot token
2. Fetch all members
3. Show a summary: how many members will be kicked, how many roles/channels will be deleted
4. Ask for confirmation (`¿Confirmar? s/n`) — skipped in dry-run
5. **Kick** all members except those with the `Docentes` role
6. **Delete** all roles except `@everyone` and `Docentes`
7. **Delete** all channels and categories

**Dry-run behavior:** Prints what would be kicked/deleted without making any API calls.

---

## Script 2: `setup.js`

**Purpose:** Create the channel structure and team roles for a course.

**Interactive flow:**
1. Select course: `diseño` or `desarrollo`
2. Select teacher: fetched from members with the `Docentes` role (arrow key list)
3. Enter number of teams (numeric input)
4. Select channel types: text only / voice only / both (default: text only)

**What gets created:**
- One **category** named `diseño-NombreDocente` or `desarrollo-NombreDocente`
- One `lobby` channel inside the category — visible to all server members
- One channel per team: `equipo-1`, `equipo-2`, etc. — visible only to the corresponding team role
- One **role** per team: `Equipo 1`, `Equipo 2`, etc.

Channel type (text/voice/both) applies to team channels. `lobby` is always text.

**Dry-run behavior:** Prints the full list of roles and channels that would be created without making any API calls.

---

## Configuration

No persistent config file needed — all inputs are gathered interactively at runtime. The `.env` file holds:

```
DISCORD_TOKEN=your_bot_token
GUILD_ID=your_server_id
```

---

## Permissions model

| Channel | Who can see it |
|---------|---------------|
| `lobby` | All server members |
| `equipo-N` | Members with role `Equipo N` + `Docentes` |

Category permissions inherit to all channels inside it. Team role permissions are set as overwrites on the category, then each team channel adds its specific role overwrite.

---

## Error handling

- If the bot lacks `KICK_MEMBERS`, `MANAGE_ROLES`, or `MANAGE_CHANNELS` permissions, print a clear error and exit before doing anything.
- Rate limits are handled automatically by `discord.js`.
- If a channel or role deletion fails mid-run, log the error and continue with remaining items.
