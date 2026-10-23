import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config'

// Иконки PWA из одного исходника: npm run assets
// Даёт pwa-192x192.png, pwa-512x512.png, maskable-icon-512x512.png, apple-touch-icon-180x180.png
export default defineConfig({
  preset: minimal2023Preset,
  images: ['public/logo.svg'],
})