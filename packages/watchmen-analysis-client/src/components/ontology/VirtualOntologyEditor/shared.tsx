import React from 'react';
import { cn } from '@/lib/utils';

export const TabButton: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string }> = ({ active, onClick, icon, label }) => (
	<button
		onClick={onClick}
		className={cn(
			'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
			active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted',
		)}
	>
		{icon}
		{label}
	</button>
);

export const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
	<div className="space-y-1">
		<label className="text-xs font-medium text-muted-foreground">{label}</label>
		{children}
	</div>
);
