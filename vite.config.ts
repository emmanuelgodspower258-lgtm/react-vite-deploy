/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: './src/test/setup.ts',
    },
    server: {
        port: 3001,
        host: true
    },
    resolve: {
        dedupe: ['react', 'react-dom', 'react-redux']
    }
})