import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGameStore } from '../../store/gameStore'
import { Modal } from '../shared/Modal'

interface Props {
  onEndPoint: () => void
}

export function BottomBar({ onEndPoint }: Props) {
  const { undoLast, events, game, endGame, onFieldPlayerIds } = useGameStore()
  const navigate = useNavigate()
  const [confirmEndGame, setConfirmEndGame] = useState(false)

  const hasEvents = events.some(e => !e.undone)
  const lineCount = onFieldPlayerIds.length
  const lineWarning = lineCount < 7

  if (game?.isComplete) {
    return (
      <div className="sticky bottom-0 bg-[#0f172a] border-t border-[#334155] px-3 py-3
                      pb-[env(safe-area-inset-bottom,12px)]">
        <button
          onClick={() => navigate(`/stats/${game.id}`)}
          className="w-full py-3 bg-[#22c55e] text-black font-black font-[Barlow_Condensed]
                     uppercase tracking-widest rounded-lg text-base"
        >
          View Final Stats →
        </button>
      </div>
    )
  }

  return (
    <>
      {/* Line count warning */}
      {lineWarning && (
        <div className="bg-[#78350f] border-t border-[#f59e0b] px-4 py-1.5 flex items-center gap-2">
          <span className="text-[#f59e0b] text-xs font-[DM_Mono]">⚠</span>
          <span className="text-[#f59e0b] text-xs font-[Barlow_Condensed] font-bold uppercase tracking-wide">
            {lineCount}/7 players on field — set your line
          </span>
        </div>
      )}

      <div className="sticky bottom-0 bg-[#0f172a] border-t border-[#334155] px-3 py-3
                      flex gap-2 pb-[env(safe-area-inset-bottom,12px)]">
        <button
          onClick={undoLast}
          disabled={!hasEvents}
          className="px-4 py-3 border border-[#334155] rounded-lg text-sm font-bold
                     font-[Barlow_Condensed] uppercase text-[#94a3b8]
                     hover:bg-[#1e293b] transition-colors disabled:opacity-30"
        >
          ↩ Undo
        </button>
        <button
          onClick={onEndPoint}
          className="flex-1 py-3 border border-[#334155] rounded-lg text-sm font-bold
                     font-[Barlow_Condensed] uppercase text-[#f1f5f9]
                     bg-[#1e293b] hover:bg-[#273549] transition-colors"
        >
          End Point →
        </button>
        <button
          onClick={() => setConfirmEndGame(true)}
          className="px-4 py-3 border border-[#ef4444] rounded-lg text-sm font-bold
                     font-[Barlow_Condensed] uppercase text-[#ef4444]
                     hover:bg-[#7f1d1d] transition-colors"
        >
          End Game
        </button>
      </div>

      <Modal open={confirmEndGame} onClose={() => setConfirmEndGame(false)} title="End Game?">
        <p className="text-[#94a3b8] font-[DM_Mono] text-sm mb-4">
          Final score: <span className="text-[#f1f5f9] font-bold">
            {game?.ourScore} – {game?.theirScore}
          </span> vs {game?.opponent}
        </p>
        <div className="flex gap-2">
          <button
            onClick={async () => {
              setConfirmEndGame(false)
              await endGame()
            }}
            className="flex-1 py-3 bg-[#ef4444] text-white font-black font-[Barlow_Condensed]
                       uppercase rounded-lg hover:bg-[#dc2626] transition-colors"
          >
            Yes, End Game
          </button>
          <button
            onClick={() => setConfirmEndGame(false)}
            className="flex-1 py-3 border border-[#334155] text-[#94a3b8] font-bold
                       font-[Barlow_Condensed] uppercase rounded-lg"
          >
            Cancel
          </button>
        </div>
      </Modal>
    </>
  )
}
