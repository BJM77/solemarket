import { describe, expect, it } from 'vitest';
import { aliasesForTeamFilter, TEAM_FILTERS } from './team-aliases';

describe('team filter aliases', () => {
  it('maps city labels and legacy nicknames to the same alias set', () => {
    expect(TEAM_FILTERS).toHaveLength(30);
    const lakers = aliasesForTeamFilter('lakers');
    expect(lakers).toContain('lakers');
    expect(aliasesForTeamFilter('la-purple-gold')).toEqual(lakers);
    expect(aliasesForTeamFilter('Celtics')).toEqual(aliasesForTeamFilter('boston'));
    expect(aliasesForTeamFilter('unknown-team')).toEqual(['unknown-team']);
  });
});
