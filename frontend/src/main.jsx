import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import ErrorBoundary from './shared/components/ErrorBoundary'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <ErrorBoundary title="Error en la Aplicación Bitácora">
        <App />
      </ErrorBoundary>
    </BrowserRouter>
  </StrictMode>,
)

