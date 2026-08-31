import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSidebar } from '@/contexts/SidebarContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import { BarChart3, CheckCircle2, Loader2, Save, Search, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import { MetricOption, UserGroupSummary } from '@/model/userGroupMetrics';
import { fetchMetrics, fetchUserGroups, saveUserGroupMetrics } from '@/services/userGroupMetricsService';

const sameIdSet = (a: Set<string>, b: Set<string>) => {
	if (a.size !== b.size) {
		return false;
	}
	for (const id of a) {
		if (!b.has(id)) {
			return false;
		}
	}
	return true;
};

const UserGroupMetrics: React.FC = () => {
	const { collapsed } = useSidebar();
	const { t } = useTranslation('userGroupMetrics');
	const { toast } = useToast();

	const [groups, setGroups] = useState<UserGroupSummary[]>([]);
	const [metrics, setMetrics] = useState<MetricOption[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [groupSearch, setGroupSearch] = useState('');
	const [metricSearch, setMetricSearch] = useState('');
	const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
	// assigned ids are the working copy, saved ids mirror the server state
	const [assignedIds, setAssignedIds] = useState<Set<string>>(new Set());
	const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
	const [isSaving, setIsSaving] = useState(false);

	const loadData = useCallback(async () => {
		setIsLoading(true);
		try {
			const [groupList, metricList] = await Promise.all([fetchUserGroups(), fetchMetrics()]);
			setGroups(groupList);
			setMetrics(metricList);
		} catch (error) {
			toast({
				title: t('loadFailed'),
				description: error instanceof Error ? error.message : String(error),
				variant: 'destructive'
			});
		} finally {
			setIsLoading(false);
		}
	}, [t, toast]);

	useEffect(() => {
		void loadData();
	}, [loadData]);

	const selectGroup = (group: UserGroupSummary) => {
		setSelectedGroupId(group.userGroupId);
		const ids = new Set(group.metricIds ?? []);
		setAssignedIds(ids);
		setSavedIds(new Set(ids));
	};

	const toggleMetric = (metricId: string) => {
		setAssignedIds(prev => {
			const next = new Set(prev);
			if (next.has(metricId)) {
				next.delete(metricId);
			} else {
				next.add(metricId);
			}
			return next;
		});
	};

	const handleSave = async () => {
		if (!selectedGroupId) {
			return;
		}
		setIsSaving(true);
		try {
			const metricIds = Array.from(assignedIds);
			const saved = await saveUserGroupMetrics(selectedGroupId, metricIds);
			setGroups(prev => prev.map(group =>
				group.userGroupId === selectedGroupId ? { ...group, metricIds: saved.metricIds ?? metricIds } : group));
			setSavedIds(new Set(assignedIds));
			toast({ title: t('savedSuccess') });
		} catch (error) {
			toast({
				title: t('saveFailed'),
				description: error instanceof Error ? error.message : String(error),
				variant: 'destructive'
			});
		} finally {
			setIsSaving(false);
		}
	};

	const filteredGroups = useMemo(() => {
		const keyword = groupSearch.trim().toLowerCase();
		if (!keyword) {
			return groups;
		}
		return groups.filter(group => group.name?.toLowerCase().includes(keyword));
	}, [groups, groupSearch]);

	const filteredMetrics = useMemo(() => {
		const keyword = metricSearch.trim().toLowerCase();
		if (!keyword) {
			return metrics;
		}
		return metrics.filter(metric =>
			metric.name?.toLowerCase().includes(keyword) || metric.label?.toLowerCase().includes(keyword));
	}, [metrics, metricSearch]);

	const selectedGroup = groups.find(group => group.userGroupId === selectedGroupId) ?? null;
	const isDirty = selectedGroupId !== null && !sameIdSet(assignedIds, savedIds);

	return (
		<div className={cn(
			"min-h-screen flex flex-col transition-all duration-300",
			collapsed ? "ml-[80px]" : "ml-[224px]"
		)}>
			<Sidebar />
			<Header />

			<main className="flex-1 p-6 space-y-4">
				<div>
					<h1 className="text-2xl font-bold tracking-tight">{t('title')}</h1>
					<p className="text-sm text-muted-foreground mt-1">{t('subtitle')}</p>
				</div>

				{isLoading ? (
					<div className="flex items-center justify-center h-64">
						<Loader2 className="h-8 w-8 animate-spin text-primary" />
					</div>
				) : (
					<div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
						<Card className="p-4 flex flex-col gap-3 lg:max-h-[calc(100vh-260px)]">
							<div className="flex items-center gap-2">
								<Users className="h-4 w-4 text-muted-foreground" />
								<span className="font-medium">{t('groups')}</span>
							</div>
							<div className="relative">
								<Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
								<Input
									className="pl-8"
									placeholder={t('searchGroup')}
									value={groupSearch}
									onChange={event => setGroupSearch(event.target.value)}
								/>
							</div>
							<ScrollArea className="h-[calc(100vh-400px)] min-h-48">
								<div className="space-y-1 pr-3">
									{filteredGroups.length === 0 && (
										<div className="text-sm text-muted-foreground py-6 text-center">{t('noGroup')}</div>
									)}
									{filteredGroups.map(group => (
										<button
											key={group.userGroupId}
											className={cn(
												"w-full text-left rounded-lg border px-3 py-2 transition-colors",
												group.userGroupId === selectedGroupId
													? "border-primary bg-primary/5"
													: "border-transparent hover:bg-accent"
											)}
											onClick={() => selectGroup(group)}
										>
											<div className="text-sm font-medium truncate">{group.name}</div>
											{group.description && (
												<div className="text-xs text-muted-foreground truncate mt-0.5">{group.description}</div>
											)}
											<div className="text-xs text-muted-foreground mt-1">
												{t('assignedCount', { count: group.metricIds?.length ?? 0 })}
											</div>
										</button>
									))}
								</div>
							</ScrollArea>
						</Card>

						<Card className="p-4 flex flex-col gap-3 lg:col-span-2 lg:max-h-[calc(100vh-260px)]">
							{!selectedGroup ? (
								<div className="flex-1 flex flex-col items-center justify-center gap-2 py-16 text-muted-foreground">
									<BarChart3 className="h-8 w-8" />
									<div className="text-sm">{t('selectGroup')}</div>
								</div>
							) : (
								<>
									<div className="flex items-center justify-between gap-2">
										<div className="flex items-center gap-2 min-w-0">
											<BarChart3 className="h-4 w-4 text-muted-foreground shrink-0" />
											<span className="font-medium truncate">{selectedGroup.name}</span>
											{isDirty && (
												<Badge variant="outline" className="text-amber-600 border-amber-300">
													{t('unsavedChanges')}
												</Badge>
											)}
										</div>
										<Button size="sm" onClick={handleSave} disabled={!isDirty || isSaving}>
											{isSaving
												? <Loader2 className="mr-1 h-4 w-4 animate-spin" />
												: <Save className="mr-1 h-4 w-4" />}
											{isSaving ? t('saving') : t('save')}
										</Button>
									</div>
									<div className="relative">
										<Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
										<Input
											className="pl-8"
											placeholder={t('searchMetric')}
											value={metricSearch}
											onChange={event => setMetricSearch(event.target.value)}
										/>
									</div>
									<ScrollArea className="h-[calc(100vh-420px)] min-h-48">
										<div className="space-y-1 pr-3">
											{filteredMetrics.length === 0 && (
												<div className="text-sm text-muted-foreground py-6 text-center">{t('noMetric')}</div>
											)}
											{filteredMetrics.map(metric => {
												const metricId = metric.id ?? '';
												const checked = metricId !== '' && assignedIds.has(metricId);
												return (
													<label
														key={metric.id ?? metric.name}
														className="flex items-center gap-3 rounded-lg border border-transparent hover:bg-accent px-3 py-2 cursor-pointer"
													>
														<Checkbox checked={checked} onCheckedChange={() => toggleMetric(metricId)} />
														<div className="min-w-0 flex-1">
															<div className="text-sm font-medium truncate">
																{metric.label || metric.name}
															</div>
															{metric.label && (
																<div className="text-xs text-muted-foreground truncate">{metric.name}</div>
															)}
														</div>
														{metric.publishStatus === 'published' ? (
															<Badge variant="outline" className="text-sky-600 border-sky-300 shrink-0">
																<CheckCircle2 className="mr-1 h-3 w-3" />
																{t('published')}
															</Badge>
														) : (
															<Badge variant="outline" className="text-muted-foreground shrink-0">
																{t('draft')}
															</Badge>
														)}
													</label>
												);
											})}
										</div>
									</ScrollArea>
								</>
							)}
						</Card>
					</div>
				)}
			</main>
		</div>
	);
};

export default UserGroupMetrics;
