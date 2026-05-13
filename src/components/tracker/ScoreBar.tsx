import { useEffect, useRef, useState } from 'react'
import { useGameStore } from '../../store/gameStore'

function usePointTimer(startTime: Date | null): string {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    if (!startTime) { setElapsed(0); return }
    const start = new Date(startTime).getTime()
    const tick = () => setElapsed(Math.floor((Date.now() - start) / 1000))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [startTime])

  const m = Math.floor(elapsed / 60)
  const s = elapsed % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function ScoreBar() {
  const { game, currentPoint, scoreFlash, clearScoreFlash } = useGameStore()
  const timer = usePointTimer(currentPoint?.startedAt ?? null)
  const usScoreRef = useRef<HTMLDivElement>(null)
  const themScoreRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!scoreFlash) return
    const ref = scoreFlash === 'us' ? usScoreRef : themScoreRef
    const el = ref.current
    if (!el) return
    el.classList.remove('animate-[score-pop_0.5s_ease-out]')
    void el.offsetWidth
    el.classList.add('animate-[score-pop_0.5s_ease-out]')
    const t = setTimeout(() => {
      el.classList.remove('animate-[score-pop_0.5s_ease-out]')
      clearScoreFlash()
    }, 500)
    return () => clearTimeout(t)
  }, [scoreFlash])

  if (!game) return null

  const pointNum = currentPoint?.pointNumber ?? '—'

  return (
    <div className="bg-[#0f172a] border-b border-[#334155]">
      {/* Main score row */}
      <div className="flex items-stretch">
        {/* Us */}
        <div className="flex-1 flex flex-col items-center justify-center py-3 relative">
          <div className="text-[10px] uppercase tracking-[0.2em] text-[#64748b] font-[DM_Mono] mb-1">Us</div>
          <div
            ref={usScoreRef}
            className="text-5xl font-black text-[#f1f5f9] font-[Barlow_Condensed] leading-none tabular-nums"
          >
            {game.ourScore}
          </div>
        </div>

        {/* Center — point + timer */}
        <div className="flex flex-col items-center justify-center px-4 gap-1 border-x border-[#334155]">
          <div className="text-[10px] uppercase tracking-[0.2em] text-[#64748b] font-[DM_Mono]">Pt</div>
          <div className="text-xl font-bold text-[#94a3b8] font-[Barlow_Condensed] leading-none">
            {pointNum}
          </div>
          <div className="text-sm font-[DM_Mono] text-[#64748b] tabular-nums leading-none">
            {timer}
          </div>
        </div>

        {/* Them */}
        <div className="flex-1 flex flex-col items-center justify-center py-3">
          <div className="text-[10px] uppercase tracking-[0.2em] text-[#64748b] font-[DM_Mono] mb-1 truncate max-w-[80px] text-center">
            {game.opponent}
          </div>
          <div
            ref={themScoreRef}
            className="text-5xl font-black text-[#f1f5f9] font-[Barlow_Condensed] leading-none tabular-nums"
          >
            {game.theirScore}
          </div>
        </div>
      </div>

      {/* Game complete banner */}
      {game.isComplete && (
        <div className="bg-[#166534] border-t border-[#22c55e] py-1.5 text-center">
          <span className="text-xs font-bold font-[Barlow_Condensed] uppercase tracking-widest text-[#22c55e]">
            Game Complete
          </span>
        </div>
      )}
    </div>
  )
}
