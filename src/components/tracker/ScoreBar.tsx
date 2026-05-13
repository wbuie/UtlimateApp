import { useGameStore } from '../../store/gameStore'

export function ScoreBar() {
  const { game } = useGameStore()
  if (!game) return null

  return (
    <div className="flex items-center justify-between bg-[#1e293b] px-4 py-2 border-b border-[#334155]">
      <div className="text-center flex-1">
        <div className="text-xs text-[#94a3b8] uppercase tracking-widest font-[DM_Mono]">Us</div>
        <div className="text-4xl font-bold text-[#f1f5f9] font-[Barlow_Condensed] leading-none">
          {game.ourScore}
        </div>
      </div>
      <div className="text-[#64748b] text-xl font-[Barlow_Condensed] px-4">vs</div>
      <div className="text-center flex-1">
        <div className="text-xs text-[#94a3b8] uppercase tracking-widest font-[DM_Mono]">
          {game.opponent}
        </div>
        <div className="text-4xl font-bold text-[#f1f5f9] font-[Barlow_Condensed] leading-none">
          {game.theirScore}
        </div>
      </div>
    </div>
  )
}
