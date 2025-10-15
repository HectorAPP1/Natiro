import { Bell } from 'lucide-react'
import { usePushNotifications } from '../hooks/usePushNotifications'

export default function TestNotification() {
  const { permission, requestPermission, sendNotification } = usePushNotifications()

  const handleTestNotification = async () => {
    if (permission !== 'granted') {
      const granted = await requestPermission()
      if (!granted) {
        alert('Necesitas activar las notificaciones primero')
        return
      }
    }

    // Enviar notificación de prueba
    sendNotification('⚠️ Stock crítico en EPP', {
      body: 'Tienes 3 equipos con stock bajo. Abre Clodi App para revisar tu inventario.',
      tag: 'test-notification',
      requireInteraction: true,
      data: {
        url: window.location.origin + '/epp',
        action: 'open-app'
      }
    })

    alert('¡Notificación enviada! Cierra o minimiza la app para verla.')
  }

  return (
    <div className="fixed bottom-20 right-4 z-[150]">
      <button
        onClick={handleTestNotification}
        className="flex items-center gap-2 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 px-4 py-3 text-sm font-semibold text-white shadow-lg transition hover:shadow-xl"
        title="Probar notificación push"
      >
        <Bell className="h-5 w-5" />
        <span className="hidden sm:inline">Probar Notificación</span>
      </button>
    </div>
  )
}
