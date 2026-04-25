# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm test                                    # run all tests
npm test -- tests/lib/discord.test.js      # run a single test file
npm run cleanup                             # run cleanup.js
npm run setup                               # run setup.js
node cleanup.js --dry-run                   # preview cleanup without changes
node setup.js --dry-run                     # preview setup without changes
```

## Architecture

Two standalone CLI scripts share a common library. Neither runs as a persistent bot — they connect, do their work, and exit.

**`cleanup.js`** — Script 1. Kicks all server members except those with the `Docentes` role, deletes all non-protected roles, deletes all non-system channels. Asks for confirmation before executing. Always check permissions first via `lib/permissions.js`.

**`setup.js`** — Script 2. Interactive wizard that creates the course structure: a category named `{course}-{teacherName}`, a public `lobby` text channel, and one channel per team (`equipo-1`, `equipo-2`, …) visible only to that team's role. Fetches available teachers directly from Discord members who have the `Docentes` role.

**`lib/discord.js`** — Shared helpers. `connectAndFetch()` handles login + guild member fetch. Filter functions (`getMembersToKick`, `getRolesToDelete`, `getChannelsToDelete`) are pure and tested with mock guild objects. `getChannelsToDelete` excludes Discord system/rules/community channels that the API won't allow deleting.

**`lib/permissions.js`** — `checkBotPermissions(guild, permNames[])` takes permission names as strings (e.g. `'KickMembers'`), validates they exist in `PermissionsBitField.Flags` (throws on typo), and returns the subset the bot is missing.

## Key conventions

- Both scripts call `require('dotenv').config()` at the top — `lib/discord.js` does not (library modules don't load env).
- `client` is hoisted to module scope in both scripts so the `main().catch()` handler can call `client.destroy()` before exiting.
- All git commits use Conventional Commits format (`feat:`, `fix:`, `chore:`, `refactor:`, etc.).
- The `Docentes` role name is hardcoded — it's the protected role that never gets kicked or deleted.
