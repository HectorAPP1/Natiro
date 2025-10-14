import { useState } from 'react'
import type { FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
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
          <span className="inline-flex items-center justify-center rounded-full bg-mint-100 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-celeste-300">
            Natiro HSE
          </span>
          <h1 className="mt-4 text-2xl font-semibold text-slate-800">Ingreso al portal</h1>
          <p className="mt-2 text-sm text-slate-500">
            Utiliza tu correo corporativo para acceder al módulo de EPP.
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
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-2 w-full rounded-xl border border-soft-gray-200 bg-soft-gray-50 px-4 py-2.5 text-sm text-slate-700 shadow-inner focus:border-celeste-200 focus:outline-none focus:ring-2 focus:ring-celeste-200"
              placeholder="••••••••"
            />
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
