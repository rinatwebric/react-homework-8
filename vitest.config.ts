import { defineConfig } from 'vitest/config'

// Тесты только для чистой логики: правила риска, geo, очередь, сжатие.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})