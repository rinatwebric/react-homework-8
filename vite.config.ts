import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// Манифест PWA. Иконки генерируются из public/logo.svg: npm run assets
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'autoUpdate',
      injectRegister: false,
      manifest: {
        name: 'SuuTech — риск подтопления',
        short_name: 'SuuTech',
        description:
          'SuuTech: сигналы жителей, погода и датчики о риске подземного подтопления в Кыргызстане.',
        lang: 'ru',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#eff6ff',
        theme_color: '#1e40af',
        icons: [
          { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: '/maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      injectManifest: {
        // iife: SW работает как обычный скрипт — без type="module" (шире поддержка на телефонах)
        rollupFormat: 'iife',
        globPatterns: ['**/*.{js,css,html,svg,png,woff2,webmanifest}'],
        // Шрифт + иконки: 2 МБ на файл хватает с запасом
        maximumFileSizeToCacheInBytes: 2 * 1024 * 1024,
      },
      devOptions: {
        enabled: true,
        type: 'module',
        navigateFallback: 'index.html',
      },
    }),
  ],
})