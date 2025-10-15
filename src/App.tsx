import AppRouter from './routes/AppRouter'
import PWAUpdatePrompt from './components/PWAUpdatePrompt'
import NotificationPermission from './components/NotificationPermission'
import DynamicThemeColor from './components/DynamicThemeColor'

function App() {
  return (
    <>
      <DynamicThemeColor />
      <AppRouter />
      <PWAUpdatePrompt />
      <NotificationPermission />
    </>
  )
}

export default App
