import { useGameStore } from '../../store/gameStore'

export function ToastContainer() {
  const { toasts, dismissToast } = useGameStore()
  if (!toasts.length) return null

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map(t => (
        <div
          key={t.id}
          onClick={() => dismissToast(t.id)}
          className="pointer-events-auto bg-[#1e293b] text-[#f1f5f9] font-[Barlow_Condensed] text-base font-semibold
                     px-4 py-2 rounded-lg shadow-lg border border-[#334155]
                     animate-[toast-in_0.2s_ease-out]"
        >
          {t.message}
        </div>
      ))}
    </div>
  )
}
