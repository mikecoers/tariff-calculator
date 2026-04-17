import { playersRepo } from '@/db/repositories';
import type { Player } from '@/types';

export const WIPE_AND_RESEED = true;

const PHILLIES = [
  'Cooper Coers',
  'Aiden Doughty',
  'Arlington Pribble',
  'Asher Zielinski',
  'Benjamin Davis',
  'Braxton Gifford',
  'Griffin Connor',
  'Jake Rogers',
  'Jaxon Logan',
  'Owen Bailey',
  'Spencer Ryan',
  'Weston Monson'
];

function toDisplay(first: string, last: string): string {
  return `${first} ${last[0] ?? ''}.`.trim();
}

export async function seedPhilliesRoster(teamId: string, wipe = false): Promise<Player[]> {
  if (wipe) {
    await playersRepo.wipeTeam(teamId);
  }
  const rows = PHILLIES.map((full) => {
    const [first, ...rest] = full.split(' ');
    const last = rest.join(' ');
    return {
      teamId,
      firstName: first,
      lastName: last,
      displayName: toDisplay(first, last),
      jerseyNumber: '',
      preferredPositions: [],
      secondaryPositions: [],
      active: true,
      isCatcher: false
    } as Omit<Player, 'id' | 'createdAt' | 'updatedAt'>;
  });
  return playersRepo.bulkCreate(rows);
}
