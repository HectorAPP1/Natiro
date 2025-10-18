import { Moon, Sun } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'

export default function ThemeToggle() {
  const { theme, preference, setPreference, toggleTheme } = useTheme()

  const handleClick = () => {
    if (preference === 'system') {
      setPreference(theme === 'light' ? 'dark' : 'light')
      return
    }
    toggleTheme()
  }

  return (
    <button
      onClick={handleClick}
      className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-soft-gray-200/70 bg-white/80 text-slate-600 shadow-sm transition hover:border-celeste-300 hover:bg-celeste-50 dark:border-dracula-current dark:bg-dracula-current dark:text-dracula-cyan dark:hover:border-dracula-purple dark:hover:bg-dracula-bg"
      aria-label="Toggle theme"
      title={
        preference === 'system'
          ? 'Tema automático (sigue el sistema)'
          : theme === 'light'
          ? 'Cambiar a modo oscuro'
          : 'Cambiar a modo claro'
      }
    >
      {theme === 'light' ? (
        <Moon className="h-5 w-5" />
      ) : (
        <Sun className="h-5 w-5" />
      )}
    </button>
  )
}
