import Papa from 'papaparse';
import type { Player, Position } from '@/types';

const KNOWN_POSITIONS: Position[] = ['P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF'];

function parsePositions(value: string | undefined): Position[] {
  if (!value) return [];
  return value
    .split(/[|,]/)
    .map((s) => s.trim().toUpperCase())
    .filter((s): s is Position => (KNOWN_POSITIONS as string[]).includes(s));
}

export interface ParsedRosterRow {
  firstName: string;
  lastName: string;
  displayName: string;
  jerseyNumber?: string;
  age?: number;
  bats?: Player['bats'];
  throws?: Player['throws'];
  isCatcher: boolean;
  preferredPositions: Position[];
  secondaryPositions: Position[];
  notes?: string;
  active: boolean;
}

export function parseRosterCsv(csv: string): { rows: ParsedRosterRow[]; errors: string[] } {
  const parsed = Papa.parse<Record<string, string>>(csv, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase().replace(/\s+/g, '_')
  });
  const errors: string[] = parsed.errors.map((e) => `${e.row != null ? `Row ${e.row}: ` : ''}${e.message}`);
  const rows: ParsedRosterRow[] = [];
  for (const r of parsed.data) {
    const first = (r.first_name || r.first || r.firstname || '').trim();
    const last = (r.last_name || r.last || r.lastname || '').trim();
    if (!first && !last) continue;
    const display =
      (r.display_name || r.nickname || `${first} ${last.slice(0, 1) ? last[0] + '.' : ''}`).trim() || first;
    rows.push({
      firstName: first,
      lastName: last,
      displayName: display,
      jerseyNumber: (r.jersey || r.jersey_number || '').trim() || undefined,
      age: r.age ? Number(r.age) : undefined,
      bats: (r.bats || '').toUpperCase() as Player['bats'] | undefined,
      throws: (r.throws || '').toUpperCase() as Player['throws'] | undefined,
      isCatcher: /^true|1|yes$/i.test(r.is_catcher || r.catcher || ''),
      preferredPositions: parsePositions(r.preferred_positions || r.preferred || r.positions),
      secondaryPositions: parsePositions(r.secondary_positions || r.secondary),
      notes: (r.notes || '').trim() || undefined,
      active: /^false|0|no$/i.test(r.active || '') ? false : true
    });
  }
  return { rows, errors };
}

export function rosterToCsv(players: Player[]): string {
  return Papa.unparse(
    players.map((p) => ({
      first_name: p.firstName,
      last_name: p.lastName,
      display_name: p.displayName,
      jersey_number: p.jerseyNumber ?? '',
      age: p.age ?? '',
      bats: p.bats ?? '',
      throws: p.throws ?? '',
      is_catcher: p.isCatcher ? 'true' : 'false',
      preferred_positions: p.preferredPositions.join('|'),
      secondary_positions: p.secondaryPositions.join('|'),
      notes: p.notes ?? '',
      active: p.active ? 'true' : 'false'
    }))
  );
}
