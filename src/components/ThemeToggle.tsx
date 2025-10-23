import { Moon, Sun } from 'lucide-react'
import { useMemo } from 'react'
import { useTheme } from '../context/ThemeContext'

export default function ThemeToggle() {
  const { theme, preference, setPreference, toggleTheme } = useTheme()

  const isDark = theme === 'dark'

  const title = useMemo(() => {
    if (preference === 'system') {
      return 'Tema automático (sigue el sistema)'
    }
    return theme === 'light' ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro'
  }, [preference, theme])

  const handleToggle = () => {
    if (preference === 'system') {
      setPreference(theme === 'light' ? 'dark' : 'light')
      return
    }
    toggleTheme()
  }

  return (
    <label className="theme-toggle" title={title} aria-label={title}>
      <span className="sr-only">Cambiar tema</span>
      <input
        type="checkbox"
        className="theme-toggle__input"
        checked={isDark}
        onChange={handleToggle}
      />
      <div className="theme-toggle__track">
        <Sun className="theme-toggle__icon theme-toggle__icon--sun theme-toggle__icon--inactive" />
        <Moon className="theme-toggle__icon theme-toggle__icon--moon theme-toggle__icon--inactive" />
      </div>
      <div className="theme-toggle__thumb">
        <Sun className="theme-toggle__thumb-icon theme-toggle__thumb-icon--sun" />
        <Moon className="theme-toggle__thumb-icon theme-toggle__thumb-icon--moon" />
      </div>
    </label>
  )
}
