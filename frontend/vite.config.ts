/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

const localEngine = process.env.LOCAL_ENGINE

export default defineConfig({
  base: '/aacalc2/',
  plugins: [react()],
  resolve: localEngine ? {
    alias: {
      aacalc2: path.resolve(__dirname, '..', 'dist'),
    },
  } : undefined,
  build: {
    outDir: 'dist',
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test-setup.ts',
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
