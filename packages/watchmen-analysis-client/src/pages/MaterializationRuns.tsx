import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '@/components/ui/select';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow
} from '@/components/ui/table';
import {
	Pagination,
	PaginationContent,
	PaginationItem,
	PaginationLink,
	PaginationNext,
	PaginationPrevious
} from '@/components/ui/pagination';
import { ChevronDown, ChevronRight, Loader2, RefreshCw, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import type { MaterializationRun, MaterializationRunStatus } from '@/model/materialization';
import { materializationService } from '@/services/materializationService';

const STATUSES: (MaterializationRunStatus | 'ALL')[] = ['ALL', 'PENDING', 'RUNNING', 'SUCCESS', 'FAILED'];

const statusColor: Record<MaterializationRunStatus, string> = {
	PENDING: 'bg-slate-100 text-slate-700 border-slate-300',
	RUNNING: 'bg-amber-100 text-amber-800 border-amber-300',
	SUCCESS: 'bg-emerald-100 text-emerald-800 border-emerald-300',
	FAILED: 'bg-rose-100 text-rose-800 border-rose-300'
};

const formatDuration = (ms?: number): string => {
	if (ms === undefined || ms === null) {
		return '-';
	}
	if (ms < 1000) {
		return `${ms}ms`;
	}
	return `${(ms / 1000).toFixed(1)}s`;
};

const formatDateTime = (iso?: string): string => {
	if (!iso) {
		return '-';
	}
	try {
		return new Date(iso).toLocaleString();
	} catch {
		return iso;
	}
};

const MaterializationRuns: React.FC = () => {
	const { t } = useTranslation(['common', 'materialization']);
	const { toast } = useToast();

	const [rows, setRows] = useState<MaterializationRun[]>([]);
	const [loading, setLoading] = useState(true);
	const [keyword, setKeyword] = useState('');
	const [status, setStatus] = useState<MaterializationRunStatus | 'ALL'>('ALL');
	const [pageNumber, setPageNumber] = useState(1);
	const [pageSize] = useState(10);
	const [pageCount, setPageCount] = useState(1);
	const [itemCount, setItemCount] = useState(0);
	const [expandedId, setExpandedId] = useState<string | null>(null);

	const load = useCallback(async () => {
		setLoading(true);
		try {
			const result = await materializationService.pageRuns({
				keyword,
				status,
				pageNumber,
				pageSize
			});
			setRows(result.data);
			setItemCount(result.itemCount);
			setPageCount(result.pageCount);
			if (result.pageNumber !== pageNumber) {
				setPageNumber(result.pageNumber);
			}
		} catch (error) {
			toast({
				title: t('materialization:runs.loadFailed'),
				description: error instanceof Error ? error.message : String(error),
				variant: 'destructive'
			});
		} finally {
			setLoading(false);
		}
	}, [keyword, status, pageNumber, pageSize, toast, t]);

	useEffect(() => {
		void load();
	}, [load]);

	// auto-refresh while any run on this page is still active
	useEffect(() => {
		const hasActive = rows.some((r) => r.status === 'PENDING' || r.status === 'RUNNING');
		if (!hasActive) {
			return;
		}
		const timer = setTimeout(() => {
			void load();
		}, 2500);
		return () => clearTimeout(timer);
	}, [rows, load]);

	const handleSearch = (value: string) => {
		setKeyword(value);
		setPageNumber(1);
	};

	const handleStatusChange = (value: string) => {
		setStatus(value as MaterializationRunStatus | 'ALL');
		setPageNumber(1);
	};

	const toggleExpand = (runId: string) => {
		setExpandedId((prev) => (prev === runId ? null : runId));
	};

	return (
		<div className="min-h-screen bg-background">
			<div className="min-h-screen transition-all duration-300">
				<main className="container py-8 space-y-6">
					<div className="flex flex-wrap items-start justify-between gap-4">
						<div>
							<h1 className="text-2xl font-bold tracking-tight">{t('materialization:runs.title')}</h1>
							<p className="text-muted-foreground">{t('materialization:runs.subtitle')}</p>
						</div>
						<div className="flex items-center gap-2">
							<Button variant="outline" size="sm" asChild>
								<Link to="/metrics/materialization">
									{t('materialization:runs.backToList')}
								</Link>
							</Button>
							<Button
								variant="outline"
								size="sm"
								onClick={() => void load()}
								disabled={loading}
							>
								{loading ? (
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								) : (
									<RefreshCw className="mr-2 h-4 w-4" />
								)}
								{t('common:refresh')}
							</Button>
						</div>
					</div>

					<div className="flex flex-wrap items-center gap-2">
						<div className="relative">
							<Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
							<Input
								className="pl-8 w-64"
								placeholder={t('materialization:runs.searchPlaceholder')}
								value={keyword}
								onChange={(e) => handleSearch(e.target.value)}
							/>
						</div>
						<Select value={status} onValueChange={handleStatusChange}>
							<SelectTrigger className="w-40">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{STATUSES.map((s) => (
									<SelectItem key={s} value={s}>
										{s === 'ALL'
											? t('materialization:runs.allStatuses')
											: t(`materialization:runStatus.${s}`)}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						<span className="ml-auto text-xs text-muted-foreground">
							{t('materialization:runs.totalCount', { count: itemCount })}
						</span>
					</div>

					<Card>
						{loading ? (
							<div className="flex items-center justify-center h-64">
								<Loader2 className="h-8 w-8 animate-spin text-primary" />
							</div>
						) : (
								<>
									<div className="overflow-x-auto">
									<Table>
									<TableHeader>
										<TableRow>
											<TableHead className="w-8" />
											<TableHead>{t('materialization:runs.colRunId')}</TableHead>
											<TableHead>{t('materialization:runs.colJob')}</TableHead>
											<TableHead>{t('materialization:runs.colStatus')}</TableHead>
											<TableHead>{t('materialization:runs.colWindow')}</TableHead>
											<TableHead>{t('materialization:runs.colEngine')}</TableHead>
											<TableHead className="text-right">
												{t('materialization:runs.colRowCount')}
											</TableHead>
											<TableHead className="text-right">
												{t('materialization:runs.colDuration')}
											</TableHead>
											<TableHead>{t('materialization:runs.colTrigger')}</TableHead>
											<TableHead>{t('materialization:runs.colStartedAt')}</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{rows.length === 0 && (
											<TableRow>
												<TableCell colSpan={10} className="h-32 text-center text-muted-foreground">
													{t('materialization:runs.empty')}
												</TableCell>
											</TableRow>
										)}
										{rows.map((row) => (
											<React.Fragment key={row.runId}>
												<TableRow
													className="cursor-pointer"
													onClick={() => toggleExpand(row.runId)}
												>
													<TableCell>
														{expandedId === row.runId ? (
															<ChevronDown className="h-4 w-4 text-muted-foreground" />
														) : (
															<ChevronRight className="h-4 w-4 text-muted-foreground" />
														)}
													</TableCell>
													<TableCell className="font-mono text-xs">{row.runId}</TableCell>
													<TableCell className="max-w-[200px]">
														<div className="truncate text-sm font-medium">
															{row.materializationName || row.metricName}
														</div>
														{row.flowName && (
															<div className="truncate text-xs text-muted-foreground">
																{t('materialization:runs.viaFlow', { name: row.flowName })}
															</div>
														)}
													</TableCell>
													<TableCell>
														<Badge variant="outline" className={cn('text-xs', statusColor[row.status])}>
															{(row.status === 'RUNNING' || row.status === 'PENDING') && (
																<Loader2 className="mr-1 h-3 w-3 animate-spin" />
															)}
															{t(`materialization:runStatus.${row.status}`)}
														</Badge>
													</TableCell>
													<TableCell className="text-xs whitespace-nowrap">
														{row.windowStart && row.windowEnd
															? `${row.windowStart} ~ ${row.windowEnd}`
															: '-'}
													</TableCell>
													<TableCell>
														<Badge variant="secondary" className="text-xs">
															{t(`materialization:engines.${row.engine ?? 'AUTO'}`)}
														</Badge>
													</TableCell>
													<TableCell className="text-right tabular-nums">
														{row.rowCount ?? '-'}
													</TableCell>
													<TableCell className="text-right tabular-nums">
														{formatDuration(row.durationMs)}
													</TableCell>
													<TableCell>
														<Badge variant="outline" className="text-xs">
															{t(`materialization:triggers.${row.triggerType}`)}
														</Badge>
													</TableCell>
													<TableCell className="text-xs whitespace-nowrap">
														{formatDateTime(row.startedAt)}
													</TableCell>
												</TableRow>
												{expandedId === row.runId && (
													<TableRow className="hover:bg-transparent">
														<TableCell colSpan={10} className="bg-muted/30 px-6 py-4">
															<div className="grid gap-4 md:grid-cols-2">
																<div className="space-y-2">
																	<div className="text-xs font-medium text-muted-foreground uppercase">
																		{t('materialization:runs.detailMeta')}
																	</div>
																	<dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
																		<dt className="text-muted-foreground">
																			{t('materialization:runs.finishedAt')}
																		</dt>
																		<dd>{formatDateTime(row.finishedAt)}</dd>
																		<dt className="text-muted-foreground">
																			{t('materialization:runs.metric')}
																		</dt>
																		<dd className="font-mono text-xs">{row.metricName}</dd>
																		{row.errorMessage && (
																			<>
																				<dt className="text-muted-foreground">
																					{t('materialization:runs.error')}
																				</dt>
																				<dd className="text-destructive text-xs">
																					{row.errorMessage}
																				</dd>
																			</>
																		)}
																	</dl>
																</div>
																<div className="space-y-2">
																	<div className="text-xs font-medium text-muted-foreground uppercase">
																		{t('materialization:runs.sqlPreview')}
																	</div>
																	<pre className="rounded-md border bg-background px-3 py-2 text-xs overflow-auto max-h-48 whitespace-pre-wrap break-all">
																		{row.sqlPreview || t('materialization:runs.noSql')}
																	</pre>
																</div>
															</div>
														</TableCell>
													</TableRow>
												)}
											</React.Fragment>
										))}
									</TableBody>
								</Table>
									</div>

								{pageCount > 1 && (
									<div className="flex justify-center border-t py-4">
										<Pagination>
											<PaginationContent>
												<PaginationItem>
													<PaginationPrevious
														href="#"
														onClick={(e) => {
															e.preventDefault();
															setPageNumber((p) => Math.max(1, p - 1));
														}}
													/>
												</PaginationItem>
												{Array.from({ length: pageCount }, (_, i) => i + 1)
													.filter(
														(p) =>
															p === 1 ||
															p === pageCount ||
															Math.abs(p - pageNumber) <= 1
													)
													.map((p, idx, arr) => (
														<React.Fragment key={p}>
															{idx > 0 && arr[idx - 1] !== p - 1 && (
																<PaginationItem>
																	<span className="px-2 text-muted-foreground">…</span>
																</PaginationItem>
															)}
															<PaginationItem>
																<PaginationLink
																	href="#"
																	isActive={p === pageNumber}
																	onClick={(e) => {
																		e.preventDefault();
																		setPageNumber(p);
																	}}
																>
																	{p}
																</PaginationLink>
															</PaginationItem>
														</React.Fragment>
													))}
												<PaginationItem>
													<PaginationNext
														href="#"
														onClick={(e) => {
															e.preventDefault();
															setPageNumber((p) => Math.min(pageCount, p + 1));
														}}
													/>
												</PaginationItem>
											</PaginationContent>
										</Pagination>
									</div>
								)}
							</>
						)}
					</Card>
				</main>
			</div>
		</div>
	);
};

export default MaterializationRuns;
