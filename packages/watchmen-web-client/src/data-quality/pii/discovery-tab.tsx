import {confirmPiiTerm, discoverPiiTerm, linkPiiFactor} from '@/services/data/data-quality/pii';
import {
	asPiiLinkedFactorKey,
	PiiClassificationTerm,
	PiiDiscoverResult,
	PiiLinkedFactor,
	PiiMatchSource
} from '@/services/data/data-quality/pii-types';
import {fetchAllTopics} from '@/services/data/pipeline/all-topics';
import {Topic} from '@/services/data/tuples/topic-types';
import {Button} from '@/widgets/basic/button';
import {CheckBox} from '@/widgets/basic/checkbox';
import {Dropdown} from '@/widgets/basic/dropdown';
import {ButtonInk, DropdownOption} from '@/widgets/basic/types';
import {useEventBus} from '@/widgets/events/event-bus';
import {EventTypes} from '@/widgets/events/types';
import {Lang} from '@/widgets/langs';
import React, {useEffect, useState} from 'react';
import {
	PiiEditorActions,
	PiiEditorField,
	PiiEditorLabel,
	PiiEditorOverlay,
	PiiEditorPanel,
	PiiEditorTitle,
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

interface LinkingState {
	topicId: string;
	factorId: string;
}

const asMatchSourceLabel = (source?: string): string => {
	switch (source) {
		case PiiMatchSource.TYPE:
			return Lang.PII.MATCH_SOURCE_TYPE;
		case PiiMatchSource.KEYWORD:
			return Lang.PII.MATCH_SOURCE_KEYWORD;
		case PiiMatchSource.MANUAL:
			return Lang.PII.MATCH_SOURCE_MANUAL;
		default:
			return source ?? '-';
	}
};

export const PiiDiscoveryTab = (props: {
	terms: Array<PiiClassificationTerm>;
	onTermsChanged: () => void;
}) => {
	const {terms, onTermsChanged} = props;

	const {fire: fireGlobal} = useEventBus();
	const [termId, setTermId] = useState<string>('');
	const [results, setResults] = useState<Array<PiiLinkedFactor> | null>(null);
	const [selected, setSelected] = useState<Record<string, boolean>>({});
	const [topics, setTopics] = useState<Array<Topic>>([]);
	const [linking, setLinking] = useState<LinkingState | null>(null);

	useEffect(() => {
		if (!termId && terms.length !== 0) {
			setTermId(terms[0].termId ?? '');
		}
	}, [terms, termId]);

	// show the term's persisted linked factors on open/switch, so confirmed
	// links are visible without re-running discovery
	useEffect(() => {
		const term = terms.find(t => t.termId === termId);
		const linked = term?.linkedFactors ?? [];
		setResults(termId ? linked : null);
		setSelected(linked.reduce((map: Record<string, boolean>, lf: PiiLinkedFactor) => {
			map[asPiiLinkedFactorKey(lf)] = lf.confirmed;
			return map;
		}, {}));
	}, [terms, termId]);

	useEffect(() => {
		fireGlobal(EventTypes.INVOKE_REMOTE_REQUEST,
			async () => await fetchAllTopics(),
			(loaded: Array<Topic>) => setTopics(loaded ?? []));
	}, [fireGlobal]);

	const termOptions: Array<DropdownOption> = terms.map(term => {
		return {value: term.termId ?? '', label: term.name};
	});

	const term = terms.find(t => t.termId === termId);
	const scopeTopicIds = term?.topicIds ?? [];
	const scopeTopics = topics.filter(topic => scopeTopicIds.includes(topic.topicId));

	const onDiscover = () => {
		if (!termId) {
			return;
		}
		fireGlobal(EventTypes.INVOKE_REMOTE_REQUEST,
			async () => await discoverPiiTerm(termId),
			(result: PiiDiscoverResult) => {
				const factors = result?.linkedFactors ?? [];
				setResults(factors);
				setSelected(factors.reduce((map: Record<string, boolean>, lf: PiiLinkedFactor) => {
					map[asPiiLinkedFactorKey(lf)] = lf.confirmed;
					return map;
				}, {}));
				// discovery writes back linkedFactors and bumps the version,
				// refresh terms so a later edit does not save with a stale version
				onTermsChanged();
			});
	};

	const selectedFactorKeys = () => {
		return (results ?? []).filter(lf => selected[asPiiLinkedFactorKey(lf)]).map(asPiiLinkedFactorKey);
	};

	const onBatchConfirm = () => {
		const factorIds = selectedFactorKeys();
		if (!termId || factorIds.length === 0) {
			return;
		}
		fireGlobal(EventTypes.INVOKE_REMOTE_REQUEST,
			async () => await confirmPiiTerm({termId, factorIds, removeFactorIds: []}),
			() => {
				setResults(prev => (prev ?? []).map(lf => factorIds.includes(asPiiLinkedFactorKey(lf)) ? {...lf, confirmed: true} : lf));
				onTermsChanged();
			});
	};

	const onBatchRemove = () => {
		const removeFactorIds = selectedFactorKeys();
		if (!termId || removeFactorIds.length === 0) {
			return;
		}
		fireGlobal(EventTypes.INVOKE_REMOTE_REQUEST,
			async () => await confirmPiiTerm({termId, factorIds: [], removeFactorIds}),
			() => {
				setResults(prev => (prev ?? []).filter(lf => !removeFactorIds.includes(asPiiLinkedFactorKey(lf))));
				onTermsChanged();
			});
	};

	const onStartLinking = () => {
		setLinking({topicId: scopeTopics[0]?.topicId ?? '', factorId: ''});
	};

	const onLinkFactor = () => {
		if (!termId || !linking || !linking.topicId || !linking.factorId) {
			return;
		}
		fireGlobal(EventTypes.INVOKE_REMOTE_REQUEST,
			async () => await linkPiiFactor({termId, topicId: linking.topicId, factorId: linking.factorId}),
			(saved: PiiClassificationTerm) => {
				const linked = (saved.linkedFactors ?? []).find(lf => {
					return lf.topicId === linking.topicId && lf.factorId === linking.factorId;
				});
				if (linked != null) {
					setResults(prev => {
						const exists = (prev ?? []).some(lf => asPiiLinkedFactorKey(lf) === asPiiLinkedFactorKey(linked));
						return exists ? (prev ?? []) : [...(prev ?? []), linked];
					});
					setSelected(prev => ({...prev, [asPiiLinkedFactorKey(linked)]: true}));
				}
				setLinking(null);
				onTermsChanged();
			});
	};

	const confirmedCount = (results ?? []).filter(lf => lf.confirmed).length;

	const linkingTopic = topics.find(topic => topic.topicId === linking?.topicId);
	const linkingFactorOptions: Array<DropdownOption> = (linkingTopic?.factors ?? []).map(factor => {
		return {value: factor.factorId, label: factor.label ?? factor.name};
	});

	return <>
		<PiiToolbar>
			<PiiToolbarLabel>Term</PiiToolbarLabel>
			<PiiToolbarDropdown width={200}>
				<Dropdown options={termOptions} value={termId}
				          onChange={(option) => setTermId(option.value)}/>
			</PiiToolbarDropdown>
			<PiiToolbarPlaceholder/>
			<Button ink={ButtonInk.PRIMARY} onClick={onStartLinking}
			        disabled={scopeTopicIds.length === 0}>{Lang.PII.ADD_FACTOR}</Button>
			<Button ink={ButtonInk.PRIMARY} onClick={onDiscover}>Run Discovery</Button>
		</PiiToolbar>
		{scopeTopicIds.length === 0
			? <PiiInfoNote>{Lang.PII.NO_SCAN_TOPICS}</PiiInfoNote>
			: <PiiToolbar>
				<PiiToolbarLabel>{Lang.PII.SCAN_SCOPE}</PiiToolbarLabel>
				{scopeTopics.length === 0
					? <PiiMonoText>{scopeTopicIds.join(', ')}</PiiMonoText>
					: scopeTopics.map(topic => <PiiTag key={topic.topicId}>{topic.name}</PiiTag>)}
			</PiiToolbar>}
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
								const key = asPiiLinkedFactorKey(lf);
								const confidence = Math.round((lf.matchConfidence ?? 0) * 100);
								return <tr key={key}>
									<td>
										<CheckBox value={!!selected[key]}
										          onChange={(value) => setSelected({...selected, [key]: value})}/>
									</td>
									<td><PiiTopicText>{lf.topicName ?? lf.topicId}</PiiTopicText></td>
									<td><PiiMonoText>{lf.factorLabel ?? lf.factorName ?? lf.factorId}</PiiMonoText></td>
									<td>{lf.factorType ? <PiiTag>{lf.factorType}</PiiTag> : <span style={{opacity: 0.4}}>-</span>}</td>
									<td>
										<PiiSourceBadge source={lf.matchSource}>
											{asMatchSourceLabel(lf.matchSource)}
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
					Discovered factors take effect only after manual confirmation. Confirmed and
					manually linked factors are preserved across discovery runs.
				</PiiInfoNote>
			</>
			: <PiiNoData>Select a term and run discovery.</PiiNoData>}
		{linking != null
			? <PiiEditorOverlay onClick={(e) => {
				if (e.target === e.currentTarget) {
					setLinking(null);
				}
			}}>
				<PiiEditorPanel>
					<PiiEditorTitle>{Lang.PII.ADD_FACTOR_DIALOG_TITLE}</PiiEditorTitle>
					<PiiEditorField>
						<PiiEditorLabel>{Lang.PII.ADD_FACTOR_TOPIC_LABEL}</PiiEditorLabel>
						<Dropdown options={scopeTopics.map(topic => {
							return {value: topic.topicId, label: topic.name};
						})} value={linking.topicId}
						          onChange={(option) => setLinking({topicId: option.value, factorId: ''})}/>
					</PiiEditorField>
					<PiiEditorField>
						<PiiEditorLabel>{Lang.PII.ADD_FACTOR_FACTOR_LABEL}</PiiEditorLabel>
						<Dropdown options={linkingFactorOptions} value={linking.factorId}
						          onChange={(option) => setLinking({...linking, factorId: option.value})}/>
					</PiiEditorField>
					<PiiEditorActions>
						<Button ink={ButtonInk.WAIVE} onClick={() => setLinking(null)}>Cancel</Button>
						<Button ink={ButtonInk.PRIMARY} disabled={!linking.topicId || !linking.factorId}
						        onClick={onLinkFactor}>{Lang.ACTIONS.CONFIRM}</Button>
					</PiiEditorActions>
				</PiiEditorPanel>
			</PiiEditorOverlay>
			: null}
	</>;
};
