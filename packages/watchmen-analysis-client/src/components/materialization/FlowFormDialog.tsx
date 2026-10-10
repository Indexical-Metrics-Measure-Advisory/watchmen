import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ArrowDown, ArrowUp, Plus, Trash2, Workflow, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type {
	ManualFlowEdge,
	Materialization,
	MaterializationFlow,
	ScheduleFrequency
} from '@/model/materialization';

const WEEKDAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

interface FlowFormDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	mode: 'create' | 'edit';
	initial?: MaterializationFlow;
	materializations: Materialization[];
	onSave: (value: Partial<MaterializationFlow>) => Promise<void> | void;
}

// DFS over the manual edges only; derived data edges are validated server-side
const hasManualCycle = (edges: ManualFlowEdge[]): boolean => {
	const children = new Map<string, string[]>();
	edges.forEach((edge) => {
		children.set(edge.source, [...(children.get(edge.source) ?? []), edge.target]);
	});
	const state = new Map<string, number>(); // 0 fresh, 1 on stack, 2 done
	const visit = (node: string): boolean => {
		state.set(node, 1);
		for (const child of children.get(node) ?? []) {
			const mark = state.get(child) ?? 0;
			if (mark === 1) {
				return true;
			}
			if (mark === 0 && visit(child)) {
				return true;
			}
		}
		state.set(node, 2);
		return false;
	};
	return [...children.keys()].some((node) => (state.get(node) ?? 0) === 0 && visit(node));
};

const FlowFormDialog: React.FC<FlowFormDialogProps> = ({
	open,
	onOpenChange,
	mode,
	initial,
	materializations,
	onSave
}) => {
	const { t } = useTranslation(['common', 'materialization']);

	const [name, setName] = useState('');
	const [description, setDescription] = useState('');
	const [enabled, setEnabled] = useState(true);
	const [members, setMembers] = useState<string[]>([]);
	const [manualEdges, setManualEdges] = useState<ManualFlowEdge[]>([]);
	const [scheduleEnabled, setScheduleEnabled] = useState(false);
	const [frequency, setFrequency] = useState<ScheduleFrequency>('day');
	const [time, setTime] = useState('02:00');
	const [weekday, setWeekday] = useState('mon');
	const [dayOfMonth, setDayOfMonth] = useState('1');
	const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState('');

	useEffect(() => {
		if (!open) {
			return;
		}
		setSaving(false);
		setError('');
		if (mode === 'edit' && initial) {
			setName(initial.name);
			setDescription(initial.description ?? '');
			setEnabled(initial.enabled);
			setMembers([...initial.materializationIds]);
			setManualEdges((initial.manualEdges ?? []).map((edge) => ({ ...edge })));
			setScheduleEnabled(initial.schedule?.enabled ?? false);
			setFrequency(initial.schedule?.frequency ?? 'day');
			setTime(initial.schedule?.time ?? '02:00');
			setWeekday(initial.schedule?.weekday ?? 'mon');
			setDayOfMonth(String(initial.schedule?.dayOfMonth ?? 1));
			setDate(initial.schedule?.date ?? new Date().toISOString().slice(0, 10));
		} else {
			setName('');
			setDescription('');
			setEnabled(true);
			setMembers([]);
			setManualEdges([]);
			setScheduleEnabled(false);
			setFrequency('day');
			setTime('02:00');
			setWeekday('mon');
			setDayOfMonth('1');
			setDate(new Date().toISOString().slice(0, 10));
		}
	}, [open, mode, initial]);

	const matById = useMemo(() => {
		const map = new Map<string, Materialization>();
		materializations.forEach((m) => map.set(m.materializationId, m));
		return map;
	}, [materializations]);

	const candidates = useMemo(
		() => materializations.filter((m) => !members.includes(m.materializationId)),
		[materializations, members]
	);

	// manual edges whose endpoints were removed from the flow are dropped on save
	const effectiveEdges = useMemo(
		() => manualEdges.filter(
			(edge) => members.includes(edge.source) && members.includes(edge.target)),
		[manualEdges, members]
	);

	const memberLabel = (id: string): string => {
		const materialization = matById.get(id);
		return materialization?.name || materialization?.metricName || id;
	};

	const moveMember = (index: number, offset: -1 | 1) => {
		const target = index + offset;
		if (target < 0 || target >= members.length) {
			return;
		}
		const next = [...members];
		[next[index], next[target]] = [next[target], next[index]];
		setMembers(next);
	};

	const handleSave = async () => {
		const trimmedName = name.trim();
		if (!trimmedName) {
			setError(t('materialization:flow.editor.nameRequired'));
			return;
		}
		if (members.length === 0) {
			setError(t('materialization:flow.editor.membersRequired'));
			return;
		}
		if (hasManualCycle(effectiveEdges)) {
			setError(t('materialization:flow.editor.edgeCycle'));
			return;
		}
		setSaving(true);
		try {
			await onSave({
				flowId: mode === 'edit' ? initial?.flowId : undefined,
				name: trimmedName,
				description: description.trim() || undefined,
				enabled,
				materializationIds: members,
				manualEdges: effectiveEdges,
				schedule: {
					enabled: scheduleEnabled,
					frequency,
					time: time || '02:00',
					weekday: frequency === 'week' ? weekday : undefined,
					dayOfMonth: frequency === 'month' ? Number(dayOfMonth) || 1 : undefined,
					date: frequency === 'once' ? date : undefined
				}
			});
			onOpenChange(false);
		} catch (e) {
			setError(e instanceof Error ? e.message : String(e));
		} finally {
			setSaving(false);
		}
	};

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent side="right" className="w-[95vw] sm:max-w-[680px] p-0 flex flex-col">
				<SheetHeader className="px-6 pt-6 pb-4 border-b">
					<SheetTitle className="flex items-center gap-2">
						<Workflow className="h-5 w-5 text-primary" />
						{mode === 'edit'
							? t('materialization:flow.editor.editTitle')
							: t('materialization:flow.editor.createTitle')}
					</SheetTitle>
					<SheetDescription>{t('materialization:flow.editor.description')}</SheetDescription>
				</SheetHeader>
				<ScrollArea className="flex-1">
					<div className="px-6 py-4 space-y-6">
						{/* basic */}
						<section className="space-y-4">
							<div className="space-y-2">
								<Label htmlFor="flow-name">{t('materialization:flow.editor.name')}</Label>
								<Input
									id="flow-name"
									value={name}
									onChange={(e) => setName(e.target.value)}
									placeholder={t('materialization:flow.editor.namePlaceholder')}
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="flow-description">
									{t('materialization:flow.editor.descriptionLabel')}
								</Label>
								<Textarea
									id="flow-description"
									value={description}
									onChange={(e) => setDescription(e.target.value)}
									rows={2}
								/>
							</div>
							<div className="flex items-center justify-between rounded-lg border p-3">
								<div className="space-y-0.5">
									<Label>{t('materialization:flow.editor.enabled')}</Label>
									<p className="text-xs text-muted-foreground">
										{t('materialization:flow.editor.enabledHint')}
									</p>
								</div>
								<Switch checked={enabled} onCheckedChange={setEnabled} />
							</div>
						</section>

						<Separator />

						{/* members */}
						<section className="space-y-3">
							<div>
								<Label>{t('materialization:flow.editor.members')}</Label>
								<p className="text-xs text-muted-foreground">
									{t('materialization:flow.editor.membersHint')}
								</p>
							</div>
							{members.length === 0 ? (
								<p className="text-sm text-muted-foreground rounded-lg border border-dashed p-4 text-center">
									{t('materialization:flow.editor.noMembers')}
								</p>
							) : (
								<ul className="space-y-2">
									{members.map((id, index) => (
										<li
											key={id}
											className="flex items-center gap-2 rounded-lg border px-3 py-2"
										>
											<Badge variant="outline" className="text-xs shrink-0">
												{index + 1}
											</Badge>
											<div className="min-w-0 flex-1">
												<div className="text-sm font-medium truncate" title={memberLabel(id)}>
													{memberLabel(id)}
												</div>
												<div className="text-xs font-mono text-muted-foreground truncate">
													{matById.get(id)?.metricName ?? id}
												</div>
											</div>
											<Button
												variant="ghost"
												size="icon"
												className="h-7 w-7"
												disabled={index === 0}
												onClick={() => moveMember(index, -1)}
												aria-label={t('materialization:flow.editor.moveUp')}
											>
												<ArrowUp className="h-4 w-4" />
											</Button>
											<Button
												variant="ghost"
												size="icon"
												className="h-7 w-7"
												disabled={index === members.length - 1}
												onClick={() => moveMember(index, 1)}
												aria-label={t('materialization:flow.editor.moveDown')}
											>
												<ArrowDown className="h-4 w-4" />
											</Button>
											<Button
												variant="ghost"
												size="icon"
												className="h-7 w-7 text-destructive hover:text-destructive"
												onClick={() => setMembers(members.filter((m) => m !== id))}
												aria-label={t('materialization:flow.editor.removeMember')}
											>
												<X className="h-4 w-4" />
											</Button>
										</li>
									))}
								</ul>
							)}
							{candidates.length > 0 && (
								<Select
									value=""
									onValueChange={(value) => {
										if (value) {
											setMembers([...members, value]);
										}
									}}
								>
									<SelectTrigger className="w-full">
										<SelectValue placeholder={t('materialization:flow.editor.addMember')} />
									</SelectTrigger>
									<SelectContent>
										{candidates.map((m) => (
											<SelectItem key={m.materializationId} value={m.materializationId}>
												{m.name || m.metricName}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							)}
						</section>

						<Separator />

						{/* manual dependencies */}
						<section className="space-y-3">
							<div>
								<Label>{t('materialization:flow.editor.manualEdges')}</Label>
								<p className="text-xs text-muted-foreground">
									{t('materialization:flow.editor.manualEdgesHint')}
								</p>
							</div>
							{effectiveEdges.length === 0 ? (
								<p className="text-sm text-muted-foreground rounded-lg border border-dashed p-4 text-center">
									{members.length < 2
										? t('materialization:flow.editor.needTwoMembers')
										: t('materialization:flow.editor.noEdges')}
								</p>
							) : (
								<ul className="space-y-2">
									{effectiveEdges.map((edge, index) => (
										<li
											key={`${edge.source}->${edge.target}`}
											className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm"
										>
											<span className="min-w-0 flex-1 truncate">{memberLabel(edge.source)}</span>
											<span className="text-muted-foreground shrink-0">→</span>
											<span className="min-w-0 flex-1 truncate">{memberLabel(edge.target)}</span>
											<Button
												variant="ghost"
												size="icon"
												className="h-7 w-7 text-destructive hover:text-destructive"
												onClick={() => setManualEdges(manualEdges.filter((_, i) => i !== index))}
												aria-label={t('materialization:flow.editor.removeEdge')}
											>
												<Trash2 className="h-4 w-4" />
											</Button>
										</li>
									))}
								</ul>
							)}
							<ManualEdgePicker
								members={members}
								memberLabel={memberLabel}
								existing={effectiveEdges}
								onAdd={(edge) => setManualEdges([...manualEdges, edge])}
							/>
						</section>

						<Separator />

						{/* flow-level schedule */}
						<section className="space-y-3">
							<div>
								<Label>{t('materialization:flow.editor.schedule')}</Label>
								<p className="text-xs text-muted-foreground">
									{t('materialization:flow.editor.scheduleHint')}
								</p>
							</div>
							<div className="flex items-center justify-between rounded-lg border p-3">
								<span className="text-sm">{t('materialization:flow.editor.scheduleEnabled')}</span>
								<Switch checked={scheduleEnabled} onCheckedChange={setScheduleEnabled} />
							</div>
							{scheduleEnabled && (
								<div className="grid grid-cols-2 gap-3">
									<div className="space-y-2">
										<Label>{t('materialization:flow.editor.frequency')}</Label>
										<Select value={frequency} onValueChange={(v) => setFrequency(v as ScheduleFrequency)}>
											<SelectTrigger className="w-full">
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												{(['once', 'day', 'week', 'month'] as ScheduleFrequency[]).map((f) => (
													<SelectItem key={f} value={f}>
														{t(`materialization:frequencies.${f}`)}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</div>
									<div className="space-y-2">
										<Label>{t('materialization:flow.editor.time')}</Label>
										<Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
									</div>
									{frequency === 'week' && (
										<div className="space-y-2">
											<Label>{t('materialization:flow.editor.weekday')}</Label>
											<Select value={weekday} onValueChange={setWeekday}>
												<SelectTrigger className="w-full">
													<SelectValue />
												</SelectTrigger>
												<SelectContent>
													{WEEKDAYS.map((day) => (
														<SelectItem key={day} value={day}>
															{t(`materialization:weekdays.${day}`)}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
										</div>
									)}
									{frequency === 'month' && (
										<div className="space-y-2">
											<Label>{t('materialization:flow.editor.dayOfMonth')}</Label>
											<Input
												type="number"
												min={1}
												max={31}
												value={dayOfMonth}
												onChange={(e) => setDayOfMonth(e.target.value)}
											/>
										</div>
									)}
									{frequency === 'once' && (
										<div className="space-y-2">
											<Label>{t('materialization:flow.editor.date')}</Label>
											<Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
										</div>
									)}
								</div>
							)}
						</section>

						{error && (
							<p className="text-sm text-destructive break-all" role="alert">
								{error}
							</p>
						)}
					</div>
				</ScrollArea>
				<div className="border-t px-6 py-4 flex justify-end gap-2">
					<Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
						{t('common:cancel')}
					</Button>
					<Button onClick={() => void handleSave()} disabled={saving}>
						{saving ? t('common:saving') : t('common:save')}
					</Button>
				</div>
			</SheetContent>
		</Sheet>
	);
};

const ManualEdgePicker: React.FC<{
	members: string[];
	memberLabel: (id: string) => string;
	existing: ManualFlowEdge[];
	onAdd: (edge: ManualFlowEdge) => void;
}> = ({ members, memberLabel, existing, onAdd }) => {
	const { t } = useTranslation(['materialization']);
	const [source, setSource] = useState('');
	const [target, setTarget] = useState('');

	useEffect(() => {
		// keep the picker consistent when the member list changes
		if (source && !members.includes(source)) {
			setSource('');
		}
		if (target && !members.includes(target)) {
			setTarget('');
		}
	}, [members, source, target]);

	if (members.length < 2) {
		return null;
	}
	const duplicate = existing.some(
		(edge) => edge.source === source && edge.target === target
	);
	const invalid = !source || !target || source === target || duplicate;
	return (
		<div className="flex items-center gap-2">
			<Select value={source} onValueChange={setSource}>
				<SelectTrigger className="min-w-0 flex-1">
					<SelectValue placeholder={t('flow.editor.edgeSource')} />
				</SelectTrigger>
				<SelectContent>
					{members.map((id) => (
						<SelectItem key={id} value={id}>
							{memberLabel(id)}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
			<span className="text-muted-foreground shrink-0">→</span>
			<Select value={target} onValueChange={setTarget}>
				<SelectTrigger className="min-w-0 flex-1">
					<SelectValue placeholder={t('flow.editor.edgeTarget')} />
				</SelectTrigger>
				<SelectContent>
					{members.map((id) => (
						<SelectItem key={id} value={id}>
							{memberLabel(id)}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
			<Button
				variant="outline"
				size="icon"
				className="shrink-0"
				disabled={invalid}
				onClick={() => {
					onAdd({ source, target });
					setSource('');
					setTarget('');
				}}
				aria-label={t('flow.editor.addEdge')}
			>
				<Plus className="h-4 w-4" />
			</Button>
		</div>
	);
};

export default FlowFormDialog;
