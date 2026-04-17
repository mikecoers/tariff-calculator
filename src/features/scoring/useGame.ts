import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  atBatsRepo,
  defenseRepo,
  gameEventsRepo,
  gamesRepo,
  lineupsRepo,
  pitchEventsRepo,
  playersRepo,
  alertsRepo,
  pitcherAppearancesRepo,
  pitcherRestRepo
} from '@/db/repositories';
import type {
  AtBat,
  AtBatResult,
  DefensiveAssignment,
  Game,
  GameEvent,
  GameLineup,
  PitchEvent,
  PitchResult,
  Player,
  PitcherAppearance,
  Alert
} from '@/types';
import { newId, now } from '@/lib/id';
import { isGameOver, nextHalfInning, shouldEndHalfInning } from '@/features/rules/inningRules';
import { computeLiveAlerts } from '@/features/rules/complianceEngine';
import { restDaysForPitches } from '@/features/rules/pitchingRules';
import type { SeasonSettings } from '@/types';

export interface GameBundle {
  game: Game;
  players: Player[];
  lineup?: GameLineup;
  defense: DefensiveAssignment[];
  atBats: AtBat[];
  pitchEvents: PitchEvent[];
  events: GameEvent[];
  alerts: Alert[];
  loading: boolean;
}

export function useGame(gameId: string | undefined, settings: SeasonSettings | null) {
  const [bundle, setBundle] = useState<GameBundle>({
    game: null as unknown as Game,
    players: [],
    defense: [],
    atBats: [],
    pitchEvents: [],
    events: [],
    alerts: [],
    loading: true
  });
  const [tick, setTick] = useState(0);
  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    if (!gameId) return;
    let cancelled = false;
    (async () => {
      const game = await gamesRepo.get(gameId);
      if (!game) return;
      const players = await playersRepo.getMany(game.rosterPlayerIds);
      const lineup = await lineupsRepo.latest(gameId);
      const defense = await defenseRepo.forGame(gameId);
      const atBats = await atBatsRepo.forGame(gameId);
      const pitchEvents = await pitchEventsRepo.forGame(gameId);
      const events = await gameEventsRepo.forGame(gameId);
      const alerts = await alertsRepo.forGame(gameId);
      if (cancelled) return;
      setBundle({ game, players, lineup, defense, atBats, pitchEvents, events, alerts, loading: false });
    })();
    return () => {
      cancelled = true;
    };
  }, [gameId, tick]);

  const playersById = useMemo(() => new Map(bundle.players.map((p) => [p.id, p])), [bundle.players]);

  const recordEvent = useCallback(
    async (type: GameEvent['type'], payload: unknown, undoOf?: string) => {
      if (!bundle.game) return;
      await gameEventsRepo.create({
        gameId: bundle.game.id,
        type,
        inning: bundle.game.inning,
        halfInning: bundle.game.halfInning,
        payload,
        timestamp: now(),
        undoOf
      });
    },
    [bundle.game]
  );

  const addPitch = useCallback(
    async (result: PitchResult) => {
      const { game } = bundle;
      if (!game || !settings) return;
      const pitcherId = game.currentPitcherPlayerId;
      const batterId = bundle.lineup?.battingOrder[game.currentBatterSlot];
      if (!pitcherId || !batterId) return;

      const atBat =
        (await atBatsRepo.latest(game.id))?.resultType == null
          ? await atBatsRepo.latest(game.id)
          : undefined;

      const currentAB: AtBat =
        atBat ??
        (await atBatsRepo.create({
          gameId: game.id,
          inning: game.inning,
          halfInning: game.halfInning,
          batterPlayerId: batterId,
          pitcherPlayerId: pitcherId,
          resultType: 'other',
          outsRecorded: 0,
          rbis: 0,
          runsScored: 0,
          ballCountFinal: game.balls,
          strikeCountFinal: game.strikes,
          timestamp: now()
        }));

      const sequenceNumber = (await pitchEventsRepo.forAtBat(game.id, currentAB.id)).length + 1;
      await pitchEventsRepo.create({
        gameId: game.id,
        atBatId: currentAB.id,
        pitcherPlayerId: pitcherId,
        batterPlayerId: batterId,
        sequenceNumber,
        result,
        timestamp: now()
      });

      let balls = game.balls;
      let strikes = game.strikes;
      if (result === 'ball') balls += 1;
      else if (result === 'strike') strikes += 1;
      else if (result === 'foul') strikes = Math.min(2, strikes + 1);

      const patch: Partial<Game> = { balls, strikes };
      if (balls >= 4 && settings.allowWalks) {
        // walk resolves at bat
      }
      await gamesRepo.update(game.id, patch);
      await recordEvent('at_bat', { atBatId: currentAB.id, pitchResult: result });
      refresh();
    },
    [bundle, settings, recordEvent, refresh]
  );

  const resolveAtBat = useCallback(
    async (result: AtBatResult, runs = 0, rbis = 0, outs = 0) => {
      const { game, lineup } = bundle;
      if (!game || !lineup) return;
      const batterId = lineup.battingOrder[game.currentBatterSlot];
      const pitcherId = game.currentPitcherPlayerId;
      const ab = await atBatsRepo.create({
        gameId: game.id,
        inning: game.inning,
        halfInning: game.halfInning,
        batterPlayerId: batterId,
        pitcherPlayerId: pitcherId,
        resultType: result,
        outsRecorded: outs,
        rbis,
        runsScored: runs,
        ballCountFinal: game.balls,
        strikeCountFinal: game.strikes,
        timestamp: now()
      });

      const nextOuts = game.outs + outs;
      const isHomeBatting = game.halfInning === 'bottom' ? game.homeAway === 'home' : game.homeAway !== 'home';
      const homeScore = game.homeScore + (isHomeBatting ? runs : 0);
      const awayScore = game.awayScore + (!isHomeBatting ? runs : 0);
      const nextSlot = (game.currentBatterSlot + 1) % Math.max(1, lineup.battingOrder.length);

      let patch: Partial<Game> = {
        outs: nextOuts,
        balls: 0,
        strikes: 0,
        runsThisInning: game.runsThisInning + runs,
        homeScore,
        awayScore,
        currentBatterSlot: nextSlot
      };

      await gamesRepo.update(game.id, patch);
      const updated = { ...game, ...patch } as Game;
      await recordEvent('at_bat', { atBatId: ab.id, result, runs, rbis, outs });

      if (settings && shouldEndHalfInning(updated, settings)) {
        const next = nextHalfInning(updated);
        patch = { ...patch, inning: next.inning, halfInning: next.halfInning, outs: 0, runsThisInning: 0 };
        await gamesRepo.update(game.id, patch);
        await recordEvent('half_inning_change', { from: game.halfInning, to: next.halfInning, inning: next.inning });
      }

      if (settings && isGameOver({ ...game, ...patch } as Game, settings)) {
        await gamesRepo.update(game.id, { status: 'completed', gameEndedReason: 'reached_max_innings' });
        await recordEvent('game_end', { reason: 'reached_max_innings' });
      }

      await refreshLiveAlerts();
      refresh();
    },
    [bundle, settings, recordEvent, refresh]
  );

  const refreshLiveAlerts = useCallback(async () => {
    const { game, players, defense, pitchEvents } = bundle;
    if (!game || !settings) return;
    const computed = computeLiveAlerts({
      game,
      settings,
      players,
      assignments: defense,
      pitchEvents
    });
    for (const a of computed) {
      await alertsRepo.create(a);
    }
  }, [bundle, settings]);

  const setPitcher = useCallback(
    async (playerId: string) => {
      if (!bundle.game) return;
      await gamesRepo.update(bundle.game.id, { currentPitcherPlayerId: playerId });
      await recordEvent('pitching_change', { playerId });
      refresh();
    },
    [bundle.game, recordEvent, refresh]
  );

  const recordOut = useCallback(async () => {
    await resolveAtBat('groundout', 0, 0, 1);
  }, [resolveAtBat]);

  const undoLast = useCallback(async () => {
    const last = await gameEventsRepo.latest(bundle.game!.id);
    if (!last) return;
    // Simple undo: if at_bat event and has resolving result, remove latest at-bat and adjust score.
    if (last.type === 'at_bat') {
      const latestAb = await atBatsRepo.latest(bundle.game!.id);
      if (latestAb) {
        const isHomeBatting =
          latestAb.halfInning === 'bottom'
            ? bundle.game!.homeAway === 'home'
            : bundle.game!.homeAway !== 'home';
        const patch: Partial<Game> = {
          homeScore: Math.max(0, bundle.game!.homeScore - (isHomeBatting ? latestAb.runsScored : 0)),
          awayScore: Math.max(0, bundle.game!.awayScore - (!isHomeBatting ? latestAb.runsScored : 0)),
          outs: Math.max(0, bundle.game!.outs - latestAb.outsRecorded),
          runsThisInning: Math.max(0, bundle.game!.runsThisInning - latestAb.runsScored),
          currentBatterSlot:
            (bundle.game!.currentBatterSlot - 1 + (bundle.lineup?.battingOrder.length ?? 1)) %
            (bundle.lineup?.battingOrder.length ?? 1)
        };
        await gamesRepo.update(bundle.game!.id, patch);
        await atBatsRepo.remove(latestAb.id);
      }
    }
    await gameEventsRepo.remove(last.id);
    await recordEvent('undo', { undoneEventId: last.id }, last.id);
    refresh();
  }, [bundle, recordEvent, refresh]);

  const applyDefensiveInning = useCallback(
    async (inning: number, assigns: Array<{ playerId: string; position: DefensiveAssignment['position'] }>) => {
      if (!bundle.game) return;
      await defenseRepo.removeInning(bundle.game.id, inning);
      const toInsert = assigns.map((a) => ({
        gameId: bundle.game!.id,
        inning,
        playerId: a.playerId,
        position: a.position,
        startedInning: inning,
        source: 'auto' as const
      }));
      await defenseRepo.bulkInsert(toInsert);
      await recordEvent('defensive_change', { inning, count: assigns.length });
      refresh();
    },
    [bundle.game, recordEvent, refresh]
  );

  const finalizeGame = useCallback(async () => {
    if (!bundle.game) return;
    // Compute pitcher appearances + rest
    const { game, pitchEvents, players } = bundle;
    const counts = new Map<string, number>();
    for (const pe of pitchEvents) counts.set(pe.pitcherPlayerId, (counts.get(pe.pitcherPlayerId) ?? 0) + 1);
    for (const [pid, count] of counts) {
      if (count === 0 || !settings) continue;
      const restDays = restDaysForPitches(count, settings.pitchCountRestTiers);
      const ONE_DAY = 24 * 60 * 60 * 1000;
      const appearance: Omit<PitcherAppearance, 'id'> = {
        gameId: game.id,
        playerId: pid,
        inningStart: 1,
        inningEnd: game.inning,
        pitchesThrown: count,
        battersFaced: 0,
        walks: 0,
        strikeouts: 0,
        earnedRuns: 0,
        restDaysRequired: restDays,
        date: game.date
      };
      await pitcherAppearancesRepo.create(appearance);
      await pitcherRestRepo.create({
        playerId: pid,
        gameId: game.id,
        appearanceDate: game.date,
        pitchesThrown: count,
        restDaysRequired: restDays,
        eligibleOn: game.date + restDays * ONE_DAY
      });
    }
    await gamesRepo.update(game.id, { status: 'completed' });
    await recordEvent('game_end', { reason: 'manual' });
    void players;
    refresh();
  }, [bundle, settings, recordEvent, refresh]);

  return {
    ...bundle,
    playersById,
    refresh,
    addPitch,
    resolveAtBat,
    recordOut,
    setPitcher,
    undoLast,
    applyDefensiveInning,
    finalizeGame
  };
}
