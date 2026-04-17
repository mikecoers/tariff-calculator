import { useState } from 'react';
import Header from '@/components/Header';
import PrimaryButton from '@/components/PrimaryButton';
import { useApp } from '@/app/AppContext';
import { applySeasonPhaseDefaults } from './defaults';
import { describePhase } from '@/features/rules/seasonPhaseRules';
import { seedPhilliesRoster, WIPE_AND_RESEED } from '@/features/roster/seed';
import { resetAllData } from '@/db/reset';

export default function SettingsScreen() {
  const { team, settings, saveSettings } = useApp();
  const [busy, setBusy] = useState<string | null>(null);

  if (!team || !settings) return <div className="p-4">Create a team first.</div>;

  return (
    <div className="pb-24">
      <Header title="Settings" subtitle={team.name} />
      <div className="p-4 space-y-4 max-w-2xl mx-auto">
        <section className="card">
          <div className="field-label">Season phase</div>
          <div className="grid grid-cols-3 gap-2 mt-2">
            {(['early', 'mid', 'end'] as const).map((p) => {
              const d = describePhase(p);
              const active = settings.seasonPhase === p;
              return (
                <button
                  key={p}
                  className={`tap-btn tap-btn-lg ${active ? 'tap-btn-success' : 'tap-btn-neutral'}`}
                  onClick={() => saveSettings(applySeasonPhaseDefaults(settings, p))}
                >
                  <div className="text-center">
                    <div className="text-xs">{d.label}</div>
                  </div>
                </button>
              );
            })}
          </div>
          <p className="text-xs text-ump-dim mt-2">{describePhase(settings.seasonPhase).description}</p>
        </section>

        <section className="card space-y-3">
          <div className="field-label">Game rules</div>
          <Toggle label="Walks allowed" value={settings.allowWalks} onChange={(v) => saveSettings({ allowWalks: v })} />
          <Toggle label="Steals allowed" value={settings.allowSteals} onChange={(v) => saveSettings({ allowSteals: v })} />
          <Toggle label="Steal home allowed" value={settings.allowStealHome} onChange={(v) => saveSettings({ allowStealHome: v })} />
          <Toggle label="Manager can pitch" value={settings.allowManagerPitch} onChange={(v) => saveSettings({ allowManagerPitch: v })} />
          <Toggle
            label="Catcher→Pitcher same inning"
            value={settings.catcherToPitcherSameInningAllowed}
            onChange={(v) => saveSettings({ catcherToPitcherSameInningAllowed: v })}
          />
          <Toggle
            label="Last inning runs uncapped"
            value={settings.lastInningRunsUncapped}
            onChange={(v) => saveSettings({ lastInningRunsUncapped: v })}
          />
          <Row label="Max innings">
            <NumberInput value={settings.maxInnings} onChange={(n) => saveSettings({ maxInnings: n })} />
          </Row>
          <Row label="Runs per inning cap">
            <NumberInput value={settings.runsPerInningLimit} onChange={(n) => saveSettings({ runsPerInningLimit: n })} />
          </Row>
          <Row label="Min defensive innings / game">
            <NumberInput value={settings.minDefensiveInnings} onChange={(n) => saveSettings({ minDefensiveInnings: n })} />
          </Row>
          <Row label="Min first-half innings">
            <NumberInput value={settings.minFirstHalfInnings} onChange={(n) => saveSettings({ minFirstHalfInnings: n })} />
          </Row>
          <Row label="First-half inning boundary">
            <NumberInput value={settings.firstHalfInningBoundary} onChange={(n) => saveSettings({ firstHalfInningBoundary: n })} />
          </Row>
        </section>

        <section className="card border-ump-crit/40">
          <div className="field-label text-ump-crit">Danger zone</div>
          <p className="text-xs text-ump-dim mt-1">
            Wipe all teams, players, games, stats, and pitcher history on this device. This can't be undone.
          </p>
          <button
            className="tap-btn tap-btn-danger tap-btn-lg w-full mt-3"
            disabled={busy != null}
            onClick={async () => {
              if (!confirm('Reset everything? You will start from scratch.')) return;
              if (!confirm('Are you absolutely sure? This clears all games and stats.')) return;
              setBusy('reset');
              await resetAllData();
              window.location.href = '/home';
            }}
          >
            Reset all data &amp; start over
          </button>
        </section>

        <section className="card">
          <div className="field-label">Demo data</div>
          <p className="text-xs text-ump-dim mt-1">
            Seed with the Phillies roster (12 players from your team list).
          </p>
          <div className="mt-2 flex gap-2">
            <button
              className="tap-btn tap-btn-neutral tap-btn-sm flex-1"
              disabled={busy != null}
              onClick={async () => {
                setBusy('seed');
                await seedPhilliesRoster(team.id, false);
                setBusy(null);
                alert('Phillies roster added.');
              }}
            >
              Seed Phillies roster
            </button>
            <button
              className="tap-btn tap-btn-danger tap-btn-sm"
              disabled={busy != null}
              onClick={async () => {
                if (!confirm('Wipe and replace with Phillies roster?')) return;
                setBusy('wipe');
                await seedPhilliesRoster(team.id, WIPE_AND_RESEED);
                setBusy(null);
                alert('Roster replaced with Phillies.');
              }}
            >
              Replace
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between">
      <span className="text-sm">{label}</span>
      <button
        onClick={() => onChange(!value)}
        className={`h-7 w-12 rounded-full transition relative ${value ? 'bg-ump-ok' : 'bg-ump-line'}`}
        aria-pressed={value}
      >
        <span
          className={`absolute top-0.5 h-6 w-6 rounded-full bg-white transition ${value ? 'left-[26px]' : 'left-0.5'}`}
        />
      </button>
    </label>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm">{label}</span>
      {children}
    </div>
  );
}

function NumberInput({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div className="inline-flex items-center gap-2">
      <button className="tap-btn tap-btn-neutral tap-btn-sm" onClick={() => onChange(Math.max(0, value - 1))}>
        −
      </button>
      <span className="w-8 text-center font-bold">{value}</span>
      <button className="tap-btn tap-btn-neutral tap-btn-sm" onClick={() => onChange(value + 1)}>
        +
      </button>
    </div>
  );
}

void PrimaryButton;
