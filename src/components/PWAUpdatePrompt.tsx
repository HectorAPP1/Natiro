import { useEffect, useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { RefreshCw, X } from 'lucide-react'

// Versión actual de la app
const APP_VERSION = '1.0.1'

export default function PWAUpdatePrompt() {
  const [showPrompt, setShowPrompt] = useState(false)

  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('SW Registered: ' + r)
      // Verificar actualizaciones cada hora
      r && setInterval(() => {
        r.update()
      }, 60 * 60 * 1000)
    },
    onRegisterError(error) {
      console.log('SW registration error', error)
    },
  })

  useEffect(() => {
    if (needRefresh) {
      setShowPrompt(true)
      // Enviar notificación push nativa
      sendUpdateNotification()
    }
  }, [needRefresh])

  const sendUpdateNotification = async () => {
    // Verificar si las notificaciones están soportadas y permitidas
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        // Si hay service worker, usar showNotification
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
          const registration = await navigator.serviceWorker.ready
          await registration.showNotification('¡Nueva actualización disponible!', {
            body: `Clodi App v${APP_VERSION} está lista. Toca aquí para actualizar y disfrutar de las mejoras.`,
            icon: '/icon-192x192.png',
            badge: '/icon-192x192.png',
            tag: 'app-update',
            requireInteraction: true,
            data: {
              url: window.location.href,
              action: 'update'
            },
            actions: [
              {
                action: 'update',
                title: 'Actualizar ahora'
              },
              {
                action: 'later',
                title: 'Más tarde'
              }
            ]
          } as NotificationOptions & { vibrate?: number[] })
        } else {
          // Fallback a Notification API directa
          const notification = new Notification('¡Nueva actualización disponible!', {
            body: `Clodi App v${APP_VERSION} está lista. Toca aquí para actualizar y disfrutar de las mejoras.`,
            icon: '/icon-192x192.png',
            tag: 'app-update',
            requireInteraction: true
          } as NotificationOptions)

          notification.onclick = () => {
            window.focus()
            notification.close()
            setShowPrompt(true)
          }
        }
      } catch (error) {
        console.error('Error al enviar notificación de actualización:', error)
      }
    }
  }

  const close = () => {
    setOfflineReady(false)
    setNeedRefresh(false)
    setShowPrompt(false)
  }

  const handleUpdate = () => {
    updateServiceWorker(true)
    setShowPrompt(false)
  }

  if (!showPrompt && !offlineReady) return null

  return (
    <div className="fixed bottom-4 right-4 z-[200] max-w-sm animate-in slide-in-from-bottom-5">
      <div className="rounded-2xl border border-celeste-200/70 bg-white/95 p-4 shadow-[0_20px_40px_-20px_rgba(139,92,246,0.4)] backdrop-blur dark:border-dracula-purple/50 dark:bg-dracula-bg/95">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-celeste-200/80 to-mint-200/80 dark:from-dracula-cyan/30 dark:to-dracula-green/30">
            <RefreshCw className="h-5 w-5 text-slate-700 dark:text-dracula-foreground" />
          </div>
          
          <div className="flex-1">
            {offlineReady ? (
              <>
                <h4 className="text-sm font-semibold text-slate-800 dark:text-dracula-foreground">
                  ¡App lista para usar offline!
                </h4>
                <p className="mt-1 text-xs text-slate-500 dark:text-dracula-comment">
                  Ahora puedes usar Clodi App sin conexión a internet
                </p>
              </>
            ) : (
              <>
                <h4 className="text-sm font-semibold text-slate-800 dark:text-dracula-foreground">
                  Nueva versión v{APP_VERSION} disponible
                </h4>
                <p className="mt-1 text-xs text-slate-500 dark:text-dracula-comment">
                  Actualiza ahora para disfrutar de las mejoras
                </p>
              </>
            )}

            <div className="mt-3 flex gap-2">
              {needRefresh && (
                <button
                  onClick={handleUpdate}
                  className="rounded-full bg-gradient-to-r from-celeste-200/80 via-white to-mint-200/70 px-4 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:shadow-md dark:from-dracula-cyan/20 dark:via-dracula-bg dark:to-dracula-green/20 dark:text-dracula-foreground"
                >
                  Actualizar ahora
                </button>
              )}
              <button
                onClick={close}
                className="rounded-full border border-soft-gray-200/70 bg-white px-4 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-soft-gray-50 dark:border-dracula-current dark:bg-dracula-current dark:text-dracula-comment dark:hover:bg-dracula-selection"
              >
                {needRefresh ? 'Más tarde' : 'Cerrar'}
              </button>
            </div>
          </div>

          <button
            onClick={close}
            className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-soft-gray-100 hover:text-slate-600 dark:text-dracula-comment dark:hover:bg-dracula-selection dark:hover:text-dracula-foreground"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
