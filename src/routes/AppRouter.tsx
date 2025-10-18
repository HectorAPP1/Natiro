import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import ProtectedLayout from '../layouts/ProtectedLayout.tsx'
import Login from '../pages/Login.tsx'
import EppDashboard from '../pages/EppDashboard.tsx'
import EppEntregas from '../pages/EppEntregas.tsx'
import Trabajadores from '../pages/Trabajadores.tsx'
import Configuracion from '../pages/Configuracion.tsx'
import Ajustes from '../pages/Ajustes.tsx'
import ComingSoon from '../pages/ComingSoon.tsx'

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<ProtectedLayout />}>
          <Route index element={<Navigate to="/epp" replace />} />
          <Route path="/epp" element={<EppDashboard />} />
          <Route path="/epp/entregas" element={<EppEntregas />} />
          <Route path="/trabajadores" element={<Trabajadores />} />
          <Route
            path="/inspecciones"
            element={<ComingSoon title="Inspecciones" moduleKey="inspecciones" />}
          />
          <Route
            path="/capacitaciones"
            element={<ComingSoon title="Capacitaciones" moduleKey="capacitaciones" />}
          />
          <Route
            path="/riesgos"
            element={<ComingSoon title="Gestión de riesgos" moduleKey="riesgos" />}
          />
          <Route
            path="/protocolos"
            element={<ComingSoon title="Protocolos HSE" moduleKey="protocolos" />}
          />
          <Route
            path="/reportes"
            element={<ComingSoon title="Reportes y analíticas" moduleKey="reportes" />}
          />
          <Route path="/ajustes" element={<Ajustes />} />
          <Route
            path="/configuracion"
            element={<Configuracion />}
          />
        </Route>
        <Route path="*" element={<Navigate to="/epp" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
