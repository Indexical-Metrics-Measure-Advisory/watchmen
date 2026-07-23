import { Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import AuthGuard from '@/components/AuthGuard';
import AppShell from '@/components/layout/AppShell';
import LoginPage from '@/pages/LoginPage';
import DashboardPage from '@/pages/DashboardPage';
import RulesPage from '@/pages/rules/RulesPage';
import ResultsPage from '@/pages/results/ResultsPage';
import CatalogPage from '@/pages/catalog/CatalogPage';
import DataHealthPage from '@/pages/health/DataHealthPage';
import TopicProfilePage from '@/pages/profile/TopicProfilePage';
import PiiPage from '@/pages/pii/PiiPage';
import NotFoundPage from '@/pages/NotFoundPage';
import { isPiiEnabled } from '@/utils/utils';

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
		<QueryClientProvider client={queryClient}>
			<Routes>
				{/* Login page — no auth required */}
				<Route path="/login" element={<LoginPage />} />

				{/* Protected routes */}
				<Route
					path="/"
					element={
						<AuthGuard>
							<AppShell />
						</AuthGuard>
					}
				>
					<Route index element={<DashboardPage />} />
					<Route path="rules" element={<RulesPage />} />
					<Route path="results" element={<ResultsPage />} />
					<Route path="catalog" element={<CatalogPage />} />
					<Route path="health" element={<DataHealthPage />} />
					<Route path="profile" element={<TopicProfilePage />} />
					{isPiiEnabled() && <Route path="pii" element={<PiiPage />} />}
					<Route path="*" element={<NotFoundPage />} />
				</Route>
			</Routes>
		</QueryClientProvider>
	);
}

export default App;
