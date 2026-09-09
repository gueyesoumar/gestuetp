import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/inter'
import '@fontsource-variable/jetbrains-mono'
import './index.css'
import App from './App.tsx'
import { ErrorBoundary } from './components/ErrorBoundary'
import { installErrorBuffer } from './lib/errorBuffer'
import { applyCachedBrandingAtBoot } from './features/branding/brandingCache'

installErrorBuffer()
// Applique le branding cabinet en cache AVANT le premier rendu (anti-FOUC).
applyCachedBrandingAtBoot()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
