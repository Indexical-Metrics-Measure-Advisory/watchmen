import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
	AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
	AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { OntologySensitivity, OntologySpaceOption, sensitivityConfig, VirtualOntology } from '@/model/ontology';
import { ontologyService } from '@/services/ontologyService';
import { Field } from './shared';

export const MetaTab: React.FC<{
	draft: VirtualOntology;
	update: (patch: Partial<VirtualOntology>) => void;
	setSpace: (spaceId?: string) => void;
}> = ({ draft, update, setSpace }) => {
	const { t } = useTranslation('ontology');
	const [spaces, setSpaces] = useState<OntologySpaceOption[]>([]);
	// pending space switch that awaits user confirmation (stale topic mappings exist)
	const [pendingSwitch, setPendingSwitch] = useState<{ spaceId: string; staleCount: number } | null>(null);

	useEffect(() => {
		ontologyService.fetchAvailableSpaces()
			.then(setSpaces)
			.catch((e) => {
				console.warn('[MetaTab] failed to load available spaces', e);
				setSpaces([]);
			});
	}, []);

	const handleSpaceChange = (value: string) => {
		const nextSpaceId = value === '__none__' ? undefined : value;
		if (nextSpaceId) {
			const space = spaces.find(s => s.spaceId === nextSpaceId);
			if (space) {
				const topicIds = new Set(space.topicIds);
				const staleCount = draft.virtualObjects.reduce(
					(sum, vo) => sum + vo.physicalTables.filter(pt => pt.topicId && !topicIds.has(pt.topicId)).length,
					0,
				);
				if (staleCount > 0) {
					setPendingSwitch({ spaceId: nextSpaceId, staleCount });
					return;
				}
			}
		}
		setSpace(nextSpaceId);
	};

	const confirmSpaceSwitch = () => {
		if (pendingSwitch) {
			setSpace(pendingSwitch.spaceId);
		}
		setPendingSwitch(null);
	};

	return (
		<div className="space-y-4 p-1">
			<Field label="Ontology Name">
				<Input value={draft.name} onChange={e => update({ name: e.target.value })} placeholder="e.g. Customer Virtual Ontology" />
			</Field>
			<Field label="Description">
				<Input value={draft.description} onChange={e => update({ description: e.target.value })} placeholder="Brief description" />
			</Field>
			<div className="grid grid-cols-2 gap-3">
				<Field label="Business Owner">
					<Input value={draft.owner} onChange={e => update({ owner: e.target.value })} />
				</Field>
				<Field label="Technical Owner">
					<Input value={draft.technicalOwner} onChange={e => update({ technicalOwner: e.target.value })} />
				</Field>
			</div>
			<div className="grid grid-cols-2 gap-3">
				<Field label="Sensitivity">
					<Select value={draft.sensitivity} onValueChange={v => update({ sensitivity: v as OntologySensitivity })}>
						<SelectTrigger><SelectValue /></SelectTrigger>
						<SelectContent>
							{Object.entries(sensitivityConfig).map(([key, cfg]) => (
								<SelectItem key={key} value={key}>{cfg.icon} {cfg.label}</SelectItem>
							))}
						</SelectContent>
					</Select>
				</Field>
				<Field label="Tags (comma separated)">
					<Input
						value={draft.tags.join(', ')}
						onChange={e => update({ tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) })}
					/>
				</Field>
			</div>
			<div className="grid grid-cols-2 gap-3">
				<Field label={t('space')}>
					<Select value={draft.spaceId ?? '__none__'} onValueChange={handleSpaceChange}>
						<SelectTrigger><SelectValue placeholder={t('spaceUnrestricted')} /></SelectTrigger>
						<SelectContent>
							<SelectItem value="__none__">{t('spaceUnrestricted')}</SelectItem>
							{spaces.map(s => (
								<SelectItem key={s.spaceId} value={s.spaceId}>{s.name}</SelectItem>
							))}
						</SelectContent>
					</Select>
				</Field>
			</div>

			<AlertDialog open={pendingSwitch !== null} onOpenChange={(open) => !open && setPendingSwitch(null)}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>{t('spaceSwitchTitle')}</AlertDialogTitle>
						<AlertDialogDescription>
							{t('spaceSwitchConfirm', { count: pendingSwitch?.staleCount ?? 0 })}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>{t('common:cancel')}</AlertDialogCancel>
						<AlertDialogAction onClick={confirmSpaceSwitch}>{t('spaceSwitchProceed')}</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
};
