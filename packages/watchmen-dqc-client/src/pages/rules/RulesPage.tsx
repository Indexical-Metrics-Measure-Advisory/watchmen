import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Pencil, Play, Plus, Save, Trash2 } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
import { Switch } from '@/components/ui/switch';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SeverityBadge } from '@/components/dqc/common';
import { monitorRuleService } from '@/services/monitorRuleService';
import { topicService } from '@/services/topicService';
import {
	MonitorRuleCode,
	MonitorRuleGrade,
	MonitorRuleSeverity,
	MonitorRuleStatisticalInterval,
	type MonitorRule,
	type MonitorRuleParameters,
} from '@/models/monitorRule';
import type { Topic } from '@/models/topic';
import { ruleCodesOfGrade, ruleParamFieldsOf } from '@/utils/ruleCodeDescriptors';

const NUMERIC_PARAM_FIELDS = new Set(['coverageRate', 'aggregation', 'quantile', 'length', 'max', 'min']);

/** Render a rule's params as compact translated key=value text. */
const paramsToText = (params: MonitorRuleParameters | undefined, t: (k: string) => string): string => {
	if (!params) return '-';
	const parts = Object.entries(params)
		.filter(([, v]) => v !== null && v !== undefined && v !== '')
		.map(([k, v]) => `${t(`dqc:param.${k}`)}=${v}`);
	return parts.length === 0 ? '-' : parts.join(', ');
};

/** Convert a dialog draft into a clean MonitorRule (numbers parsed, blanks dropped). */
const draftToRule = (draft: MonitorRule, paramDraft: Record<string, string>): MonitorRule => {
	const params: MonitorRuleParameters = {};
	for (const [key, raw] of Object.entries(paramDraft)) {
		if (raw === '' || raw === null || raw === undefined) continue;
		(params as any)[key] = NUMERIC_PARAM_FIELDS.has(key) ? Number(raw) : raw;
	}
	return {
		...draft,
		params: Object.keys(params).length > 0 ? params : undefined,
	};
};

interface RuleDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	grade: MonitorRuleGrade;
	topic?: Topic;
	rule?: MonitorRule | null;
	onSubmit: (rule: MonitorRule) => void;
}

/** New/edit rule dialog with parameter form driven by the rule code. */
const RuleDialog: React.FC<RuleDialogProps> = ({ open, onOpenChange, grade, topic, rule, onSubmit }) => {
	const { t } = useTranslation(['dqc', 'common']);
	const [code, setCode] = useState<MonitorRuleCode | undefined>(rule?.code);
	const [severity, setSeverity] = useState<MonitorRuleSeverity>(rule?.severity ?? MonitorRuleSeverity.WARN);
	const [factorId, setFactorId] = useState<string>(rule?.factorId ?? '');
	const [paramDraft, setParamDraft] = useState<Record<string, string>>({});
	const [compareTopic, setCompareTopic] = useState<Topic | undefined>(undefined);

	// Re-initialize the draft whenever the dialog is (re)opened
	React.useEffect(() => {
		if (!open) return;
		setCode(rule?.code);
		setSeverity(rule?.severity ?? MonitorRuleSeverity.WARN);
		setFactorId(rule?.factorId ?? '');
		const draft: Record<string, string> = {};
		for (const [k, v] of Object.entries(rule?.params ?? {})) {
			if (v !== null && v !== undefined) draft[k] = String(v);
		}
		setParamDraft(draft);
		setCompareTopic(undefined);
	}, [open, rule]);

	const isFactorCode = code ? ruleCodesOfGrade(MonitorRuleGrade.FACTOR).includes(code) && !ruleCodesOfGrade(MonitorRuleGrade.TOPIC).includes(code) : false;
	const effectiveGrade = grade === MonitorRuleGrade.TOPIC && isFactorCode ? MonitorRuleGrade.FACTOR : grade;
	const availableCodes = grade === MonitorRuleGrade.GLOBAL
		? ruleCodesOfGrade(MonitorRuleGrade.GLOBAL)
		: [...ruleCodesOfGrade(MonitorRuleGrade.TOPIC), ...ruleCodesOfGrade(MonitorRuleGrade.FACTOR).filter((c) => !ruleCodesOfGrade(MonitorRuleGrade.TOPIC).includes(c))];
	const paramFields = ruleParamFieldsOf(code);
	const factors = topic?.factors ?? [];

	const submit = () => {
		if (!code) return;
		const rule_ = draftToRule(
			{
				ruleId: rule?.ruleId,
				code,
				grade: effectiveGrade,
				severity,
				topicId: effectiveGrade === MonitorRuleGrade.GLOBAL ? undefined : topic?.topicId,
				factorId: effectiveGrade === MonitorRuleGrade.FACTOR ? factorId || undefined : undefined,
				enabled: rule?.enabled ?? true,
				tenantId: rule?.tenantId,
				version: rule?.version,
			},
			paramDraft,
		);
		onSubmit(rule_);
		onOpenChange(false);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-lg">
				<DialogHeader>
					<DialogTitle>{rule ? t('dqc:rules.editRule') : t('dqc:rules.newRule')}</DialogTitle>
				</DialogHeader>
				<div className="grid grid-cols-2 gap-3">
					<div className="col-span-2 flex flex-col gap-1.5">
						<Label>{t('dqc:rules.code')}</Label>
						<Select value={code} onValueChange={(v) => setCode(v as MonitorRuleCode)}>
							<SelectTrigger><SelectValue placeholder={t('common:selectPlaceholder')} /></SelectTrigger>
							<SelectContent>
								{availableCodes.map((c) => (
									<SelectItem key={c} value={c}>{t(`dqc:ruleCode.${c}`)}</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<div className="flex flex-col gap-1.5">
						<Label>{t('dqc:rules.severityLabel')}</Label>
						<Select value={severity} onValueChange={(v) => setSeverity(v as MonitorRuleSeverity)}>
							<SelectTrigger><SelectValue /></SelectTrigger>
							<SelectContent>
								{Object.values(MonitorRuleSeverity).map((s) => (
									<SelectItem key={s} value={s}>{t(`dqc:severity.${s}`)}</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					{effectiveGrade === MonitorRuleGrade.FACTOR && (
						<div className="flex flex-col gap-1.5">
							<Label>{t('common:factor')}</Label>
							<Select value={factorId} onValueChange={setFactorId}>
								<SelectTrigger><SelectValue placeholder={t('common:selectPlaceholder')} /></SelectTrigger>
								<SelectContent>
									{factors.map((f) => (
										<SelectItem key={f.factorId} value={f.factorId!}>{f.label || f.name}</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					)}
					{paramFields.map((field) => {
						if (field === 'statisticalInterval') {
							return (
								<div key={field} className="flex flex-col gap-1.5">
									<Label>{t('dqc:param.statisticalInterval')}</Label>
									<Select
										value={paramDraft[field] ?? ''}
										onValueChange={(v) => setParamDraft((d) => ({ ...d, [field]: v }))}
									>
										<SelectTrigger><SelectValue placeholder={t('common:optional')} /></SelectTrigger>
										<SelectContent>
											{Object.values(MonitorRuleStatisticalInterval).map((i) => (
												<SelectItem key={i} value={i}>{t(`dqc:interval.${i}`)}</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
							);
						}
						if (field === 'compareOperator') {
							return (
								<div key={field} className="flex flex-col gap-1.5">
									<Label>{t('dqc:param.compareOperator')}</Label>
									<Select
										value={paramDraft[field] ?? ''}
										onValueChange={(v) => setParamDraft((d) => ({ ...d, [field]: v }))}
									>
										<SelectTrigger><SelectValue placeholder={t('common:optional')} /></SelectTrigger>
										<SelectContent>
											{['eq', 'lt', 'lte', 'gt', 'gte'].map((op) => (
												<SelectItem key={op} value={op}>{t(`dqc:compareOperator.${op}`)}</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
							);
						}
						if (field === 'topicId') {
							return (
								<CompareTopicSelect
									key={field}
									value={paramDraft[field] ?? ''}
									onChange={(topicId, t_) => {
										setParamDraft((d) => ({ ...d, [field]: topicId }));
										setCompareTopic(t_);
									}}
								/>
							);
						}
						if (field === 'factorId') {
							return (
								<div key={field} className="flex flex-col gap-1.5">
									<Label>{t('dqc:param.factorId')}</Label>
									<Select
										value={paramDraft[field] ?? ''}
										onValueChange={(v) => setParamDraft((d) => ({ ...d, [field]: v }))}
									>
										<SelectTrigger><SelectValue placeholder={t('common:selectPlaceholder')} /></SelectTrigger>
										<SelectContent>
											{(compareTopic?.factors ?? factors).map((f) => (
												<SelectItem key={f.factorId} value={f.factorId!}>{f.label || f.name}</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
							);
						}
						return (
							<div key={field} className="flex flex-col gap-1.5">
								<Label>{t(`dqc:param.${field}`)}</Label>
								<Input
									type={NUMERIC_PARAM_FIELDS.has(field) ? 'number' : 'text'}
									value={paramDraft[field] ?? ''}
									onChange={(e) => setParamDraft((d) => ({ ...d, [field]: e.target.value }))}
								/>
							</div>
						);
					})}
				</div>
				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)}>{t('common:cancel')}</Button>
					<Button onClick={submit} disabled={!code || (effectiveGrade === MonitorRuleGrade.FACTOR && !factorId)}>
						{t('common:save')}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
};

/** Topic selector for the compare-topic parameter (loads topics from doll). */
const CompareTopicSelect: React.FC<{ value: string; onChange: (topicId: string, topic?: Topic) => void }> = ({ value, onChange }) => {
	const { t } = useTranslation(['dqc', 'common']);
	const { data: topics } = useQuery({ queryKey: ['dqc', 'topics'], queryFn: () => topicService.getAllTopics() });
	return (
		<div className="flex flex-col gap-1.5">
			<Label>{t('dqc:param.topicId')}</Label>
			<Select value={value} onValueChange={(v) => onChange(v, (topics ?? []).find((topic) => topic.topicId === v))}>
				<SelectTrigger><SelectValue placeholder={t('common:selectPlaceholder')} /></SelectTrigger>
				<SelectContent>
					{(topics ?? []).map((topic) => (
						<SelectItem key={topic.topicId} value={topic.topicId!}>{topic.name}</SelectItem>
					))}
				</SelectContent>
			</Select>
		</div>
	);
};

/** "Run now" dialog — GET /dqc/monitor/rules/run. */
const RunDialog: React.FC<{ open: boolean; onOpenChange: (open: boolean) => void; topics: Topic[] }> = ({ open, onOpenChange, topics }) => {
	const { t } = useTranslation(['dqc', 'common']);
	const [topicName, setTopicName] = useState('');
	const [frequency, setFrequency] = useState<MonitorRuleStatisticalInterval>(MonitorRuleStatisticalInterval.DAILY);
	const [processDate, setProcessDate] = useState('');

	const runMutation = useMutation({
		mutationFn: () => monitorRuleService.runRules({
			topicName: topicName || undefined,
			frequency,
			processDate: processDate || undefined,
		}),
		onSuccess: () => {
			toast.success(t('dqc:rules.runTriggered'));
			onOpenChange(false);
		},
		onError: (err: any) => toast.error(err?.message || t('dqc:rules.runFailed')),
	});

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-md">
				<DialogHeader>
					<DialogTitle>{t('dqc:rules.runDialogTitle')}</DialogTitle>
				</DialogHeader>
				<div className="flex flex-col gap-3">
					<div className="flex flex-col gap-1.5">
						<Label>{t('dqc:rules.runTopicName')}</Label>
						<Input value={topicName} onChange={(e) => setTopicName(e.target.value)} list="dqc-topic-names" />
						<datalist id="dqc-topic-names">
							{topics.map((topic) => <option key={topic.topicId} value={topic.name} />)}
						</datalist>
					</div>
					<div className="flex flex-col gap-1.5">
						<Label>{t('dqc:rules.runFrequency')}</Label>
						<Select value={frequency} onValueChange={(v) => setFrequency(v as MonitorRuleStatisticalInterval)}>
							<SelectTrigger><SelectValue /></SelectTrigger>
							<SelectContent>
								{Object.values(MonitorRuleStatisticalInterval).map((i) => (
									<SelectItem key={i} value={i}>{t(`dqc:interval.${i}`)}</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<div className="flex flex-col gap-1.5">
						<Label>{t('dqc:rules.runProcessDate')}</Label>
						<Input type="date" value={processDate} onChange={(e) => setProcessDate(e.target.value)} />
					</div>
				</div>
				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)}>{t('common:cancel')}</Button>
					<Button onClick={() => runMutation.mutate()} disabled={runMutation.isPending}>
						{t('common:run')}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
};

const RulesPage: React.FC = () => {
	const { t } = useTranslation(['dqc', 'common']);
	const queryClient = useQueryClient();
	const [tab, setTab] = useState<'global' | 'topic'>('global');
	const [selectedTopicId, setSelectedTopicId] = useState<string>('');
	const [rules, setRules] = useState<MonitorRule[]>([]);
	const [dialogOpen, setDialogOpen] = useState(false);
	const [editingRule, setEditingRule] = useState<MonitorRule | null>(null);
	const [runDialogOpen, setRunDialogOpen] = useState(false);

	const topicsQuery = useQuery({ queryKey: ['dqc', 'topics'], queryFn: () => topicService.getAllTopics() });
	const topics = useMemo(() => topicsQuery.data ?? [], [topicsQuery.data]);

	/**
	 * Load the full tenant rule set (global + every topic) up front: the backend
	 * batch-upsert deletes any tenant rule missing from the POST payload, so a
	 * partial save would silently drop rules of other topics.
	 */
	const rulesQuery = useQuery({
		queryKey: ['dqc', 'rules', 'all', topics.map((x) => x.topicId).join(',')],
		enabled: topicsQuery.isSuccess,
		queryFn: async () => {
			const globalRules = await monitorRuleService.findRules(MonitorRuleGrade.GLOBAL);
			const perTopic = await Promise.all(
				topics.map((topic) => monitorRuleService.findRules(undefined, topic.topicId!).catch(() => [] as MonitorRule[])),
			);
			return [...globalRules, ...perTopic.flat()];
		},
	});

	React.useEffect(() => {
		if (rulesQuery.data) setRules(rulesQuery.data);
	}, [rulesQuery.data]);

	const saveMutation = useMutation({
		mutationFn: (payload: MonitorRule[]) => monitorRuleService.saveRules(payload),
		onSuccess: () => {
			toast.success(t('dqc:rules.saved'));
			queryClient.invalidateQueries({ queryKey: ['dqc', 'rules'] });
		},
		onError: (err: any) => toast.error(err?.message || t('dqc:rules.saveFailed')),
	});

	const selectedTopic = topics.find((topic) => topic.topicId === selectedTopicId);
	const visibleRules = rules.filter((rule) =>
		tab === 'global'
			? rule.grade === MonitorRuleGrade.GLOBAL
			: rule.topicId === selectedTopicId && rule.grade !== MonitorRuleGrade.GLOBAL,
	);

	const upsertLocal = (rule: MonitorRule) => {
		setRules((prev) => {
			const index = rule.ruleId ? prev.findIndex((x) => x.ruleId === rule.ruleId) : -1;
			if (index >= 0) {
				const next = [...prev];
				next[index] = rule;
				return next;
			}
			return [...prev, rule];
		});
	};

	const removeLocal = (rule: MonitorRule) => {
		setRules((prev) => prev.filter((x) => x !== rule));
		toast(t('dqc:rules.ruleDeleted'));
	};

	const toggleEnabled = (rule: MonitorRule, enabled: boolean) => {
		setRules((prev) => prev.map((x) => (x === rule ? { ...x, enabled } : x)));
	};

	const isLoading = topicsQuery.isLoading || (topicsQuery.isSuccess && rulesQuery.isLoading);

	return (
		<div className="flex flex-col gap-4">
			<Tabs value={tab} onValueChange={(v) => setTab(v as 'global' | 'topic')}>
				<div className="flex items-center justify-between gap-3">
					<TabsList>
						<TabsTrigger value="global">{t('dqc:rules.globalTab')}</TabsTrigger>
						<TabsTrigger value="topic">{t('dqc:rules.topicTab')}</TabsTrigger>
					</TabsList>
					<div className="flex items-center gap-2">
						{tab === 'topic' && (
							<Select value={selectedTopicId} onValueChange={setSelectedTopicId}>
								<SelectTrigger className="w-56">
									<SelectValue placeholder={t('dqc:rules.selectTopicHint')} />
								</SelectTrigger>
								<SelectContent>
									{topics.map((topic) => (
										<SelectItem key={topic.topicId} value={topic.topicId!}>{topic.name}</SelectItem>
									))}
								</SelectContent>
							</Select>
						)}
						<Button variant="outline" size="sm" onClick={() => setRunDialogOpen(true)}>
							<Play className="mr-1.5 h-4 w-4" />
							{t('dqc:rules.runNow')}
						</Button>
						<Button
							size="sm"
							disabled={tab === 'topic' && !selectedTopic}
							onClick={() => { setEditingRule(null); setDialogOpen(true); }}
						>
							<Plus className="mr-1.5 h-4 w-4" />
							{t('dqc:rules.newRule')}
						</Button>
						<Button
							size="sm"
							variant="secondary"
							onClick={() => saveMutation.mutate(rules)}
							disabled={saveMutation.isPending || isLoading}
						>
							<Save className="mr-1.5 h-4 w-4" />
							{t('dqc:rules.saveAll')}
						</Button>
					</div>
				</div>

				{(['global', 'topic'] as const).map((tabKey) => (
					<TabsContent key={tabKey} value={tabKey}>
						<Card>
							<CardContent className="p-0">
								{isLoading ? (
									<div className="flex flex-col gap-2 p-4">
										{[0, 1, 2].map((i) => <Skeleton key={i} className="h-10" />)}
									</div>
								) : tabKey === 'topic' && !selectedTopic ? (
									<p className="p-8 text-center text-sm text-muted-foreground">{t('dqc:rules.selectTopicHint')}</p>
								) : visibleRules.length === 0 ? (
									<p className="p-8 text-center text-sm text-muted-foreground">{t('dqc:rules.noRules')}</p>
								) : (
									<Table>
										<TableHeader>
											<TableRow>
												<TableHead className="w-16">{t('common:status')}</TableHead>
												<TableHead>{t('dqc:rules.code')}</TableHead>
												<TableHead>{t('dqc:gradeLabel')}</TableHead>
												<TableHead>{t('dqc:rules.severityLabel')}</TableHead>
												{tabKey === 'topic' && <TableHead>{t('common:factor')}</TableHead>}
												<TableHead>{t('dqc:rules.params')}</TableHead>
												<TableHead className="w-24 text-right">{t('common:actions')}</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{visibleRules.map((rule, index) => {
												const factor = selectedTopic?.factors?.find((f) => f.factorId === rule.factorId);
												return (
													<TableRow key={rule.ruleId ?? `new-${index}`}>
														<TableCell>
															<Switch
																checked={!!rule.enabled}
																onCheckedChange={(checked) => toggleEnabled(rule, checked)}
																title={t('dqc:rules.enabledHint')}
															/>
														</TableCell>
														<TableCell className="text-sm">{t(`dqc:ruleCode.${rule.code}`)}</TableCell>
														<TableCell>
															<Badge variant="outline">{t(`dqc:grade.${rule.grade}`)}</Badge>
														</TableCell>
														<TableCell><SeverityBadge severity={rule.severity} /></TableCell>
														{tabKey === 'topic' && (
															<TableCell className="text-sm text-muted-foreground">
																{rule.grade === MonitorRuleGrade.FACTOR ? (factor?.label || factor?.name || rule.factorId || '-') : '-'}
															</TableCell>
														)}
														<TableCell className="max-w-72 truncate text-xs text-muted-foreground" title={paramsToText(rule.params, t)}>
															{paramsToText(rule.params, t)}
														</TableCell>
														<TableCell className="text-right">
															<Button
																variant="ghost" size="icon" className="h-7 w-7"
																onClick={() => { setEditingRule(rule); setDialogOpen(true); }}
															>
																<Pencil className="h-3.5 w-3.5" />
															</Button>
															<Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeLocal(rule)}>
																<Trash2 className="h-3.5 w-3.5" />
															</Button>
														</TableCell>
													</TableRow>
												);
											})}
										</TableBody>
									</Table>
								)}
							</CardContent>
						</Card>
					</TabsContent>
				))}
			</Tabs>

			<RuleDialog
				open={dialogOpen}
				onOpenChange={setDialogOpen}
				grade={tab === 'global' ? MonitorRuleGrade.GLOBAL : MonitorRuleGrade.TOPIC}
				topic={tab === 'topic' ? selectedTopic : undefined}
				rule={editingRule}
				onSubmit={upsertLocal}
			/>
			<RunDialog open={runDialogOpen} onOpenChange={setRunDialogOpen} topics={topics} />
		</div>
	);
};

export default RulesPage;
