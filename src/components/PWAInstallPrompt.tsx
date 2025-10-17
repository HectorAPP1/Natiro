import { useEffect, useRef, useState } from 'react'
import { Download, X } from 'lucide-react'

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

const DISMISS_KEY = 'pwa-install-dismissed'

export default function PWAInstallPrompt() {
  const [isVisible, setIsVisible] = useState(false)
  const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault()
      deferredPrompt.current = event as BeforeInstallPromptEvent
      if (localStorage.getItem(DISMISS_KEY)) return
      if (window.matchMedia('(max-width: 768px)').matches) {
        setIsVisible(true)
      }
    }

    const handleAppInstalled = () => {
      deferredPrompt.current = null
      setIsVisible(false)
      localStorage.removeItem(DISMISS_KEY)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const close = () => {
    setIsVisible(false)
    localStorage.setItem(DISMISS_KEY, '1')
  }

  const install = async () => {
    if (!deferredPrompt.current) return
    await deferredPrompt.current.prompt()
    const choice = await deferredPrompt.current.userChoice
    deferredPrompt.current = null
    if (choice.outcome === 'accepted') {
      setIsVisible(false)
      localStorage.removeItem(DISMISS_KEY)
    } else {
      close()
    }
  }

  if (!isVisible) return null

  return (
    <div className="fixed inset-0 z-[180] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={close} />
      <div className="relative w-full max-w-sm scale-100 rounded-3xl border border-celeste-200/70 bg-white p-6 text-slate-700 shadow-[0_30px_60px_-25px_rgba(14,116,144,0.35)] transition-all duration-300 ease-out dark:border-dracula-purple/40 dark:bg-dracula-bg dark:text-dracula-foreground">
        <button
          type="button"
          onClick={close}
          aria-label="Cerrar"
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-slate-700 dark:bg-dracula-current dark:text-dracula-comment dark:hover:bg-dracula-selection dark:hover:text-dracula-foreground"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-celeste-200/80 to-mint-200/70 text-slate-800 dark:from-dracula-cyan/30 dark:to-dracula-green/30 dark:text-dracula-foreground">
            <Download className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Instala Clodi App</h3>
            <p className="text-sm text-slate-500 dark:text-dracula-comment">Añádela a tu pantalla de inicio para un acceso más rápido y uso optimizado.</p>
          </div>
        </div>

        <div className="mt-6 space-y-3 text-sm text-slate-600 dark:text-dracula-comment">
          <p>Disfruta de carga instantánea y modo offline en tu dispositivo móvil.</p>
          <p>Haz clic en instalar para guardar la app como PWA.</p>
        </div>

        <div className="mt-6 flex flex-col gap-3">
          <button
            type="button"
            onClick={install}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-celeste-200/90 via-white to-mint-200/80 px-6 py-3 text-sm font-semibold text-slate-800 shadow-sm transition hover:shadow-md dark:from-dracula-cyan/20 dark:via-dracula-bg dark:to-dracula-green/20 dark:text-dracula-foreground"
          >
            <Download className="h-4 w-4" />
            Instalar ahora
          </button>
          <button
            type="button"
            onClick={close}
            className="inline-flex w-full items-center justify-center rounded-full border border-soft-gray-200/70 bg-white px-6 py-3 text-sm font-semibold text-slate-600 transition hover:bg-soft-gray-50 dark:border-dracula-current dark:bg-dracula-current dark:text-dracula-comment dark:hover:bg-dracula-selection"
          >
            Quizás luego
          </button>
        </div>
      </div>
    </div>
  )
}
