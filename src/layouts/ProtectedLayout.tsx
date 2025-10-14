import { useState } from 'react'
import { Navigate, NavLink, Outlet, useLocation } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'
import {
  AlertTriangle,
  ClipboardCheck,
  HardHat,
  ChevronsLeft,
  ChevronsRight,
  Layers,
  Menu,
  Settings,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function ProtectedLayout() {
  const { user, loading, signOutUser } = useAuth()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [desktopCollapsed, setDesktopCollapsed] = useState(false)

  type NavigationItem = {
    label: string
    icon: LucideIcon
    to: string
    soon?: boolean
  }

  const navigation: NavigationItem[] = [
    { label: 'Epp', to: '/epp', icon: HardHat },
    { label: 'Inspecciones', to: '/inspecciones', icon: ClipboardCheck, soon: true },
    { label: 'Capacitaciones', to: '/capacitaciones', icon: Users, soon: true },
    { label: 'Riesgos', to: '/riesgos', icon: AlertTriangle, soon: true },
    { label: 'Protocolos', to: '/protocolos', icon: ShieldCheck, soon: true },
    { label: 'Reportes', to: '/reportes', icon: Layers, soon: true },
    { label: 'Configuración', to: '/configuracion', icon: Settings, soon: true },
  ]

  const renderNavigation = (onNavigate?: () => void) =>
    navigation.map((item) => {
      const Icon = item.icon

      return (
        <NavLink
          key={item.label}
          to={item.to}
          onClick={onNavigate}
          className={({ isActive }) =>
            `group flex items-center rounded-2xl border py-3 text-sm font-semibold transition-all ${
              desktopCollapsed ? 'justify-center px-3' : 'gap-4 px-6'
            } ${
              isActive
                ? 'border-mint-200/80 bg-white text-slate-800 shadow-sm'
                : 'border-transparent text-slate-600 hover:border-celeste-200/60 hover:bg-white/80 hover:text-slate-700'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <Icon
                className={`h-6 w-6 flex-shrink-0 transition-colors duration-200 ${
                  isActive
                    ? 'text-celeste-400'
                    : 'text-slate-600 group-hover:text-celeste-300'
                }`}
              />
              {desktopCollapsed ? null : (
                <>
                  <span className={`flex-1 text-left ${isActive ? 'text-slate-800' : 'text-slate-700'}`}>
                    {item.label}
                  </span>
                  {item.soon ? (
                    <span className="ml-auto rounded-full bg-soft-gray-100 px-2 py-0.5 text-[11px] font-semibold uppercase text-slate-400">
                      Próximamente
                    </span>
                  ) : null}
                </>
              )}
            </>
          )}
        </NavLink>
      )
    })

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-soft-gray-50">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-mint-300" />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-soft-gray-50 via-celeste-100/30 to-soft-gray-50">
      <aside
        className={`hidden flex-col justify-between border-r border-soft-gray-200/70 bg-white/85 py-10 shadow-sm backdrop-blur lg:flex ${
          desktopCollapsed ? 'w-24 px-4' : 'w-80 px-8 xl:w-[23rem]'
        }`}
      >
        <div className="space-y-8">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-mint-100 px-3 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-celeste-300">
              <HardHat className="h-4 w-4 text-mint-300" />
              {desktopCollapsed ? null : 'Natiro HSE · Epp'}
            </span>
            {desktopCollapsed ? null : (
              <p className="mt-4 text-sm text-slate-500">Gestión integral de seguridad y equipos de protección.</p>
            )}
          </div>
          <nav className="space-y-2">{renderNavigation()}</nav>
        </div>
        {desktopCollapsed ? null : (
          <div className="rounded-2xl border border-white/70 bg-white/80 px-4 py-3 text-xs text-slate-500 shadow-sm backdrop-blur">
            <p className="font-semibold text-slate-600">Centro de ayuda</p>
            <p className="mt-1 leading-relaxed">
              Capacita a tu equipo en buenas prácticas HSE y mantén tu inventario de EPP actualizado.
            </p>
          </div>
        )}
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-soft-gray-200/70 bg-white/80 px-6 py-4 shadow-sm backdrop-blur">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-soft-gray-200/80 text-slate-600 transition hover:border-celeste-200 hover:text-slate-800 lg:hidden"
              onClick={() => setSidebarOpen(true)}
              aria-label="Abrir menú de navegación"
            >
              <Menu className="h-5 w-5" />
            </button>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-celeste-300">
              Natiro HSE · Epp
            </p>
            <h1 className="text-lg font-semibold text-slate-700">Gestión de EPP</h1>
          </div>
          <div className="flex items-center gap-4">
            <button
              type="button"
              className="hidden h-10 w-10 items-center justify-center rounded-full border border-soft-gray-200/80 text-slate-600 transition hover:border-celeste-200 hover:text-slate-800 lg:inline-flex"
              onClick={() => setDesktopCollapsed((value) => !value)}
              aria-label={desktopCollapsed ? 'Expandir panel lateral' : 'Colapsar panel lateral'}
            >
              {desktopCollapsed ? <ChevronsRight className="h-5 w-5" /> : <ChevronsLeft className="h-5 w-5" />}
            </button>
            <div className="hidden items-center gap-3 rounded-full border border-white/70 bg-soft-gray-100/80 px-4 py-2 text-sm text-slate-600 sm:flex">
              <span className="font-medium">{user?.email}</span>
            </div>
            <button
              onClick={signOutUser}
              className="rounded-full border border-soft-gray-200/80 px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:border-celeste-200 hover:text-slate-800"
            >
              Cerrar sesión
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto px-6 py-10">
          <Outlet />
        </main>
      </div>

      {sidebarOpen ? (
        <div className="fixed inset-0 z-40 flex lg:hidden">
          <div
            className="absolute inset-0 bg-slate-900/40"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
          <div className="relative h-full w-80 max-w-full border-r border-soft-gray-200/70 bg-white/90 px-7 py-9 shadow-xl backdrop-blur sm:w-96">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-2 rounded-full bg-mint-100 px-3 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-celeste-300">
                <HardHat className="h-4 w-4 text-mint-300" />
                Natiro HSE · Epp
              </span>
              <button
                type="button"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-soft-gray-200/80 text-slate-600 transition hover:border-celeste-200 hover:text-slate-800"
                onClick={() => setSidebarOpen(false)}
                aria-label="Cerrar menú de navegación"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-8 space-y-2">{renderNavigation(() => setSidebarOpen(false))}</div>
            <div className="mt-10 rounded-2xl border border-white/70 bg-white/80 px-4 py-3 text-xs text-slate-500 shadow-sm">
              <p className="font-semibold text-slate-600">Centro de ayuda</p>
              <p className="mt-1 leading-relaxed">
                Capacita a tu equipo en buenas prácticas HSE y mantén tu inventario de EPP actualizado.
              </p>
            </div>
          </div>
        </div>
      ) : null}

    </div>
  )
}
