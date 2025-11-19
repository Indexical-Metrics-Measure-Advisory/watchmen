import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from '@/context/AuthContext'
import App from './App.tsx'
import './index.css'

createRoot(document.getElementById("root")!).render(
  <BrowserRouter basename={import.meta.env.VITE_WEB_CONTEXT ?? '/'}>
    <AuthProvider>
      <App />
    </AuthProvider>
  </BrowserRouter>
);
