import { useGameStore } from '../../store/gameStore'
import { PlayerChipGrid } from './PlayerChipGrid'
import { Modal } from '../shared/Modal'

export function ActionPanel() {
  const store = useGameStore()
  const {
    discHolder, possession, activePlayers, onFieldPlayerIds,
    playerPickerOpen, playerPickerContext,
    openPlayerPicker, closePlayerPicker,
    subModalOpen, openSubModal, closeSubModal,
    setOnField,
    logGoal, logThrowaway, logDrop, logStall,
    logD, logTheirDrop, logTheirStall, logCallahan,
    logTheirGoal, logPenalty,
    tapReceiver,
    game,
  } = store

  const onField = activePlayers.filter(p => onFieldPlayerIds.includes(p.id))
  const discHolderPlayer = activePlayers.find(p => p.id === discHolder)

  function handlePickerConfirm(playerId: string) {
    closePlayerPicker()
    switch (playerPickerContext) {
      case 'D':          logD(playerId); break
      case 'drop':       logDrop(playerId); break
      case 'their_drop': logTheirDrop(playerId); break
      case 'callahan':   logCallahan(playerId); break
      case 'their_stall': logTheirStall(); break
    }
  }

  function handlePickerSkip() {
    closePlayerPicker()
    switch (playerPickerContext) {
      case 'D':          logD(''); break
      case 'drop':       logDrop(''); break
      case 'their_drop': logTheirDrop(); break
      case 'callahan':   break  // can't skip callahan — need the scorer
      case 'their_stall': logTheirStall(); break
    }
  }

  return (
    <div className="flex flex-col gap-3 p-3">
      {/* Throw flow — disc holder + receiver taps */}
      <div className="bg-[#1e293b] border border-[#334155] rounded-xl p-3">
        <div className="text-xs uppercase tracking-widest text-[#94a3b8] font-[DM_Mono] mb-2">
          {discHolderPlayer
            ? `${discHolderPlayer.name} has the disc — tap receiver`
            : 'Tap to set disc holder / first receiver'}
        </div>
        <div className="grid grid-cols-4 gap-2">
          {onField.map(p => (
            <button
              key={p.id}
              onClick={() => tapReceiver(p.id)}
              className={`flex flex-col items-center py-2 px-1 rounded-lg border transition-colors
                ${discHolder === p.id
                  ? 'border-[#3b82f6] bg-[#1e3a5f] text-[#3b82f6]'
                  : 'border-[#334155] bg-[#273549] text-[#f1f5f9] hover:border-[#94a3b8] active:bg-[#334155]'}`}
            >
              <span className="text-[10px] text-[#64748b] font-[DM_Mono]">#{p.number}</span>
              <span className="text-xs font-bold font-[Barlow_Condensed] uppercase leading-tight text-center">
                {p.name.split(' ')[0]}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Offense actions */}
      {possession === 'us' && (
        <div>
          <div className="text-xs uppercase tracking-widest text-[#94a3b8] font-[DM_Mono] mb-2">
            Offense
          </div>
          <div className="grid grid-cols-2 gap-2">
            <ActionBtn
              label="🏆 Goal"
              color="green"
              onClick={logGoal}
              disabled={!discHolder}
            />
            <ActionBtn
              label="Throwaway"
              color="red"
              onClick={logThrowaway}
            />
            <ActionBtn
              label="Drop"
              color="red"
              onClick={() => openPlayerPicker('drop')}
            />
            <ActionBtn
              label="Stall"
              color="red"
              onClick={logStall}
            />
          </div>
        </div>
      )}

      {/* Defense actions */}
      {possession === 'them' && (
        <div>
          <div className="text-xs uppercase tracking-widest text-[#94a3b8] font-[DM_Mono] mb-2">
            Defense
          </div>
          <div className="grid grid-cols-2 gap-2">
            <ActionBtn
              label="D Block"
              color="green"
              onClick={() => openPlayerPicker('D')}
            />
            <ActionBtn
              label="Their Drop"
              color="green"
              onClick={() => openPlayerPicker('their_drop')}
            />
            <ActionBtn
              label="Their Stall"
              color="green"
              onClick={() => openPlayerPicker('their_stall')}
            />
            <ActionBtn
              label="⚡ Callahan"
              color="amber"
              onClick={() => openPlayerPicker('callahan')}
            />
            <ActionBtn
              label="Their Goal"
              color="red"
              onClick={logTheirGoal}
              className="col-span-2"
            />
          </div>
        </div>
      )}

      {/* Always available */}
      {!game?.isComplete && (
        <div>
          <div className="text-xs uppercase tracking-widest text-[#94a3b8] font-[DM_Mono] mb-2">
            Other
          </div>
          <div className="grid grid-cols-2 gap-2">
            <ActionBtn label="Penalty / Foul" color="amber" onClick={() => logPenalty()} />
            <ActionBtn label="⇄ Change Line" color="blue" onClick={openSubModal} />
          </div>
        </div>
      )}

      {/* Player picker modal */}
      <Modal
        open={playerPickerOpen}
        onClose={closePlayerPicker}
        title={pickerTitle(playerPickerContext)}
      >
        <PlayerChipGrid
          players={onField}
          onSelect={handlePickerConfirm}
          skipOption={playerPickerContext !== 'callahan'}
          onSkip={handlePickerSkip}
        />
      </Modal>

      {/* Quick sub modal */}
      <Modal open={subModalOpen} onClose={closeSubModal} title={`Change Line — ${onFieldPlayerIds.length}/7`}>
        <div className="grid grid-cols-3 gap-2 mb-3">
          {activePlayers.filter(p => p.active).map(p => {
            const on = onFieldPlayerIds.includes(p.id)
            const full = onFieldPlayerIds.length >= 7 && !on
            return (
              <button
                key={p.id}
                disabled={full}
                onClick={() => {
                  const next = on
                    ? onFieldPlayerIds.filter(id => id !== p.id)
                    : [...onFieldPlayerIds, p.id]
                  setOnField(next)
                }}
                className={`flex flex-col items-center py-3 px-2 rounded-lg border transition-colors disabled:opacity-30
                  ${on
                    ? 'border-[#22c55e] bg-[#166534] text-[#22c55e]'
                    : 'border-[#334155] bg-[#273549] text-[#f1f5f9] hover:border-[#94a3b8]'}`}
              >
                <span className="text-xs text-[#94a3b8] font-[DM_Mono]">#{p.number}</span>
                <span className="text-xs font-bold font-[Barlow_Condensed] uppercase leading-tight text-center">
                  {p.name.split(' ')[0]}
                </span>
                {on && <span className="text-[9px] text-[#22c55e] font-[DM_Mono] mt-0.5">ON</span>}
              </button>
            )
          })}
        </div>
        <button
          onClick={closeSubModal}
          className="w-full py-2.5 bg-[#22c55e] text-black font-black font-[Barlow_Condensed]
                     uppercase tracking-widest rounded-lg"
        >
          Done
        </button>
      </Modal>
    </div>
  )
}

// ── Sub components ─────────────────────────────────────

interface ActionBtnProps {
  label: string
  color: 'green' | 'red' | 'amber' | 'blue'
  onClick: () => void
  disabled?: boolean
  className?: string
}

function ActionBtn({ label, color, onClick, disabled, className = '' }: ActionBtnProps) {
  const colorMap = {
    green: 'bg-[#166534] border-[#22c55e] text-[#22c55e] hover:bg-[#22c55e] hover:text-black active:bg-[#166534]',
    red:   'bg-[#7f1d1d] border-[#ef4444] text-[#ef4444] hover:bg-[#ef4444] hover:text-black active:bg-[#7f1d1d]',
    amber: 'bg-[#78350f] border-[#f59e0b] text-[#f59e0b] hover:bg-[#f59e0b] hover:text-black active:bg-[#78350f]',
    blue:  'bg-[#1e3a5f] border-[#3b82f6] text-[#3b82f6] hover:bg-[#3b82f6] hover:text-black active:bg-[#1e3a5f]',
  }
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`border rounded-lg py-3 px-3 text-sm font-bold font-[Barlow_Condensed] uppercase
                  tracking-wide transition-colors select-none
                  disabled:opacity-30 disabled:pointer-events-none
                  ${colorMap[color]} ${className}`}
    >
      {label}
    </button>
  )
}

function pickerTitle(ctx: string | null): string {
  switch (ctx) {
    case 'D':          return 'Who got the D?'
    case 'drop':       return 'Who dropped it?'
    case 'their_drop': return 'Who picked it up?'
    case 'callahan':   return 'Who scored the Callahan?'
    case 'their_stall': return 'Who recovered the disc?'
    default:           return 'Select Player'
  }
}
