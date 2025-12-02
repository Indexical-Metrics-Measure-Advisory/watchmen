import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { businessService } from '@/services/businessService';
import { a2aService } from '@/services/a2aService';

interface DashboardData {
  runningAgents: number;
  totalChallenges: number;
  loading: boolean;
}

interface DashboardDataProps {
  data: DashboardData;
  onDataUpdate: (data: DashboardData) => void;
}

export const useDashboardData = () => {
  const [data, setData] = React.useState<DashboardData>({
    runningAgents: 0,
    totalChallenges: 0,
    loading: true,
  });

  const fetchDashboardData = React.useCallback(async () => {
    try {
      const [agents, challenges] = await Promise.all([
        a2aService.findAgents(),
        businessService.getChallenges()
      ]);

      const now = new Date();
      const runningCount = agents.filter(agent => {
        if (!agent.lastActive) return false;
        const lastActive = new Date(agent.lastActive);
        const timeDiff = now.getTime() - lastActive.getTime();
        return timeDiff < 5 * 60 * 1000;
      }).length;

      setData({
        runningAgents: runningCount,
        totalChallenges: challenges.length,
        loading: false,
      });
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setData(prev => ({ ...prev, loading: false }));
    }
  }, []);

  React.useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  return { data, refetch: fetchDashboardData };
};

export const DashboardStats: React.FC<{ data: DashboardData }> = ({ data }) => {
  if (data.loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="h-8 bg-gray-200 rounded animate-pulse w-16 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded animate-pulse w-32"></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="h-8 bg-gray-200 rounded animate-pulse w-16 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded animate-pulse w-32"></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Running Agents</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data.runningAgents}</div>
          <p className="text-xs text-muted-foreground">Active in last 5 minutes</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Total Challenges</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data.totalChallenges}</div>
          <p className="text-xs text-muted-foreground">Business challenges</p>
        </CardContent>
      </Card>
    </div>
  );
};