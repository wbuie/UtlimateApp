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
    el.classList.remove('animate-[possession-flash_0.6s_ease-out]')
    void el.offsetWidth
    el.classList.add('animate-[possession-flash_0.6s_ease-out]')
    const t = setTimeout(() => el.classList.remove('animate-[possession-flash_0.6s_ease-out]'), 600)
    return () => clearTimeout(t)
  }, [possession])

  if (!game) return null

  const weHaveIt = possession === 'us'

  return (
    <div
      ref={barRef}
      className="flex items-center justify-between px-4 py-3 border-b border-[#334155]"
      style={{ background: '#1a2540' }}
    >
      {/* Possession indicator */}
      <div className="flex items-center gap-2.5 min-w-0">
        {/* Animated disc indicator */}
        <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full flex-shrink-0 text-[10px] font-black
          transition-all duration-300
          ${weHaveIt
            ? 'bg-[#22c55e] text-black shadow-[0_0_8px_rgba(34,197,94,0.5)]'
            : 'bg-[#ef4444] text-white shadow-[0_0_8px_rgba(239,68,68,0.4)]'
          }`}>
          🥏
        </span>
        <span className={`text-sm font-black font-[Barlow_Condensed] uppercase tracking-wide
          ${weHaveIt ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
          {weHaveIt ? 'We have it' : 'They have it'}
        </span>
      </div>

      {/* O / D line toggle — large, glowing */}
      {!game.isComplete && (
        <div className="flex gap-1.5 flex-shrink-0">
          {(['O', 'D'] as const).map(l => (
            <button
              key={l}
              onClick={() => setLine(l)}
              className={`btn-press w-14 py-3 rounded-lg text-sm font-black font-[Barlow_Condensed] uppercase tracking-widest
                transition-all duration-200
                ${line === l
                  ? l === 'O'
                    ? 'bg-[#22c55e] text-black'
                    : 'bg-[#3b82f6] text-white'
                  : 'bg-[#273549] border border-[#334155] text-[#64748b] hover:text-[#94a3b8]'}`}
              style={line === l ? {
                boxShadow: l === 'O'
                  ? '0 0 16px rgba(34,197,94,0.45), 0 2px 4px rgba(0,0,0,0.3)'
                  : '0 0 16px rgba(59,130,246,0.45), 0 2px 4px rgba(0,0,0,0.3)',
              } : {}}
            >
              {l}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
