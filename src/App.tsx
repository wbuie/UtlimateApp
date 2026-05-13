import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Home } from './pages/Home'
import { Team } from './pages/Team'
import { GameTracker } from './pages/GameTracker'
import { GameStats } from './pages/GameStats'
import { SeasonStats } from './pages/SeasonStats'
import { Spectator } from './pages/Spectator'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"                    element={<Home />} />
        <Route path="/team/:teamId"        element={<Team />} />
        <Route path="/team/:teamId/season" element={<SeasonStats />} />
        <Route path="/game/:gameId"        element={<GameTracker />} />
        <Route path="/stats/:gameId"       element={<GameStats />} />
        <Route path="/watch/:gameId"       element={<Spectator />} />
        <Route path="*"                    element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
