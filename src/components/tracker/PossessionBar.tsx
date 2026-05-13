import { useEffect, useRef } from 'react'
import { useGameStore } from '../../store/gameStore'

export function PossessionBar() {
  const { possession, line, setLine, game } = useGameStore()
  const barRef = useRef<HTMLDivElement>(null)
  const prevPossession = useRef(possession)

  useEffect(() => {
    if (prevPossession.current === possession) return
    prevPossession.current = possession
    const el = barRef.current
    if (!el) return
    el.classList.remove('animate-[possession-flash_0.5s_ease-out]')
    void el.offsetWidth
    el.classList.add('animate-[possession-flash_0.5s_ease-out]')
    const t = setTimeout(() => el.classList.remove('animate-[possession-flash_0.5s_ease-out]'), 500)
    return () => clearTimeout(t)
  }, [possession])

  if (!game) return null

  return (
    <div
      ref={barRef}
      className="flex items-center justify-between px-4 py-2 bg-[#1e293b] border-b border-[#334155]"
    >
      {/* Possession indicator */}
      <div className="flex items-center gap-2 min-w-0">
        <span className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${
          possession === 'us' ? 'bg-[#22c55e]' : 'bg-[#ef4444]'
        }`} />
        <span className={`text-sm font-bold font-[Barlow_Condensed] uppercase tracking-wide truncate ${
          possession === 'us' ? 'text-[#22c55e]' : 'text-[#ef4444]'
        }`}>
          {possession === 'us' ? 'We have it' : 'They have it'}
        </span>
      </div>

      {/* O / D line toggle */}
      {!game.isComplete && (
        <div className="flex gap-1 flex-shrink-0">
          {(['O', 'D'] as const).map(l => (
            <button
              key={l}
              onClick={() => setLine(l)}
              className={`w-12 py-1 rounded text-xs font-black font-[Barlow_Condensed] uppercase tracking-widest transition-all
                ${line === l
                  ? l === 'O'
                    ? 'bg-[#22c55e] text-black shadow-[0_0_8px_#22c55e66]'
                    : 'bg-[#3b82f6] text-white shadow-[0_0_8px_#3b82f666]'
                  : 'bg-[#273549] text-[#64748b] hover:text-[#94a3b8]'}`}
            >
              {l}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
