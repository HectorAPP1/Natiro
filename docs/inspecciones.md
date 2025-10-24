# Módulo de Inspecciones HSE

## Visión general
- Gestionar inspecciones de higiene, seguridad y medioambiente alineadas con ISO 45001, ISO 14001 y normativas chilenas (Ley 16.744, DS 594, DS 148, DS 67).
- Integrar planificación, ejecución, hallazgos y seguimiento de acciones correctivas con trazabilidad completa.
- Conectar con otros módulos HSE para mantener un control integral y coordinado.

## Submódulos y alcance

### Dashboard HSE
- Métricas inmediatas: inspecciones programadas, vencidas, cumplimiento de acciones, hallazgos críticos.
- Widgets por norma: ISO 45001 (seguridad), ISO 14001 (ambiental), DS 594 (higiene).
- Mapas de calor por planta/área y gráfico de tendencias trimestrales.

### Programación
- Calendario y cronograma con periodicidades (diaria, semanal, mensual, anual) asociadas a cada checklist.
- Biblioteca de plantillas alineadas a ISO 45001, ISO 14001 y normativa chilena (DS 594, DS 148, DS 67).
- Asignación de responsables, recordatorios automáticos y control de cumplimiento planificado.

### Ejecución en terreno
- Formulario responsive/offline con evidencia fotográfica, geolocalización y clasificación inmediata del hallazgo.
- Sección de observaciones por criterio normativo y recomendación inmediata de acciones.
- Captura de firmas digitales (inspector y supervisor de área) y sincronización en vivo.

### Hallazgos y acciones correctivas
- Registro centralizado de No Conformidades, Observaciones y Oportunidades de Mejora.
- Flujo 8D/PDCA: análisis causa raíz, plan de acción, implementación, verificación de eficacia.
- Vistas Kanban/lista con filtros por criticidad, estado, norma afectada y responsable.

### Reportes & Analytics
- Reportes audit-ready para ISO 45001/14001 y Ley 16.744 (PDF/Excel).
- KPIs: tasa de cumplimiento, reincidencia por área, plazos de cierre, indicadores ambientales.
- Generación de dashboards comparativos por planta, contratista, tipo de inspección.

### Configuración & permisos
- Gestión de roles HSE (Inspectores, Supervisores, Administradores) y acceso granular por módulo.
- Editor de plantillas/checklists versionado y multilenguaje.
- Definición de matrices de criticidad, intervalos de inspección y catálogos de hallazgos.

### Integraciones cruzadas
- Sincronización con `Riesgos` para ajustar la matriz según hallazgos críticos.
- Creación automática de incidentes o tareas en otros módulos (EPP, Documentos) cuando corresponda.
- Notificaciones vía `usePushNotifications` (app, mail, web) y hooks para webhooks externos.

## Hoja de ruta sugerida
1. Programación & plantillas.
2. Ejecución en terreno.
3. Hallazgos y acciones correctivas.
4. Dashboard HSE y reportes iniciales.
5. Integraciones y notificaciones.
6. Analítica avanzada y configuraciones finas.

## Próximos pasos inmediatos
- Diseñar wireframes de Dashboard HSE y Programación.
- Definir esquema de datos en Firestore (`inspectionPrograms`, `inspections`, `inspectionFindings`, `correctiveActions`, `templates`).
- Implementar hooks `useInspectionPrograms` y `useInspectionTemplates`.
- Conectar submódulo Programación a datos reales y formularios de alta/edición.
