import Dexie, { Table } from 'dexie';
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
  Alert,
  SyncQueueItem
} from '@/types';

export class KidPitchDB extends Dexie {
  teams!: Table<Team, string>;
  players!: Table<Player, string>;
  games!: Table<Game, string>;
  gameLineups!: Table<GameLineup, string>;
  defensiveAssignments!: Table<DefensiveAssignment, string>;
  atBats!: Table<AtBat, string>;
  pitchEvents!: Table<PitchEvent, string>;
  gameEvents!: Table<GameEvent, string>;
  playerGameStats!: Table<PlayerGameStats, string>;
  pitcherAppearances!: Table<PitcherAppearance, string>;
  pitcherRest!: Table<PitcherRest, string>;
  seasonSettings!: Table<SeasonSettings, string>;
  alerts!: Table<Alert, string>;
  syncQueue!: Table<SyncQueueItem, string>;

  constructor() {
    super('kid-pitch-coach');
    this.version(1).stores({
      teams: 'id, name, seasonYear',
      players: 'id, teamId, active, lastName',
      games: 'id, teamId, date, status, [teamId+status], [teamId+date]',
      gameLineups: 'id, gameId, [gameId+inning]',
      defensiveAssignments: 'id, gameId, playerId, inning, [gameId+inning], [gameId+playerId], [gameId+inning+playerId]',
      atBats: 'id, gameId, batterPlayerId, inning, timestamp, [gameId+timestamp]',
      pitchEvents: 'id, gameId, atBatId, pitcherPlayerId, [gameId+atBatId], [gameId+pitcherPlayerId]',
      gameEvents: 'id, gameId, type, timestamp, [gameId+timestamp]',
      playerGameStats: 'id, gameId, playerId, [gameId+playerId]',
      pitcherAppearances: 'id, gameId, playerId, date, [playerId+date]',
      pitcherRest: 'id, playerId, eligibleOn, [playerId+eligibleOn]',
      seasonSettings: 'id, teamId, seasonYear, [teamId+seasonYear]',
      alerts: 'id, gameId, type, severity, createdAt, [gameId+createdAt]',
      syncQueue: 'id, entityType, entityId, syncStatus, createdAt'
    });
  }
}

export const db = new KidPitchDB();
