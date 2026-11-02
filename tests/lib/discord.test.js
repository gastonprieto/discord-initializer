const { getDocentes, getMembersToKick, getRolesToDelete, getChannelsToDelete, getCategories, getCategoryChannels, getCategoryRoles } = require('../../lib/discord');

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
    const guild = {
      systemChannelId: null,
      rulesChannelId: null,
      publicUpdatesChannelId: null,
      channels: { cache: new Map(channels.map(c => [c.id, c])) },
    };
    const result = getChannelsToDelete(guild);
    expect(result).toHaveLength(2);
    expect(result.map(c => c.id).sort()).toEqual(['1', '2']);
  });

  it('excludes system channels', () => {
    const channels = [
      { id: 'sys', name: 'system', type: 0 },
      { id: '1', name: 'general', type: 0 },
    ];
    const guild = {
      systemChannelId: 'sys',
      rulesChannelId: null,
      publicUpdatesChannelId: null,
      channels: { cache: new Map(channels.map(c => [c.id, c])) },
    };
    const result = getChannelsToDelete(guild);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });
});

describe('getCategories', () => {
  it('returns only category channels', () => {
    const channels = [
      { id: '1', name: 'lobby', type: 0 },
      { id: '2', name: 'diseño-juan', type: 4 },
    ];
    const guild = { channels: { cache: new Map(channels.map(c => [c.id, c])) } };
    expect(getCategories(guild).map(c => c.id)).toEqual(['2']);
  });
});

describe('getCategoryChannels', () => {
  it('returns channels whose parent is the category', () => {
    const channels = [
      { id: 'cat', name: 'diseño-juan', type: 4, parentId: null },
      { id: '1', name: 'diseño-equipo-1', type: 0, parentId: 'cat' },
      { id: '2', name: 'lobby', type: 0, parentId: null },
      { id: '3', name: 'desarrollo-equipo-1', type: 0, parentId: 'other' },
    ];
    const guild = { channels: { cache: new Map(channels.map(c => [c.id, c])) } };
    expect(getCategoryChannels(guild, 'cat').map(c => c.id)).toEqual(['1']);
  });
});

describe('getCategoryRoles', () => {
  const overwrites = ids => ({ cache: new Map(ids.map(id => [id, { id, type: 0 }])) });

  it('returns roles with overwrites on the category channels, excluding protected and shared roles', () => {
    const roles = [
      { id: 'everyone', name: '@everyone', managed: false },
      { id: 'doc', name: 'Docentes', managed: false },
      { id: 'eq1', name: 'diseño-equipo-1', managed: false },
      { id: 'eq2', name: 'diseño-equipo-2', managed: false },
      { id: 'shared', name: 'Ayudantes', managed: false },
      { id: 'bot', name: 'BotRole', managed: true },
    ];
    const channels = [
      { id: 'cat', type: 4, parentId: null, permissionOverwrites: overwrites(['everyone', 'doc']) },
      { id: '1', type: 0, parentId: 'cat', permissionOverwrites: overwrites(['everyone', 'eq1', 'shared', 'bot']) },
      { id: '2', type: 0, parentId: 'cat', permissionOverwrites: overwrites(['everyone', 'eq2']) },
      { id: '3', type: 0, parentId: 'other', permissionOverwrites: overwrites(['everyone', 'shared']) },
    ];
    const guild = {
      roles: { cache: new Map(roles.map(r => [r.id, r])) },
      channels: { cache: new Map(channels.map(c => [c.id, c])) },
    };
    expect(getCategoryRoles(guild, 'cat').map(r => r.id).sort()).toEqual(['eq1', 'eq2']);
  });
});
