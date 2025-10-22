import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import packageJson from "./package.json" assert { type: "json" };

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "prompt",
      includeAssets: [
        "icon-192x192.png",
        "icon-512x512.png",
        "apple-touch-icon.png",
        "splash-screen.png",
      ],
      manifest: {
        name: "Clodi App - Gestión de EPP",
        short_name: "Clodi App",
        description: "Sistema de gestión de Equipos de Protección Personal",
        theme_color: "#e0f2fe",
        background_color: "#ffffff",
        display: "standalone",
        orientation: "portrait",
        scope: "/",
        start_url: "/",
        icons: [
          {
            src: "/icon-192x192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any maskable",
          },
          {
            src: "/icon-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
          {
            src: "/apple-touch-icon.png",
            sizes: "180x180",
            type: "image/png",
            // ✅ La línea 'purpose' fue eliminada de aquí
          },
        ],
        screenshots: [
          {
            src: "/splash-screen.png",
            sizes: "540x720",
            type: "image/png",
            form_factor: "narrow",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff,woff2}"],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-cache",
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 año
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /^https:\/\/firebasestorage\.googleapis\.com\/.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "firebase-storage-cache",
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 7, // 1 semana
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
      devOptions: {
        enabled: true,
        type: "module",
      },
    }),
  ],
  define: {
    __APP_VERSION__: JSON.stringify(packageJson.version),
  },
  // ▼▼▼ ESTRATEGIA DE CHUNKS MÁS ESTABLE ▼▼▼
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Agrupa todas las dependencias de node_modules en un único chunk 'vendor'
          if (id.includes("node_modules")) {
            return "vendor";
          }
        },
      },
    },
  },
});
