import React from 'react';
import { Lock, Plus, ShieldAlert, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { OntologyGovernanceAttribute, OntologyGovernanceMonitorRule, VirtualObject } from '@/model/ontology';

interface Props {
	vo: VirtualObject;
	/** Governance attributes keyed by attribute name; null means no governance data (unsaved draft / load failed). */
	governanceAttrs: Map<string, OntologyGovernanceAttribute> | null;
	onAdd: (voId: string) => void;
	onUpdate: (voId: string, idx: number, patch: Partial<{ name: string; sourceTable: string; sourceField: string }>) => void;
	onRemove: (voId: string, idx: number) => void;
}

/** Rank monitor rule severity: fatal > warn > trace (unknown treated as trace). */
const severityRank = (severity?: string): number => {
	switch ((severity ?? '').toLowerCase()) {
		case 'fatal':
			return 3;
		case 'warn':
			return 2;
		default:
			return 1;
	}
};

const monitorRulesBadgeClass = (rules: OntologyGovernanceMonitorRule[]): string => {
	const worst = Math.max(...rules.map(r => severityRank(r.severity)));
	if (worst >= 3) return 'bg-red-100 text-red-700 border-red-200';
	if (worst === 2) return 'bg-amber-100 text-amber-700 border-amber-200';
	return 'bg-blue-100 text-blue-700 border-blue-200';
};

const severityDotClass = (severity?: string): string => {
	switch (severityRank(severity)) {
		case 3:
			return 'bg-red-500';
		case 2:
			return 'bg-amber-500';
		default:
			return 'bg-blue-500';
	}
};

const formatRuleParams = (params?: Record<string, unknown> | null): string | null => {
	if (!params) {
		return null;
	}
	const text = Object.entries(params).map(([key, value]) => `${key}: ${String(value)}`).join(', ');
	return text.length === 0 ? null : text;
};

/** Monitor rule badge with a popover listing each rule's code/grade/severity/params. */
const MonitorRulesDetail: React.FC<{ rules: OntologyGovernanceMonitorRule[] }> = ({ rules }) => {
	const { t } = useTranslation('ontology');
	const enabledCount = rules.filter(r => r.enabled).length;
	return (
		<Popover>
			<PopoverTrigger asChild>
				<Badge variant="outline"
				       className={`${monitorRulesBadgeClass(rules)} text-[10px] px-1.5 py-0 gap-0.5 cursor-pointer`}>
					<ShieldAlert className="w-2.5 h-2.5" /> {enabledCount}/{rules.length}
				</Badge>
			</PopoverTrigger>
			<PopoverContent className="w-80 p-2" align="start">
				<div className="text-xs font-semibold mb-1.5">{t('monitorRules')}</div>
				<div className="space-y-1.5 max-h-64 overflow-y-auto">
					{rules.map(rule => {
						const paramsText = formatRuleParams(rule.params);
						return (
							<div key={rule.ruleId} className="text-xs border rounded p-1.5 space-y-0.5">
								<div className="flex items-center gap-1.5">
									<span className={`w-2 h-2 rounded-full shrink-0 ${severityDotClass(rule.severity)}`} />
									<span className="font-medium flex-1 break-all">{rule.code}</span>
									<Badge variant="outline" className="text-[10px] px-1 py-0">{rule.grade}</Badge>
									<span className={rule.enabled ? 'text-green-600' : 'text-muted-foreground'}>
										{rule.enabled ? t('ruleEnabled') : t('ruleDisabled')}
									</span>
								</div>
								{paramsText
									? <div className="text-muted-foreground break-all">{paramsText}</div>
									: null}
							</div>
						);
					})}
				</div>
			</PopoverContent>
		</Popover>
	);
};

const GovernanceCell: React.FC<{ gov: OntologyGovernanceAttribute }> = ({ gov }) => {
	const { t } = useTranslation('ontology');

	return (
		<TooltipProvider delayDuration={200}>
			<div className="flex items-center gap-1 flex-wrap">
				{gov.piiTerms.map(term => (
					<Tooltip key={term.termId}>
						<TooltipTrigger asChild>
							{term.confirmed ? (
								<Badge variant="outline" className="bg-red-100 text-red-700 border-red-200 text-[10px] px-1.5 py-0">
									{term.name}{term.sensitivityLevel ? ` · ${term.sensitivityLevel}` : ''}
								</Badge>
							) : (
								<Badge variant="outline" className="border-amber-300 text-amber-700 bg-amber-50 text-[10px] px-1.5 py-0 border-dashed">
									{term.name}{term.sensitivityLevel ? ` · ${term.sensitivityLevel}` : ''}
								</Badge>
							)}
						</TooltipTrigger>
						<TooltipContent>
							{term.confirmed
								? [term.name, term.category, term.sensitivityLevel].filter(Boolean).join(' · ')
								: t('piiUnconfirmed')}
						</TooltipContent>
					</Tooltip>
				))}
				{gov.masked && (
					<Tooltip>
						<TooltipTrigger asChild>
							<Badge variant="outline" className="bg-slate-100 text-slate-700 border-slate-200 text-[10px] px-1.5 py-0 gap-0.5">
								<Lock className="w-2.5 h-2.5" /> {t('masked')}
							</Badge>
						</TooltipTrigger>
						<TooltipContent>
							{gov.encrypt
								? t('maskedByEncrypt', { encrypt: gov.encrypt })
								: gov.sensitiveType
									? t('maskedBySensitiveType', { type: gov.factorType ?? '' })
									: t('maskedGeneric')}
						</TooltipContent>
					</Tooltip>
				)}
				{gov.monitorRules.length > 0 && (
					<MonitorRulesDetail rules={gov.monitorRules} />
				)}
				{gov.piiTerms.length === 0 && !gov.masked && gov.monitorRules.length === 0 && (
					<span className="text-xs text-muted-foreground">-</span>
				)}
			</div>
		</TooltipProvider>
	);
};

export const AttributesEditor = React.memo<Props>(({ vo, governanceAttrs, onAdd, onUpdate, onRemove }) => {
	const { t } = useTranslation('ontology');
	return (
		<div className="space-y-2">
			<div className="flex items-center justify-between">
				<span className="text-xs font-semibold uppercase text-muted-foreground">{t('attributes')}</span>
				<Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => onAdd(vo.id)}>
					<Plus className="w-3 h-3 mr-1" /> {t('add')}
				</Button>
			</div>
			{vo.attributes.length > 0 && (
				<div className="flex items-center gap-2">
					<span className="flex-1" />
					<span className="w-4" />
					<span className="w-28" />
					<span className="w-32" />
					<span className="w-40 text-[10px] font-semibold uppercase text-muted-foreground">{t('governance')}</span>
					<span className="w-7" />
				</div>
			)}
			{vo.attributes.map((attr, attrIdx) => {
				const gov = governanceAttrs?.get(attr.name);
				return (
					<div key={attrIdx} className="flex items-center gap-2">
						<Input
							value={attr.name}
							onChange={e => onUpdate(vo.id, attrIdx, { name: e.target.value })}
							placeholder={t('attrName')}
							className="flex-1 h-7 text-xs"
						/>
						<span className="w-4 text-xs text-muted-foreground">←</span>
						<Select
							value={attr.sourceTable}
							onValueChange={v => onUpdate(vo.id, attrIdx, { sourceTable: v })}
						>
							<SelectTrigger className="w-28 h-7 text-xs"><SelectValue placeholder={t('table')} /></SelectTrigger>
							<SelectContent>
								{vo.physicalTables.map(pt => (
									<SelectItem key={pt.topicId} value={pt.alias || pt.topicName}>
										{pt.alias || pt.topicName}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						<Select
							value={attr.sourceField}
							onValueChange={v => onUpdate(vo.id, attrIdx, { sourceField: v })}
						>
							<SelectTrigger className="w-32 h-7 text-xs"><SelectValue placeholder={t('field')} /></SelectTrigger>
							<SelectContent>
								{vo.physicalTables.find(pt => (pt.alias || pt.topicName) === attr.sourceTable)?.fields.map(f => (
									<SelectItem key={f} value={f}>{f}</SelectItem>
								))}
							</SelectContent>
						</Select>
						<div className="w-40 min-h-7 flex items-center">
							{gov ? <GovernanceCell gov={gov} /> : <span className="text-xs text-muted-foreground">-</span>}
						</div>
						<Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onRemove(vo.id, attrIdx)}>
							<Trash2 className="w-3.5 h-3.5 text-red-500" />
						</Button>
					</div>
				);
			})}
		</div>
	);
});
