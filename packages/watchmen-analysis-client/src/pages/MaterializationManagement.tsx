import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import { useSidebar } from '@/contexts/SidebarContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow
} from '@/components/ui/table';
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
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger
} from '@/components/ui/tooltip';
import {
	CalendarClock,
	History,
	Loader2,
	Play,
	Plus,
	Search,
	Trash2,
	Workflow
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import type { Materialization, ScheduleFrequency } from '@/model/materialization';
import { materializationService } from '@/services/materializationService';
import MaterializationFormDialog from '@/components/materialization/MaterializationFormDialog';

const formatSchedule = (
	schedule: Materialization['schedule'],
	t: (key: string, options?: Record<string, unknown>) => string
): string => {
	if (!schedule?.enabled) {
		return t('materialization:list.scheduleOff');
	}
	const time = schedule.time ?? '00:00';
	const freq = schedule.frequency as ScheduleFrequency;
	if (freq === 'once') {
		return `${t('materialization:frequencies.once')} ${schedule.date ?? ''} ${time}`;
	}
	if (freq === 'day') {
		return `${t('materialization:frequencies.day')} ${time}`;
	}
	if (freq === 'week') {
		const wd = schedule.weekday ? t(`materialization:weekdays.${schedule.weekday}`) : '';
		return `${t('materialization:frequencies.week')} ${wd} ${time}`;
	}
	return `${t('materialization:frequencies.month')} ${schedule.dayOfMonth ?? 1} ${time}`;
};

const MaterializationManagement: React.FC = () => {
	const { collapsed } = useSidebar();
	const { t } = useTranslation(['common', 'materialization']);
	const { toast } = useToast();

	const [items, setItems] = useState<Materialization[]>([]);
	const [loading, setLoading] = useState(true);
	const [keywordInput, setKeywordInput] = useState('');
	const [keyword, setKeyword] = useState('');
	const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
	const [dialogOpen, setDialogOpen] = useState(false);
	const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
	const [editing, setEditing] = useState<Materialization | undefined>(undefined);
	const [deleteTarget, setDeleteTarget] = useState<Materialization | null>(null);
	const [busy, setBusy] = useState(false);

	const load = useCallback(async () => {
		setLoading(true);
		try {
			const list = await materializationService.listMaterializations(keyword);
			setItems(list);
		} catch (error) {
			toast({
				title: t('materialization:list.loadFailed'),
				description: error instanceof Error ? error.message : String(error),
				variant: 'destructive'
			});
		} finally {
			setLoading(false);
		}
	}, [keyword, t, toast]);

	useEffect(() => {
		void load();
	}, [load]);

	// debounce the search box, the backend filters by keyword on reload
	useEffect(() => {
		const timer = setTimeout(() => setKeyword(keywordInput.trim()), 350);
		return () => clearTimeout(timer);
	}, [keywordInput]);

	const filtered = useMemo(() => {
		const kw = keyword.trim().toLowerCase();
		if (!kw) {
			return items;
		}
		return items.filter(
			(item) =>
				(item.name ?? '').toLowerCase().includes(kw) ||
				item.metricName.toLowerCase().includes(kw) ||
				(item.targetTopicName ?? '').toLowerCase().includes(kw)
		);
	}, [items, keyword]);

	const allChecked = filtered.length > 0 && filtered.every((i) => selectedIds.has(i.materializationId));
	const someChecked = filtered.some((i) => selectedIds.has(i.materializationId));

	const toggleAll = () => {
		setSelectedIds((prev) => {
			const next = new Set(prev);
			if (allChecked) {
				filtered.forEach((i) => next.delete(i.materializationId));
			} else {
				filtered.forEach((i) => next.add(i.materializationId));
			}
			return next;
		});
	};

	const toggleOne = (id: string) => {
		setSelectedIds((prev) => {
			const next = new Set(prev);
			if (next.has(id)) {
				next.delete(id);
			} else {
				next.add(id);
			}
			return next;
		});
	};

	const openCreate = () => {
		setDialogMode('create');
		setEditing(undefined);
		setDialogOpen(true);
	};

	const openEdit = (item: Materialization) => {
		setDialogMode('edit');
		setEditing(item);
		setDialogOpen(true);
	};

	const handleSave = async (value: Partial<Materialization>) => {
		try {
			const saved = await materializationService.saveMaterialization(value);
			toast({
				title: t('materialization:list.saved')
			});
			setItems((prev) => {
				const exists = prev.some((m) => m.materializationId === saved.materializationId);
				if (exists) {
					return prev.map((m) => (m.materializationId === saved.materializationId ? saved : m));
				}
				return [saved, ...prev];
			});
		} catch (error) {
			toast({
				title: t('materialization:list.saveFailed'),
				description: error instanceof Error ? error.message : String(error),
				variant: 'destructive'
			});
			throw error;
		}
	};

	const handleToggleEnabled = async (item: Materialization, enabled: boolean) => {
		// optimistic update; the schedule switch is independent and stays as configured
		setItems((prev) => prev.map((m) => (m.materializationId === item.materializationId ? { ...m, enabled } : m)));
		try {
			await materializationService.setEnabled(item.materializationId, enabled);
		} catch (error) {
			toast({
				title: t('materialization:list.saveFailed'),
				description: error instanceof Error ? error.message : String(error),
				variant: 'destructive'
			});
			setItems((prev) => prev.map((m) => (m.materializationId === item.materializationId ? item : m)));
		}
	};

	const handleRun = async (ids: string[]) => {
		if (ids.length === 0) {
			return;
		}
		setBusy(true);
		try {
			await materializationService.runMaterializations(ids);
			toast({
				title: t('materialization:list.runStarted', { count: ids.length })
			});
			setSelectedIds(new Set());
		} catch (error) {
			toast({
				title: t('materialization:list.runFailed'),
				description: error instanceof Error ? error.message : String(error),
				variant: 'destructive'
			});
		} finally {
			setBusy(false);
		}
	};

	const handleBatchToggle = async (enabled: boolean) => {
		const ids = Array.from(selectedIds);
		if (ids.length === 0) {
			return;
		}
		setBusy(true);
		try {
			await Promise.all(ids.map((id) => materializationService.setEnabled(id, enabled)));
			setItems((prev) =>
				prev.map((m) => (selectedIds.has(m.materializationId) ? { ...m, enabled } : m))
			);
			toast({ title: t('materialization:list.saved') });
		} catch (error) {
			toast({
				title: t('materialization:list.saveFailed'),
				description: error instanceof Error ? error.message : String(error),
				variant: 'destructive'
			});
		} finally {
			setBusy(false);
		}
	};

	const handleDelete = async () => {
		if (!deleteTarget) {
			return;
		}
		try {
			await materializationService.deleteMaterialization(deleteTarget.materializationId);
			setItems((prev) => prev.filter((m) => m.materializationId !== deleteTarget.materializationId));
			setSelectedIds((prev) => {
				const next = new Set(prev);
				next.delete(deleteTarget.materializationId);
				return next;
			});
			toast({ title: t('materialization:list.deleted') });
		} catch (error) {
			toast({
				title: t('materialization:list.deleteFailed'),
				description: error instanceof Error ? error.message : String(error),
				variant: 'destructive'
			});
		} finally {
			setDeleteTarget(null);
		}
	};

	return (
		<div className="min-h-screen bg-background">
			<Sidebar />
			<div className={cn('min-h-screen transition-all duration-300', collapsed ? 'pl-20' : 'pl-56')}>
				<Header />

				<main className="container py-8 space-y-6">
					<div className="flex flex-wrap items-start justify-between gap-4">
						<div>
							<h1 className="text-2xl font-bold tracking-tight">{t('materialization:list.title')}</h1>
							<p className="text-muted-foreground">{t('materialization:list.subtitle')}</p>
						</div>
						<div className="flex flex-wrap items-center gap-2">
							<Button variant="outline" size="sm" asChild>
								<Link to="/metrics/materialization/runs">
									<History className="mr-2 h-4 w-4" />
									{t('materialization:list.viewRuns')}
								</Link>
							</Button>
							<Button variant="outline" size="sm" asChild>
								<Link to="/metrics/compute-flow">
									<Workflow className="mr-2 h-4 w-4" />
									{t('materialization:list.viewFlows')}
								</Link>
							</Button>
							<Button size="sm" onClick={openCreate}>
								<Plus className="mr-2 h-4 w-4" />
								{t('materialization:list.create')}
							</Button>
						</div>
					</div>

					<div className="flex flex-wrap items-center gap-2">
						<div className="relative">
							<Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
							<Input
								className="pl-8 w-64"
								placeholder={t('materialization:list.searchPlaceholder')}
								value={keywordInput}
								onChange={(e) => setKeywordInput(e.target.value)}
							/>
						</div>
						<div className="flex items-center gap-2 ml-auto">
							<span className="text-xs text-muted-foreground">
								{t('materialization:list.selectedCount', { count: selectedIds.size })}
							</span>
							<Button
								variant="outline"
								size="sm"
								disabled={selectedIds.size === 0 || busy}
								onClick={() => void handleRun(Array.from(selectedIds))}
							>
								{busy ? (
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								) : (
									<Play className="mr-2 h-4 w-4" />
								)}
								{t('materialization:list.batchRun')}
							</Button>
							<Button
								variant="outline"
								size="sm"
								disabled={selectedIds.size === 0 || busy}
								onClick={() => void handleBatchToggle(true)}
							>
								{t('materialization:list.batchEnable')}
							</Button>
							<Button
								variant="outline"
								size="sm"
								disabled={selectedIds.size === 0 || busy}
								onClick={() => void handleBatchToggle(false)}
							>
								{t('materialization:list.batchDisable')}
							</Button>
						</div>
					</div>

					<Card>
						{loading ? (
							<div className="flex items-center justify-center h-64">
								<Loader2 className="h-8 w-8 animate-spin text-primary" />
							</div>
						) : (
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead className="w-10">
											<Checkbox
												checked={allChecked}
												onCheckedChange={toggleAll}
												aria-label="select all"
											/>
										</TableHead>
										<TableHead>{t('materialization:list.colName')}</TableHead>
										<TableHead>{t('materialization:list.colMetric')}</TableHead>
										<TableHead>{t('materialization:list.colTarget')}</TableHead>
										<TableHead>{t('materialization:list.colGrain')}</TableHead>
										<TableHead>{t('materialization:list.colGroupBy')}</TableHead>
										<TableHead>{t('materialization:list.colWriteMode')}</TableHead>
										<TableHead>{t('materialization:list.colSchedule')}</TableHead>
										<TableHead>{t('materialization:list.colEnabled')}</TableHead>
										<TableHead className="text-right">{t('common:actions')}</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{filtered.length === 0 && (
										<TableRow>
											<TableCell colSpan={10} className="h-32 text-center text-muted-foreground">
												{t('materialization:list.empty')}
											</TableCell>
										</TableRow>
									)}
									{filtered.map((item) => (
										<TableRow key={item.materializationId}>
											<TableCell>
												<Checkbox
													checked={selectedIds.has(item.materializationId)}
													onCheckedChange={() => toggleOne(item.materializationId)}
												/>
											</TableCell>
											<TableCell className="font-medium max-w-[180px] truncate">
												<div className="flex flex-col">
													<span className="truncate">{item.name || item.metricName}</span>
													{item.name && (
														<span className="text-xs text-muted-foreground font-normal truncate">
															{item.materializationId}
														</span>
													)}
												</div>
											</TableCell>
											<TableCell className="max-w-[160px]">
												<div className="truncate text-sm" title={item.metricName}>
													{item.metricLabel || item.metricName}
												</div>
												<div className="truncate text-xs text-muted-foreground font-mono">
													{item.metricName}
												</div>
											</TableCell>
											<TableCell className="max-w-[140px]">
												{item.targetTopicName ? (
													<Badge variant="outline" className="font-mono text-xs truncate">
														{item.targetTopicName}
													</Badge>
												) : (
													<Badge variant="secondary" className="text-xs">
														<Plus className="mr-1 h-3 w-3" />
														{t('materialization:list.autoCreate')}
													</Badge>
												)}
											</TableCell>
											<TableCell>
												<Badge variant="outline">
													{t(`materialization:timeGrains.${item.timeGrain}`)}
												</Badge>
											</TableCell>
											<TableCell>
												<div className="flex flex-wrap gap-1 max-w-[180px]">
													{item.groupBy.length === 0 ? (
														<span className="text-xs text-muted-foreground">-</span>
													) : (
														item.groupBy.map((g) => (
															<Badge key={g} variant="secondary" className="text-xs">
																{g}
															</Badge>
														))
													)}
												</div>
											</TableCell>
											<TableCell>
												<Badge
													variant={item.writeMode === 'MERGE' ? 'default' : 'secondary'}
													className="text-xs"
												>
													{t(`materialization:writeModes.${item.writeMode}`)}
												</Badge>
											</TableCell>
											<TableCell className="text-xs text-muted-foreground whitespace-nowrap">
												<div className="flex items-center gap-1">
													<CalendarClock className="h-3 w-3 shrink-0" />
													{formatSchedule(item.schedule, t)}
												</div>
												{item.schedule?.enabled && (
													<span className="flex items-center gap-1 mt-0.5">
														<Badge variant="outline" className="text-[10px]">
															{t(`materialization:engines.${item.engine}`)}
														</Badge>
													</span>
												)}
											</TableCell>
											<TableCell>
												<Switch
													checked={item.enabled}
													onCheckedChange={(checked) => void handleToggleEnabled(item, checked)}
												/>
											</TableCell>
											<TableCell className="text-right">
												<div className="flex items-center justify-end gap-1">
													<Tooltip>
														<TooltipTrigger asChild>
															<Button
																variant="ghost"
																size="icon"
																className="h-8 w-8"
																onClick={() => void handleRun([item.materializationId])}
																disabled={busy}
															>
																<Play className="h-4 w-4" />
															</Button>
														</TooltipTrigger>
														<TooltipContent>{t('materialization:list.run')}</TooltipContent>
													</Tooltip>
													<Button
														variant="ghost"
														size="sm"
														onClick={() => openEdit(item)}
													>
														{t('common:edit')}
													</Button>
													<Button
														variant="ghost"
														size="icon"
														className="h-8 w-8 text-destructive hover:text-destructive"
														onClick={() => setDeleteTarget(item)}
													>
														<Trash2 className="h-4 w-4" />
													</Button>
												</div>
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						)}
					</Card>
				</main>
			</div>

			<MaterializationFormDialog
				open={dialogOpen}
				onOpenChange={setDialogOpen}
				mode={dialogMode}
				initial={editing}
				onSave={handleSave}
			/>

			<AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>{t('materialization:list.deleteTitle')}</AlertDialogTitle>
						<AlertDialogDescription>
							{t('materialization:list.deleteDescription', {
								name: deleteTarget?.name || deleteTarget?.metricName || ''
							})}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>{t('common:cancel')}</AlertDialogCancel>
						<AlertDialogAction onClick={() => void handleDelete()}>
							{t('common:delete')}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
};

export default MaterializationManagement;
