import { Routes, Route, Navigate } from 'react-router-dom';
import AppShell from '@/components/AppShell';
import HomeScreen from '@/features/home/HomeScreen';
import RosterScreen from '@/features/roster/RosterScreen';
import NewGameScreen from '@/features/games/NewGameScreen';
import GameScreen from '@/features/games/GameScreen';
import ScoreboardScreen from '@/features/games/ScoreboardScreen';
import GamesScreen from '@/features/games/GamesScreen';
import PitchersScreen from '@/features/pitching/PitchersScreen';
import StatsScreen from '@/features/stats/StatsScreen';
import SettingsScreen from '@/features/settings/SettingsScreen';
import { AppProvider } from './AppContext';

export default function App() {
  return (
    <AppProvider>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<Navigate to="/home" replace />} />
          <Route path="/home" element={<HomeScreen />} />
          <Route path="/roster" element={<RosterScreen />} />
          <Route path="/new-game" element={<NewGameScreen />} />
          <Route path="/game/:gameId" element={<GameScreen />} />
          <Route path="/game/:gameId/scoreboard" element={<ScoreboardScreen />} />
          <Route path="/games" element={<GamesScreen />} />
          <Route path="/pitchers" element={<PitchersScreen />} />
          <Route path="/stats" element={<StatsScreen />} />
          <Route path="/settings" element={<SettingsScreen />} />
          <Route path="*" element={<Navigate to="/home" replace />} />
        </Route>
      </Routes>
    </AppProvider>
  );
}
