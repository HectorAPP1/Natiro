import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

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
            purpose: "apple touch icon",
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
  // ▼▼▼ BLOQUE DE OPTIMIZACIÓN COMPLETO ▼▼▼
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Crea un chunk para el core de React
          if (
            id.includes("react-router-dom") ||
            id.includes("react-dom") ||
            id.includes("react")
          ) {
            return "react-core";
          }
          // Crea chunks dedicados para las librerías más pesadas
          if (id.includes("firebase")) {
            return "firebase";
          }
          if (id.includes("pdf-lib")) {
            return "pdf-lib";
          }
          if (id.includes("recharts")) {
            return "recharts";
          }
          if (id.includes("xlsx")) {
            return "xlsx";
          }
          // Agrupa el resto de dependencias en un chunk 'vendor'
          if (id.includes("node_modules")) {
            return "vendor";
          }
        },
      },
    },
  },
});
