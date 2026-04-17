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
      <Banner
        tone="info"
        icon="⏱"
        name={atRisk.p.displayName}
        detail={`needs ${atRisk.a.inningsStillNeeded} def · ${remaining} inn left`}
      />
    );
  }

  const tone = top.severity === 'critical' ? 'crit' : 'warn';
  const icon = top.severity === 'critical' ? '⚠' : '!';
  return <Banner tone={tone} icon={icon} message={top.message} />;
}

function Banner({
  tone,
  icon,
  name,
  detail,
  message
}: {
  tone: 'info' | 'warn' | 'crit';
  icon: string;
  name?: string;
  detail?: string;
  message?: string;
}) {
  const toneClass =
    tone === 'crit'
      ? 'bg-red-50 border-ump-crit text-ump-crit'
      : tone === 'warn'
      ? 'bg-amber-50 border-ump-warn text-amber-900'
      : 'bg-white border-phil-maroon/40 text-phil-maroonDark';
  return (
    <div className={`w-full rounded-xl border-2 px-3 py-1.5 flex items-center gap-2 text-[12px] font-bold ${toneClass}`}>
      <span className="text-sm">{icon}</span>
      {name ? (
        <span className="truncate">
          <b>{name}</b>: <span className="font-semibold">{detail}</span>
        </span>
      ) : (
        <span className="truncate">{message}</span>
      )}
    </div>
  );
}

function severityRank(s: 'info' | 'warning' | 'critical'): number {
  return s === 'critical' ? 3 : s === 'warning' ? 2 : 1;
}
