import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, type User } from 'firebase/auth'
import { auth } from '../lib/firebase'

type SignInParams = {
  email: string
  password: string
}

type AuthContextValue = {
  user: User | null
  loading: boolean
  signIn: (params: SignInParams) => Promise<void>
  signOutUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser)
      setLoading(false)
    })

    return unsubscribe
  }, [])

  const signIn = async ({ email, password }: SignInParams) => {
    await signInWithEmailAndPassword(auth, email, password)
  }

  const signOutUser = async () => {
    await signOut(auth)
  }

  const value = useMemo(
    () => ({
      user,
      loading,
      signIn,
      signOutUser,
    }),
    [user, loading],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider')
  }

  return context
}
