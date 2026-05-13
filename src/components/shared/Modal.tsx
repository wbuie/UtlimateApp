import { type ReactNode } from 'react'

interface Props {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
}

export function Modal({ open, onClose, title, children }: Props) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="bg-[#1e293b] border border-[#334155] rounded-t-2xl w-full max-w-lg
                   max-h-[80dvh] overflow-y-auto pb-safe"
        onClick={e => e.stopPropagation()}
      >
        {title && (
          <div className="px-4 pt-4 pb-2 flex items-center justify-between">
            <h2 className="text-lg font-bold text-[#f1f5f9] font-[Barlow_Condensed] uppercase tracking-wide">
              {title}
            </h2>
            <button
              onClick={onClose}
              className="text-[#94a3b8] hover:text-[#f1f5f9] text-xl leading-none"
            >
              ✕
            </button>
          </div>
        )}
        <div className="px-4 pb-6">{children}</div>
      </div>
    </div>
  )
}
