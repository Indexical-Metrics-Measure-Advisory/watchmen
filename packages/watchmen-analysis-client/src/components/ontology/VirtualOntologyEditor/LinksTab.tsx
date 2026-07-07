import React from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { OntologyDraftApi } from './useOntologyDraft';
import { VirtualLinkCard } from './VirtualLinkCard';

export const LinksTab: React.FC<{ api: OntologyDraftApi }> = ({ api }) => {
	const { draft, actions } = api;
	return (
		<div className="space-y-4 p-1">
			{draft.virtualLinks.map((link, idx) => (
				<VirtualLinkCard
					key={idx}
					idx={idx}
					link={link}
					actions={actions}
					allObjects={draft.virtualObjects}
				/>
			))}
			<Button variant="outline" className="w-full gap-2" onClick={actions.addLink}>
				<Plus className="w-4 h-4" />
				Add Virtual Link
			</Button>
		</div>
	);
};
