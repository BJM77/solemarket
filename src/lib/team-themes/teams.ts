/**
 * NBA team colour palettes for the "Your team" site theme.
 * Hex values follow each team's published brand palette (NBA.com team brand
 * pages / teamcolorcodes). `primary` is the team's dominant colour; `secondary`
 * is the main accent. Order is primary -> secondary -> tertiary.
 */
export interface NbaTeam {
  /** Official 3-letter abbreviation, used as the stored key (e.g. "LAL"). Not shown in the picker. */
  abbr: string;
  city: string;
  name: string;
  /** Public city-and-colour label, e.g. "LA Purple & Gold". */
  label: string;
  primary: string;
  secondary: string;
  tertiary?: string;
}

export const NBA_TEAMS: readonly NbaTeam[] = [
  { abbr: 'ATL', city: 'Atlanta', name: 'Hawks', label: 'Atlanta Red & Volt', primary: '#E03A3E', secondary: '#C1D32F', tertiary: '#26282A' },
  { abbr: 'BOS', city: 'Boston', name: 'Celtics', label: 'Boston Green & Gold', primary: '#007A33', secondary: '#BA9653', tertiary: '#000000' },
  { abbr: 'BKN', city: 'Brooklyn', name: 'Nets', label: 'Brooklyn Black & White', primary: '#000000', secondary: '#FFFFFF', tertiary: '#707271' },
  { abbr: 'CHA', city: 'Charlotte', name: 'Hornets', label: 'Charlotte Purple & Teal', primary: '#1D1160', secondary: '#00788C', tertiary: '#A1A1A4' },
  { abbr: 'CHI', city: 'Chicago', name: 'Bulls', label: 'Chicago Red & Black', primary: '#CE1141', secondary: '#000000' },
  { abbr: 'CLE', city: 'Cleveland', name: 'Cavaliers', label: 'Cleveland Wine & Gold', primary: '#860038', secondary: '#FDBB30', tertiary: '#041E42' },
  { abbr: 'DAL', city: 'Dallas', name: 'Mavericks', label: 'Dallas Blue & Navy', primary: '#00538C', secondary: '#002B5E', tertiary: '#B8C4CA' },
  { abbr: 'DEN', city: 'Denver', name: 'Nuggets', label: 'Denver Navy & Gold', primary: '#0E2240', secondary: '#FEC524', tertiary: '#8B2131' },
  { abbr: 'DET', city: 'Detroit', name: 'Pistons', label: 'Detroit Red & Blue', primary: '#C8102E', secondary: '#1D42BA', tertiary: '#BEC0C2' },
  { abbr: 'GSW', city: 'Golden State', name: 'Warriors', label: 'Bay Area Blue & Gold', primary: '#1D428A', secondary: '#FFC72C' },
  { abbr: 'HOU', city: 'Houston', name: 'Rockets', label: 'Houston Red & Black', primary: '#CE1141', secondary: '#000000', tertiary: '#C4CED4' },
  { abbr: 'IND', city: 'Indiana', name: 'Pacers', label: 'Indiana Navy & Gold', primary: '#002D62', secondary: '#FDBB30', tertiary: '#BEC0C2' },
  { abbr: 'LAC', city: 'LA', name: 'Clippers', label: 'LA Red & Blue', primary: '#C8102E', secondary: '#1D428A', tertiary: '#BEC0C2' },
  { abbr: 'LAL', city: 'Los Angeles', name: 'Lakers', label: 'LA Purple & Gold', primary: '#552583', secondary: '#FDB927', tertiary: '#000000' },
  { abbr: 'MEM', city: 'Memphis', name: 'Grizzlies', label: 'Memphis Steel & Navy', primary: '#5D76A9', secondary: '#12173F', tertiary: '#F5B112' },
  { abbr: 'MIA', city: 'Miami', name: 'Heat', label: 'Miami Red & Gold', primary: '#98002E', secondary: '#F9A01B', tertiary: '#000000' },
  { abbr: 'MIL', city: 'Milwaukee', name: 'Bucks', label: 'Milwaukee Green & Cream', primary: '#00471B', secondary: '#EEE1C6', tertiary: '#0077C0' },
  { abbr: 'MIN', city: 'Minnesota', name: 'Timberwolves', label: 'Minnesota Navy & Green', primary: '#0C2340', secondary: '#78BE20', tertiary: '#236192' },
  { abbr: 'NOP', city: 'New Orleans', name: 'Pelicans', label: 'New Orleans Navy & Red', primary: '#0C2340', secondary: '#C8102E', tertiary: '#85714D' },
  { abbr: 'NYK', city: 'New York', name: 'Knicks', label: 'New York Blue & Orange', primary: '#006BB6', secondary: '#F58426', tertiary: '#BEC0C2' },
  { abbr: 'OKC', city: 'Oklahoma City', name: 'Thunder', label: 'Oklahoma City Blue & Orange', primary: '#007AC1', secondary: '#EF3B24', tertiary: '#002D62' },
  { abbr: 'ORL', city: 'Orlando', name: 'Magic', label: 'Orlando Blue & Silver', primary: '#0077C0', secondary: '#C4CED4', tertiary: '#000000' },
  { abbr: 'PHI', city: 'Philadelphia', name: '76ers', label: 'Philadelphia Blue & Red', primary: '#006BB6', secondary: '#ED174C', tertiary: '#002B5C' },
  { abbr: 'PHX', city: 'Phoenix', name: 'Suns', label: 'Phoenix Purple & Orange', primary: '#1D1160', secondary: '#E56020', tertiary: '#000000' },
  { abbr: 'POR', city: 'Portland', name: 'Trail Blazers', label: 'Portland Red & Black', primary: '#E03A3E', secondary: '#000000' },
  { abbr: 'SAC', city: 'Sacramento', name: 'Kings', label: 'Sacramento Purple & Silver', primary: '#5A2D81', secondary: '#63727A', tertiary: '#000000' },
  { abbr: 'SAS', city: 'San Antonio', name: 'Spurs', label: 'San Antonio Black & Silver', primary: '#000000', secondary: '#C4CED4' },
  { abbr: 'TOR', city: 'Toronto', name: 'Raptors', label: 'Toronto Red & Black', primary: '#CE1141', secondary: '#000000', tertiary: '#A1A1A4' },
  { abbr: 'UTA', city: 'Utah', name: 'Jazz', label: 'Utah Purple & Sky', primary: '#3E2680', secondary: '#79A3DC', tertiary: '#000000' },
  { abbr: 'WAS', city: 'Washington', name: 'Wizards', label: 'Washington Navy & Red', primary: '#002B5C', secondary: '#E31837', tertiary: '#C4CED4' },
] as const;

const BY_ABBR = new Map(NBA_TEAMS.map((t) => [t.abbr, t]));

export function getTeam(abbr: string | null | undefined): NbaTeam | undefined {
  return abbr ? BY_ABBR.get(abbr.toUpperCase()) : undefined;
}

/** Swap the two colour names at the end of a city-and-colour label. */
export function flipColourLabel(label: string): string {
  const m = label.match(/^(.*)\s(\S+)\s&\s(\S+)$/);
  return m ? `${m[1]} ${m[3]} & ${m[2]}` : label;
}

/** Public theme name: city and colours. Pass alt to swap the two colours. */
export function teamLabel(t: NbaTeam, alt = false): string {
  return alt ? flipColourLabel(t.label) : t.label;
}

/** Short label under a picker swatch. Full teamLabel() stays on the title and aria-label. */
export function pickerShortLabel(t: NbaTeam): string {
  if (t.abbr === 'LAL') return 'LA Purple';
  if (t.abbr === 'LAC') return 'LA Red';
  if (t.abbr === 'GSW') return 'Bay Area';
  return t.city;
}

