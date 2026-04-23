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

  it('throws when an unknown permission name is passed', () => {
    const guild = makeGuild(0n);
    expect(() => checkBotPermissions(guild, ['InvalidPerm'])).toThrow('Permiso desconocido: InvalidPerm');
  });
});
