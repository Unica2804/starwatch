import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// StarWatch — offline-only PWA. Android-first.
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'pwa-192x192.png', 'pwa-512x512.png', 'pwa-maskable-512.png'],
      manifest: {
        name: 'StarWatch — Pocket Stargazing',
        short_name: 'StarWatch',
        description:
          'Offline-only pocket stargazing. Point, see what should be there, listen.',
        theme_color: '#0a0000',
        background_color: '#0a0000',
        display: 'standalone',
        orientation: 'any',
        start_url: '/',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'pwa-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      },
      workbox: {
        // App shell offline-first. Model shards + audio come from
        // IndexedDB/HF cache, never bundled (Render 25MB limit).
        globPatterns: ['**/*.{js,css,html,svg,json}'],
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.endsWith('.mp3'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'starwatch-audio',
              expiration: { maxEntries: 200 }
            }
          }
        ]
      }
    })
  ]
})
