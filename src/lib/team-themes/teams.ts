/**
 * NBA team colour palettes for the "Your team" site theme.
 * Hex values follow each team's published brand palette (NBA.com team brand
 * pages / teamcolorcodes). `primary` is the team's dominant colour; `secondary`
 * is the main accent. Order is primary -> secondary -> tertiary.
 */
export interface NbaTeam {
  /** Official 3-letter abbreviation, used as the stored key (e.g. "LAL"). */
  abbr: string;
  city: string;
  name: string;
  primary: string;
  secondary: string;
  tertiary?: string;
}

export const NBA_TEAMS: readonly NbaTeam[] = [
  { abbr: 'ATL', city: 'Atlanta', name: 'Hawks', primary: '#E03A3E', secondary: '#C1D32F', tertiary: '#26282A' },
  { abbr: 'BOS', city: 'Boston', name: 'Celtics', primary: '#007A33', secondary: '#BA9653', tertiary: '#000000' },
  { abbr: 'BKN', city: 'Brooklyn', name: 'Nets', primary: '#000000', secondary: '#FFFFFF', tertiary: '#707271' },
  { abbr: 'CHA', city: 'Charlotte', name: 'Hornets', primary: '#1D1160', secondary: '#00788C', tertiary: '#A1A1A4' },
  { abbr: 'CHI', city: 'Chicago', name: 'Bulls', primary: '#CE1141', secondary: '#000000' },
  { abbr: 'CLE', city: 'Cleveland', name: 'Cavaliers', primary: '#860038', secondary: '#FDBB30', tertiary: '#041E42' },
  { abbr: 'DAL', city: 'Dallas', name: 'Mavericks', primary: '#00538C', secondary: '#002B5E', tertiary: '#B8C4CA' },
  { abbr: 'DEN', city: 'Denver', name: 'Nuggets', primary: '#0E2240', secondary: '#FEC524', tertiary: '#8B2131' },
  { abbr: 'DET', city: 'Detroit', name: 'Pistons', primary: '#C8102E', secondary: '#1D42BA', tertiary: '#BEC0C2' },
  { abbr: 'GSW', city: 'Golden State', name: 'Warriors', primary: '#1D428A', secondary: '#FFC72C' },
  { abbr: 'HOU', city: 'Houston', name: 'Rockets', primary: '#CE1141', secondary: '#000000', tertiary: '#C4CED4' },
  { abbr: 'IND', city: 'Indiana', name: 'Pacers', primary: '#002D62', secondary: '#FDBB30', tertiary: '#BEC0C2' },
  { abbr: 'LAC', city: 'LA', name: 'Clippers', primary: '#C8102E', secondary: '#1D428A', tertiary: '#BEC0C2' },
  { abbr: 'LAL', city: 'Los Angeles', name: 'Lakers', primary: '#552583', secondary: '#FDB927', tertiary: '#000000' },
  { abbr: 'MEM', city: 'Memphis', name: 'Grizzlies', primary: '#5D76A9', secondary: '#12173F', tertiary: '#F5B112' },
  { abbr: 'MIA', city: 'Miami', name: 'Heat', primary: '#98002E', secondary: '#F9A01B', tertiary: '#000000' },
  { abbr: 'MIL', city: 'Milwaukee', name: 'Bucks', primary: '#00471B', secondary: '#EEE1C6', tertiary: '#0077C0' },
  { abbr: 'MIN', city: 'Minnesota', name: 'Timberwolves', primary: '#0C2340', secondary: '#78BE20', tertiary: '#236192' },
  { abbr: 'NOP', city: 'New Orleans', name: 'Pelicans', primary: '#0C2340', secondary: '#C8102E', tertiary: '#85714D' },
  { abbr: 'NYK', city: 'New York', name: 'Knicks', primary: '#006BB6', secondary: '#F58426', tertiary: '#BEC0C2' },
  { abbr: 'OKC', city: 'Oklahoma City', name: 'Thunder', primary: '#007AC1', secondary: '#EF3B24', tertiary: '#002D62' },
  { abbr: 'ORL', city: 'Orlando', name: 'Magic', primary: '#0077C0', secondary: '#C4CED4', tertiary: '#000000' },
  { abbr: 'PHI', city: 'Philadelphia', name: '76ers', primary: '#006BB6', secondary: '#ED174C', tertiary: '#002B5C' },
  { abbr: 'PHX', city: 'Phoenix', name: 'Suns', primary: '#1D1160', secondary: '#E56020', tertiary: '#000000' },
  { abbr: 'POR', city: 'Portland', name: 'Trail Blazers', primary: '#E03A3E', secondary: '#000000' },
  { abbr: 'SAC', city: 'Sacramento', name: 'Kings', primary: '#5A2D81', secondary: '#63727A', tertiary: '#000000' },
  { abbr: 'SAS', city: 'San Antonio', name: 'Spurs', primary: '#000000', secondary: '#C4CED4' },
  { abbr: 'TOR', city: 'Toronto', name: 'Raptors', primary: '#CE1141', secondary: '#000000', tertiary: '#A1A1A4' },
  { abbr: 'UTA', city: 'Utah', name: 'Jazz', primary: '#3E2680', secondary: '#79A3DC', tertiary: '#000000' },
  { abbr: 'WAS', city: 'Washington', name: 'Wizards', primary: '#002B5C', secondary: '#E31837', tertiary: '#C4CED4' },
] as const;

const BY_ABBR = new Map(NBA_TEAMS.map((t) => [t.abbr, t]));

export function getTeam(abbr: string | null | undefined): NbaTeam | undefined {
  return abbr ? BY_ABBR.get(abbr.toUpperCase()) : undefined;
}

export function teamLabel(t: NbaTeam): string {
  return `${t.city} ${t.name}`;
}
