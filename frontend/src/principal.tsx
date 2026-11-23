import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './estilos.css'
import App from './Aplicacion.tsx'
import { ToastProvider } from './componentes/interfaz/Avisos.tsx'
import { ThemeProvider } from './contexto/ContextoTema.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ToastProvider>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </ToastProvider>
  </StrictMode>,
)