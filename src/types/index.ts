export type ID = string;

export type Position =
  | 'P'
  | 'C'
  | '1B'
  | '2B'
  | '3B'
  | 'SS'
  | 'LF'
  | 'CF'
  | 'RF'
  | 'BN'
  | 'EH';

export const DEFENSIVE_POSITIONS: Position[] = ['P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF'];
export const INFIELD: Position[] = ['P', 'C', '1B', '2B', '3B', 'SS'];
export const OUTFIELD: Position[] = ['LF', 'CF', 'RF'];

export type Bats = 'L' | 'R' | 'S';
export type Throws = 'L' | 'R';

export interface Team {
  id: ID;
  name: string;
  seasonYear: number;
  createdAt: number;
  updatedAt: number;
}

export interface Player {
  id: ID;
  teamId: ID;
  firstName: string;
  lastName: string;
  displayName: string;
  jerseyNumber?: string;
  age?: number;
  bats?: Bats;
  throws?: Throws;
  isCatcher?: boolean;
  preferredPositions: Position[];
  secondaryPositions: Position[];
  notes?: string;
  active: boolean;
  createdAt: number;
  updatedAt: number;
}

export type GameStatus = 'scheduled' | 'in_progress' | 'completed' | 'archived';
export type SeasonPhase = 'early' | 'mid' | 'end';
export type HalfInning = 'top' | 'bottom';
export type HomeAway = 'home' | 'away';

export interface Game {
  id: ID;
  teamId: ID;
  opponent: string;
  date: number;
  location?: string;
  homeAway: HomeAway;
  status: GameStatus;
  seasonPhase: SeasonPhase;
  inning: number;
  halfInning: HalfInning;
  outs: number;
  balls: number;
  strikes: number;
  homeScore: number;
  awayScore: number;
  runsThisInning: number;
  currentBatterSlot: number;
  currentPitcherPlayerId?: ID;
  currentCatcherPlayerId?: ID;
  startTime?: number;
  elapsedSeconds: number;
  lastPlayableInningDeclared?: number;
  gameEndedReason?: string;
  rosterPlayerIds: ID[];
  absentPlayerIds: ID[];
  opponentBatterNumber?: number;
  firstBasePlayerId?: ID | null;
  secondBasePlayerId?: ID | null;
  thirdBasePlayerId?: ID | null;
  coachPitchActive?: boolean;
  lastPlay?: string;
  createdAt: number;
  updatedAt: number;
}

export interface GameLineup {
  id: ID;
  gameId: ID;
  inning: number;
  battingOrder: ID[];
  benchPlayerIds: ID[];
  dhEnabled: boolean;
}

export interface DefensiveAssignment {
  id: ID;
  gameId: ID;
  inning: number;
  playerId: ID;
  position: Position;
  startedInning: number;
  endedInning?: number;
  source: 'auto' | 'manual' | 'substitution';
}

export type AtBatResult =
  | 'single'
  | 'double'
  | 'triple'
  | 'hr'
  | 'walk'
  | 'strikeout'
  | 'groundout'
  | 'flyout'
  | 'hbp'
  | 'fc'
  | 'error'
  | 'sac'
  | 'other';

export interface AtBat {
  id: ID;
  gameId: ID;
  inning: number;
  halfInning: HalfInning;
  batterPlayerId: ID;
  pitcherPlayerId?: ID;
  resultType: AtBatResult;
  outsRecorded: number;
  rbis: number;
  runsScored: number;
  ballCountFinal: number;
  strikeCountFinal: number;
  fieldedToPosition?: Position;
  basesAfter?: [ID | null, ID | null, ID | null];
  timestamp: number;
}

export type PitchResult = 'ball' | 'strike' | 'foul' | 'inPlay' | 'hbp';

export interface PitchEvent {
  id: ID;
  gameId: ID;
  atBatId: ID;
  pitcherPlayerId: ID;
  batterPlayerId: ID;
  sequenceNumber: number;
  result: PitchResult;
  timestamp: number;
}

export interface PitcherAppearance {
  id: ID;
  gameId: ID;
  playerId: ID;
  inningStart: number;
  inningEnd?: number;
  pitchesThrown: number;
  battersFaced: number;
  walks: number;
  strikeouts: number;
  earnedRuns: number;
  restDaysRequired: number;
  date: number;
}

export interface PitcherRest {
  id: ID;
  playerId: ID;
  gameId: ID;
  appearanceDate: number;
  pitchesThrown: number;
  restDaysRequired: number;
  eligibleOn: number;
}

export type AlertType =
  | 'playing_time_risk'
  | 'playing_time_violation'
  | 'early_innings_risk'
  | 'pitcher_limit_near'
  | 'pitcher_limit_reached'
  | 'pitcher_ineligible'
  | 'catcher_to_pitcher'
  | 'inning_run_limit'
  | 'manager_pitch_disallowed'
  | 'no_walks_early'
  | 'steal_home_blocked'
  | 'bench_too_long'
  | 'info';

export type AlertSeverity = 'info' | 'warning' | 'critical';

export interface Alert {
  id: ID;
  gameId: ID;
  type: AlertType;
  severity: AlertSeverity;
  playerId?: ID;
  inning?: number;
  message: string;
  createdAt: number;
  resolvedAt?: number;
}

export type GameEventType =
  | 'game_start'
  | 'game_end'
  | 'inning_change'
  | 'half_inning_change'
  | 'pitching_change'
  | 'defensive_change'
  | 'lineup_change'
  | 'run_scored'
  | 'out_recorded'
  | 'at_bat'
  | 'undo'
  | 'alert';

export interface GameEvent {
  id: ID;
  gameId: ID;
  type: GameEventType;
  inning: number;
  halfInning: HalfInning;
  payload: unknown;
  timestamp: number;
  undoOf?: ID;
}

export interface PlayerGameStats {
  id: ID;
  gameId: ID;
  playerId: ID;
  atBats: number;
  hits: number;
  runs: number;
  rbis: number;
  walks: number;
  strikeouts: number;
  defensiveInnings: number;
  inningsByPosition: Partial<Record<Position, number>>;
  benchedInnings: number;
  firstHalfDefInnings: number;
  pitched: boolean;
  pitchesThrown: number;
}

export interface SeasonSettings {
  id: ID;
  teamId: ID;
  seasonYear: number;
  seasonPhase: SeasonPhase;
  maxInnings: number;
  runsPerInningLimit: number;
  lastInningRunsUncapped: boolean;
  minDefensiveInnings: number;
  minFirstHalfInnings: number;
  firstHalfInningBoundary: number;
  catcherToPitcherSameInningAllowed: boolean;
  allowManagerPitch: boolean;
  pitchCountLimitByAge: Record<string, number>;
  pitchCountRestTiers: Array<{ maxPitches: number; restDays: number }>;
  allowWalks: boolean;
  allowSteals: boolean;
  allowStealHome: boolean;
  dhEnabled: boolean;
  updatedAt: number;
}

export interface SyncQueueItem {
  id: ID;
  entityType: string;
  entityId: ID;
  operation: 'create' | 'update' | 'delete';
  payload: unknown;
  createdAt: number;
  retryCount: number;
  syncStatus: 'pending' | 'in_flight' | 'done' | 'error';
}
