import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Alert, DefensiveAssignment, Game, PitchEvent, Player } from '@/types';
import { buildComplianceSummary } from '@/features/rules/complianceEngine';
import type { SeasonSettings } from '@/types';

export function exportGameSummaryPdf(args: {
  game: Game;
  opponent: string;
  teamName: string;
  settings: SeasonSettings;
  players: Player[];
  assignments: DefensiveAssignment[];
  pitchEvents: PitchEvent[];
  alerts: Alert[];
  appearances: any[];
}) {
  const { game, opponent, teamName, settings, players, assignments, pitchEvents, alerts } = args;
  const doc = new jsPDF();
  doc.setFontSize(18);
  doc.text(`${teamName} vs ${opponent}`, 14, 18);
  doc.setFontSize(10);
  doc.text(
    `${new Date(game.date).toLocaleDateString()} — Final: ${game.awayScore}-${game.homeScore}`,
    14,
    25
  );

  const summary = buildComplianceSummary({
    game,
    settings,
    players,
    assignments,
    appearances: [],
    pitchEvents,
    alerts
  });

  autoTable(doc, {
    head: [['Player', 'Def Innings', 'First Half', 'Min Met', 'First Half Met']],
    body: summary.playingTime.map((p) => [
      p.name,
      String(p.defensiveInnings),
      String(p.firstHalfInnings),
      p.met ? 'Yes' : 'No',
      p.firstHalfMet ? 'Yes' : 'No'
    ]),
    startY: 32
  });

  if (summary.pitching.length > 0) {
    autoTable(doc, {
      head: [['Pitcher', 'Pitches', 'Tier', 'Rest Days']],
      body: summary.pitching.map((p) => [p.name, String(p.pitches), p.tier, String(p.restDaysIfStopNow)])
    });
  }

  if (summary.issues.length > 0) {
    autoTable(doc, {
      head: [['Alerts']],
      body: summary.issues.map((a) => [`[${a.severity}] ${a.message}`])
    });
  }

  doc.save(`${teamName}_vs_${opponent}_${new Date(game.date).toISOString().slice(0, 10)}.pdf`);
}
