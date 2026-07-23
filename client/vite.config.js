import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      // Proxy any short code (3-20 chars) that isn't a known frontend route
      '^/(?!api|login|signup|my-links|mine)[a-zA-Z0-9-_]{3,20}$': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      }
    },
  },
})
