import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { format, subDays } from 'date-fns';
import { CheckCircle2, Search, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import { KpiCard } from '@/components/dqc/common';
import { dataHealthService } from '@/services/dataHealthService';

const DATE_FMT = 'yyyy-MM-dd';

/** Pipeline-error health view — GET /dqc/error/monitor. */
const DataHealthPage: React.FC = () => {
	const { t } = useTranslation(['dqc', 'common']);
	const [startDate, setStartDate] = useState(format(subDays(new Date(), 7), DATE_FMT));
	const [endDate, setEndDate] = useState(format(new Date(), DATE_FMT));
	const [range, setRange] = useState<{ startDate: string; endDate: string }>({ startDate, endDate });

	const healthQuery = useQuery({
		queryKey: ['dqc', 'health', range],
		queryFn: () => dataHealthService.runMonitor(range.startDate, range.endDate),
	});
	const result = healthQuery.data;
	const pipelineError = result?.pipelineError;
	const errorSummary = Object.entries(pipelineError?.errorSummary ?? {});
	const errorDetails = pipelineError?.errorDetails ?? [];

	return (
		<div className="flex flex-col gap-4">
			<Card>
				<CardContent className="flex flex-wrap items-end gap-3 p-4">
					<div className="flex flex-col gap-1.5">
						<Label>{t('common:startDate')}</Label>
						<Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
					</div>
					<div className="flex flex-col gap-1.5">
						<Label>{t('common:endDate')}</Label>
						<Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
					</div>
					<Button onClick={() => setRange({ startDate, endDate })} disabled={healthQuery.isFetching}>
						<Search className="mr-1.5 h-4 w-4" />
						{t('dqc:results.query')}
					</Button>
				</CardContent>
			</Card>

			{healthQuery.isLoading ? (
				<Skeleton className="h-28" />
			) : (
				<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
					<KpiCard
						title={t('dqc:health.errorCount')}
						value={pipelineError?.errorCount ?? 0}
						icon={
							result?.hasError
								? <XCircle className="h-4 w-4 text-destructive" />
								: <CheckCircle2 className="h-4 w-4 text-success" />
						}
					/>
					<Card>
						<CardHeader className="pb-2">
							<CardTitle className="text-sm font-medium text-muted-foreground">{t('common:status')}</CardTitle>
						</CardHeader>
						<CardContent>
							<Badge
								variant="outline"
								className={
									result?.hasError
										? 'border-red-500/40 bg-red-500/15 text-red-400'
										: 'border-emerald-500/40 bg-emerald-500/15 text-emerald-400'
								}
							>
								{result?.hasError ? t('dqc:health.hasError') : t('dqc:health.noError')}
							</Badge>
						</CardContent>
					</Card>
				</div>
			)}

			<Card>
				<CardHeader>
					<CardTitle className="text-sm font-medium">{t('dqc:health.summary')}</CardTitle>
				</CardHeader>
				<CardContent className="p-0">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>{t('common:topic')} [pipeline]</TableHead>
								<TableHead className="w-32 text-right">{t('dqc:health.errorCount')}</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{errorSummary.length === 0 ? (
								<TableRow>
									<TableCell colSpan={2} className="p-8 text-center text-sm text-muted-foreground">
										{t('dqc:health.noError')}
									</TableCell>
								</TableRow>
							) : (
								errorSummary.map(([group, count]) => (
									<TableRow key={group}>
										<TableCell className="text-sm">{group}</TableCell>
										<TableCell className="text-right font-medium text-destructive">{count}</TableCell>
									</TableRow>
								))
							)}
						</TableBody>
					</Table>
				</CardContent>
			</Card>

			{errorDetails.length > 0 && (
				<Card>
					<CardHeader>
						<CardTitle className="text-sm font-medium">{t('dqc:health.details')}</CardTitle>
					</CardHeader>
					<CardContent className="p-0">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>{t('dqc:health.topicId')}</TableHead>
									<TableHead>{t('dqc:health.pipelineId')}</TableHead>
									<TableHead>{t('dqc:health.details')}</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{errorDetails.slice(0, 100).map((detail, index) => {
									const { topicId, pipelineId, ...rest } = detail as Record<string, any>;
									return (
										<TableRow key={index}>
											<TableCell className="text-sm">{topicId ?? '-'}</TableCell>
											<TableCell className="text-sm">{pipelineId ?? '-'}</TableCell>
											<TableCell className="max-w-96 truncate text-xs text-muted-foreground" title={JSON.stringify(rest)}>
												{JSON.stringify(rest)}
											</TableCell>
										</TableRow>
									);
								})}
							</TableBody>
						</Table>
					</CardContent>
				</Card>
			)}
		</div>
	);
};

export default DataHealthPage;
