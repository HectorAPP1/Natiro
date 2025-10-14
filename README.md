# 🛡️ Natiro - Sistema de Gestión HSE

<div align="center">

![React](https://img.shields.io/badge/React-19.2-61DAFB?style=for-the-badge&logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-11.1-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)
![TailwindCSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)

**Sistema completo de gestión de Equipos de Protección Personal (EPP) con tecnología QR y sincronización en tiempo real**

[Demo](#) • [Documentación](#características) • [Instalación](#instalación)

</div>

---

## 📋 Tabla de Contenidos

- [Características](#características)
- [Tecnologías](#tecnologías)
- [Instalación](#instalación)
- [Configuración](#configuración)
- [Uso](#uso)
- [Estructura del Proyecto](#estructura-del-proyecto)
- [Roadmap](#roadmap)

---

## ✨ Características

### 🎯 Gestión de EPP

- ✅ **CRUD Completo**: Crear, leer, actualizar y eliminar EPP
- ✅ **Multi-talla**: Gestión de stock por tallas individuales
- ✅ **Validación Inteligente**: Stock crítico no puede superar stock mínimo
- ✅ **Estados**: Vigente/Discontinuado con indicadores visuales
- ✅ **Archivos Adjuntos**: Fotos, fichas técnicas y certificados en base64
- ✅ **Precios en CLP**: Cálculo automático del valor total del inventario

### 🔍 Búsqueda y Filtros

- 🔎 Búsqueda por nombre o código EPP
- 📂 Filtro por categoría (9 categorías HSE)
- 🏷️ Filtro por estado (Vigente/Discontinuado)
- 📄 Paginación (20 items por página)

### 📊 Dashboard y Reportes

- 📈 Tarjetas con métricas en tiempo real:
  - Total de registros
  - Unidades disponibles
  - EPP en nivel crítico
  - **Valor total del inventario**
- 📥 **Exportación a Excel** con todos los datos (excepto archivos)
- 🎨 Indicadores de stock con colores:
  - 🟢 Normal
  - 🟡 Mínimo
  - 🔴 Crítico

### 📱 Sistema QR

#### Escanear QR (Modo Bodega)
- 📷 Escaneo con cámara del dispositivo
- ➕➖ Ajuste rápido de stock con botones +/-
- 💾 Actualización instantánea en Firestore
- 📦 Compatible con talla única y multi-talla

#### Generar QR
- 🏷️ Generación de códigos QR por EPP
- 📂 Filtro por categoría
- ⬇️ Descarga individual o masiva
- 🖨️ Listo para imprimir y pegar en bodega

### 🔐 Autenticación

- 🔑 Login con Firebase Authentication
- 👤 Gestión de sesiones
- 🛡️ Rutas protegidas

### ⚡ Sincronización en Tiempo Real

- 🔄 Firestore con listeners en tiempo real
- 🚀 Actualizaciones instantáneas entre dispositivos
- 📊 Índices compuestos para queries optimizadas

---

## 🛠️ Tecnologías

### Frontend
- **React 19** - Librería UI
- **TypeScript** - Tipado estático
- **Vite** - Build tool ultrarrápido
- **TailwindCSS** - Estilos utility-first
- **Lucide React** - Iconos modernos

### Backend & Database
- **Firebase Authentication** - Autenticación de usuarios
- **Cloud Firestore** - Base de datos NoSQL en tiempo real
- **Firebase Hosting** - Hosting (opcional)

### Librerías Especializadas
- **html5-qrcode** - Escaneo de códigos QR
- **qrcode** - Generación de códigos QR
- **xlsx** - Exportación a Excel

---

## 🚀 Instalación

### Prerrequisitos

- Node.js 18+ 
- npm o yarn
- Cuenta de Firebase

### Pasos

1. **Clonar el repositorio**
```bash
git clone https://github.com/HectorAPP1/Natiro.git
cd Natiro
```

2. **Instalar dependencias**
```bash
npm install
```

3. **Configurar variables de entorno**

Crea un archivo `.env` en la raíz del proyecto:

```env
VITE_FIREBASE_API_KEY=tu_api_key
VITE_FIREBASE_AUTH_DOMAIN=tu_auth_domain
VITE_FIREBASE_PROJECT_ID=tu_project_id
VITE_FIREBASE_STORAGE_BUCKET=tu_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=tu_sender_id
VITE_FIREBASE_APP_ID=tu_app_id
VITE_FIREBASE_MEASUREMENT_ID=tu_measurement_id
```

4. **Configurar Firestore**

```bash
# Iniciar sesión en Firebase
firebase login

# Desplegar reglas e índices
firebase deploy --only firestore:rules,firestore:indexes
```

5. **Iniciar servidor de desarrollo**
```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:5173`

---

## ⚙️ Configuración

### Reglas de Firestore

Las reglas de seguridad están en `firestore.rules`:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /epp/{document} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### Índices Compuestos

Los índices están definidos en `firestore.indexes.json` para optimizar queries con múltiples filtros.

---

## 📖 Uso

### 1. Registrar un EPP

1. Clic en **"Añadir EPP"**
2. Completar formulario:
   - Información básica (nombre, categoría, marca, precio)
   - Gestión de stock (talla única o multi-talla)
   - Archivos opcionales (foto, ficha técnica, certificados)
3. Guardar

### 2. Editar Stock con QR

1. Clic en **"Gestión QR"** → **"Escanear QR"**
2. Permitir acceso a cámara
3. Escanear código QR del EPP
4. Ajustar stock con botones +/-
5. Guardar cambios

### 3. Generar Códigos QR

1. Clic en **"Gestión QR"** → **"Generar QR"**
2. Filtrar por categoría (opcional)
3. Descargar QR individuales o todos
4. Imprimir y pegar en bodega

### 4. Exportar a Excel

1. Clic en **"Exportar Excel"**
2. Se descarga archivo `Inventario_EPP_YYYY-MM-DD.xlsx`
3. Incluye todos los datos excepto archivos adjuntos

---

## 📁 Estructura del Proyecto

```
Natiro/
├── src/
│   ├── components/          # Componentes reutilizables (futuro)
│   ├── context/
│   │   └── AuthContext.tsx  # Contexto de autenticación
│   ├── hooks/
│   │   └── useEppFirestore.ts  # Hook para CRUD de EPP
│   ├── layouts/
│   │   └── ProtectedLayout.tsx  # Layout con rutas protegidas
│   ├── lib/
│   │   └── firebase.ts      # Configuración de Firebase
│   ├── pages/
│   │   ├── EppDashboard.tsx # Dashboard principal
│   │   ├── QRManager.tsx    # Gestión de códigos QR
│   │   ├── Login.tsx        # Página de login
│   │   └── ComingSoon.tsx   # Placeholder para módulos futuros
│   ├── routes/
│   │   └── AppRouter.tsx    # Configuración de rutas
│   └── main.tsx             # Punto de entrada
├── firestore.rules          # Reglas de seguridad
├── firestore.indexes.json   # Índices compuestos
├── firebase.json            # Configuración de Firebase
└── package.json
```

---

## 🗺️ Roadmap

### ✅ Fase 1 - Gestión de EPP (Completado)
- [x] CRUD completo de EPP
- [x] Sistema de tallas
- [x] Búsqueda y filtros
- [x] Exportación a Excel
- [x] Sistema QR completo

### 🚧 Fase 2 - Gestión de Entregas (Próximamente)
- [ ] Módulo de empleados
- [ ] Entrega de EPP con QR
- [ ] Historial de entregas
- [ ] Firma digital
- [ ] Notificaciones de vencimiento

### 📅 Fase 3 - Reportes Avanzados
- [ ] Dashboard de analíticas
- [ ] Reportes personalizables
- [ ] Gráficos de consumo
- [ ] Predicción de necesidades
- [ ] Exportación PDF

### 🔮 Fase 4 - Integraciones
- [ ] API REST
- [ ] Integración con ERP
- [ ] App móvil nativa
- [ ] Notificaciones push
- [ ] Sincronización offline

---

## 🤝 Contribuir

Las contribuciones son bienvenidas. Por favor:

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add: AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

---

## 📄 Licencia

Este proyecto es privado y de uso exclusivo para Natiro.

---

## 👨‍💻 Autor

**Héctor Valdés**
- GitHub: [@HectorAPP1](https://github.com/HectorAPP1)

---

## 🙏 Agradecimientos

- Firebase por la infraestructura backend
- Lucide por los iconos
- TailwindCSS por el sistema de diseño
- Comunidad de React por las mejores prácticas

---

<div align="center">

**Hecho con ❤️ para mejorar la seguridad laboral**

[⬆ Volver arriba](#-natiro---sistema-de-gestión-hse)

</div>
