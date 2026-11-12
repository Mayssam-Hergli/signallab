import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App'
import { PresentationProvider } from './lib/presentation'
// Source Serif 4 is bundled (no Google Fonts request): the site works offline.
import '@fontsource/source-serif-4/400.css'
import '@fontsource/source-serif-4/400-italic.css'
import '@fontsource/source-serif-4/600.css'
import '@fontsource/source-serif-4/700.css'
import './index.css'

// HashRouter: URLs look like /#/traitement-du-signal/tp1. The part after # never reaches the
// server, so a static host (GitHub Pages, Vercel) always serves index.html
// and no rewrite rule is needed.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <PresentationProvider>
        <App />
      </PresentationProvider>
    </HashRouter>
  </StrictMode>,
)
