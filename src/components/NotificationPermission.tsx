import { useState, useEffect } from 'react'
import { Bell, X } from 'lucide-react'
import { usePushNotifications } from '../hooks/usePushNotifications'

export default function NotificationPermission() {
  const { permission, isSupported, requestPermission, sendNotification } = usePushNotifications()
  const [showPrompt, setShowPrompt] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    // Mostrar el prompt solo si:
    // 1. Las notificaciones están soportadas
    // 2. No se han concedido permisos
    // 3. No se ha rechazado previamente
    // 4. No se ha cerrado el prompt en esta sesión
    const hasSeenPrompt = localStorage.getItem('notification-prompt-seen')
    
    if (isSupported && permission === 'default' && !hasSeenPrompt && !dismissed) {
      // Esperar 10 segundos después de cargar la app
      const timer = setTimeout(() => {
        setShowPrompt(true)
      }, 10000)
      
      return () => clearTimeout(timer)
    }
  }, [isSupported, permission, dismissed])

  const handleAccept = async () => {
    const granted = await requestPermission()
    if (granted) {
      // Enviar notificación de bienvenida
      sendNotification('¡Bienvenido a Clodi App!', {
        body: 'Ahora recibirás notificaciones importantes sobre tu inventario de EPP',
        tag: 'welcome',
      })
      localStorage.setItem('notification-prompt-seen', 'true')
    }
    setShowPrompt(false)
  }

  const handleDismiss = () => {
    setShowPrompt(false)
    setDismissed(true)
    localStorage.setItem('notification-prompt-seen', 'true')
  }

  if (!showPrompt || !isSupported || permission !== 'default') return null

  return (
    <div className="fixed bottom-4 left-4 z-[200] max-w-sm animate-in slide-in-from-left-5">
      <div className="rounded-2xl border border-mint-200/70 bg-white/95 p-4 shadow-[0_20px_40px_-20px_rgba(16,185,129,0.4)] backdrop-blur dark:border-dracula-green/50 dark:bg-dracula-bg/95">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-mint-200/80 to-celeste-200/80 dark:from-dracula-green/30 dark:to-dracula-cyan/30">
            <Bell className="h-5 w-5 text-slate-700 dark:text-dracula-foreground" />
          </div>
          
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-slate-800 dark:text-dracula-foreground">
              Activa las notificaciones
            </h4>
            <p className="mt-1 text-xs text-slate-500 dark:text-dracula-comment">
              Recibe alertas sobre stock bajo, vencimientos y actualizaciones importantes
            </p>

            <div className="mt-3 flex gap-2">
              <button
                onClick={handleAccept}
                className="rounded-full bg-gradient-to-r from-mint-200/80 via-white to-celeste-200/70 px-4 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:shadow-md dark:from-dracula-green/20 dark:via-dracula-bg dark:to-dracula-cyan/20 dark:text-dracula-foreground"
              >
                Activar
              </button>
              <button
                onClick={handleDismiss}
                className="rounded-full border border-soft-gray-200/70 bg-white px-4 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-soft-gray-50 dark:border-dracula-current dark:bg-dracula-current dark:text-dracula-comment dark:hover:bg-dracula-selection"
              >
                Ahora no
              </button>
            </div>
          </div>

          <button
            onClick={handleDismiss}
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
