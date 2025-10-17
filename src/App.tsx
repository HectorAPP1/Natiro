import AppRouter from './routes/AppRouter'
import PWAUpdatePrompt from './components/PWAUpdatePrompt'
import NotificationPermission from './components/NotificationPermission'
import DynamicThemeColor from './components/DynamicThemeColor'
import PWAInstallPrompt from './components/PWAInstallPrompt'

function App() {
  return (
    <>
      <DynamicThemeColor />
      <AppRouter />
      <PWAUpdatePrompt />
      <PWAInstallPrompt />
      <NotificationPermission />
    </>
  )
}

export default App
