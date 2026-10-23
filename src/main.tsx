import '@fontsource-variable/golos-text'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { registerServiceWorker } from './app/registerServiceWorker'
import { router } from './app/router'
import './index.css'
import './shared/lib/i18n'

const container = document.getElementById('root')
if (!container) throw new Error('Не найден контейнер #root')

createRoot(container).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)

registerServiceWorker()