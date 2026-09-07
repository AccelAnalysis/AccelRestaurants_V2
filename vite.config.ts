import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['vite.svg'],
      manifest: {
        name: 'AccelRestaurants Player',
        short_name: 'AccelPlayer',
        description: 'Digital Signage Player for AccelRestaurants',
        theme_color: '#111827',
        background_color: '#000000',
        display: 'fullscreen',
        orientation: 'landscape',
        icons: [
          {
            src: 'icons/pwa-72x72.png',
            sizes: '72x72',
            type: 'image/png'
          },
          {
            src: 'icons/pwa-96x96.png',
            sizes: '96x96',
            type: 'image/png'
          },
          {
            src: 'icons/pwa-128x128.png',
            sizes: '128x128',
            type: 'image/png'
          },
          {
            src: 'icons/pwa-144x144.png',
            sizes: '144x144',
            type: 'image/png'
          },
          {
            src: 'icons/pwa-152x152.png',
            sizes: '152x152',
            type: 'image/png'
          },
          {
            src: 'icons/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'icons/pwa-384x384.png',
            sizes: '384x384',
            type: 'image/png'
          },
          {
            src: 'icons/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        navigateFallbackDenylist: [/^\/r(?:\/|$)/, /^\/engage(?:\/|$)/],
        // Cache Google Fonts, images, etc.
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/firebasestorage\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'firebase-storage-images',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      }
    })
  ],
  optimizeDeps: {
    include: ['react-dnd', 'react-dnd-html5-backend', 'dnd-core']
  },
  resolve: {
    dedupe: ['react', 'react-dom', 'react-dnd', 'react-dnd-html5-backend', 'dnd-core']
  }
})
