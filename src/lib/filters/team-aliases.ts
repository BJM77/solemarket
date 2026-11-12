/**
 * Card "team" filters use city (or city-and-colour) labels in the UI.
 * Each option still matches official nicknames in existing listing titles
 * so current data keeps filtering correctly.
 */
export interface TeamFilterOption {
  /** Value stored in the query string. */
  value: string;
  /** Shown in the filter UI. */
  label: string;
  /** Lowercase substrings matched against title + description. */
  aliases: string[];
}

export const TEAM_FILTERS: readonly TeamFilterOption[] = [
  { value: 'atlanta', label: 'Atlanta', aliases: ['atlanta', 'hawks'] },
  { value: 'boston', label: 'Boston', aliases: ['boston', 'celtics'] },
  { value: 'brooklyn', label: 'Brooklyn', aliases: ['brooklyn', 'nets'] },
  { value: 'charlotte', label: 'Charlotte', aliases: ['charlotte', 'hornets'] },
  { value: 'chicago', label: 'Chicago', aliases: ['chicago', 'bulls'] },
  { value: 'cleveland', label: 'Cleveland', aliases: ['cleveland', 'cavaliers', 'cavs'] },
  { value: 'dallas', label: 'Dallas', aliases: ['dallas', 'mavericks', 'mavs'] },
  { value: 'denver', label: 'Denver', aliases: ['denver', 'nuggets'] },
  { value: 'detroit', label: 'Detroit', aliases: ['detroit', 'pistons'] },
  { value: 'bay-area', label: 'Bay Area', aliases: ['golden state', 'warriors', 'bay area'] },
  { value: 'houston', label: 'Houston', aliases: ['houston', 'rockets'] },
  { value: 'indiana', label: 'Indiana', aliases: ['indiana', 'pacers'] },
  { value: 'la-red-blue', label: 'LA Red & Blue', aliases: ['clippers'] },
  { value: 'la-purple-gold', label: 'LA Purple & Gold', aliases: ['lakers'] },
  { value: 'memphis', label: 'Memphis', aliases: ['memphis', 'grizzlies'] },
  { value: 'miami', label: 'Miami', aliases: ['miami', 'heat'] },
  { value: 'milwaukee', label: 'Milwaukee', aliases: ['milwaukee', 'bucks'] },
  { value: 'minnesota', label: 'Minnesota', aliases: ['minnesota', 'timberwolves', 'wolves'] },
  { value: 'new-orleans', label: 'New Orleans', aliases: ['new orleans', 'pelicans'] },
  { value: 'new-york', label: 'New York', aliases: ['new york', 'knicks'] },
  { value: 'oklahoma-city', label: 'Oklahoma City', aliases: ['oklahoma city', 'okc', 'thunder'] },
  { value: 'orlando', label: 'Orlando', aliases: ['orlando', 'magic'] },
  { value: 'philadelphia', label: 'Philadelphia', aliases: ['philadelphia', '76ers', 'sixers'] },
  { value: 'phoenix', label: 'Phoenix', aliases: ['phoenix', 'suns'] },
  { value: 'portland', label: 'Portland', aliases: ['portland', 'trail blazers', 'blazers'] },
  { value: 'sacramento', label: 'Sacramento', aliases: ['sacramento', 'kings'] },
  { value: 'san-antonio', label: 'San Antonio', aliases: ['san antonio', 'spurs'] },
  { value: 'toronto', label: 'Toronto', aliases: ['toronto', 'raptors'] },
  { value: 'utah', label: 'Utah', aliases: ['utah', 'jazz'] },
  { value: 'washington', label: 'Washington', aliases: ['washington', 'wizards'] },
];

/** Aliases to match against listing text for a filter value or a legacy nickname. */
export function aliasesForTeamFilter(raw: string): string[] {
  const q = String(raw || '').trim().toLowerCase();
  if (!q) return [];
  const found = TEAM_FILTERS.find(
    (t) => t.value === q || t.label.toLowerCase() === q || t.aliases.includes(q),
  );
  return found ? found.aliases : [q];
}
