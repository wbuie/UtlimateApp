import { useEffect, useRef } from 'react'
import { useGameStore } from '../../store/gameStore'

export function PossessionBar() {
  const { possession, line, setLine } = useGameStore()
  const barRef = useRef<HTMLDivElement>(null)
  const prevPossession = useRef(possession)

  useEffect(() => {
    if (prevPossession.current !== possession) {
      barRef.current?.classList.remove('animate-[flash_0.4s_ease-out]')
      void barRef.current?.offsetWidth  // reflow to restart animation
      barRef.current?.classList.add('animate-[flash_0.4s_ease-out]')
      prevPossession.current = possession
    }
  }, [possession])

  return (
    <div
      ref={barRef}
      className="flex items-center justify-between px-4 py-2 bg-[#273549] border-b border-[#334155]"
    >
      <div className="flex items-center gap-2">
        <span className="text-xs uppercase tracking-widest text-[#94a3b8] font-[DM_Mono]">Disc</span>
        <span className={`text-sm font-bold font-[Barlow_Condensed] uppercase tracking-wide
          ${possession === 'us' ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
          {possession === 'us' ? '▶ We have it' : '◀ They have it'}
        </span>
      </div>
      <div className="flex gap-1">
        {(['O', 'D'] as const).map(l => (
          <button
            key={l}
            onClick={() => setLine(l)}
            className={`px-3 py-1 rounded text-sm font-bold font-[Barlow_Condensed] uppercase transition-colors
              ${line === l
                ? l === 'O' ? 'bg-[#22c55e] text-black' : 'bg-[#3b82f6] text-white'
                : 'bg-[#334155] text-[#94a3b8]'}`}
          >
            {l}-Line
          </button>
        ))}
      </div>
    </div>
  )
}
