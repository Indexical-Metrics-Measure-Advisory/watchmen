import {confirmPiiTerm, discoverPiiTerm} from '@/services/data/data-quality/pii';
import {
	asPiiMatchSourceLabel,
	PiiClassificationTerm,
	PiiDiscoverResult,
	PiiLinkedFactor
} from '@/services/data/data-quality/pii-types';
import {Button} from '@/widgets/basic/button';
import {CheckBox} from '@/widgets/basic/checkbox';
import {Dropdown} from '@/widgets/basic/dropdown';
import {ButtonInk, DropdownOption} from '@/widgets/basic/types';
import {useEventBus} from '@/widgets/events/event-bus';
import {EventTypes} from '@/widgets/events/types';
import React, {useEffect, useState} from 'react';
import {
	PiiInfoNote,
	PiiMonoText,
	PiiNoData,
	PiiProgress,
	PiiProgressFill,
	PiiProgressText,
	PiiSourceBadge,
	PiiStatusBadge,
	PiiTable,
	PiiTag,
	PiiToolbar,
	PiiToolbarDropdown,
	PiiToolbarLabel,
	PiiToolbarPlaceholder,
	PiiTopicText
} from './widgets';

// NOTE: the AI strategy options are intentionally not offered in the first
// version — the backend runs logic matching only (PII_AI_CHANNEL_ENABLED=off),
// and factors are mapped manually via confirm.

export const PiiDiscoveryTab = (props: {
	terms: Array<PiiClassificationTerm>;
	onTermsChanged: () => void;
}) => {
	const {terms, onTermsChanged} = props;

	const {fire: fireGlobal} = useEventBus();
	const [termId, setTermId] = useState<string>('');
	const [results, setResults] = useState<Array<PiiLinkedFactor> | null>(null);
	const [selected, setSelected] = useState<Record<string, boolean>>({});

	useEffect(() => {
		if (!termId && terms.length !== 0) {
			setTermId(terms[0].termId ?? '');
		}
	}, [terms, termId]);

	const termOptions: Array<DropdownOption> = terms.map(term => {
		return {value: term.termId ?? '', label: term.name};
	});

	const onDiscover = () => {
		if (!termId) {
			return;
		}
		fireGlobal(EventTypes.INVOKE_REMOTE_REQUEST,
			async () => await discoverPiiTerm({termId}),
			(result: PiiDiscoverResult) => {
				const factors = result?.linkedFactors ?? [];
				setResults(factors);
				setSelected(factors.reduce((map: Record<string, boolean>, lf: PiiLinkedFactor) => {
					map[lf.factorId] = lf.confirmed;
					return map;
				}, {}));
			});
	};

	const selectedFactorIds = () => {
		return (results ?? []).filter(lf => selected[lf.factorId]).map(lf => lf.factorId);
	};

	const onBatchConfirm = () => {
		const factorIds = selectedFactorIds();
		if (!termId || factorIds.length === 0) {
			return;
		}
		fireGlobal(EventTypes.INVOKE_REMOTE_REQUEST,
			async () => await confirmPiiTerm({termId, factorIds, removeFactorIds: []}),
			() => {
				setResults(prev => (prev ?? []).map(lf => factorIds.includes(lf.factorId) ? {...lf, confirmed: true} : lf));
				onTermsChanged();
			});
	};

	const onBatchRemove = () => {
		const removeFactorIds = selectedFactorIds();
		if (!termId || removeFactorIds.length === 0) {
			return;
		}
		fireGlobal(EventTypes.INVOKE_REMOTE_REQUEST,
			async () => await confirmPiiTerm({termId, factorIds: [], removeFactorIds}),
			() => {
				setResults(prev => (prev ?? []).filter(lf => !removeFactorIds.includes(lf.factorId)));
				onTermsChanged();
			});
	};

	const confirmedCount = (results ?? []).filter(lf => lf.confirmed).length;

	return <>
		<PiiToolbar>
			<PiiToolbarLabel>Term</PiiToolbarLabel>
			<PiiToolbarDropdown width={200}>
				<Dropdown options={termOptions} value={termId}
				          onChange={(option) => {
					          setTermId(option.value);
					          setResults(null);
				          }}/>
			</PiiToolbarDropdown>
			<PiiToolbarPlaceholder/>
			<Button ink={ButtonInk.PRIMARY} onClick={onDiscover}>Run Discovery</Button>
		</PiiToolbar>
		{results != null
			? <>
				<PiiToolbar>
					<span>
						<strong>Discovered {results.length} linked factors</strong>
						<span style={{opacity: 0.6}}> ({confirmedCount} confirmed)</span>
					</span>
					<PiiToolbarPlaceholder/>
					<Button ink={ButtonInk.PRIMARY} onClick={onBatchConfirm}>Batch Confirm</Button>
					<Button ink={ButtonInk.DANGER} onClick={onBatchRemove}>Batch Remove</Button>
				</PiiToolbar>
				{results.length === 0
					? <PiiNoData>No factors discovered.</PiiNoData>
					: <PiiTable>
						<thead>
							<tr>
								<th style={{width: 40}}></th>
								<th>Topic</th>
								<th>Factor</th>
								<th>Factor Type</th>
								<th>Match Source</th>
								<th>Confidence</th>
								<th>Status</th>
							</tr>
						</thead>
						<tbody>
							{results.map(lf => {
								const confidence = Math.round((lf.matchConfidence ?? 0) * 100);
								return <tr key={`${lf.topicId}|${lf.factorId}`}>
									<td>
										<CheckBox value={!!selected[lf.factorId]}
										          onChange={(value) => setSelected({...selected, [lf.factorId]: value})}/>
									</td>
									<td><PiiTopicText>{lf.topicName ?? lf.topicId}</PiiTopicText></td>
									<td><PiiMonoText>{lf.factorName ?? lf.factorId}</PiiMonoText></td>
									<td>{lf.factorType ? <PiiTag>{lf.factorType}</PiiTag> : <span style={{opacity: 0.4}}>-</span>}</td>
									<td>
										<PiiSourceBadge source={lf.matchSource}>
											{asPiiMatchSourceLabel(lf.matchSource)}
										</PiiSourceBadge>
									</td>
									<td>
										<div style={{display: 'flex', alignItems: 'center'}}>
											<PiiProgress>
												<PiiProgressFill percent={confidence}/>
											</PiiProgress>
											<PiiProgressText>{confidence}%</PiiProgressText>
										</div>
									</td>
									<td>
										<PiiStatusBadge confirmed={lf.confirmed}>
											{lf.confirmed ? 'Confirmed' : 'Pending'}
										</PiiStatusBadge>
									</td>
								</tr>;
							})}
						</tbody>
					</PiiTable>}
				<PiiInfoNote>
					Discovered factors take effect only after manual confirmation.
					Results below 75% confidence are filtered out automatically.
				</PiiInfoNote>
			</>
			: <PiiNoData>Select a term and run discovery.</PiiNoData>}
	</>;
};
