import { db } from './schema';
import { newId, now } from '@/lib/id';
import type {
  Team,
  Player,
  Game,
  GameLineup,
  DefensiveAssignment,
  AtBat,
  PitchEvent,
  GameEvent,
  PlayerGameStats,
  PitcherAppearance,
  PitcherRest,
  SeasonSettings,
  Alert
} from '@/types';

export const teamsRepo = {
  all: () => db.teams.toArray(),
  get: (id: string) => db.teams.get(id),
  create: async (input: Omit<Team, 'id' | 'createdAt' | 'updatedAt'>): Promise<Team> => {
    const t: Team = { ...input, id: newId('tm'), createdAt: now(), updatedAt: now() };
    await db.teams.put(t);
    return t;
  },
  update: async (id: string, patch: Partial<Team>) => {
    const t = await db.teams.get(id);
    if (!t) return;
    const merged = { ...t, ...patch, updatedAt: now() };
    await db.teams.put(merged);
    return merged;
  },
  remove: (id: string) => db.teams.delete(id)
};

export const playersRepo = {
  byTeam: (teamId: string) => db.players.where('teamId').equals(teamId).toArray(),
  activeByTeam: (teamId: string) =>
    db.players.where('teamId').equals(teamId).filter((p) => !!p.active).toArray(),
  get: (id: string) => db.players.get(id),
  getMany: (ids: string[]) => db.players.bulkGet(ids).then((list) => list.filter(Boolean) as Player[]),
  create: async (input: Omit<Player, 'id' | 'createdAt' | 'updatedAt'>): Promise<Player> => {
    const p: Player = { ...input, id: newId('pl'), createdAt: now(), updatedAt: now() };
    await db.players.put(p);
    return p;
  },
  bulkCreate: async (items: Array<Omit<Player, 'id' | 'createdAt' | 'updatedAt'>>) => {
    const rows: Player[] = items.map((i) => ({ ...i, id: newId('pl'), createdAt: now(), updatedAt: now() }));
    await db.players.bulkPut(rows);
    return rows;
  },
  update: async (id: string, patch: Partial<Player>) => {
    const p = await db.players.get(id);
    if (!p) return;
    const merged = { ...p, ...patch, updatedAt: now() };
    await db.players.put(merged);
    return merged;
  },
  remove: (id: string) => db.players.delete(id),
  wipeTeam: (teamId: string) => db.players.where('teamId').equals(teamId).delete()
};

export const gamesRepo = {
  all: () => db.games.orderBy('date').reverse().toArray(),
  byTeam: (teamId: string) => db.games.where('teamId').equals(teamId).toArray(),
  get: (id: string) => db.games.get(id),
  inProgress: async (teamId: string) =>
    (await db.games.where('[teamId+status]').equals([teamId, 'in_progress']).toArray())[0],
  create: async (input: Omit<Game, 'id' | 'createdAt' | 'updatedAt'>): Promise<Game> => {
    const g: Game = { ...input, id: newId('gm'), createdAt: now(), updatedAt: now() };
    await db.games.put(g);
    return g;
  },
  update: async (id: string, patch: Partial<Game>) => {
    const g = await db.games.get(id);
    if (!g) return;
    const merged = { ...g, ...patch, updatedAt: now() };
    await db.games.put(merged);
    return merged;
  },
  remove: (id: string) => db.games.delete(id)
};

export const lineupsRepo = {
  forGame: (gameId: string) => db.gameLineups.where('gameId').equals(gameId).toArray(),
  forInning: async (gameId: string, inning: number) => {
    const rows = await db.gameLineups.where('[gameId+inning]').equals([gameId, inning]).toArray();
    return rows[0];
  },
  latest: async (gameId: string) => {
    const rows = await db.gameLineups.where('gameId').equals(gameId).toArray();
    rows.sort((a, b) => b.inning - a.inning);
    return rows[0];
  },
  upsert: async (lineup: Omit<GameLineup, 'id'> & { id?: string }): Promise<GameLineup> => {
    const withId: GameLineup = { ...lineup, id: lineup.id ?? newId('ln') };
    await db.gameLineups.put(withId);
    return withId;
  }
};

export const defenseRepo = {
  forGame: (gameId: string) => db.defensiveAssignments.where('gameId').equals(gameId).toArray(),
  forInning: (gameId: string, inning: number) =>
    db.defensiveAssignments.where('[gameId+inning]').equals([gameId, inning]).toArray(),
  bulkInsert: async (rows: Array<Omit<DefensiveAssignment, 'id'>>) => {
    const withIds = rows.map((r) => ({ ...r, id: newId('da') }));
    await db.defensiveAssignments.bulkPut(withIds);
    return withIds;
  },
  remove: (id: string) => db.defensiveAssignments.delete(id),
  removeInning: (gameId: string, inning: number) =>
    db.defensiveAssignments.where('[gameId+inning]').equals([gameId, inning]).delete()
};

export const atBatsRepo = {
  forGame: (gameId: string) => db.atBats.where('gameId').equals(gameId).sortBy('timestamp'),
  latest: async (gameId: string) => {
    const rows = await db.atBats.where('gameId').equals(gameId).toArray();
    rows.sort((a, b) => b.timestamp - a.timestamp);
    return rows[0];
  },
  create: async (input: Omit<AtBat, 'id'>): Promise<AtBat> => {
    const ab: AtBat = { ...input, id: newId('ab') };
    await db.atBats.put(ab);
    return ab;
  },
  remove: (id: string) => db.atBats.delete(id)
};

export const pitchEventsRepo = {
  forGame: (gameId: string) => db.pitchEvents.where('gameId').equals(gameId).toArray(),
  forAtBat: (gameId: string, atBatId: string) =>
    db.pitchEvents.where('[gameId+atBatId]').equals([gameId, atBatId]).toArray(),
  forPitcherInGame: (gameId: string, pitcherPlayerId: string) =>
    db.pitchEvents.where('[gameId+pitcherPlayerId]').equals([gameId, pitcherPlayerId]).toArray(),
  create: async (input: Omit<PitchEvent, 'id'>): Promise<PitchEvent> => {
    const p: PitchEvent = { ...input, id: newId('pt') };
    await db.pitchEvents.put(p);
    return p;
  },
  remove: (id: string) => db.pitchEvents.delete(id)
};

export const gameEventsRepo = {
  forGame: (gameId: string) => db.gameEvents.where('gameId').equals(gameId).sortBy('timestamp'),
  latest: async (gameId: string) => {
    const rows = await db.gameEvents.where('gameId').equals(gameId).toArray();
    rows.sort((a, b) => b.timestamp - a.timestamp);
    return rows[0];
  },
  create: async (input: Omit<GameEvent, 'id'>): Promise<GameEvent> => {
    const e: GameEvent = { ...input, id: newId('ev') };
    await db.gameEvents.put(e);
    return e;
  },
  remove: (id: string) => db.gameEvents.delete(id)
};

export const playerStatsRepo = {
  forGame: (gameId: string) => db.playerGameStats.where('gameId').equals(gameId).toArray(),
  forPlayer: (playerId: string) => db.playerGameStats.where('playerId').equals(playerId).toArray(),
  upsert: async (s: PlayerGameStats) => {
    await db.playerGameStats.put(s);
    return s;
  },
  removeForGame: async (gameId: string) => {
    await db.playerGameStats.where('gameId').equals(gameId).delete();
  }
};

export const pitcherAppearancesRepo = {
  forGame: (gameId: string) => db.pitcherAppearances.where('gameId').equals(gameId).toArray(),
  forPlayer: (playerId: string) => db.pitcherAppearances.where('playerId').equals(playerId).toArray(),
  upsert: async (a: PitcherAppearance) => {
    await db.pitcherAppearances.put(a);
    return a;
  },
  create: async (input: Omit<PitcherAppearance, 'id'>): Promise<PitcherAppearance> => {
    const a: PitcherAppearance = { ...input, id: newId('pa') };
    await db.pitcherAppearances.put(a);
    return a;
  }
};

export const pitcherRestRepo = {
  forPlayer: (playerId: string) => db.pitcherRest.where('playerId').equals(playerId).toArray(),
  upsert: async (r: PitcherRest) => {
    await db.pitcherRest.put(r);
    return r;
  },
  create: async (input: Omit<PitcherRest, 'id'>): Promise<PitcherRest> => {
    const r: PitcherRest = { ...input, id: newId('pr') };
    await db.pitcherRest.put(r);
    return r;
  }
};

export const settingsRepo = {
  forTeam: async (teamId: string, seasonYear: number): Promise<SeasonSettings | undefined> => {
    const rows = await db.seasonSettings
      .where('[teamId+seasonYear]')
      .equals([teamId, seasonYear])
      .toArray();
    return rows[0];
  },
  upsert: async (s: SeasonSettings) => {
    await db.seasonSettings.put(s);
    return s;
  }
};

export const alertsRepo = {
  forGame: (gameId: string) => db.alerts.where('gameId').equals(gameId).reverse().sortBy('createdAt'),
  active: async (gameId: string) =>
    (await db.alerts.where('gameId').equals(gameId).toArray()).filter((a) => !a.resolvedAt),
  create: async (input: Omit<Alert, 'id'>): Promise<Alert> => {
    const a: Alert = { ...input, id: newId('al') };
    await db.alerts.put(a);
    return a;
  },
  resolve: async (id: string) => {
    const a = await db.alerts.get(id);
    if (!a) return;
    await db.alerts.put({ ...a, resolvedAt: now() });
  }
};
