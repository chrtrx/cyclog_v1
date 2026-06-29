import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['apple-touch-icon-180x180.png'],
      manifest: {
        name: 'Cyclog – Verschleiß-Tracker',
        short_name: 'Cyclog',
        description: 'Verschleiß-Tracker für dein Fahrrad mit Strava-Sync',
        lang: 'de',
        theme_color: '#070d1a',
        background_color: '#070d1a',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // SPA: alle Navigationen auf index.html zurückfallen lassen …
        navigateFallback: 'index.html',
        // … außer /api/* – die müssen die echten Serverless-Funktionen treffen,
        // nicht von der App-Hülle abgefangen werden.
        navigateFallbackDenylist: [/^\/api\//],
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // Push-/Notification-Handler in den generierten SW importieren
        importScripts: ['push-sw.js'],
        runtimeCaching: [
          {
            // Google Fonts (JetBrains Mono + Inter) offline verfügbar machen
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Supabase-Daten: online frisch, offline zuletzt geladene Daten zeigen
            urlPattern: /^https:\/\/[a-z0-9-]+\.supabase\.co\/rest\/v1\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-api',
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
  server: {
    port: 5173,
    host: true, // erlaubt Zugriff von anderen Geräten im Netzwerk
  },
})
