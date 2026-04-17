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
import { now } from '@/lib/id';
import { isGameOver, nextHalfInning, shouldEndHalfInning } from '@/features/rules/inningRules';
import { computeLiveAlerts } from '@/features/rules/complianceEngine';
import { restDaysForPitches } from '@/features/rules/pitchingRules';
import type { SeasonSettings } from '@/types';
import { advanceRunners } from './bases';

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

export function opponentIsBatting(game: Game): boolean {
  // Our team is batting when:
  //   home team & bottom of inning, OR away team & top of inning
  const ourBatting =
    (game.halfInning === 'bottom' && game.homeAway === 'home') ||
    (game.halfInning === 'top' && game.homeAway === 'away');
  return !ourBatting;
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
      let balls = game.balls;
      let strikes = game.strikes;
      if (result === 'ball') balls += 1;
      else if (result === 'strike') strikes += 1;
      else if (result === 'foul') strikes = Math.min(2, strikes + 1);

      // Only attribute pitch events to OUR pitcher when opponent is batting
      if (opponentIsBatting(game) && game.currentPitcherPlayerId) {
        const latest = await atBatsRepo.latest(game.id);
        const ab =
          latest && latest.resultType === 'other' && latest.inning === game.inning
            ? latest
            : await atBatsRepo.create({
                gameId: game.id,
                inning: game.inning,
                halfInning: game.halfInning,
                batterPlayerId: '',
                pitcherPlayerId: game.currentPitcherPlayerId,
                resultType: 'other',
                outsRecorded: 0,
                rbis: 0,
                runsScored: 0,
                ballCountFinal: game.balls,
                strikeCountFinal: game.strikes,
                timestamp: now()
              });
        const sequenceNumber = (await pitchEventsRepo.forAtBat(game.id, ab.id)).length + 1;
        await pitchEventsRepo.create({
          gameId: game.id,
          atBatId: ab.id,
          pitcherPlayerId: game.currentPitcherPlayerId,
          batterPlayerId: ab.batterPlayerId || '',
          sequenceNumber,
          result,
          timestamp: now()
        });
      }

      await gamesRepo.update(game.id, { balls, strikes });
      await recordEvent('at_bat', { pitchResult: result });
      refresh();
    },
    [bundle, settings, recordEvent, refresh]
  );

  const resolveAtBat = useCallback(
    async (result: AtBatResult, rbis = 0, outs = 0) => {
      const { game, lineup } = bundle;
      if (!game) return;
      const ourBatting = !opponentIsBatting(game);
      const batterId = ourBatting ? lineup?.battingOrder[game.currentBatterSlot] ?? '' : '';
      const pitcherId = ourBatting ? undefined : game.currentPitcherPlayerId;

      // Advance runners (only meaningful when our team bats; for opponent, we don't track their runners)
      let bases = {
        first: game.firstBasePlayerId ?? null,
        second: game.secondBasePlayerId ?? null,
        third: game.thirdBasePlayerId ?? null
      };
      let runs = 0;
      if (ourBatting) {
        const adv = advanceRunners(bases, result, batterId);
        bases = adv.bases;
        runs = adv.runs;
      }

      const ab = await atBatsRepo.create({
        gameId: game.id,
        inning: game.inning,
        halfInning: game.halfInning,
        batterPlayerId: batterId,
        pitcherPlayerId: pitcherId,
        resultType: result,
        outsRecorded: outs,
        rbis: rbis || runs,
        runsScored: runs,
        ballCountFinal: game.balls,
        strikeCountFinal: game.strikes,
        timestamp: now()
      });

      const nextOuts = game.outs + outs;
      const isHomeBatting =
        (game.halfInning === 'bottom' && game.homeAway === 'home') ||
        (game.halfInning === 'top' && game.homeAway !== 'home');
      const homeScore = game.homeScore + (isHomeBatting ? runs : 0);
      const awayScore = game.awayScore + (!isHomeBatting ? runs : 0);
      const nextSlot = ourBatting && lineup
        ? (game.currentBatterSlot + 1) % Math.max(1, lineup.battingOrder.length)
        : game.currentBatterSlot;

      let patch: Partial<Game> = {
        outs: nextOuts,
        balls: 0,
        strikes: 0,
        runsThisInning: game.runsThisInning + runs,
        homeScore,
        awayScore,
        currentBatterSlot: nextSlot,
        firstBasePlayerId: bases.first,
        secondBasePlayerId: bases.second,
        thirdBasePlayerId: bases.third,
        lastPlay: describePlay(result, runs, playersById.get(batterId)?.displayName)
      };

      await gamesRepo.update(game.id, patch);
      const updated = { ...game, ...patch } as Game;
      await recordEvent('at_bat', { atBatId: ab.id, result, runs, rbis, outs });

      if (settings && shouldEndHalfInning(updated, settings)) {
        const next = nextHalfInning(updated);
        patch = {
          ...patch,
          inning: next.inning,
          halfInning: next.halfInning,
          outs: 0,
          runsThisInning: 0,
          firstBasePlayerId: null,
          secondBasePlayerId: null,
          thirdBasePlayerId: null
        };
        await gamesRepo.update(game.id, patch);
        await recordEvent('half_inning_change', { from: game.halfInning, to: next.halfInning, inning: next.inning });
      }

      if (settings && isGameOver({ ...game, ...patch } as Game, settings)) {
        await gamesRepo.update(game.id, { status: 'completed', gameEndedReason: 'reached_max_innings' });
        await recordEvent('game_end', { reason: 'reached_max_innings' });
      }

      refresh();
    },
    [bundle, settings, recordEvent, refresh, playersById]
  );

  const setPitcher = useCallback(
    async (playerId: string) => {
      if (!bundle.game) return;
      await gamesRepo.update(bundle.game.id, { currentPitcherPlayerId: playerId });
      await recordEvent('pitching_change', { playerId });
      refresh();
    },
    [bundle.game, recordEvent, refresh]
  );

  const addOpponentRun = useCallback(async () => {
    const { game } = bundle;
    if (!game) return;
    const ourHome = game.homeAway === 'home';
    const ourBatting = !opponentIsBatting(game);
    if (ourBatting) return; // use resolve at bat
    await gamesRepo.update(game.id, {
      homeScore: game.homeScore + (!ourHome && game.halfInning === 'bottom' ? 1 : 0),
      awayScore: game.awayScore + ((!ourHome && game.halfInning === 'top') || (ourHome && game.halfInning === 'top') ? 1 : 0),
      runsThisInning: game.runsThisInning + 1,
      lastPlay: 'Run scored (opponent)'
    });
    refresh();
  }, [bundle, refresh]);

  const undoLast = useCallback(async () => {
    if (!bundle.game) return;
    const last = await gameEventsRepo.latest(bundle.game.id);
    if (!last) return;
    if (last.type === 'at_bat') {
      const latestAb = await atBatsRepo.latest(bundle.game.id);
      if (latestAb) {
        const isHomeBatting =
          latestAb.halfInning === 'bottom'
            ? bundle.game.homeAway === 'home'
            : bundle.game.homeAway !== 'home';
        const patch: Partial<Game> = {
          homeScore: Math.max(0, bundle.game.homeScore - (isHomeBatting ? latestAb.runsScored : 0)),
          awayScore: Math.max(0, bundle.game.awayScore - (!isHomeBatting ? latestAb.runsScored : 0)),
          outs: Math.max(0, bundle.game.outs - latestAb.outsRecorded),
          runsThisInning: Math.max(0, bundle.game.runsThisInning - latestAb.runsScored),
          currentBatterSlot:
            (bundle.game.currentBatterSlot - 1 + (bundle.lineup?.battingOrder.length ?? 1)) %
            (bundle.lineup?.battingOrder.length ?? 1)
        };
        await gamesRepo.update(bundle.game.id, patch);
        await atBatsRepo.remove(latestAb.id);
      }
    }
    await gameEventsRepo.remove(last.id);
    refresh();
  }, [bundle, refresh]);

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
      const pitcher = assigns.find((a) => a.position === 'P');
      const catcher = assigns.find((a) => a.position === 'C');
      await gamesRepo.update(bundle.game.id, {
        currentPitcherPlayerId: pitcher?.playerId ?? bundle.game.currentPitcherPlayerId,
        currentCatcherPlayerId: catcher?.playerId ?? bundle.game.currentCatcherPlayerId
      });
      await recordEvent('defensive_change', { inning, count: assigns.length });
      refresh();
    },
    [bundle.game, recordEvent, refresh]
  );

  const finalizeGame = useCallback(async () => {
    if (!bundle.game) return;
    const { game, pitchEvents } = bundle;
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
    refresh();
  }, [bundle, settings, recordEvent, refresh]);

  // Live alert derivation (memoized for display, not persisted here)
  const liveAlerts = useMemo(() => {
    if (!settings || !bundle.game) return [];
    return computeLiveAlerts({
      game: bundle.game,
      settings,
      players: bundle.players,
      assignments: bundle.defense,
      pitchEvents: bundle.pitchEvents
    });
  }, [bundle, settings]);

  return {
    ...bundle,
    playersById,
    liveAlerts,
    refresh,
    addPitch,
    resolveAtBat,
    setPitcher,
    addOpponentRun,
    undoLast,
    applyDefensiveInning,
    finalizeGame
  };
}

function describePlay(result: AtBatResult, runs: number, name?: string): string {
  const who = name ?? 'Batter';
  const runPart = runs > 0 ? ` — ${runs} run${runs === 1 ? '' : 's'}` : '';
  const map: Record<string, string> = {
    single: `${who} singled`,
    double: `${who} doubled`,
    triple: `${who} tripled`,
    hr: `${who} HOME RUN`,
    walk: `${who} walked`,
    hbp: `${who} hit by pitch`,
    strikeout: `${who} struck out`,
    groundout: `${who} grounded out`,
    flyout: `${who} flied out`,
    fc: `${who} reached on FC`,
    error: `${who} reached on error`,
    sac: `${who} sacrifice`,
    other: `${who} at bat`
  };
  return (map[result] ?? 'Play') + runPart;
}
