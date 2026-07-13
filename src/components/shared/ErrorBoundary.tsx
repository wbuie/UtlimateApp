import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

// A crash during a live game must never be a blank white screen — the data is
// already safe in IndexedDB, so recovery is just a reload.
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <div className="min-h-dvh bg-[#0f172a] flex flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="text-4xl">🥏</div>
        <h1 className="text-xl font-black text-[#f1f5f9] font-[Barlow_Condensed] uppercase tracking-wide">
          Something went wrong
        </h1>
        <p className="text-[#94a3b8] font-[DM_Mono] text-xs max-w-sm">
          Your game data is saved on this device. Reload to pick up where you left off.
        </p>
        <p className="text-[#64748b] font-[DM_Mono] text-[10px] max-w-sm break-all">
          {this.state.error.message}
        </p>
        <button
          onClick={() => window.location.reload()}
          className="bg-[#22c55e] text-black font-black font-[Barlow_Condensed] uppercase
                     tracking-widest px-6 py-3 rounded-lg"
        >
          Reload
        </button>
      </div>
    )
  }
}
