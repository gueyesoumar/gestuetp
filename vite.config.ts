import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { execSync } from 'node:child_process'

function gitShortSha(): string {
  try {
    return execSync('git rev-parse --short HEAD').toString().trim()
  } catch {
    return 'dev'
  }
}

export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
  ],
  define: {
    __BUILD_SHA__: JSON.stringify(gitShortSha()),
  },
  build: {
    rollupOptions: {
      output: {
        // Vendors stables chargés sur presque toutes les pages -> chunks séparés,
        // mis en cache par le navigateur entre déploiements (le code applicatif,
        // lui, est désormais découpé par page via React.lazy dans App.tsx).
        manualChunks(id: string): string | undefined {
          if (!id.includes('node_modules')) return undefined
          if (/node_modules\/(react|react-dom|react-router-dom|scheduler)\//.test(id)) return 'react-vendor'
          if (id.includes('@supabase')) return 'supabase'
          if (id.includes('lucide-react')) return 'icons'
          return undefined
        },
      },
    },
  },
})