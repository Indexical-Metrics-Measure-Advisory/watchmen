import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { AlertCircle, Database, Loader2, RefreshCw, Search, Table2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import type {
	FactorMappingColumn,
	Materialization,
	MockDimensionOption,
	MockMetricOption,
	ScheduleFrequency,
	TimeGrain,
	WriteMode
} from '@/model/materialization';
import type { CellValue } from '@/model/metricFlow';
import { buildGroupBy, isTimeDimensionByName } from '@/utils/dimensionQuery';
import { isTimeDimensionOption, resolveTargetTopicIdOnLoad } from '@/utils/materializationForm';
import { buildMockFactorMapping } from '@/services/materializationMockData';
import { materializationService } from '@/services/materializationService';
import { metricsService } from '@/services/metricsService';

const TIME_GRAINS: TimeGrain[] = ['day', 'week', 'month', 'quarter', 'year'];
const WRITE_MODES: WriteMode[] = ['TRUNCATE_INSERT', 'MERGE'];
const WEEKDAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
// rows requested from the engine / shown in the preview table
const PREVIEW_LIMIT = 500;
const PREVIEW_DISPLAY_ROWS = 100;
// dimension list cap before the show-all toggle (same as the chart builder)
const MAX_DIM_DISPLAY = 24;

interface MaterializationFormDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	mode: 'create' | 'edit';
	initial?: Materialization;
	onSave: (value: Partial<Materialization>) => Promise<void> | void;
}

interface PreviewState {
	status: 'idle' | 'loading' | 'ready' | 'error';
	columns: string[];
	rows: CellValue[][];
	error?: string;
}

const EMPTY_PREVIEW: PreviewState = { status: 'idle', columns: [], rows: [] };

const SectionTitle = ({ index, title }: { index: number; title: string }) => (
	<div className="flex items-center gap-2">
		<span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
			{index}
		</span>
		<h3 className="text-base font-semibold">{title}</h3>
	</div>
);

const MaterializationFormDialog: React.FC<MaterializationFormDialogProps> = ({
	open,
	onOpenChange,
	mode,
	initial,
	onSave
}) => {
	const { t } = useTranslation(['common', 'materialization']);
	const [saving, setSaving] = useState(false);
	const [metrics, setMetrics] = useState<MockMetricOption[]>([]);
	const [dimensions, setDimensions] = useState<MockDimensionOption[]>([]);
	const [topics, setTopics] = useState<{ id: string; name: string }[]>([]);
	const [loadingOptions, setLoadingOptions] = useState(false);

	const [name, setName] = useState('');
	const [metricName, setMetricName] = useState('');
	const [timeGrain, setTimeGrain] = useState<TimeGrain>('day');
	const [groupBy, setGroupBy] = useState<string[]>([]);
	const [dimKeyword, setDimKeyword] = useState('');
	const [dimType, setDimType] = useState<'TIME' | 'CATEGORICAL'>('CATEGORICAL');
	const [showAllDims, setShowAllDims] = useState(false);
	const [writeMode, setWriteMode] = useState<WriteMode>('MERGE');
	const [targetTopicId, setTargetTopicId] = useState<string>('auto');
	const [autoCreateTopic, setAutoCreateTopic] = useState(true);
	const [description, setDescription] = useState('');
	const [enabled, setEnabled] = useState(true);
	const [scheduleEnabled, setScheduleEnabled] = useState(false);
	const [frequency, setFrequency] = useState<ScheduleFrequency>('day');
	const [time, setTime] = useState('02:00');
	const [weekday, setWeekday] = useState('mon');
	const [dayOfMonth, setDayOfMonth] = useState('1');
	const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

	const [preview, setPreview] = useState<PreviewState>(EMPTY_PREVIEW);
	const [previewNonce, setPreviewNonce] = useState(0);
	const [rebuildConfirmOpen, setRebuildConfirmOpen] = useState(false);

	// groupBy/timeGrain form the business key of the stored rows; changing either
	// one makes the backend flag the job so the next run rebuilds full history
	const rebuildChange = useMemo(() => {
		if (mode !== 'edit' || !initial) {
			return null;
		}
		const before = initial.groupBy ?? [];
		const after = groupBy;
		const beforeSet = new Set(before);
		const afterSet = new Set(after);
		const added = after.filter((d) => !beforeSet.has(d));
		const removed = before.filter((d) => !afterSet.has(d));
		const grainChanged = initial.timeGrain !== timeGrain;
		if (added.length === 0 && removed.length === 0 && !grainChanged) {
			return null;
		}
		return { added, removed, grainChanged, from: initial.timeGrain };
	}, [mode, initial, groupBy, timeGrain]);

	useEffect(() => {
		if (!open) {
			return;
		}
		setSaving(false);
		setPreview(EMPTY_PREVIEW);
		setDimKeyword('');
		setDimType('CATEGORICAL');
		setShowAllDims(false);
		setRebuildConfirmOpen(false);
		if (mode === 'edit' && initial) {
			setName(initial.name ?? '');
			setMetricName(initial.metricName);
			setTimeGrain(initial.timeGrain);
			setGroupBy(initial.groupBy ?? []);
			setWriteMode(initial.writeMode);
			setAutoCreateTopic(initial.autoCreateTopic);
			// auto-create rows keep the flag even after a run persisted the
			// concrete topic id; otherwise the select would render blank
			setTargetTopicId(resolveTargetTopicIdOnLoad(initial));
			setDescription(initial.description ?? '');
			setEnabled(initial.enabled);
			setScheduleEnabled(initial.schedule?.enabled ?? false);
			setFrequency(initial.schedule?.frequency ?? 'day');
			setTime(initial.schedule?.time ?? '02:00');
			setWeekday(initial.schedule?.weekday ?? 'mon');
			setDayOfMonth(String(initial.schedule?.dayOfMonth ?? 1));
			setDate(initial.schedule?.date ?? new Date().toISOString().slice(0, 10));
		} else {
			setName('');
			setMetricName('');
			setTimeGrain('day');
			setGroupBy([]);
			setWriteMode('MERGE');
			setAutoCreateTopic(true);
			setTargetTopicId('auto');
			setDescription('');
			setEnabled(true);
			setScheduleEnabled(false);
			setFrequency('day');
			setTime('02:00');
			setWeekday('mon');
			setDayOfMonth('1');
			setDate(new Date().toISOString().slice(0, 10));
		}
	}, [open, mode, initial]);

	useEffect(() => {
		if (!open) {
			return;
		}
		let alive = true;
		setLoadingOptions(true);
		Promise.all([
			materializationService.getMetricOptions(),
			materializationService.getTargetTopics()
		])
			.then(([metricList, topicList]) => {
				if (!alive) {
					return;
				}
				setMetrics(metricList);
				setTopics(topicList);
				if (mode === 'create' && metricList.length > 0 && !metricName) {
					setMetricName(metricList[0].name);
				}
			})
			.finally(() => {
				if (alive) {
					setLoadingOptions(false);
				}
			});
		return () => {
			alive = false;
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [open, mode]);

	useEffect(() => {
		if (!open || !metricName) {
			setDimensions([]);
			return;
		}
		let alive = true;
		materializationService
			.getDimensionsByMetric(metricName)
			.then((dims) => {
				if (alive) {
					setDimensions(dims);
					// drop selected dims that no longer exist for this metric
					setGroupBy((prev) => prev.filter((id) => dims.some((d) => d.id === id)));
				}
			})
			.catch(() => {
				if (alive) {
					setDimensions([]);
				}
			});
		return () => {
			alive = false;
		};
	}, [open, metricName]);

	// Live preview: same group_by the backend will compute with, so the table
	// mirrors what the materialization run writes into the target topic.
	const groupByKey = groupBy.join('|');
	const previewGroupBy = useMemo(
		() => buildGroupBy(groupBy, timeGrain, isTimeDimensionByName),
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[groupByKey, timeGrain]
	);

	useEffect(() => {
		if (!open || !metricName) {
			setPreview(EMPTY_PREVIEW);
			return;
		}
		let alive = true;
		setPreview((prev) => ({ ...prev, status: 'loading' }));
		const timer = setTimeout(async () => {
			try {
				const columns = [...(previewGroupBy ?? []), metricName];
				if (materializationService.isMockMode) {
					const rows = Array.from({ length: 8 }, (_, i) =>
						columns.map((col) => {
							if (col === metricName) {
								return 1200 + i * 137;
							}
							if (col.includes('__') || /(date|time|day|month|year|week|quarter)/i.test(col)) {
								return `2026-${String((i % 9) + 1).padStart(2, '0')}-${String((i % 27) + 1).padStart(2, '0')}`;
							}
							return `${col}#${(i % 4) + 1}`;
						})
					);
					if (alive) {
						setPreview({ status: 'ready', columns, rows });
					}
					return;
				}
				const resp = await metricsService.getMetricValue({
					metric: metricName,
					group_by: previewGroupBy,
					limit: PREVIEW_LIMIT
				});
				if (alive) {
					setPreview({
						status: 'ready',
						columns: resp.column_names ?? [],
						rows: Array.isArray(resp.data) ? resp.data : []
					});
				}
			} catch (e) {
				if (alive) {
					setPreview({
						status: 'error',
						columns: [],
						rows: [],
						error: e instanceof Error ? e.message : String(e)
					});
				}
			}
		}, 400);
		return () => {
			alive = false;
			clearTimeout(timer);
		};
	}, [open, metricName, previewGroupBy, previewNonce]);

	const selectedMetric = metrics.find((m) => m.name === metricName);
	const targetTopic = topics.find((tp) => tp.id === targetTopicId);

	const factorMapping: FactorMappingColumn[] = useMemo(
		() => buildMockFactorMapping(metricName || 'metric_value', timeGrain, groupBy),
		[metricName, timeGrain, groupBy]
	);

	// Build a Chart style dimension picker: a type tab (time / categorical),
	// a keyword filter, and a capped list with a show-all toggle.
	// The active tab falls back to the first type actually present so a metric
	// with only time dimensions never renders an empty list.
	const presentDimTypes = useMemo(() => {
		const types = new Set<'TIME' | 'CATEGORICAL'>();
		dimensions.forEach((d) => types.add(isTimeDimensionOption(d) ? 'TIME' : 'CATEGORICAL'));
		return types;
	}, [dimensions]);
	const activeDimType = presentDimTypes.has(dimType)
		? dimType
		: Array.from(presentDimTypes)[0] ?? dimType;

	const { matchedDimensions, visibleDimensions, dimsTruncated } = useMemo(() => {
		const keyword = dimKeyword.trim().toLowerCase();
		const byType = dimensions.filter((d) =>
			activeDimType === 'TIME' ? isTimeDimensionOption(d) : !isTimeDimensionOption(d)
		);
		const matched = keyword
			? byType.filter(
					(d) =>
						d.name.toLowerCase().includes(keyword) ||
						(d.qualifiedName ?? '').toLowerCase().includes(keyword)
				)
			: byType;
		return {
			matchedDimensions: matched,
			visibleDimensions: showAllDims ? matched : matched.slice(0, MAX_DIM_DISPLAY),
			dimsTruncated: !showAllDims && matched.length > MAX_DIM_DISPLAY
		};
	}, [dimensions, activeDimType, dimKeyword, showAllDims]);

	const toggleDimension = (id: string) => {
		setGroupBy((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
	};

	// a stored topic may be missing from the (datamart-filtered) topic list —
	// inject it as an option so the select never renders blank on reopen
	const topicOptions = useMemo(() => {
		if (!targetTopicId || targetTopicId === 'auto' || topics.some((tp) => tp.id === targetTopicId)) {
			return topics;
		}
		return [...topics, { id: targetTopicId, name: initial?.targetTopicName || targetTopicId }];
	}, [topics, targetTopicId, initial]);

	const dimLabel = (id: string) => dimensions.find((d) => d.id === id)?.name ?? id;

	const renderDimensionRow = (dim: MockDimensionOption) => (
		<label
			key={dim.id}
			className={cn(
				'flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm transition-colors',
				groupBy.includes(dim.id) ? 'bg-accent/50' : 'hover:bg-accent/20'
			)}
		>
			<Checkbox
				checked={groupBy.includes(dim.id)}
				onCheckedChange={() => toggleDimension(dim.id)}
			/>
			<span className="min-w-0 flex-1 truncate">{dim.name}</span>
			{dim.qualifiedName && (
				<span className="max-w-[40%] truncate text-xs text-muted-foreground">
					{dim.qualifiedName}
				</span>
			)}
		</label>
	);

	const handleSave = async (skipRebuildConfirm = false) => {
		if (!metricName) {
			return;
		}
		if (rebuildChange && !skipRebuildConfirm) {
			setRebuildConfirmOpen(true);
			return;
		}
		setSaving(true);
		try {
			const isAuto = targetTopicId === 'auto';
			await onSave({
				...(mode === 'edit' && initial ? { materializationId: initial.materializationId } : {}),
				name: name || undefined,
				metricId: selectedMetric?.id ?? metricName,
				metricName,
				metricLabel: selectedMetric?.label,
				autoCreateTopic: isAuto ? true : autoCreateTopic,
				// '' clears a previously stored topic on the backend (switching back to auto-create);
				// undefined would be dropped by JSON.stringify and keep the old value
				targetTopicId: isAuto ? '' : targetTopicId,
				targetTopicName: isAuto ? '' : targetTopic?.name,
				timeGrain,
				groupBy,
				writeMode,
				engine: initial?.engine ?? 'AUTO',
				schedule: {
					enabled: scheduleEnabled,
					frequency,
					time,
					...(frequency === 'once' ? { date } : {}),
					...(frequency === 'week' ? { weekday } : {}),
					...(frequency === 'month' ? { dayOfMonth: Number(dayOfMonth) } : {})
				},
				factorMapping,
				enabled,
				description: description || undefined
			});
			onOpenChange(false);
		} catch {
			// keep the sheet open; the page is responsible for the error toast
		} finally {
			setSaving(false);
		}
	};

	const renderPreviewTable = () => {
		if (!metricName) {
			return (
				<div className="flex h-full min-h-[240px] flex-col items-center justify-center rounded-md border border-dashed text-muted-foreground">
					<Table2 className="mb-2 h-8 w-8 opacity-50" />
					<p className="text-sm">{t('materialization:form.previewSelectMetric')}</p>
				</div>
			);
		}
		if (preview.status === 'loading') {
			return (
				<div className="flex h-full min-h-[240px] items-center justify-center rounded-md border border-dashed text-muted-foreground">
					<Loader2 className="mr-2 h-5 w-5 animate-spin" />
					<span className="text-sm">{t('common:loading')}</span>
				</div>
			);
		}
		if (preview.status === 'error') {
			return (
				<div className="flex h-full min-h-[240px] flex-col items-center justify-center rounded-md border border-dashed text-center">
					<AlertCircle className="mb-2 h-8 w-8 text-destructive opacity-70" />
					<p className="text-sm text-muted-foreground">{t('materialization:form.previewFailed')}</p>
					{preview.error && (
						<p className="mt-1 max-w-[80%] break-all text-xs text-destructive">{preview.error}</p>
					)}
					<Button
						variant="outline"
						size="sm"
						className="mt-3"
						onClick={() => setPreviewNonce((n) => n + 1)}
					>
						<RefreshCw className="mr-2 h-3.5 w-3.5" />
						{t('materialization:form.previewRetry')}
					</Button>
				</div>
			);
		}
		if (preview.status === 'ready' && preview.rows.length === 0) {
			return (
				<div className="flex h-full min-h-[240px] flex-col items-center justify-center rounded-md border border-dashed text-muted-foreground">
					<Table2 className="mb-2 h-8 w-8 opacity-50" />
					<p className="text-sm">{t('materialization:form.previewNoData')}</p>
				</div>
			);
		}
		const shownRows = preview.rows.slice(0, PREVIEW_DISPLAY_ROWS);
		return (
			<div className="rounded-md border">
				<ScrollArea className="max-h-[360px]">
					<table className="w-full text-sm">
						<thead className="sticky top-0 z-10 bg-muted/50 text-left text-xs text-muted-foreground">
							<tr>
								{preview.columns.map((col) => (
									<th key={col} className="px-3 py-2 font-medium">
										{col}
									</th>
								))}
							</tr>
						</thead>
						<tbody>
							{shownRows.map((row, rowIndex) => (
								<tr key={rowIndex} className="border-t">
									{row.map((cell, cellIndex) => (
										<td
											key={cellIndex}
											className={cn(
												'max-w-[240px] truncate px-3 py-2',
												typeof cell === 'number' ? 'text-right tabular-nums' : ''
											)}
											title={cell === null || cell === undefined ? '' : String(cell)}
										>
											{cell === null || cell === undefined ? '-' : String(cell)}
										</td>
									))}
								</tr>
							))}
						</tbody>
					</table>
				</ScrollArea>
				{preview.rows.length > PREVIEW_DISPLAY_ROWS && (
					<p className="border-t px-3 py-2 text-xs text-muted-foreground">
						{t('materialization:form.previewTruncated', {
							count: PREVIEW_DISPLAY_ROWS,
							total: preview.rows.length
						})}
					</p>
				)}
			</div>
		);
	};

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent side="right" className="w-[95vw] sm:max-w-[1100px] p-0">
				<div className="flex h-full flex-col">
					<SheetHeader className="px-6 pt-6 pb-4 border-b">
						<SheetTitle className="flex items-center gap-2">
							<Database className="h-5 w-5 text-muted-foreground" />
							{mode === 'edit'
								? t('materialization:form.editTitle')
								: t('materialization:form.createTitle')}
						</SheetTitle>
						<SheetDescription>{t('materialization:form.description')}</SheetDescription>
					</SheetHeader>

					{loadingOptions ? (
						<div className="flex flex-1 items-center justify-center">
							<Loader2 className="h-6 w-6 animate-spin text-primary" />
						</div>
					) : (
						<div className="flex-1 overflow-y-auto p-6">
							<div className="grid grid-cols-12 gap-6">
								{/* Left: configuration */}
								<Card className="col-span-12 lg:col-span-5 h-fit border-l-4 border-l-primary/20">
									<CardHeader className="pb-3">
										<CardTitle className="text-lg">
											{t('materialization:form.configTitle')}
										</CardTitle>
										<CardDescription>{t('materialization:form.configDescription')}</CardDescription>
									</CardHeader>
									<CardContent className="space-y-6">
										<section className="space-y-4">
											<SectionTitle index={1} title={t('materialization:form.sectionBasic')} />
											<div className="space-y-2">
												<Label>{t('materialization:form.name')}</Label>
												<Input
													value={name}
													onChange={(e) => setName(e.target.value)}
													placeholder={t('materialization:form.namePlaceholder')}
												/>
											</div>
											<div className="space-y-2">
												<Label>{t('materialization:form.metric')}</Label>
												<Select value={metricName} onValueChange={setMetricName}>
													<SelectTrigger>
														<SelectValue placeholder={t('materialization:form.selectMetric')} />
													</SelectTrigger>
													<SelectContent>
														{metrics.map((m) => (
															<SelectItem key={m.name} value={m.name}>
																{m.label}
															</SelectItem>
														))}
													</SelectContent>
												</Select>
											</div>
											<div className="space-y-2">
												<Label>{t('materialization:form.descriptionLabel')}</Label>
												<Textarea
													value={description}
													onChange={(e) => setDescription(e.target.value)}
													placeholder={t('materialization:form.descriptionPlaceholder')}
													rows={2}
												/>
											</div>
										</section>

										<Separator />

										<section className="space-y-4">
											<SectionTitle
												index={2}
												title={t('materialization:form.sectionDimensions')}
											/>
											<div className="space-y-2">
												<Label>{t('materialization:form.timeGrain')}</Label>
												<Select
													value={timeGrain}
													onValueChange={(v) => setTimeGrain(v as TimeGrain)}
												>
													<SelectTrigger>
														<SelectValue />
													</SelectTrigger>
													<SelectContent>
														{TIME_GRAINS.map((g) => (
															<SelectItem key={g} value={g}>
																{t(`materialization:timeGrains.${g}`)}
															</SelectItem>
														))}
													</SelectContent>
												</Select>
											</div>
											<div className="space-y-2">
												<div className="flex items-center justify-between">
													<Label>{t('materialization:form.groupBy')}</Label>
													{groupBy.length > 0 && (
														<Badge variant="secondary" className="text-xs">
															{t('materialization:form.dimSelected', {
																count: groupBy.length
															})}
														</Badge>
													)}
												</div>
												<p className="text-xs text-muted-foreground">
													{t('materialization:form.groupByHint')}
												</p>
												{dimensions.length === 0 ? (
													<div className="rounded-md border border-dashed py-6 text-center text-sm text-muted-foreground">
														{t('materialization:form.noDimensions')}
													</div>
												) : (
													<Tabs
														value={activeDimType}
														onValueChange={(v) => setDimType(v as 'TIME' | 'CATEGORICAL')}
														className="w-full"
													>
														<TabsList className="mb-2 grid w-full grid-cols-2">
															<TabsTrigger value="TIME" className="text-xs">
																{t('materialization:form.dimGroupTime')}
															</TabsTrigger>
															<TabsTrigger value="CATEGORICAL" className="text-xs">
																{t('materialization:form.dimGroupCategory')}
															</TabsTrigger>
														</TabsList>
														<div className="relative mb-2">
															<Search className="absolute left-2 top-2.5 h-3 w-3 text-muted-foreground" />
															<Input
																value={dimKeyword}
																onChange={(e) => setDimKeyword(e.target.value)}
																placeholder={t('materialization:form.dimFilter')}
																className="h-8 pl-7 text-xs"
															/>
														</div>
														<ScrollArea className="h-[200px] rounded-md border p-2">
															<div className="grid grid-cols-1 gap-1">
																{visibleDimensions.map(renderDimensionRow)}
																{matchedDimensions.length === 0 && (
																	<p className="py-4 text-center text-xs text-muted-foreground">
																		{t('materialization:form.dimNoMatch')}
																	</p>
																)}
															</div>
														</ScrollArea>
														{dimsTruncated && (
															<button
																type="button"
																className="w-full py-1.5 text-center text-xs text-primary hover:underline"
																onClick={() => setShowAllDims((v) => !v)}
															>
																{showAllDims
																	? t('materialization:form.dimShowTop')
																	: t('materialization:form.dimShowAll', {
																			count: matchedDimensions.length
																		})}
															</button>
														)}
													</Tabs>
												)}
											</div>
										</section>

										<Separator />

										<section className="space-y-4">
											<SectionTitle
												index={3}
												title={t('materialization:form.sectionMaterialize')}
											/>
											<div className="space-y-2">
												<Label>{t('materialization:form.targetTopic')}</Label>
												<Select
													value={targetTopicId}
													onValueChange={(v) => {
														setTargetTopicId(v);
														setAutoCreateTopic(v === 'auto');
													}}
												>
													<SelectTrigger>
														<SelectValue placeholder={t('materialization:form.selectTopic')} />
													</SelectTrigger>
													<SelectContent>
														<SelectItem value="auto">
															{t('materialization:form.autoCreateTopic')}
														</SelectItem>
														{topicOptions.map((tp) => (
															<SelectItem key={tp.id} value={tp.id}>
																{tp.name}
															</SelectItem>
														))}
													</SelectContent>
												</Select>
												<p className="text-xs text-muted-foreground">
													{targetTopicId === 'auto'
														? t('materialization:form.autoCreateHint')
														: t('materialization:form.existingTopicHint')}
												</p>
											</div>
											<div className="space-y-2">
												<Label>{t('materialization:form.writeMode')}</Label>
												<RadioGroup
													value={writeMode}
													onValueChange={(v) => setWriteMode(v as WriteMode)}
													className="flex gap-4 pt-1"
												>
													{WRITE_MODES.map((wm) => (
														<label
															key={wm}
															className="flex cursor-pointer items-center gap-2 text-sm"
														>
															<RadioGroupItem value={wm} />
															{t(`materialization:writeModes.${wm}`)}
														</label>
													))}
												</RadioGroup>
												{writeMode === 'TRUNCATE_INSERT' && (
													<p className="text-xs text-amber-600 dark:text-amber-400">
														{t('materialization:form.truncateWarning')}
													</p>
												)}
											</div>

											<div className="flex items-center justify-between rounded-lg border px-4 py-3">
												<div>
													<div className="text-sm font-medium">
														{t('materialization:form.enableSchedule')}
													</div>
													<div className="text-xs text-muted-foreground">
														{t('materialization:form.enableScheduleHint')}
													</div>
												</div>
												<Switch checked={scheduleEnabled} onCheckedChange={setScheduleEnabled} />
											</div>

											{scheduleEnabled && (
												<div className="grid grid-cols-2 gap-4">
													<div className="space-y-2">
														<Label>{t('materialization:form.frequency')}</Label>
														<Select
															value={frequency}
															onValueChange={(v) => setFrequency(v as ScheduleFrequency)}
														>
															<SelectTrigger>
																<SelectValue />
															</SelectTrigger>
															<SelectContent>
																<SelectItem value="once">
																	{t('materialization:frequencies.once')}
																</SelectItem>
																<SelectItem value="day">
																	{t('materialization:frequencies.day')}
																</SelectItem>
																<SelectItem value="week">
																	{t('materialization:frequencies.week')}
																</SelectItem>
																<SelectItem value="month">
																	{t('materialization:frequencies.month')}
																</SelectItem>
															</SelectContent>
														</Select>
													</div>
													<div className="space-y-2">
														<Label>{t('materialization:form.runAt')}</Label>
														<Input
															type="time"
															value={time}
															onChange={(e) => setTime(e.target.value)}
														/>
													</div>
													{frequency === 'once' && (
														<div className="space-y-2">
															<Label>{t('materialization:form.runDate')}</Label>
															<Input
																type="date"
																value={date}
																onChange={(e) => setDate(e.target.value)}
															/>
														</div>
													)}
													{frequency === 'week' && (
														<div className="space-y-2">
															<Label>{t('materialization:form.weekday')}</Label>
															<Select value={weekday} onValueChange={setWeekday}>
																<SelectTrigger>
																	<SelectValue />
																</SelectTrigger>
																<SelectContent>
																	{WEEKDAYS.map((w) => (
																		<SelectItem key={w} value={w}>
																			{t(`materialization:weekdays.${w}`)}
																		</SelectItem>
																	))}
																</SelectContent>
															</Select>
														</div>
													)}
													{frequency === 'month' && (
														<div className="space-y-2">
															<Label>{t('materialization:form.dayOfMonth')}</Label>
															<Select value={dayOfMonth} onValueChange={setDayOfMonth}>
																<SelectTrigger>
																	<SelectValue />
																</SelectTrigger>
																<SelectContent>
																	{Array.from({ length: 31 }, (_, i) => String(i + 1)).map(
																		(d) => (
																			<SelectItem key={d} value={d}>
																				{d}
																			</SelectItem>
																		)
																	)}
																</SelectContent>
															</Select>
														</div>
													)}
												</div>
											)}

											<div className="flex items-center justify-between rounded-lg border px-4 py-3">
												<div>
													<div className="text-sm font-medium">
														{t('materialization:form.enableJob')}
													</div>
													<div className="text-xs text-muted-foreground">
														{t('materialization:form.enableJobHint')}
													</div>
												</div>
												<Switch checked={enabled} onCheckedChange={setEnabled} />
											</div>
										</section>
									</CardContent>
								</Card>

								{/* Right: live data preview + target schema */}
								<Card className="col-span-12 lg:col-span-7 h-full flex flex-col border-l-4 border-l-blue-500/20">
									<CardHeader className="pb-2 border-b">
										<div className="flex items-center justify-between gap-2">
											<div className="space-y-1">
												<CardTitle className="text-lg flex items-center gap-2">
													<Table2 className="h-5 w-5 text-blue-500" />
													{t('materialization:form.previewTitle')}
												</CardTitle>
												<CardDescription>
													{t('materialization:form.previewLiveHint', {
														count: PREVIEW_DISPLAY_ROWS
													})}
												</CardDescription>
											</div>
											<div className="flex items-center gap-2">
												{preview.status === 'ready' && (
													<Badge variant="outline" className="text-xs">
														{t('materialization:form.previewRows', {
															count: preview.rows.length
														})}
													</Badge>
												)}
												<Button
													variant="outline"
													size="sm"
													disabled={!metricName || preview.status === 'loading'}
													onClick={() => setPreviewNonce((n) => n + 1)}
												>
													<RefreshCw
														className={cn(
															'mr-2 h-3.5 w-3.5',
															preview.status === 'loading' && 'animate-spin'
														)}
													/>
													{t('common:refresh')}
												</Button>
											</div>
										</div>
									</CardHeader>
									<CardContent className="flex-1 space-y-6 p-6">
										{renderPreviewTable()}

										<div className="space-y-2">
											<div>
												<h4 className="text-sm font-semibold">
													{t('materialization:form.targetSchema')}
												</h4>
												<p className="text-xs text-muted-foreground">
													{t('materialization:form.previewHint')}
												</p>
											</div>
											<div className="rounded-md border overflow-hidden">
												<table className="w-full text-sm">
													<thead className="bg-muted/50 text-left text-xs text-muted-foreground">
														<tr>
															<th className="px-3 py-2 font-medium">
																{t('materialization:form.previewColumn')}
															</th>
															<th className="px-3 py-2 font-medium">
																{t('materialization:form.previewFactor')}
															</th>
															<th className="px-3 py-2 font-medium">
																{t('materialization:form.previewType')}
															</th>
															<th className="px-3 py-2 font-medium">
																{t('materialization:form.previewRole')}
															</th>
															<th className="px-3 py-2 font-medium">
																{t('materialization:form.previewSource')}
															</th>
														</tr>
													</thead>
													<tbody>
														{factorMapping.map((col) => (
															<tr key={col.columnName} className="border-t">
																<td className="px-3 py-2 font-mono text-xs">
																	{col.columnName}
																</td>
																<td className="px-3 py-2 font-mono text-xs">
																	{col.factorName}
																</td>
																<td className="px-3 py-2">
																	<Badge variant="outline" className="text-xs">
																		{col.factorType}
																	</Badge>
																</td>
																<td className="px-3 py-2">
																	<Badge
																		variant="secondary"
																		className={cn(
																			'text-xs',
																			col.role === 'metric' &&
																				'bg-emerald-100 text-emerald-800',
																			col.role === 'time' && 'bg-sky-100 text-sky-800'
																		)}
																	>
																		{t(`materialization:roles.${col.role}`)}
																	</Badge>
																</td>
																<td className="px-3 py-2 font-mono text-xs text-muted-foreground">
																	{col.source ?? '-'}
																</td>
															</tr>
														))}
													</tbody>
												</table>
											</div>
										</div>
									</CardContent>
									<CardFooter className="border-t bg-muted/10 py-4 flex justify-end gap-2">
										<Button
											variant="outline"
											onClick={() => onOpenChange(false)}
											disabled={saving}
										>
											{t('common:cancel')}
										</Button>
										<Button
											onClick={() => void handleSave()}
											disabled={saving || loadingOptions || !metricName}
										>
											{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
											{mode === 'edit'
												? t('common:saveChanges')
												: t('materialization:form.create')}
										</Button>
									</CardFooter>
								</Card>
							</div>
						</div>
					)}
				</div>

				<AlertDialog open={rebuildConfirmOpen} onOpenChange={setRebuildConfirmOpen}>
					<AlertDialogContent>
						<AlertDialogHeader>
							<AlertDialogTitle>
								{t('materialization:form.rebuildConfirmTitle')}
							</AlertDialogTitle>
							<AlertDialogDescription className="space-y-2">
								<p>{t('materialization:form.rebuildConfirmBody')}</p>
								{rebuildChange && rebuildChange.added.length > 0 && (
									<p className="font-medium text-foreground">
										{t('materialization:form.rebuildAdded', {
											list: rebuildChange.added.map(dimLabel).join(', ')
										})}
									</p>
								)}
								{rebuildChange && rebuildChange.removed.length > 0 && (
									<p className="font-medium text-foreground">
										{t('materialization:form.rebuildRemoved', {
											list: rebuildChange.removed.map(dimLabel).join(', ')
										})}
									</p>
								)}
								{rebuildChange?.grainChanged && (
									<p className="font-medium text-foreground">
										{t('materialization:form.rebuildGrain', {
											from: t(`materialization:timeGrains.${rebuildChange.from}`),
											to: t(`materialization:timeGrains.${timeGrain}`)
										})}
									</p>
								)}
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel>{t('common:cancel')}</AlertDialogCancel>
							<AlertDialogAction onClick={() => void handleSave(true)}>
								{t('materialization:form.rebuildConfirmOk')}
							</AlertDialogAction>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialog>
			</SheetContent>
		</Sheet>
	);
};

export default MaterializationFormDialog;
