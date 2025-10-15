import { useState } from 'react'
import { Bell, X, Send, Settings } from 'lucide-react'
import { usePushNotifications } from '../hooks/usePushNotifications'

export default function Configuracion() {
  const { permission, requestPermission, sendNotification } = usePushNotifications()
  const [showModal, setShowModal] = useState(false)
  const [title, setTitle] = useState('⚠️ Stock crítico en EPP')
  const [message, setMessage] = useState('Tienes 3 equipos con stock bajo. Abre Clodi App para revisar tu inventario.')

  const handleSendNotification = async () => {
    if (permission !== 'granted') {
      const granted = await requestPermission()
      if (!granted) {
        alert('Necesitas activar las notificaciones primero')
        return
      }
    }

    if (!title.trim() || !message.trim()) {
      alert('Por favor completa el título y el mensaje')
      return
    }

    // Enviar notificación personalizada
    sendNotification(title, {
      body: message,
      tag: 'custom-notification',
      requireInteraction: true,
      data: {
        url: window.location.origin + '/epp',
        action: 'open-app'
      }
    })

    setShowModal(false)
    alert('¡Notificación enviada! Los usuarios la verán cuando tengan la app en segundo plano.')
  }

  const quickMessages = [
    {
      title: '⚠️ Stock crítico en EPP',
      message: 'Tienes equipos con stock bajo. Abre Clodi App para revisar tu inventario.'
    },
    {
      title: '📅 Recordatorio de inspección',
      message: 'Es momento de realizar la inspección mensual de EPP. Ingresa a la app.'
    },
    {
      title: '✅ Actualización completada',
      message: 'Se han actualizado los registros de EPP. Revisa los cambios en la app.'
    },
    {
      title: '🎯 Nueva capacitación disponible',
      message: 'Hay un nuevo módulo de capacitación en seguridad. Accede ahora.'
    }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-celeste-300 dark:text-dracula-cyan">
          CONFIGURACIÓN
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-800 dark:text-dracula-foreground">
          Ajustes de la aplicación
        </h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-dracula-comment">
          Configura las opciones y preferencias de Clodi App
        </p>
      </div>

      {/* Sección de Notificaciones */}
      <div className="rounded-2xl border border-soft-gray-200/70 bg-white p-6 shadow-sm dark:border-dracula-current dark:bg-dracula-bg">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20">
            <Bell className="h-6 w-6 text-purple-500 dark:text-purple-400" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-dracula-foreground">
              Notificaciones Push
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-dracula-comment">
              Envía notificaciones personalizadas a todos los usuarios de la aplicación
            </p>
            <button
              onClick={() => setShowModal(true)}
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:shadow-lg"
            >
              <Send className="h-4 w-4" />
              Enviar Notificación
            </button>
          </div>
        </div>
      </div>

      {/* Próximamente */}
      <div className="rounded-2xl border border-soft-gray-200/70 bg-white p-6 shadow-sm dark:border-dracula-current dark:bg-dracula-bg">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-celeste-200/50 to-mint-200/50">
            <Settings className="h-6 w-6 text-celeste-500 dark:text-dracula-cyan" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-dracula-foreground">
              Más configuraciones
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-dracula-comment">
              Próximamente agregaremos más opciones de configuración para personalizar tu experiencia
            </p>
            <span className="mt-4 inline-block rounded-full bg-soft-gray-100 px-4 py-2 text-xs font-semibold uppercase text-slate-400 dark:bg-dracula-current dark:text-dracula-comment">
              Próximamente
            </span>
          </div>
        </div>
      </div>

      {/* Modal de Notificaciones */}
      {showModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl border border-white/70 bg-white/95 p-6 shadow-2xl dark:border-dracula-current dark:bg-dracula-bg/95">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl font-semibold text-slate-800 dark:text-dracula-foreground">
                Enviar Notificación Push
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-soft-gray-100 hover:text-slate-600 dark:text-dracula-comment dark:hover:bg-dracula-selection"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Mensajes rápidos */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-dracula-comment">
                  Mensajes rápidos
                </label>
                <div className="grid gap-2">
                  {quickMessages.map((msg, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        setTitle(msg.title)
                        setMessage(msg.message)
                      }}
                      className="rounded-xl border border-soft-gray-200/70 bg-white p-3 text-left text-xs transition hover:border-celeste-200 hover:bg-celeste-50/50 dark:border-dracula-current dark:bg-dracula-current dark:hover:border-dracula-purple dark:hover:bg-dracula-selection"
                    >
                      <p className="font-semibold text-slate-700 dark:text-dracula-foreground">{msg.title}</p>
                      <p className="mt-1 text-slate-500 dark:text-dracula-comment">{msg.message}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Título */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-dracula-comment">
                  Título de la notificación
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ej: ⚠️ Stock crítico en EPP"
                  className="w-full rounded-xl border border-soft-gray-200/70 bg-white px-4 py-3 text-sm text-slate-700 transition focus:border-celeste-300 focus:outline-none focus:ring-2 focus:ring-celeste-200/50 dark:border-dracula-current dark:bg-dracula-current dark:text-dracula-foreground"
                  maxLength={50}
                />
                <p className="mt-1 text-xs text-slate-400 dark:text-dracula-comment">
                  {title.length}/50 caracteres
                </p>
              </div>

              {/* Mensaje */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-dracula-comment">
                  Mensaje
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Escribe el mensaje que verán los usuarios..."
                  rows={4}
                  className="w-full rounded-xl border border-soft-gray-200/70 bg-white px-4 py-3 text-sm text-slate-700 transition focus:border-celeste-300 focus:outline-none focus:ring-2 focus:ring-celeste-200/50 dark:border-dracula-current dark:bg-dracula-current dark:text-dracula-foreground"
                  maxLength={150}
                />
                <p className="mt-1 text-xs text-slate-400 dark:text-dracula-comment">
                  {message.length}/150 caracteres
                </p>
              </div>

              {/* Botones */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 rounded-full border border-soft-gray-300 px-6 py-3 text-sm font-semibold text-slate-600 transition hover:bg-soft-gray-50 dark:border-dracula-current dark:text-dracula-comment dark:hover:bg-dracula-selection"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSendNotification}
                  className="flex flex-1 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:shadow-lg"
                >
                  <Send className="h-4 w-4" />
                  Enviar Notificación
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
