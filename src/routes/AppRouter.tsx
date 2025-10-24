import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import ProtectedLayout from '../layouts/ProtectedLayout.tsx'
import Login from '../pages/Login.tsx'
import EppDashboard from '../pages/EppDashboard.tsx'
import EppEntregas from '../pages/EppEntregas.tsx'
import Trabajadores from '../pages/Trabajadores.tsx'
import Configuracion from '../pages/Configuracion.tsx'
import Ajustes from '../pages/Ajustes.tsx'
import ComingSoon from '../pages/ComingSoon.tsx'
import Riesgos from '../pages/Riesgos.tsx'
import InspectionsPage from '../pages/inspecciones/InspectionsPage.tsx'
import InspectionsComingSoon from '../pages/inspecciones/InspectionsComingSoon.tsx'
import InspectionsProgramming from '../pages/inspecciones/InspectionsProgramming.tsx'

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
          <Route path="/inspecciones" element={<InspectionsPage />}>
            <Route index element={<InspectionsProgramming />} />
            <Route path="programacion" element={<InspectionsProgramming />} />
            <Route
              path="ejecucion"
              element={
                <InspectionsComingSoon
                  title="Ejecución en terreno"
                  moduleKey="inspecciones"
                />
              }
            />
            <Route
              path="hallazgos"
              element={
                <InspectionsComingSoon
                  title="Hallazgos y acciones"
                  moduleKey="inspecciones"
                />
              }
            />
            <Route
              path="reportes"
              element={
                <InspectionsComingSoon
                  title="Reportes & analytics"
                  moduleKey="inspecciones"
                />
              }
            />
            <Route
              path="automatizaciones"
              element={
                <InspectionsComingSoon
                  title="Automatizaciones & integraciones"
                  moduleKey="inspecciones"
                />
              }
            />
          </Route>
          <Route
            path="/capacitaciones"
            element={<ComingSoon title="Capacitaciones" moduleKey="capacitaciones" />}
          />
          <Route path="/riesgos" element={<Riesgos />} />
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
