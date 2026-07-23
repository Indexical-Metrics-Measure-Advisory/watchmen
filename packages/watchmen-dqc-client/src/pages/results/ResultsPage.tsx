import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { format, subDays } from 'date-fns';
import { Search } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import {
	Bar,
	BarChart,
	CartesianGrid,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from 'recharts';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import { formatDateTime } from '@/components/dqc/common';
import { monitorResultService } from '@/services/monitorResultService';
import { topicService } from '@/services/topicService';
import { MonitorRuleCode } from '@/models/monitorRule';
import type { MonitorRuleLog, MonitorRuleLogCriteria } from '@/models/monitorResult';

const DATE_FMT = 'yyyy-MM-dd';
const ALL = '__all__';

const ResultsPage: React.FC = () => {
	const { t } = useTranslation(['dqc', 'common']);
	const [startDate, setStartDate] = useState(format(subDays(new Date(), 30), DATE_FMT));
	const [endDate, setEndDate] = useState(format(new Date(), DATE_FMT));
	const [ruleCode, setRuleCode] = useState<string>(ALL);
	const [topicId, setTopicId] = useState<string>(ALL);
	const [factorId, setFactorId] = useState<string>(ALL);
	const [criteria, setCriteria] = useState<MonitorRuleLogCriteria>({ startDate, endDate });

	const topicsQuery = useQuery({ queryKey: ['dqc', 'topics'], queryFn: () => topicService.getAllTopics() });
	const topics = useMemo(() => topicsQuery.data ?? [], [topicsQuery.data]);
	const selectedTopic = topics.find((topic) => topic.topicId === topicId);
	const topicNameOf = (id?: string) => topics.find((topic) => topic.topicId === id)?.name ?? id ?? '-';

	const logsQuery = useQuery({
		queryKey: ['dqc', 'monitor-logs', criteria],
		queryFn: () => monitorResultService.findLogs(criteria),
	});
	const logs: MonitorRuleLog[] = logsQuery.data ?? [];

	const runQuery = () => {
		setCriteria({
			startDate: startDate || undefined,
			endDate: endDate || undefined,
			ruleCode: ruleCode === ALL ? undefined : (ruleCode as MonitorRuleCode),
			topicId: topicId === ALL ? undefined : topicId,
			factorId: factorId === ALL ? undefined : factorId,
		});
	};

	/** Hit trend aggregated by day of last occurrence. */
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

	React.useEffect(() => {
		if (logsQuery.isError) {
			toast.error(t('dqc:results.queryFailed'));
		}
	}, [logsQuery.isError, t]);

	return (
		<div className="flex flex-col gap-4">
			{/* Filters */}
			<Card>
				<CardContent className="grid grid-cols-2 items-end gap-3 p-4 lg:grid-cols-6">
					<div className="flex flex-col gap-1.5">
						<Label>{t('common:startDate')}</Label>
						<Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
					</div>
					<div className="flex flex-col gap-1.5">
						<Label>{t('common:endDate')}</Label>
						<Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
					</div>
					<div className="flex flex-col gap-1.5">
						<Label>{t('dqc:results.ruleCode')}</Label>
						<Select value={ruleCode} onValueChange={setRuleCode}>
							<SelectTrigger><SelectValue /></SelectTrigger>
							<SelectContent>
								<SelectItem value={ALL}>{t('common:all')}</SelectItem>
								{Object.values(MonitorRuleCode).map((code) => (
									<SelectItem key={code} value={code}>{t(`dqc:ruleCode.${code}`)}</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<div className="flex flex-col gap-1.5">
						<Label>{t('common:topic')}</Label>
						<Select value={topicId} onValueChange={(v) => { setTopicId(v); setFactorId(ALL); }}>
							<SelectTrigger><SelectValue /></SelectTrigger>
							<SelectContent>
								<SelectItem value={ALL}>{t('common:all')}</SelectItem>
								{topics.map((topic) => (
									<SelectItem key={topic.topicId} value={topic.topicId!}>{topic.name}</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<div className="flex flex-col gap-1.5">
						<Label>{t('common:factor')}</Label>
						<Select value={factorId} onValueChange={setFactorId} disabled={!selectedTopic}>
							<SelectTrigger><SelectValue /></SelectTrigger>
							<SelectContent>
								<SelectItem value={ALL}>{t('common:all')}</SelectItem>
								{(selectedTopic?.factors ?? []).map((factor) => (
									<SelectItem key={factor.factorId} value={factor.factorId!}>{factor.label || factor.name}</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<Button onClick={runQuery} disabled={logsQuery.isFetching}>
						<Search className="mr-1.5 h-4 w-4" />
						{t('dqc:results.query')}
					</Button>
				</CardContent>
			</Card>

			{/* Trend */}
			<Card>
				<CardHeader>
					<CardTitle className="text-sm font-medium">{t('dqc:results.trend')}</CardTitle>
				</CardHeader>
				<CardContent className="h-64">
					{trendData.length === 0 ? (
						<p className="pt-20 text-center text-sm text-muted-foreground">{t('common:noData')}</p>
					) : (
						<ResponsiveContainer width="100%" height="100%">
							<BarChart data={trendData}>
								<CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
								<XAxis dataKey="day" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
								<YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
								<Tooltip contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
								<Bar dataKey="count" name={t('dqc:dashboard.count')} fill="#5b7fff" radius={[4, 4, 0, 0]} />
							</BarChart>
						</ResponsiveContainer>
					)}
				</CardContent>
			</Card>

			{/* Result table */}
			<Card>
				<CardContent className="p-0">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>{t('dqc:results.ruleCode')}</TableHead>
								<TableHead>{t('common:topic')}</TableHead>
								<TableHead>{t('common:factor')}</TableHead>
								<TableHead className="text-right">{t('dqc:results.hitCount')}</TableHead>
								<TableHead>{t('dqc:results.lastOccurred')}</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{logs.length === 0 ? (
								<TableRow>
									<TableCell colSpan={5} className="p-8 text-center text-sm text-muted-foreground">
										{t('common:noData')}
									</TableCell>
								</TableRow>
							) : (
								logs.map((log, index) => {
									const factor = topics
										.find((topic) => topic.topicId === log.topicId)
										?.factors?.find((f) => f.factorId === log.factorId);
									return (
										<TableRow key={index}>
											<TableCell className="text-sm">{t(`dqc:ruleCode.${log.ruleCode}`)}</TableCell>
											<TableCell className="text-sm">{topicNameOf(log.topicId)}</TableCell>
											<TableCell className="text-sm text-muted-foreground">
												{factor?.label || factor?.name || log.factorId || '-'}
											</TableCell>
											<TableCell className="text-right font-medium">{log.count ?? 0}</TableCell>
											<TableCell className="text-sm text-muted-foreground">{formatDateTime(log.lastOccurredTime)}</TableCell>
										</TableRow>
									);
								})
							)}
						</TableBody>
					</Table>
				</CardContent>
			</Card>
		</div>
	);
};

export default ResultsPage;
