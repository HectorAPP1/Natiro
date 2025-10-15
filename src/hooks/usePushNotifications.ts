import { useState, useEffect } from 'react'

export function usePushNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [isSupported, setIsSupported] = useState(false)

  useEffect(() => {
    // Verificar si las notificaciones están soportadas
    if ('Notification' in window) {
      setIsSupported(true)
      setPermission(Notification.permission)
    }
  }, [])

  const requestPermission = async () => {
    if (!isSupported) {
      console.log('Las notificaciones no están soportadas en este navegador')
      return false
    }

    try {
      const result = await Notification.requestPermission()
      setPermission(result)
      return result === 'granted'
    } catch (error) {
      console.error('Error al solicitar permisos de notificación:', error)
      return false
    }
  }

  const sendNotification = (title: string, options?: NotificationOptions) => {
    if (permission !== 'granted') {
      console.log('No hay permisos para enviar notificaciones')
      return
    }

    try {
      // Si hay un service worker registrado, usar showNotification
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.ready.then((registration) => {
          registration.showNotification(title, {
            icon: '/icon-192x192.png',
            badge: '/icon-192x192.png',
            ...options,
          })
        })
      } else {
        // Fallback a Notification API directa
        new Notification(title, {
          icon: '/icon-192x192.png',
          ...options,
        })
      }
    } catch (error) {
      console.error('Error al enviar notificación:', error)
    }
  }

  return {
    permission,
    isSupported,
    requestPermission,
    sendNotification,
  }
}
