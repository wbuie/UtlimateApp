import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useSyncStore } from './store/syncStore'
import { Home } from './pages/Home'
import { Team } from './pages/Team'
import { GameTracker } from './pages/GameTracker'
import { Spectator } from './pages/Spectator'

// Stats pages pull in recharts — keep them out of the tracker's bundle
const GameStats = lazy(() => import('./pages/GameStats').then(m => ({ default: m.GameStats })))
const SeasonStats = lazy(() => import('./pages/SeasonStats').then(m => ({ default: m.SeasonStats })))
const PlayerDetail = lazy(() => import('./pages/PlayerDetail').then(m => ({ default: m.PlayerDetail })))

function PageFallback() {
  return (
    <div className="min-h-dvh flex items-center justify-center text-[#64748b] font-[DM_Mono]">
      Loading…
    </div>
  )
}

export default function App() {
  const initSync = useSyncStore(s => s.init)
  useEffect(() => { initSync() }, [initSync])

  return (
    <BrowserRouter>
      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route path="/"                                   element={<Home />} />
          <Route path="/team/:teamId"                       element={<Team />} />
          <Route path="/team/:teamId/season"                element={<SeasonStats />} />
          <Route path="/team/:teamId/player/:playerId"      element={<PlayerDetail />} />
          <Route path="/game/:gameId"                       element={<GameTracker />} />
          <Route path="/stats/:gameId"                      element={<GameStats />} />
          <Route path="/watch/:gameId"                      element={<Spectator />} />
          <Route path="*"                                   element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
