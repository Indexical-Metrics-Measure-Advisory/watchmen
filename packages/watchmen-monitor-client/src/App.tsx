import { Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { ThemeProvider } from '@/components/theme-provider';

import AuthGuard from '@/components/AuthGuard';
import Layout from '@/components/Layout';
import Login from '@/pages/Login';
import IngestionMonitor from '@/pages/IngestionMonitor';
import PipelineMonitor from '@/pages/PipelineMonitor';
import DataSourceMonitor from '@/pages/DataSourceMonitor';
import GlobalMap from '@/pages/GlobalMap';
import NotFound from '@/pages/NotFound';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 30_000,
    },
  },
});

function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="watchmen-monitor-theme">
      <QueryClientProvider client={queryClient}>
        <Toaster />
        <Routes>
          {/* Login page — no auth required */}
          <Route path="/login" element={<Login />} />

          {/* Protected routes */}
          <Route
            path="/"
            element={
              <AuthGuard>
                <Layout />
              </AuthGuard>
            }
          >
            <Route index element={<GlobalMap />} />
            <Route path="ingestion" element={<IngestionMonitor />} />
            <Route path="pipeline" element={<PipelineMonitor />} />
            <Route path="datasource" element={<DataSourceMonitor />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
