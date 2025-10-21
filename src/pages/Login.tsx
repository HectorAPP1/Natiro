import { useState } from 'react'
import type { FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

type LocationState = {
  from?: {
    pathname?: string
  }
}

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [passwordVisible, setPasswordVisible] = useState(false)

  const navigate = useNavigate()
  const location = useLocation()
  const { signIn } = useAuth()

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setSubmitting(true)

    try {
      await signIn({ email, password })
      const state = location.state as LocationState | undefined
      const redirectTo = state?.from?.pathname ?? '/epp'
      navigate(redirectTo, { replace: true })
    } catch (signInError) {
      setError('No pudimos iniciar sesión. Verifica tus credenciales.')
      console.error(signInError)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-soft-gray-50 px-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-xl ring-1 ring-soft-gray-100">
        <div className="mb-8 text-center">
          <div className="flex justify-center">
            <img
              src="/IsoLogo Clodi Light.png"
              alt="Clodi"
              className="h-12 w-auto drop-shadow-sm"
              loading="lazy"
            />
          </div>
          <p className="mt-4 text-sm text-slate-500">
            Accede con tu correo corporativo y opera en la app.
          </p>
        </div>
        <form className="space-y-5" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm font-medium text-slate-600" htmlFor="email">
              Correo electrónico
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-2 w-full rounded-xl border border-soft-gray-200 bg-soft-gray-50 px-4 py-2.5 text-sm text-slate-700 shadow-inner focus:border-celeste-200 focus:outline-none focus:ring-2 focus:ring-celeste-200"
              placeholder="tu.usuario@empresa.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600" htmlFor="password">
              Contraseña
            </label>
            <div className="relative mt-2">
              <input
                id="password"
                type={passwordVisible ? 'text' : 'password'}
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-xl border border-soft-gray-200 bg-soft-gray-50 px-4 py-2.5 pr-10 text-sm text-slate-700 shadow-inner focus:border-celeste-200 focus:outline-none focus:ring-2 focus:ring-celeste-200"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setPasswordVisible((visible) => !visible)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"
                aria-label={passwordVisible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {passwordVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          {error ? (
            <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">{error}</p>
          ) : null}
          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center justify-center rounded-xl bg-mint-300 py-2.5 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-mint-200 disabled:opacity-60"
          >
            {submitting ? 'Ingresando…' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  )
}
