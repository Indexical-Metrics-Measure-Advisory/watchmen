import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Download, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { KpiCard } from '@/components/dqc/common';
import { piiService } from '@/services/piiService';
import {
	PII_CATEGORIES,
	PII_SENSITIVITY_LEVELS,
	PiiMatchStrategy,
	type LinkedFactor,
	type PIIClassificationTerm,
} from '@/models/pii';

const NONE = '__none__';

/** Create/edit term dialog. */
const TermDialog: React.FC<{
	open: boolean;
	onOpenChange: (open: boolean) => void;
	term?: PIIClassificationTerm | null;
	onSaved: () => void;
}> = ({ open, onOpenChange, term, onSaved }) => {
	const { t } = useTranslation(['dqc', 'common']);
	const [draft, setDraft] = useState({
		name: '',
		description: '',
		category: NONE,
		sensitivityLevel: NONE,
		dataLevel: '',
		ownerDepartment: '',
		matchStrategy: PiiMatchStrategy.LOGIC as string,
		factorTypePatterns: '',
		keywordPatterns: '',
	});

	React.useEffect(() => {
		if (!open) return;
		setDraft({
			name: term?.name ?? '',
			description: term?.description ?? '',
			category: term?.category ?? NONE,
			sensitivityLevel: term?.sensitivityLevel ?? NONE,
			dataLevel: term?.dataLevel ?? '',
			ownerDepartment: term?.ownerDepartment ?? '',
			matchStrategy: term?.matchStrategy ?? PiiMatchStrategy.LOGIC,
			factorTypePatterns: (term?.factorTypePatterns ?? []).join(', '),
			keywordPatterns: (term?.keywordPatterns ?? []).join(', '),
		});
	}, [open, term]);

	const saveMutation = useMutation({
		mutationFn: (payload: PIIClassificationTerm) => piiService.saveTerm(payload),
		onSuccess: () => {
			toast.success(t('dqc:pii.saved'));
			onOpenChange(false);
			onSaved();
		},
		onError: (err: any) => toast.error(err?.message || t('dqc:pii.saveFailed')),
	});

	const splitPatterns = (value: string) => value.split(',').map((x) => x.trim()).filter((x) => x.length > 0);

	const submit = () => {
		saveMutation.mutate({
			termId: term?.termId,
			name: draft.name,
			description: draft.description || undefined,
			category: draft.category === NONE ? undefined : draft.category,
			sensitivityLevel: draft.sensitivityLevel === NONE ? undefined : draft.sensitivityLevel,
			dataLevel: draft.dataLevel || undefined,
			ownerDepartment: draft.ownerDepartment || undefined,
			matchStrategy: draft.matchStrategy,
			factorTypePatterns: splitPatterns(draft.factorTypePatterns),
			keywordPatterns: splitPatterns(draft.keywordPatterns),
			linkedFactors: term?.linkedFactors ?? [],
			tenantId: term?.tenantId,
			version: term?.version,
		});
	};

	const patch = (key: keyof typeof draft) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
		setDraft((d) => ({ ...d, [key]: e.target.value }));

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-lg">
				<DialogHeader>
					<DialogTitle>{term ? t('dqc:pii.editTerm') : t('dqc:pii.newTerm')}</DialogTitle>
				</DialogHeader>
				<div className="grid grid-cols-2 gap-3">
					<div className="col-span-2 flex flex-col gap-1.5">
						<Label>{t('common:name')}</Label>
						<Input value={draft.name} onChange={patch('name')} />
					</div>
					<div className="col-span-2 flex flex-col gap-1.5">
						<Label>{t('common:description')}</Label>
						<Textarea value={draft.description} onChange={patch('description')} rows={2} />
					</div>
					<div className="flex flex-col gap-1.5">
						<Label>{t('dqc:pii.category')}</Label>
						<Select value={draft.category} onValueChange={(v) => setDraft((d) => ({ ...d, category: v }))}>
							<SelectTrigger><SelectValue /></SelectTrigger>
							<SelectContent>
								<SelectItem value={NONE}>{t('common:none')}</SelectItem>
								{PII_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
							</SelectContent>
						</Select>
					</div>
					<div className="flex flex-col gap-1.5">
						<Label>{t('dqc:pii.sensitivityLevel')}</Label>
						<Select value={draft.sensitivityLevel} onValueChange={(v) => setDraft((d) => ({ ...d, sensitivityLevel: v }))}>
							<SelectTrigger><SelectValue /></SelectTrigger>
							<SelectContent>
								<SelectItem value={NONE}>{t('common:none')}</SelectItem>
								{PII_SENSITIVITY_LEVELS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
							</SelectContent>
						</Select>
					</div>
					<div className="flex flex-col gap-1.5">
						<Label>{t('dqc:pii.dataLevel')}</Label>
						<Input value={draft.dataLevel} onChange={patch('dataLevel')} />
					</div>
					<div className="flex flex-col gap-1.5">
						<Label>{t('dqc:pii.ownerDepartment')}</Label>
						<Input value={draft.ownerDepartment} onChange={patch('ownerDepartment')} />
					</div>
					<div className="flex flex-col gap-1.5">
						<Label>{t('dqc:pii.matchStrategy')}</Label>
						<Select value={draft.matchStrategy} onValueChange={(v) => setDraft((d) => ({ ...d, matchStrategy: v }))}>
							<SelectTrigger><SelectValue /></SelectTrigger>
							<SelectContent>
								{Object.values(PiiMatchStrategy).map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
							</SelectContent>
						</Select>
					</div>
					<div className="flex flex-col gap-1.5">
						<Label>{t('dqc:pii.factorTypePatterns')} ({t('dqc:pii.patternsHint')})</Label>
						<Input value={draft.factorTypePatterns} onChange={patch('factorTypePatterns')} />
					</div>
					<div className="col-span-2 flex flex-col gap-1.5">
						<Label>{t('dqc:pii.keywordPatterns')} ({t('dqc:pii.patternsHint')})</Label>
						<Input value={draft.keywordPatterns} onChange={patch('keywordPatterns')} />
					</div>
				</div>
				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)}>{t('common:cancel')}</Button>
					<Button onClick={submit} disabled={!draft.name.trim() || saveMutation.isPending}>
						{t('common:save')}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
};

/** Discovery dialog: runs factor discovery and confirms/removes matches. */
const DiscoverDialog: React.FC<{
	open: boolean;
	onOpenChange: (open: boolean) => void;
	term: PIIClassificationTerm | null;
	onDone: () => void;
}> = ({ open, onOpenChange, term, onDone }) => {
	const { t } = useTranslation(['dqc', 'common']);
	const [factors, setFactors] = useState<LinkedFactor[]>([]);
	const [selected, setSelected] = useState<Set<string>>(new Set());

	const factorKey = (f: LinkedFactor) => `${f.topicId}|${f.factorId}`;

	React.useEffect(() => {
		if (!open) return;
		setFactors(term?.linkedFactors ?? []);
		setSelected(new Set());
	}, [open, term]);

	const discoverMutation = useMutation({
		mutationFn: () => piiService.discover(term!.termId!),
		onSuccess: (result) => {
			setFactors(result.linkedFactors ?? []);
			toast.success(t('dqc:pii.discoverDone'));
		},
		onError: (err: any) => toast.error(err?.message || t('dqc:pii.discoverFailed')),
	});

	const confirmMutation = useMutation({
		mutationFn: (body: { factorIds: string[]; removeFactorIds: string[] }) =>
			piiService.confirm(term!.termId!, body),
		onSuccess: (updated) => {
			setFactors(updated.linkedFactors ?? []);
			setSelected(new Set());
			toast.success(t('dqc:pii.confirmed'));
			onDone();
		},
		onError: (err: any) => toast.error(err?.message || t('dqc:pii.confirmFailed')),
	});

	const toggle = (key: string, checked: boolean) => {
		setSelected((prev) => {
			const next = new Set(prev);
			if (checked) next.add(key); else next.delete(key);
			return next;
		});
	};

	const selectedFactors = factors.filter((f) => selected.has(factorKey(f)));

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-2xl">
				<DialogHeader>
					<DialogTitle>{term?.name} — {t('dqc:pii.linkedFactors')}</DialogTitle>
				</DialogHeader>
				<div className="flex items-center gap-2">
					<Button size="sm" onClick={() => discoverMutation.mutate()} disabled={discoverMutation.isPending}>
						<Search className="mr-1.5 h-4 w-4" />
						{t('dqc:pii.discover')}
					</Button>
					<Button
						size="sm" variant="secondary"
						disabled={selectedFactors.length === 0 || confirmMutation.isPending}
						onClick={() => confirmMutation.mutate({ factorIds: selectedFactors.map((f) => f.factorId), removeFactorIds: [] })}
					>
						{t('dqc:pii.confirmSelected')}
					</Button>
					<Button
						size="sm" variant="destructive"
						disabled={selectedFactors.length === 0 || confirmMutation.isPending}
						onClick={() => confirmMutation.mutate({ factorIds: [], removeFactorIds: selectedFactors.map((f) => f.factorId) })}
					>
						{t('dqc:pii.removeSelected')}
					</Button>
				</div>
				<div className="max-h-96 overflow-auto rounded-md border">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead className="w-10"></TableHead>
								<TableHead>{t('common:topic')}</TableHead>
								<TableHead>{t('common:factor')}</TableHead>
								<TableHead>{t('dqc:pii.confidence')}</TableHead>
								<TableHead>{t('dqc:pii.matchSource')}</TableHead>
								<TableHead>{t('common:status')}</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{factors.length === 0 ? (
								<TableRow>
									<TableCell colSpan={6} className="p-6 text-center text-sm text-muted-foreground">
										{t('dqc:pii.runDiscoverHint')}
									</TableCell>
								</TableRow>
							) : (
								factors.map((factor) => {
									const key = factorKey(factor);
									return (
										<TableRow key={key}>
											<TableCell>
												<Checkbox checked={selected.has(key)} onCheckedChange={(c) => toggle(key, c === true)} />
											</TableCell>
											<TableCell className="text-sm">{factor.topicName ?? factor.topicId}</TableCell>
											<TableCell className="text-sm">{factor.factorLabel || factor.factorName || factor.factorId}</TableCell>
											<TableCell className="text-sm">{(factor.matchConfidence ?? 0).toFixed(2)}</TableCell>
											<TableCell><Badge variant="outline">{factor.matchSource}</Badge></TableCell>
											<TableCell>
												{factor.confirmed
													? <Badge variant="outline" className="border-emerald-500/40 bg-emerald-500/15 text-emerald-400">{t('dqc:pii.confirmedFlag')}</Badge>
													: <Badge variant="outline" className="border-amber-500/40 bg-amber-500/15 text-amber-400">{t('dqc:pii.unconfirmed')}</Badge>}
											</TableCell>
										</TableRow>
									);
								})
							)}
						</TableBody>
					</Table>
				</div>
			</DialogContent>
		</Dialog>
	);
};

/** Overview report tab — GET /dqc/pii-report. */
const ReportTab: React.FC = () => {
	const { t } = useTranslation(['dqc', 'common']);
	const reportQuery = useQuery({ queryKey: ['dqc', 'pii-report'], queryFn: () => piiService.getReport() });

	React.useEffect(() => {
		if (reportQuery.isError) {
			toast.error(t('dqc:pii.reportLoadFailed'));
		}
	}, [reportQuery.isError, t]);

	const exportMutation = useMutation({
		mutationFn: async (fmt: 'csv' | 'xlsx') => {
			const blob = await piiService.exportReport(fmt);
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `pii-report.${fmt}`;
			a.click();
			URL.revokeObjectURL(url);
		},
		onError: (err: any) => toast.error(err?.message || t('dqc:pii.exportFailed')),
	});

	if (reportQuery.isLoading) {
		return <Skeleton className="h-64" />;
	}
	const report = reportQuery.data;
	if (!report) return null;

	const overviewTable = (title: string, rows: typeof report.terms) => (
		<Card>
			<CardHeader>
				<CardTitle className="text-sm font-medium">{title}</CardTitle>
			</CardHeader>
			<CardContent className="p-0">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>{t('common:name')}</TableHead>
							<TableHead>{t('dqc:pii.sensitivityLevel')}</TableHead>
							<TableHead className="text-right">{t('dqc:pii.linkedFactorCount')}</TableHead>
							<TableHead className="text-right">{t('dqc:pii.topicCount')}</TableHead>
							<TableHead className="text-right">{t('dqc:pii.pipelineCount')}</TableHead>
							<TableHead className="text-right">{t('dqc:pii.metricCount')}</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{rows.length === 0 ? (
							<TableRow>
								<TableCell colSpan={6} className="p-6 text-center text-sm text-muted-foreground">{t('common:noData')}</TableCell>
							</TableRow>
						) : (
							rows.map((row) => (
								<TableRow key={row.termId ?? row.termName}>
									<TableCell className="text-sm font-medium">{row.termName}</TableCell>
									<TableCell className="text-sm">{row.sensitivityLevel ?? '-'}</TableCell>
									<TableCell className="text-right">{row.linkedFactorCount}</TableCell>
									<TableCell className="text-right">{row.topicCount}</TableCell>
									<TableCell className="text-right">{row.pipelineCount}</TableCell>
									<TableCell className="text-right">{row.metricCount}</TableCell>
								</TableRow>
							))
						)}
					</TableBody>
				</Table>
			</CardContent>
		</Card>
	);

	return (
		<div className="flex flex-col gap-4">
			<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
				<KpiCard title={t('dqc:pii.totalTerms')} value={report.totalTerms} />
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-sm font-medium text-muted-foreground">{t('dqc:pii.bySensitivity')}</CardTitle>
					</CardHeader>
					<CardContent className="flex flex-wrap gap-1.5">
						{Object.entries(report.bySensitivityLevel ?? {}).map(([level, count]) => (
							<Badge key={level} variant="secondary">{level}: {count}</Badge>
						))}
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-sm font-medium text-muted-foreground">{t('dqc:pii.byCategory')}</CardTitle>
					</CardHeader>
					<CardContent className="flex flex-wrap gap-1.5">
						{Object.entries(report.byCategory ?? {}).map(([category, count]) => (
							<Badge key={category} variant="secondary">{category}: {count}</Badge>
						))}
					</CardContent>
				</Card>
			</div>
			<div className="flex gap-2">
				<Button variant="outline" size="sm" onClick={() => exportMutation.mutate('csv')} disabled={exportMutation.isPending}>
					<Download className="mr-1.5 h-4 w-4" />
					{t('dqc:pii.exportCsv')}
				</Button>
				<Button variant="outline" size="sm" onClick={() => exportMutation.mutate('xlsx')} disabled={exportMutation.isPending}>
					<Download className="mr-1.5 h-4 w-4" />
					{t('dqc:pii.exportXlsx')}
				</Button>
			</div>
			{overviewTable(t('dqc:pii.highRisk'), report.highRiskTerms ?? [])}
			{overviewTable(t('dqc:pii.topImpact'), report.topImpactTerms ?? [])}
			{overviewTable(t('dqc:pii.terms'), report.terms ?? [])}
		</div>
	);
};

const PiiPage: React.FC = () => {
	const { t } = useTranslation(['dqc', 'common']);
	const queryClient = useQueryClient();
	const [dialogOpen, setDialogOpen] = useState(false);
	const [editingTerm, setEditingTerm] = useState<PIIClassificationTerm | null>(null);
	const [deletingTerm, setDeletingTerm] = useState<PIIClassificationTerm | null>(null);
	const [discoveringTerm, setDiscoveringTerm] = useState<PIIClassificationTerm | null>(null);

	const termsQuery = useQuery({ queryKey: ['dqc', 'pii-terms'], queryFn: () => piiService.listTerms() });
	const terms = termsQuery.data ?? [];

	React.useEffect(() => {
		if (termsQuery.isError) {
			toast.error(t('dqc:pii.loadFailed'));
		}
	}, [termsQuery.isError, t]);

	const deleteMutation = useMutation({
		mutationFn: (termId: string) => piiService.deleteTerm(termId),
		onSuccess: () => {
			toast.success(t('dqc:pii.deleted'));
			setDeletingTerm(null);
			queryClient.invalidateQueries({ queryKey: ['dqc', 'pii-terms'] });
		},
		onError: (err: any) => toast.error(err?.message || t('dqc:pii.deleteFailed')),
	});

	return (
		<Tabs defaultValue="terms" className="flex flex-col gap-4">
			<div className="flex items-center justify-between">
				<TabsList>
					<TabsTrigger value="terms">{t('dqc:pii.terms')}</TabsTrigger>
					<TabsTrigger value="report">{t('dqc:pii.report')}</TabsTrigger>
				</TabsList>
				<Button size="sm" onClick={() => { setEditingTerm(null); setDialogOpen(true); }}>
					<Plus className="mr-1.5 h-4 w-4" />
					{t('dqc:pii.newTerm')}
				</Button>
			</div>

			<TabsContent value="terms">
				<Card>
					<CardContent className="p-0">
						{termsQuery.isLoading ? (
							<div className="flex flex-col gap-2 p-4">
								{[0, 1, 2].map((i) => <Skeleton key={i} className="h-10" />)}
							</div>
						) : (
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>{t('common:name')}</TableHead>
										<TableHead>{t('dqc:pii.category')}</TableHead>
										<TableHead>{t('dqc:pii.sensitivityLevel')}</TableHead>
										<TableHead>{t('dqc:pii.matchStrategy')}</TableHead>
										<TableHead className="text-right">{t('dqc:pii.linkedFactorCount')}</TableHead>
										<TableHead className="w-36 text-right">{t('common:actions')}</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{terms.length === 0 ? (
										<TableRow>
											<TableCell colSpan={6} className="p-8 text-center text-sm text-muted-foreground">
												{t('common:noData')}
											</TableCell>
										</TableRow>
									) : (
										terms.map((term) => (
											<TableRow key={term.termId}>
												<TableCell className="font-medium">{term.name}</TableCell>
												<TableCell className="text-sm">{term.category ?? '-'}</TableCell>
												<TableCell className="text-sm">{term.sensitivityLevel ?? '-'}</TableCell>
												<TableCell><Badge variant="outline">{term.matchStrategy}</Badge></TableCell>
												<TableCell className="text-right">{(term.linkedFactors ?? []).length}</TableCell>
												<TableCell className="text-right">
													<Button variant="ghost" size="icon" className="h-7 w-7" title={t('dqc:pii.discover')} onClick={() => setDiscoveringTerm(term)}>
														<Search className="h-3.5 w-3.5" />
													</Button>
													<Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingTerm(term); setDialogOpen(true); }}>
														<Pencil className="h-3.5 w-3.5" />
													</Button>
													<Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDeletingTerm(term)}>
														<Trash2 className="h-3.5 w-3.5" />
													</Button>
												</TableCell>
											</TableRow>
										))
									)}
								</TableBody>
							</Table>
						)}
					</CardContent>
				</Card>
			</TabsContent>

			<TabsContent value="report">
				<ReportTab />
			</TabsContent>

			<TermDialog
				open={dialogOpen}
				onOpenChange={setDialogOpen}
				term={editingTerm}
				onSaved={() => queryClient.invalidateQueries({ queryKey: ['dqc', 'pii-terms'] })}
			/>
			<DiscoverDialog
				open={!!discoveringTerm}
				onOpenChange={(open) => !open && setDiscoveringTerm(null)}
				term={discoveringTerm}
				onDone={() => queryClient.invalidateQueries({ queryKey: ['dqc', 'pii-terms'] })}
			/>
			<AlertDialog open={!!deletingTerm} onOpenChange={(open) => !open && setDeletingTerm(null)}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>{t('common:deleteConfirmTitle')}</AlertDialogTitle>
						<AlertDialogDescription>
							{deletingTerm?.name} — {t('common:deleteConfirmMessage')}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>{t('common:cancel')}</AlertDialogCancel>
						<AlertDialogAction onClick={() => deletingTerm?.termId && deleteMutation.mutate(deletingTerm.termId)}>
							{t('common:delete')}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</Tabs>
	);
};

export default PiiPage;
