import { createContext, ReactNode, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { teamsRepo, settingsRepo } from '@/db/repositories';
import { defaultSeasonSettings } from '@/features/settings/defaults';
import type { SeasonSettings, Team } from '@/types';

interface AppCtx {
  team: Team | null;
  settings: SeasonSettings | null;
  setTeam: (t: Team) => void;
  refreshSettings: () => Promise<void>;
  createTeam: (name: string, seasonYear: number) => Promise<Team>;
  saveSettings: (patch: Partial<SeasonSettings>) => Promise<void>;
  loading: boolean;
}

const Ctx = createContext<AppCtx | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [team, setTeamState] = useState<Team | null>(null);
  const [settings, setSettings] = useState<SeasonSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const loadTeam = useCallback(async () => {
    const teams = await teamsRepo.all();
    const t = teams[0] ?? null;
    setTeamState(t);
    if (t) {
      const s = await settingsRepo.forTeam(t.id, t.seasonYear);
      if (s) setSettings(s);
      else {
        const def = defaultSeasonSettings(t.id, t.seasonYear);
        await settingsRepo.upsert(def);
        setSettings(def);
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadTeam();
  }, [loadTeam]);

  const createTeam = useCallback(async (name: string, seasonYear: number) => {
    const t = await teamsRepo.create({ name, seasonYear });
    const s = defaultSeasonSettings(t.id, seasonYear);
    await settingsRepo.upsert(s);
    setTeamState(t);
    setSettings(s);
    return t;
  }, []);

  const refreshSettings = useCallback(async () => {
    if (!team) return;
    const s = await settingsRepo.forTeam(team.id, team.seasonYear);
    if (s) setSettings(s);
  }, [team]);

  const saveSettings = useCallback(
    async (patch: Partial<SeasonSettings>) => {
      if (!settings) return;
      const merged = { ...settings, ...patch, updatedAt: Date.now() };
      await settingsRepo.upsert(merged);
      setSettings(merged);
    },
    [settings]
  );

  const value = useMemo<AppCtx>(
    () => ({
      team,
      settings,
      setTeam: setTeamState,
      refreshSettings,
      createTeam,
      saveSettings,
      loading
    }),
    [team, settings, refreshSettings, createTeam, saveSettings, loading]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useApp outside provider');
  return v;
}
