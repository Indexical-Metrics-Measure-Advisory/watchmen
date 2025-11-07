
import { Routes, Route } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import { ThemeProvider } from '@/components/theme-provider';

import AuthGuard from '@/components/AuthGuard';
import Layout from '@/components/Layout';
import Login from '@/pages/Login';
import Index from '@/pages/Index';
import Modules from '@/pages/Modules';
import Models from '@/pages/Models';
import Tables from '@/pages/Tables';
import Monitor from '@/pages/Monitor';
import Config from '@/pages/Config';
import Discovery from '@/pages/Discovery';
import NotFound from '@/pages/NotFound';

// Feature flags
export const FEATURE_FLAGS = {
  showDiscovery: false, // Set to false to hide Discovery menu and route
};

function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
      <Toaster />
      <Routes>
        {/* Login page - no authentication protection required */}
        <Route path="/login" element={<Login />} />
        
        {/* Protected routes - login required to access */}
        <Route path="/" element={
          <AuthGuard>
            <Layout />
          </AuthGuard>
        }>
          <Route index element={<Index />} />
          <Route path="modules" element={<Modules />} />
          <Route path="models" element={<Models />} />
          <Route path="tables" element={<Tables />} />
          <Route path="monitor" element={<Monitor />} />
          <Route path="config" element={<Config />} />
          {FEATURE_FLAGS.showDiscovery && (
            <Route path="discovery" element={<Discovery />} />
          )}
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </ThemeProvider>
  );
}

export default App;
