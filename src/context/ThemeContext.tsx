import { createContext, useContext, useEffect, useMemo, useState } from 'react'

type Theme = 'light' | 'dark'
type ThemePreference = 'system' | Theme

type ThemeContextType = {
  theme: Theme
  preference: ThemePreference
  setPreference: (preference: ThemePreference) => void
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

const THEME_STORAGE_KEY = 'theme'
const THEME_PREF_KEY = 'theme_preference'

const getSystemTheme = (): Theme =>
  window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [preference, setPreference] = useState<ThemePreference>(() => {
    const storedPreference = localStorage.getItem(THEME_PREF_KEY) as ThemePreference | null
    if (storedPreference === 'system' || storedPreference === 'light' || storedPreference === 'dark') {
      return storedPreference
    }
    return 'system'
  })

  const [theme, setTheme] = useState<Theme>(() => {
    const storedTheme = localStorage.getItem(THEME_STORAGE_KEY) as Theme | null
    if (storedTheme === 'light' || storedTheme === 'dark') {
      return storedTheme
    }
    if (preference === 'system') {
      return getSystemTheme()
    }
    return preference
  })

  useEffect(() => {
    if (preference === 'system') {
      const systemTheme = getSystemTheme()
      setTheme(systemTheme)

      const listener = (event: MediaQueryListEvent) => {
        setTheme(event.matches ? 'dark' : 'light')
      }

      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      mediaQuery.addEventListener('change', listener)
      return () => mediaQuery.removeEventListener('change', listener)
    }

    setTheme(preference)
  }, [preference])

  useEffect(() => {
    const root = document.documentElement

    if (theme === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }

    localStorage.setItem(THEME_STORAGE_KEY, theme)
  }, [theme])

  useEffect(() => {
    localStorage.setItem(THEME_PREF_KEY, preference)
  }, [preference])

  const toggleTheme = () => {
    setPreference((prev) => {
      if (prev === 'system') {
        return theme === 'light' ? 'dark' : 'light'
      }
      return prev === 'light' ? 'dark' : 'light'
    })
  }

  const value = useMemo<ThemeContextType>(
    () => ({
      theme,
      preference,
      setPreference,
      toggleTheme,
    }),
    [theme, preference]
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider')
  }
  return context
}
