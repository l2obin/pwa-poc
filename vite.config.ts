import path from "path"
import tailwindcss from "@tailwindcss/vite"
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import mkcert from 'vite-plugin-mkcert'
import { VitePWA } from 'vite-plugin-pwa';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    // Please make sure that '@tanstack/router-plugin' is passed before '@vitejs/plugin-react'
    tanstackRouter({
      target: 'react',
      autoCodeSplitting: true,
    }),
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: {
        enabled: true
      },
      // generates 'manifest.webmanifest' file on build
      manifest: {
        name: 'POC-PWA',
        short_name: 'POC-PWA',
        start_url: '/',
        background_color: '#ffffff',
        theme_color: '#000000',
        icons: [
          {
            src: '/images/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/images/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ],
        screenshots: [
          {
            src: '/images/screenshot-1.png',
            sizes: '512x512',
            type: 'image/png',
            form_factor: 'wide',
          },
          {
            src: '/images/screenshot-1.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ]
      },
      workbox: {
        // defining cached files formats
        globPatterns: ["**/*.{js,css,html,ico,png,svg,webmanifest,wasm}"],
      }
    }),
    mkcert()
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    // For OPFS to work, will need the following header
    // 'Cross-Origin-Opener-Policy': 'same-origin'
    // 'Cross-Origin-Embedder-Policy': 'require-corp',
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
  optimizeDeps: {
    exclude: ['@sqlite.org/sqlite-wasm'],
  },
})
