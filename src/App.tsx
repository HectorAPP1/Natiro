import AppRouter from './routes/AppRouter'
import PWAUpdatePrompt from './components/PWAUpdatePrompt'
import NotificationPermission from './components/NotificationPermission'
import DynamicThemeColor from './components/DynamicThemeColor'
import TestNotification from './components/TestNotification'

function App() {
  return (
    <>
      <DynamicThemeColor />
      <AppRouter />
      <PWAUpdatePrompt />
      <NotificationPermission />
      <TestNotification />
    </>
  )
}

export default App
