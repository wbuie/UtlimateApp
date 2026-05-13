// Phase 4: realtime spectator view — reads from Supabase Realtime
// Placeholder until Supabase is configured
import { useParams } from 'react-router-dom'

export function Spectator() {
  const { gameId } = useParams<{ gameId: string }>()
  return (
    <div className="min-h-dvh bg-[#0f172a] flex flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-5xl">📡</p>
      <h1 className="text-2xl font-bold text-[#f1f5f9] font-[Barlow_Condensed] uppercase">
        Spectator Mode
      </h1>
      <p className="text-[#94a3b8] font-[DM_Mono] text-sm">
        Live streaming for game <span className="text-[#3b82f6]">{gameId}</span> will be
        available in Phase 4 after Supabase Realtime is configured.
      </p>
    </div>
  )
}
