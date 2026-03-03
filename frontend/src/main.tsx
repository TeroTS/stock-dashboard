import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { initializeFrontendObservability } from './observability/bootstrap'

const disposeObservability = initializeFrontendObservability()

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    disposeObservability()
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
