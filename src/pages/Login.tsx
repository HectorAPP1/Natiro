import { useState } from 'react'
import type { CSSProperties, FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'
import {
  AlertTriangle,
  Eye,
  EyeOff,
  HardHat,
  LifeBuoy,
  Loader2,
  ShieldCheck,
  Wrench
} from 'lucide-react'
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

  const variantClassMap = {
    primary: 'floating-icon text-slate-300/35',
    alt: 'floating-icon-alt text-slate-300/30',
    ghost: 'floating-icon-ghost text-slate-200/55'
  } as const

  type FloatingIconSpec = {
    Icon: LucideIcon
    variant: keyof typeof variantClassMap
    size: number
    duration: string
    delay: string
    top?: string
    left?: string
    right?: string
    bottom?: string
    floatX?: string
    floatY?: string
    opacity?: number
  }

  const floatingIcons: FloatingIconSpec[] = [
    {
      Icon: HardHat,
      variant: 'primary',
      size: 76,
      duration: '24s',
      delay: '0s',
      top: '10%',
      left: '6%',
      floatX: '52px',
      floatY: '-34px',
      opacity: 0.32
    },
    {
      Icon: ShieldCheck,
      variant: 'alt',
      size: 64,
      duration: '28s',
      delay: '-4s',
      top: '14%',
      right: '10%',
      floatX: '-46px',
      floatY: '28px',
      opacity: 0.28
    },
    {
      Icon: Wrench,
      variant: 'primary',
      size: 58,
      duration: '26s',
      delay: '-6s',
      bottom: '18%',
      left: '8%',
      floatX: '40px',
      floatY: '26px',
      opacity: 0.26
    },
    {
      Icon: AlertTriangle,
      variant: 'alt',
      size: 52,
      duration: '32s',
      delay: '-2s',
      bottom: '12%',
      right: '14%',
      floatX: '-32px',
      floatY: '-22px',
      opacity: 0.24
    },
    {
      Icon: LifeBuoy,
      variant: 'ghost',
      size: 60,
      duration: '34s',
      delay: '-10s',
      top: '20%',
      left: '38%',
      floatX: '48px',
      floatY: '-30px',
      opacity: 0.22
    },
    {
      Icon: HardHat,
      variant: 'ghost',
      size: 88,
      duration: '36s',
      delay: '-12s',
      top: '4%',
      right: '32%',
      floatX: '-60px',
      floatY: '36px',
      opacity: 0.2
    },
    {
      Icon: ShieldCheck,
      variant: 'primary',
      size: 44,
      duration: '22s',
      delay: '-8s',
      top: '38%',
      left: '18%',
      floatX: '32px',
      floatY: '-24px',
      opacity: 0.34
    },
    {
      Icon: Wrench,
      variant: 'alt',
      size: 48,
      duration: '27s',
      delay: '-14s',
      bottom: '30%',
      right: '22%',
      floatX: '-36px',
      floatY: '24px',
      opacity: 0.3
    },
    {
      Icon: AlertTriangle,
      variant: 'ghost',
      size: 40,
      duration: '30s',
      delay: '-18s',
      top: '46%',
      right: '12%',
      floatX: '-28px',
      floatY: '30px',
      opacity: 0.1
    },
    {
      Icon: LifeBuoy,
      variant: 'primary',
      size: 50,
      duration: '25s',
      delay: '-20s',
      bottom: '8%',
      left: '30%',
      floatX: '40px',
      floatY: '-18px',
      opacity: 0.16
    },
    {
      Icon: HardHat,
      variant: 'alt',
      size: 46,
      duration: '29s',
      delay: '-16s',
      top: '62%',
      left: '10%',
      floatX: '28px',
      floatY: '18px',
      opacity: 0.15
    },
    {
      Icon: ShieldCheck,
      variant: 'ghost',
      size: 56,
      duration: '33s',
      delay: '-24s',
      bottom: '18%',
      right: '38%',
      floatX: '-52px',
      floatY: '-24px',
      opacity: 0.21
    },
    {
      Icon: Wrench,
      variant: 'primary',
      size: 42,
      duration: '31s',
      delay: '-26s',
      top: '32%',
      right: '28%',
      floatX: '-34px',
      floatY: '22px',
      opacity: 0.18
    },
    {
      Icon: AlertTriangle,
      variant: 'primary',
      size: 36,
      duration: '23s',
      delay: '-30s',
      bottom: '6%',
      right: '6%',
      floatX: '-24px',
      floatY: '32px',
      opacity: 0.16
    }
  ]

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-soft-gray-50 px-4">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {floatingIcons.map((spec, index) => {
          const { Icon, variant, size, duration, delay, top, right, bottom, left, floatX, floatY, opacity } = spec
          const style: (CSSProperties & {
            '--float-x'?: string
            '--float-y'?: string
            '--float-opacity'?: number
          }) = {
            width: size,
            height: size,
            animationDuration: duration,
            animationDelay: delay,
            top,
            right,
            bottom,
            left,
            '--float-x': floatX,
            '--float-y': floatY,
            '--float-opacity': opacity
          }

          return (
            <Icon
              key={`${Icon.displayName ?? Icon.name}-${index}`}
              className={`${variantClassMap[variant]}`}
              style={style}
            />
          )
        })}
      </div>
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
            className={`relative flex w-full items-center justify-center overflow-hidden rounded-xl py-2.5 text-sm font-semibold text-slate-800 shadow-sm transition active:scale-[0.98]
              ${submitting
                ? 'bg-gradient-to-r from-mint-300 via-celeste-300 to-mint-200'
                : 'bg-mint-300 hover:bg-mint-200'}`}
          >
            {submitting ? (
              <>
                <span className="absolute inset-0 animate-pulse bg-white/30" />
                <span className="relative flex items-center gap-2 text-slate-800">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Conectando...
                </span>
              </>
            ) : (
              <span className="relative">Ingresar</span>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
