import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowLeft,
  HardHat,
  Layers,
  Settings,
  ShieldCheck,
  Users,
} from 'lucide-react'

const moduleIcons = {
  inspecciones: Layers,
  capacitaciones: Users,
  riesgos: AlertTriangle,
  protocolos: ShieldCheck,
  reportes: Layers,
  configuracion: Settings,
} as const

type ComingSoonProps = {
  title: string
  moduleKey: keyof typeof moduleIcons
  description?: string
}

export default function ComingSoon({ title, moduleKey, description }: ComingSoonProps) {
  const Icon = moduleIcons[moduleKey] ?? HardHat

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6">
      <div className="relative rounded-[32px] border border-white/80 bg-white/90 px-10 py-12 text-center shadow-[0_30px_60px_-40px_rgba(15,23,42,0.4)] backdrop-blur">
        <span className="absolute -top-6 right-10 inline-flex items-center gap-2 rounded-full bg-celeste-100/70 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.3em] text-celeste-400">
          <AlertTriangle className="h-4 w-4" />
          En construcción
        </span>
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-mint-100/80 text-celeste-300">
          <Icon className="h-8 w-8" />
        </div>
        <h1 className="mt-6 text-3xl font-semibold text-slate-800">{title}</h1>
        <p className="mt-3 max-w-md text-sm text-slate-500">
          {description ?? 'Estamos trabajando para habilitar este módulo muy pronto. Mientras tanto, puedes revisar la gestión de EPP o regresar al panel principal.'}
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3 text-sm font-semibold">
          <Link
            to="/epp"
            className="inline-flex items-center gap-2 rounded-full border border-mint-200/80 bg-white/80 px-5 py-2 text-slate-700 transition hover:border-mint-200 hover:bg-white"
          >
            <HardHat className="h-4 w-4" />
            Ir a módulo EPP
          </Link>
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-full border border-celeste-200/80 bg-white/80 px-5 py-2 text-slate-700 transition hover:border-celeste-200 hover:bg-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  )
}
