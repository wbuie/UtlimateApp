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
      case 'callahan':   break
      case 'their_stall': logTheirStall(); break
    }
  }

  return (
    <div className="flex flex-col gap-3 p-3">
      {/* Throw flow — disc holder + receiver taps */}
      <div className="rounded-xl p-3" style={{ background: '#1e293b', border: '1px solid #334155', boxShadow: '0 2px 6px rgba(0,0,0,0.3)' }}>
        <div className="text-[10px] uppercase tracking-widest font-[DM_Mono] mb-2.5"
          style={{ color: discHolderPlayer ? '#3b82f6' : '#64748b' }}>
          {discHolderPlayer
            ? `${discHolderPlayer.name} has the disc — tap receiver`
            : 'Tap to set disc holder / first receiver'}
        </div>
        <div className="grid grid-cols-4 gap-2">
          {onField.map(p => (
            <button
              key={p.id}
              onClick={() => tapReceiver(p.id)}
              className={`btn-press flex flex-col items-center py-2.5 px-1 rounded-lg border transition-colors
                ${discHolder === p.id
                  ? 'border-[#3b82f6] bg-[#1e3a5f] text-[#3b82f6]'
                  : 'border-[#334155] bg-[#273549] text-[#f1f5f9] hover:border-[#94a3b8]'}`}
              style={discHolder === p.id ? { boxShadow: '0 0 8px rgba(59,130,246,0.35)' } : {}}
            >
              <span className="text-[9px] text-[#64748b] font-[DM_Mono]">#{p.number}</span>
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
          <div className="text-[10px] uppercase tracking-widest text-[#64748b] font-[DM_Mono] mb-2">
            Offense
          </div>
          <div className="grid grid-cols-2 gap-2">
            {/* GOAL — biggest button, hero action */}
            <ActionBtn
              label="🏆 Goal"
              color="green"
              size="hero"
              onClick={logGoal}
              disabled={!discHolder}
              className="col-span-2"
            />
            <ActionBtn label="Throwaway" color="red" size="md" onClick={logThrowaway} />
            <ActionBtn label="Drop" color="red" size="md" onClick={() => openPlayerPicker('drop')} />
            <ActionBtn label="Stall" color="red" size="sm" onClick={logStall} />
          </div>
        </div>
      )}

      {/* Defense actions */}
      {possession === 'them' && (
        <div>
          <div className="text-[10px] uppercase tracking-widest text-[#64748b] font-[DM_Mono] mb-2">
            Defense
          </div>
          <div className="grid grid-cols-2 gap-2">
            <ActionBtn label="D Block" color="green" size="md" onClick={() => openPlayerPicker('D')} />
            <ActionBtn label="Their Drop" color="green" size="md" onClick={() => openPlayerPicker('their_drop')} />
            <ActionBtn label="Their Stall" color="green" size="sm" onClick={() => openPlayerPicker('their_stall')} />
            <ActionBtn label="⚡ Callahan" color="amber" size="md" onClick={() => openPlayerPicker('callahan')} />
            <ActionBtn
              label="Their Goal"
              color="red"
              size="md"
              onClick={logTheirGoal}
              className="col-span-2"
            />
          </div>
        </div>
      )}

      {/* Always available */}
      {!game?.isComplete && (
        <div>
          <div className="text-[10px] uppercase tracking-widest text-[#64748b] font-[DM_Mono] mb-2">
            Other
          </div>
          <div className="grid grid-cols-2 gap-2">
            <ActionBtn label="Penalty / Foul" color="amber" size="sm" onClick={() => logPenalty()} />
            <ActionBtn label="⇄ Change Line" color="blue" size="sm" onClick={openSubModal} />
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
                className={`btn-press flex flex-col items-center py-3 px-2 rounded-lg border transition-colors disabled:opacity-30
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
          className="btn-press w-full py-2.5 bg-[#22c55e] text-black font-black font-[Barlow_Condensed]
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
  size: 'hero' | 'md' | 'sm'
  onClick: () => void
  disabled?: boolean
  className?: string
}

function ActionBtn({ label, color, size, onClick, disabled, className = '' }: ActionBtnProps) {
  const colorMap = {
    green: 'bg-[#166534] border-[#22c55e] text-[#22c55e] hover:bg-[#22c55e] hover:text-black',
    red:   'bg-[#7f1d1d] border-[#ef4444] text-[#ef4444] hover:bg-[#ef4444] hover:text-black',
    amber: 'bg-[#78350f] border-[#f59e0b] text-[#f59e0b] hover:bg-[#f59e0b] hover:text-black',
    blue:  'bg-[#1e3a5f] border-[#3b82f6] text-[#3b82f6] hover:bg-[#3b82f6] hover:text-black',
  }
  const sizeMap = {
    hero: 'py-4 text-lg tracking-widest',
    md:   'py-3 text-sm tracking-wide',
    sm:   'py-2.5 text-xs tracking-wide',
  }
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`btn-press border rounded-lg px-3 font-black font-[Barlow_Condensed] uppercase
                  transition-colors select-none
                  disabled:opacity-30 disabled:pointer-events-none
                  ${colorMap[color]} ${sizeMap[size]} ${className}`}
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
