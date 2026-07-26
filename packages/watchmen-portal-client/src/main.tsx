import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@/i18n';
import { AuthProvider } from '@/context/AuthContext';
import { APP_TITLE } from '@/lib/appTitle';
import App from './App.tsx';
import './index.css';

// Sync the browser tab title with the configured brand.
document.title = `${APP_TITLE} Portal`;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>
);
