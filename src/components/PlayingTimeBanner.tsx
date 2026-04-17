import type { DefensiveAssignment, Game, Player, SeasonSettings } from '@/types';
import { auditPlayingTime, playingTimeRisks } from '@/features/rules/playingTimeRules';

export default function PlayingTimeBanner({
  players,
  assignments,
  game,
  settings
}: {
  players: Player[];
  assignments: DefensiveAssignment[];
  game: Game;
  settings: SeasonSettings;
}) {
  const active = players.filter((p) => p.active && !game.absentPlayerIds.includes(p.id));
  const audits = auditPlayingTime(active, assignments, game, settings);
  const risks = playingTimeRisks(audits, game, settings, new Map(active.map((p) => [p.id, p])));
  const top = risks
    .filter((r) => r.severity !== 'info')
    .sort((a, b) => severityRank(b.severity) - severityRank(a.severity))[0];

  const remaining = Math.max(0, settings.maxInnings - game.inning + 1);

  if (!top) {
    const atRisk = audits
      .map((a) => {
        const p = active.find((x) => x.id === a.playerId);
        return { a, p, slack: remaining - a.inningsStillNeeded };
      })
      .filter((x) => x.p && x.a.inningsStillNeeded > 0)
      .sort((x, y) => x.slack - y.slack)[0];
    if (!atRisk?.p) return null;
    return (
      <div className="rounded-lg px-2 py-1 text-[11px] font-semibold flex items-center gap-2 bg-phil-blue/10 text-phil-blue border border-phil-blue/30">
        <span>⏱</span>
        <span className="truncate">
          <b>{atRisk.p.displayName}</b> needs {atRisk.a.inningsStillNeeded} more def · {remaining} inn left
        </span>
      </div>
    );
  }

  const tone =
    top.severity === 'critical'
      ? 'bg-ump-crit/15 text-ump-crit border-ump-crit/50'
      : 'bg-ump-warn/15 text-ump-warn border-ump-warn/50';
  const icon = top.severity === 'critical' ? '⚠' : '!';
  return (
    <div className={`rounded-lg px-2 py-1 text-[11px] font-semibold flex items-center gap-2 border ${tone}`}>
      <span>{icon}</span>
      <span className="truncate">{top.message}</span>
    </div>
  );
}

function severityRank(s: 'info' | 'warning' | 'critical'): number {
  return s === 'critical' ? 3 : s === 'warning' ? 2 : 1;
}
