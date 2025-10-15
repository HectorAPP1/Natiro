import AppRouter from './routes/AppRouter'
import PWAUpdatePrompt from './components/PWAUpdatePrompt'
import NotificationPermission from './components/NotificationPermission'

function App() {
  return (
    <>
      <AppRouter />
      <PWAUpdatePrompt />
      <NotificationPermission />
    </>
  )
}

export default App
