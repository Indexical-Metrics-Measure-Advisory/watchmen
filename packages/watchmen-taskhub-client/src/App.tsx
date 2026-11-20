import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import AppLayout from '@/components/AppLayout';
import { TaskHubProvider } from '@/context/TaskHubContext';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import OverviewPage from '@/pages/OverviewPage';
import TasksPage from '@/pages/TasksPage';
import TaskDetailPage from '@/pages/TaskDetailPage';
import RunsPage from '@/pages/RunsPage';
import DependenciesPage from '@/pages/DependenciesPage';
import BuildMapPage from '@/pages/BuildMapPage';
import TimelinePage from '@/pages/TimelinePage';
import AssetsPage from '@/pages/AssetsPage';
import LoginPage from '@/pages/LoginPage';

function ProtectedLayout() {
  const { user, isLoading } = useAuth();
  if (isLoading) return <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <TaskHubProvider><AppLayout /></TaskHubProvider>;
}

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.VITE_WEB_CONTEXT ?? '/'}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedLayout />}>
            <Route path="/" element={<OverviewPage />} />
            <Route path="/tasks" element={<TasksPage />} />
            <Route path="/tasks/:taskId" element={<TaskDetailPage />} />
            <Route path="/runs" element={<RunsPage />} />
            <Route path="/dependencies" element={<DependenciesPage />} />
            <Route path="/map" element={<BuildMapPage />} />
            <Route path="/timeline" element={<TimelinePage />} />
            <Route path="/assets" element={<AssetsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
