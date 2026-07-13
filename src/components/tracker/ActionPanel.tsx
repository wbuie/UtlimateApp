import { useGameStore } from '../../store/gameStore'
import { PlayerChipGrid } from './PlayerChipGrid'
import { Modal } from '../shared/Modal'

export function ActionPanel() {
  const {
    discHolder, possession, activePlayers, onFieldPlayerIds,
    playerPickerOpen, playerPickerContext,
    openPlayerPicker, closePlayerPicker,
    subModalOpen, openSubModal, closeSubModal,
    setOnField,
    logGoal, logThrowaway, logDrop, logStall,
    logD, logTheirDrop, logTheirStall, logCallahan,
    logTheirGoal, logPenalty, logTheirPass, logTimeout,
    tapReceiver,
    theirPassCount,
  } = useGameStore()

  const onField = activePlayers.filter(p => onFieldPlayerIds.includes(p.id))
  const discHolderPlayer = activePlayers.find(p => p.id === discHolder)

  function handlePickerConfirm(playerId: string) {
    closePlayerPicker()
    switch (playerPickerContext) {
      case 'D':          logD(playerId); break
      case 'drop':       logDrop(playerId); break
      case 'their_drop': logTheirDrop(playerId); break
      case 'callahan':   logCallahan(playerId); break
    }
  }

  function handlePickerSkip() {
    closePlayerPicker()
    switch (playerPickerContext) {
      case 'D':          logD(); break
      case 'drop':       logDrop(); break
      case 'their_drop': logTheirDrop(); break
      case 'callahan':   break
    }
  }

  return (
    <div className="flex flex-col gap-3 p-3">

      {/* ── OFFENSE: throw flow ── */}
      {possession === 'us' && (
        <>
          <div className="rounded-xl p-3"
            style={{ background: '#1e293b', border: '1px solid #334155', boxShadow: '0 2px 6px rgba(0,0,0,0.3)' }}>
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

          <div>
            <div className="text-[10px] uppercase tracking-widest text-[#64748b] font-[DM_Mono] mb-2">Offense</div>
            <div className="grid grid-cols-2 gap-2">
              <ActionBtn label="🏆 Goal" color="green" size="hero" onClick={logGoal}
                disabled={!discHolder} className="col-span-2" />
              <ActionBtn label="Throwaway" color="red" size="md" onClick={logThrowaway} />
              <ActionBtn label="Drop" color="red" size="md" onClick={() => openPlayerPicker('drop')} />
              <ActionBtn label="Stall" color="red" size="sm" onClick={logStall} />
            </div>
          </div>
        </>
      )}

      {/* ── DEFENSE: opponent pass counter + D actions ── */}
      {possession === 'them' && (
        <>
          {/* Pass counter */}
          <div className="rounded-xl p-4 flex items-center gap-4"
            style={{ background: '#1e293b', border: '1px solid #334155', boxShadow: '0 2px 6px rgba(0,0,0,0.3)' }}>
            <div className="flex-1">
              <div className="text-[10px] uppercase tracking-widest text-[#64748b] font-[DM_Mono] mb-1">
                Their passes
              </div>
              <div className="text-4xl font-black font-[Barlow_Condensed] text-[#94a3b8] tabular-nums leading-none">
                {theirPassCount}
              </div>
            </div>
            <button
              onClick={logTheirPass}
              className="btn-press w-20 h-16 rounded-xl border border-[#334155] bg-[#273549]
                         text-[#94a3b8] font-black font-[Barlow_Condensed] text-2xl
                         hover:border-[#94a3b8] hover:text-[#f1f5f9] transition-colors"
            >
              +1
            </button>
          </div>

          <div>
            <div className="text-[10px] uppercase tracking-widest text-[#64748b] font-[DM_Mono] mb-2">Defense</div>
            <div className="grid grid-cols-2 gap-2">
              <ActionBtn label="D Block" color="green" size="md" onClick={() => openPlayerPicker('D')} />
              <ActionBtn label="Their Drop" color="green" size="md" onClick={() => openPlayerPicker('their_drop')} />
              <ActionBtn label="Their Stall" color="green" size="sm" onClick={logTheirStall} />
              <ActionBtn label="⚡ Callahan" color="amber" size="md" onClick={() => openPlayerPicker('callahan')} />
              <ActionBtn label="Their Goal" color="red" size="md" onClick={logTheirGoal} className="col-span-2" />
            </div>
          </div>
        </>
      )}

      {/* Always available */}
      <div>
        <div className="text-[10px] uppercase tracking-widest text-[#64748b] font-[DM_Mono] mb-2">Other</div>
        <div className="grid grid-cols-3 gap-2">
          <ActionBtn label="Penalty" color="amber" size="sm" onClick={() => logPenalty()} />
          <ActionBtn label="Timeout" color="amber" size="sm" onClick={logTimeout} />
          <ActionBtn label="⇄ Sub" color="blue" size="sm" onClick={openSubModal} />
        </div>
      </div>

      {/* Player picker modal */}
      <Modal open={playerPickerOpen} onClose={closePlayerPicker} title={pickerTitle(playerPickerContext)}>
        <PlayerChipGrid
          players={onField}
          onSelect={handlePickerConfirm}
          skipOption={playerPickerContext !== 'callahan'}
          onSkip={handlePickerSkip}
        />
      </Modal>

      {/* Mid-point substitution modal */}
      <Modal open={subModalOpen} onClose={closeSubModal} title={`Substitution — ${onFieldPlayerIds.length}/7`}>
        <p className="text-[10px] text-[#64748b] font-[DM_Mono] uppercase tracking-wider mb-3">
          Everyone who takes the field is credited for this point
        </p>
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
        <button onClick={closeSubModal}
          className="btn-press w-full py-2.5 bg-[#22c55e] text-black font-black font-[Barlow_Condensed]
                     uppercase tracking-widest rounded-lg">
          Done
        </button>
      </Modal>
    </div>
  )
}

// ── Sub components ──────────────────────────────────────────────────────────

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
    case 'D':           return 'Who got the D?'
    case 'drop':        return 'Who dropped it?'
    case 'their_drop':  return 'Who picked it up?'
    case 'callahan':    return 'Who scored the Callahan?'
    default:            return 'Select Player'
  }
}
