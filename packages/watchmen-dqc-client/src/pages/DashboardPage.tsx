import React, { useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { format, subDays } from 'date-fns';
import { AlertTriangle, BookOpen, ListChecks, Sigma } from 'lucide-react';
import {
	Bar,
	BarChart,
	CartesianGrid,
	Cell,
	Line,
	LineChart,
	Pie,
	PieChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { CHART_COLORS, KpiCard, SEVERITY_COLORS } from '@/components/dqc/common';
import { monitorRuleService } from '@/services/monitorRuleService';
import { monitorResultService } from '@/services/monitorResultService';
import { catalogService } from '@/services/catalogService';
import { dataHealthService } from '@/services/dataHealthService';
import { topicService } from '@/services/topicService';
import { MonitorRuleGrade, type MonitorRule } from '@/models/monitorRule';
import type { MonitorRuleLog } from '@/models/monitorResult';
import type { Topic } from '@/models/topic';

const DATE_FMT = 'yyyy-MM-dd';

const DashboardPage: React.FC = () => {
	const { t } = useTranslation(['dqc', 'common']);
	const endDate = format(new Date(), DATE_FMT);
	const startDate = format(subDays(new Date(), 30), DATE_FMT);

	const [rulesQuery, catalogsQuery, logsQuery, healthQuery, topicsQuery] = useQueries({
		queries: [
			{
				queryKey: ['dqc', 'rules', 'global'],
				queryFn: () => monitorRuleService.findRules(MonitorRuleGrade.GLOBAL),
			},
			{
				queryKey: ['dqc', 'catalogs', 'count'],
				queryFn: () => catalogService.findByCriteria({}),
			},
			{
				queryKey: ['dqc', 'monitor-logs', startDate, endDate],
				queryFn: () => monitorResultService.findLogs({ startDate, endDate }),
			},
			{
				queryKey: ['dqc', 'health', startDate, endDate],
				queryFn: () => dataHealthService.runMonitor(startDate, endDate),
			},
			{
				queryKey: ['dqc', 'topics'],
				queryFn: () => topicService.getAllTopics(),
			},
		],
	});

	const rules: MonitorRule[] = rulesQuery.data ?? [];
	const logs: MonitorRuleLog[] = logsQuery.data ?? [];
	const topics: Topic[] = topicsQuery.data ?? [];
	const topicNameOf = useMemo(() => {
		const map = new Map(topics.map((topic) => [topic.topicId, topic.name ?? topic.topicId]));
		return (topicId?: string) => (topicId ? map.get(topicId) ?? topicId : '-');
	}, [topics]);

	const enabledRules = rules.filter((rule) => rule.enabled).length;
	const totalHits = logs.reduce((sum, log) => sum + (log.count ?? 0), 0);
	const pipelineErrorCount = healthQuery.data?.pipelineError?.errorCount ?? 0;

	/** Hits aggregated by day of last occurrence. */
	const trendData = useMemo(() => {
		const byDay = new Map<string, number>();
		for (const log of logs) {
			if (!log.lastOccurredTime) continue;
			const day = log.lastOccurredTime.slice(0, 10);
			byDay.set(day, (byDay.get(day) ?? 0) + (log.count ?? 0));
		}
		return Array.from(byDay.entries())
			.sort(([a], [b]) => a.localeCompare(b))
			.map(([day, count]) => ({ day, count }));
	}, [logs]);

	/** Hits aggregated by topic. */
	const byTopicData = useMemo(() => {
		const byTopic = new Map<string, number>();
		for (const log of logs) {
			const key = topicNameOf(log.topicId);
			byTopic.set(key, (byTopic.get(key) ?? 0) + (log.count ?? 0));
		}
		return Array.from(byTopic.entries())
			.map(([name, count]) => ({ name, count }))
			.sort((a, b) => b.count - a.count)
			.slice(0, 10);
	}, [logs, topicNameOf]);

	/** Hits aggregated by rule code. */
	const byRuleData = useMemo(() => {
		const byRule = new Map<string, number>();
		for (const log of logs) {
			const key = log.ruleCode ?? 'unknown';
			byRule.set(key, (byRule.get(key) ?? 0) + (log.count ?? 0));
		}
		return Array.from(byRule.entries())
			.map(([code, count]) => ({ name: t(`dqc:ruleCode.${code}`), count }))
			.sort((a, b) => b.count - a.count)
			.slice(0, 10);
	}, [logs, t]);

	/** Loaded rules aggregated by severity. */
	const bySeverityData = useMemo(() => {
		const bySeverity = new Map<string, number>();
		for (const rule of rules) {
			const key = rule.severity ?? 'trace';
			bySeverity.set(key, (bySeverity.get(key) ?? 0) + 1);
		}
		return Array.from(bySeverity.entries()).map(([severity, count]) => ({
			name: t(`dqc:severity.${severity}`),
			severity,
			count,
		}));
	}, [rules, t]);

	const isLoading = rulesQuery.isLoading || logsQuery.isLoading || catalogsQuery.isLoading || healthQuery.isLoading;

	if (isLoading) {
		return (
			<div className="flex flex-col gap-4">
				<div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
					{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28" />)}
				</div>
				<Skeleton className="h-72" />
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-4">
			{/* KPI cards */}
			<div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
				<KpiCard
					title={t('dqc:dashboard.rulesEnabled')}
					value={enabledRules}
					hint={t('dqc:dashboard.rulesEnabledHint')}
					icon={<ListChecks className="h-4 w-4 text-muted-foreground" />}
				/>
				<KpiCard
					title={t('dqc:dashboard.catalogs')}
					value={catalogsQuery.data?.length ?? 0}
					hint={t('dqc:dashboard.catalogsHint')}
					icon={<BookOpen className="h-4 w-4 text-muted-foreground" />}
				/>
				<KpiCard
					title={t('dqc:dashboard.hitsInRange')}
					value={totalHits}
					hint={t('dqc:dashboard.hitsInRangeHint')}
					icon={<Sigma className="h-4 w-4 text-muted-foreground" />}
				/>
				<KpiCard
					title={t('dqc:dashboard.pipelineErrors')}
					value={pipelineErrorCount}
					hint={pipelineErrorCount === 0 ? t('dqc:dashboard.healthOk') : t('dqc:dashboard.pipelineErrorsHint')}
					icon={<AlertTriangle className={pipelineErrorCount > 0 ? 'h-4 w-4 text-destructive' : 'h-4 w-4 text-muted-foreground'} />}
				/>
			</div>

			{/* Trend + severity */}
			<div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
				<Card className="xl:col-span-2">
					<CardHeader>
						<CardTitle className="text-sm font-medium">{t('dqc:dashboard.hitTrend')}</CardTitle>
					</CardHeader>
					<CardContent className="h-72">
						{trendData.length === 0 ? (
							<p className="pt-24 text-center text-sm text-muted-foreground">{t('common:noData')}</p>
						) : (
							<ResponsiveContainer width="100%" height="100%">
								<LineChart data={trendData}>
									<CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
									<XAxis dataKey="day" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
									<YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
									<Tooltip contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
									<Line type="monotone" dataKey="count" name={t('dqc:dashboard.count')} stroke="#5b7fff" strokeWidth={2} dot={false} />
								</LineChart>
							</ResponsiveContainer>
						)}
					</CardContent>
				</Card>
				<Card>
					<CardHeader>
						<CardTitle className="text-sm font-medium">{t('dqc:dashboard.hitBySeverity')}</CardTitle>
					</CardHeader>
					<CardContent className="h-72">
						{bySeverityData.length === 0 ? (
							<p className="pt-24 text-center text-sm text-muted-foreground">{t('common:noData')}</p>
						) : (
							<ResponsiveContainer width="100%" height="100%">
								<PieChart>
									<Pie data={bySeverityData} dataKey="count" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={3}>
										{bySeverityData.map((entry) => (
											<Cell key={entry.severity} fill={SEVERITY_COLORS[entry.severity] ?? CHART_COLORS[0]} />
										))}
									</Pie>
									<Tooltip contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
								</PieChart>
							</ResponsiveContainer>
						)}
					</CardContent>
				</Card>
			</div>

			{/* Distributions */}
			<div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
				<Card>
					<CardHeader>
						<CardTitle className="text-sm font-medium">{t('dqc:dashboard.hitByTopic')}</CardTitle>
					</CardHeader>
					<CardContent className="h-72">
						{byTopicData.length === 0 ? (
							<p className="pt-24 text-center text-sm text-muted-foreground">{t('common:noData')}</p>
						) : (
							<ResponsiveContainer width="100%" height="100%">
								<BarChart data={byTopicData}>
									<CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
									<XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
									<YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
									<Tooltip contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
									<Bar dataKey="count" name={t('dqc:dashboard.count')} radius={[4, 4, 0, 0]}>
										{byTopicData.map((_, index) => (
											<Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
										))}
									</Bar>
								</BarChart>
							</ResponsiveContainer>
						)}
					</CardContent>
				</Card>
				<Card>
					<CardHeader>
						<CardTitle className="text-sm font-medium">{t('dqc:dashboard.hitByRule')}</CardTitle>
					</CardHeader>
					<CardContent className="h-72">
						{byRuleData.length === 0 ? (
							<p className="pt-24 text-center text-sm text-muted-foreground">{t('common:noData')}</p>
						) : (
							<ResponsiveContainer width="100%" height="100%">
								<BarChart data={byRuleData} layout="vertical">
									<CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
									<XAxis type="number" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
									<YAxis type="category" dataKey="name" width={160} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
									<Tooltip contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
									<Bar dataKey="count" name={t('dqc:dashboard.count')} fill="#7c3aed" radius={[0, 4, 4, 0]} />
								</BarChart>
							</ResponsiveContainer>
						)}
					</CardContent>
				</Card>
			</div>
		</div>
	);
};

export default DashboardPage;
