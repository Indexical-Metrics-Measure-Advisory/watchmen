import React from 'react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MonitorRuleSeverity } from '@/models/monitorRule';
import { cn } from '@/lib/utils';

/** Brand-aligned chart palette (DataMO dark theme). */
export const CHART_COLORS = ['#5b7fff', '#7c3aed', '#22d3ee', '#34d399', '#f59e0b', '#f87171', '#a3e635', '#f472b6'];

export const SEVERITY_COLORS: Record<string, string> = {
	fatal: '#f87171',
	warn: '#f59e0b',
	trace: '#5b7fff',
};

/** Colored severity badge (fatal/warn/trace). */
export const SeverityBadge: React.FC<{ severity?: MonitorRuleSeverity | string }> = ({ severity }) => {
	const { t } = useTranslation('dqc');
	if (!severity) return null;
	const styles: Record<string, string> = {
		fatal: 'border-red-500/40 bg-red-500/15 text-red-400',
		warn: 'border-amber-500/40 bg-amber-500/15 text-amber-400',
		trace: 'border-blue-500/40 bg-blue-500/15 text-blue-400',
	};
	return (
		<Badge variant="outline" className={cn('capitalize', styles[severity] ?? '')}>
			{t(`severity.${severity}`)}
		</Badge>
	);
};

/** KPI tile used on dashboard-style pages. */
export const KpiCard: React.FC<{
	title: string;
	value: React.ReactNode;
	hint?: string;
	icon?: React.ReactNode;
}> = ({ title, value, hint, icon }) => (
	<Card>
		<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
			<CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
			{icon}
		</CardHeader>
		<CardContent>
			<div className="text-2xl font-bold">{value}</div>
			{hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
		</CardContent>
	</Card>
);

/** Format an ISO-ish datetime string for table display. */
export const formatDateTime = (value?: string): string => {
	if (!value) return '-';
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return value;
	return date.toLocaleString();
};
