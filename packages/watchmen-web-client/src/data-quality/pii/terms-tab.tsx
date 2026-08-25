import {deletePiiTerm, savePiiTerm} from '@/services/data/data-quality/pii';
import {
	asPiiCategoryLabel,
	asPiiLevelLabel,
	PII_CATEGORY_LABELS,
	PII_SENSITIVITY_LEVEL_LABELS,
	PiiCategory,
	PiiClassificationTerm,
	PiiSensitivityLevel
} from '@/services/data/data-quality/pii-types';
import {fetchAllTopics} from '@/services/data/pipeline/all-topics';
import {Topic} from '@/services/data/tuples/topic-types';
import {Button} from '@/widgets/basic/button';
import {CheckBox} from '@/widgets/basic/checkbox';
import {Dropdown} from '@/widgets/basic/dropdown';
import {Input} from '@/widgets/basic/input';
import {ButtonInk, DropdownOption} from '@/widgets/basic/types';
import {useEventBus} from '@/widgets/events/event-bus';
import {EventTypes} from '@/widgets/events/types';
import {Lang} from '@/widgets/langs';
import React, {useEffect, useState} from 'react';
import {
	PiiCheckList,
	PiiCheckListItem,
	PiiEditorActions,
	PiiEditorField,
	PiiEditorInput,
	PiiEditorLabel,
	PiiEditorOverlay,
	PiiEditorPanel,
	PiiEditorTextarea,
	PiiEditorTitle,
	PiiLevelBadge,
	PiiNoData,
	PiiTag,
	PiiTermCard,
	PiiTermCardActions,
	PiiTermCardHeader,
	PiiTermCardMeta,
	PiiTermCardStats,
	PiiTermCardTags,
	PiiTermCardTitle,
	PiiTermGrid,
	PiiToolbar,
	PiiToolbarDropdown,
	PiiToolbarInput,
	PiiToolbarPlaceholder
} from './widgets';

interface EditorState {
	termId?: string;
	name: string;
	description: string;
	category: string;
	sensitivityLevel: string;
	topicIds: Array<string>;
	factorTypePatterns: string;
	keywordPatterns: string;
	// carried through on edit so saving never clobbers existing mappings
	linkedFactors: PiiClassificationTerm['linkedFactors'];
}

const EMPTY_EDITOR: EditorState = {
	name: '',
	description: '',
	category: PiiCategory.CUSTOMER,
	sensitivityLevel: PiiSensitivityLevel.LEVEL_1,
	topicIds: [],
	factorTypePatterns: '',
	keywordPatterns: '',
	linkedFactors: []
};

const asPatterns = (text: string): Array<string> => {
	return text.split(/[,\n]/).map(x => x.trim()).filter(x => x.length > 0);
};

export const PiiTermsTab = (props: {
	terms: Array<PiiClassificationTerm>;
	onTermsChanged: () => void;
}) => {
	const {terms, onTermsChanged} = props;

	const {fire: fireGlobal} = useEventBus();
	const [searchText, setSearchText] = useState('');
	const [levelFilter, setLevelFilter] = useState('');
	const [categoryFilter, setCategoryFilter] = useState('');
	const [editing, setEditing] = useState<EditorState | null>(null);
	const [topics, setTopics] = useState<Array<Topic>>([]);

	useEffect(() => {
		fireGlobal(EventTypes.INVOKE_REMOTE_REQUEST,
			async () => await fetchAllTopics(),
			(loaded: Array<Topic>) => setTopics(loaded ?? []));
	}, [fireGlobal]);

	const levelOptions: Array<DropdownOption> = [
		{value: '', label: 'All Levels'},
		...Object.values(PiiSensitivityLevel).map(level => {
			return {value: level, label: PII_SENSITIVITY_LEVEL_LABELS[level]};
		})
	];
	const categoryOptions: Array<DropdownOption> = [
		{value: '', label: 'All Categories'},
		...Object.values(PiiCategory).map(category => {
			return {value: category, label: PII_CATEGORY_LABELS[category]};
		})
	];

	const filtered = terms.filter(term => {
		if (searchText && !term.name.toLowerCase().includes(searchText.toLowerCase())) {
			return false;
		}
		if (levelFilter && term.sensitivityLevel !== levelFilter) {
			return false;
		}
		if (categoryFilter && term.category !== categoryFilter) {
			return false;
		}
		return true;
	});

	const onCreate = () => setEditing({...EMPTY_EDITOR});
	const onEdit = (term: PiiClassificationTerm) => {
		setEditing({
			termId: term.termId,
			name: term.name,
			description: term.description ?? '',
			category: term.category ?? PiiCategory.CUSTOMER,
			sensitivityLevel: term.sensitivityLevel ?? PiiSensitivityLevel.LEVEL_1,
			topicIds: term.topicIds ?? [],
			factorTypePatterns: (term.factorTypePatterns ?? []).join(', '),
			keywordPatterns: (term.keywordPatterns ?? []).join(', '),
			linkedFactors: term.linkedFactors ?? []
		});
	};
	const onDelete = (term: PiiClassificationTerm) => {
		fireGlobal(EventTypes.SHOW_YES_NO_DIALOG,
			`Are you sure to delete term "${term.name}"?`,
			() => {
				fireGlobal(EventTypes.HIDE_DIALOG);
				fireGlobal(EventTypes.INVOKE_REMOTE_REQUEST,
					async () => await deletePiiTerm(term.termId!),
					() => onTermsChanged());
			},
			() => fireGlobal(EventTypes.HIDE_DIALOG));
	};
	const onSave = () => {
		if (!editing || !editing.name.trim()) {
			return;
		}
		const term = {
			termId: editing.termId,
			name: editing.name.trim(),
			description: editing.description.trim() || (void 0),
			category: editing.category,
			sensitivityLevel: editing.sensitivityLevel,
			topicIds: editing.topicIds,
			factorTypePatterns: asPatterns(editing.factorTypePatterns),
			keywordPatterns: asPatterns(editing.keywordPatterns),
			linkedFactors: editing.linkedFactors
		} as PiiClassificationTerm;
		fireGlobal(EventTypes.INVOKE_REMOTE_REQUEST,
			async () => await savePiiTerm(term),
			() => {
				setEditing(null);
				onTermsChanged();
			});
	};

	const topicNameOf = (topicId: string): string => {
		return topics.find(topic => topic.topicId === topicId)?.name ?? topicId;
	};
	const onTopicToggled = (topicId: string) => {
		if (!editing) {
			return;
		}
		const topicIds = editing.topicIds.includes(topicId)
			? editing.topicIds.filter(id => id !== topicId)
			: [...editing.topicIds, topicId];
		setEditing({...editing, topicIds});
	};

	const renderCard = (term: PiiClassificationTerm) => {
		return <PiiTermCard key={term.termId}>
			<PiiTermCardHeader>
				<PiiTermCardTitle>{term.name}</PiiTermCardTitle>
				<PiiLevelBadge level={term.sensitivityLevel}>
					{asPiiLevelLabel(term.sensitivityLevel)}
				</PiiLevelBadge>
			</PiiTermCardHeader>
			<PiiTermCardMeta>
				<span>{asPiiCategoryLabel(term.category)}</span>
			</PiiTermCardMeta>
			<PiiTermCardStats>
				<span>Linked Factors</span>
				<span>{(term.linkedFactors ?? []).length}</span>
			</PiiTermCardStats>
			{(term.topicIds ?? []).length !== 0
				? <PiiTermCardTags>{term.topicIds.map(t => <PiiTag key={t}>{topicNameOf(t)}</PiiTag>)}</PiiTermCardTags>
				: null}
			{(term.factorTypePatterns ?? []).length !== 0
				? <PiiTermCardTags>{term.factorTypePatterns.map(t => <PiiTag key={t}>{t}</PiiTag>)}</PiiTermCardTags>
				: null}
			{(term.keywordPatterns ?? []).length !== 0
				? <PiiTermCardTags>{term.keywordPatterns.map(t => <PiiTag key={t}>{t}</PiiTag>)}</PiiTermCardTags>
				: null}
			<PiiTermCardActions>
				<span onClick={() => onEdit(term)}>Edit</span>
				<span onClick={() => onDelete(term)}>Delete</span>
			</PiiTermCardActions>
		</PiiTermCard>;
	};

	return <>
		<PiiToolbar>
			<PiiToolbarInput>
				<Input value={searchText} placeholder="Search terms..."
				       onChange={(e) => setSearchText(e.target.value)}/>
			</PiiToolbarInput>
			<PiiToolbarDropdown width={160}>
				<Dropdown options={levelOptions} value={levelFilter}
				          onChange={(option) => setLevelFilter(option.value)}/>
			</PiiToolbarDropdown>
			<PiiToolbarDropdown width={180}>
				<Dropdown options={categoryOptions} value={categoryFilter}
				          onChange={(option) => setCategoryFilter(option.value)}/>
			</PiiToolbarDropdown>
			<PiiToolbarPlaceholder/>
			<Button ink={ButtonInk.PRIMARY} onClick={onCreate}>New Term</Button>
		</PiiToolbar>
		{filtered.length === 0
			? <PiiNoData>No terms found.</PiiNoData>
			: <PiiTermGrid>{filtered.map(renderCard)}</PiiTermGrid>}
		{editing != null
			? <PiiEditorOverlay onClick={(e) => {
				if (e.target === e.currentTarget) {
					setEditing(null);
				}
			}}>
				<PiiEditorPanel>
					<PiiEditorTitle>{editing.termId ? 'Edit Term' : 'New Term'}</PiiEditorTitle>
					<PiiEditorField>
						<PiiEditorLabel>Name *</PiiEditorLabel>
						<PiiEditorInput value={editing.name} placeholder="Term name" autoFocus
						                onChange={(e) => setEditing({...editing, name: e.target.value})}/>
					</PiiEditorField>
					<PiiEditorField>
						<PiiEditorLabel>Description</PiiEditorLabel>
						<PiiEditorTextarea value={editing.description} placeholder="Optional description"
						                   onChange={(e) => setEditing({...editing, description: e.target.value})}/>
					</PiiEditorField>
					<PiiEditorField>
						<PiiEditorLabel>Sensitivity Level</PiiEditorLabel>
						<Dropdown options={Object.values(PiiSensitivityLevel).map(level => {
							return {value: level, label: PII_SENSITIVITY_LEVEL_LABELS[level]};
						})} value={editing.sensitivityLevel}
						          onChange={(option) => setEditing({...editing, sensitivityLevel: option.value})}/>
					</PiiEditorField>
					<PiiEditorField>
						<PiiEditorLabel>Category</PiiEditorLabel>
						<Dropdown options={Object.values(PiiCategory).map(category => {
							return {value: category, label: PII_CATEGORY_LABELS[category]};
						})} value={editing.category}
						          onChange={(option) => setEditing({...editing, category: option.value})}/>
					</PiiEditorField>
					<PiiEditorField>
						<PiiEditorLabel>{Lang.PII.RELATED_TOPICS}</PiiEditorLabel>
						<PiiCheckList>
							{topics.length === 0
								? <PiiNoData>{Lang.PLAIN.LOADING}</PiiNoData>
								: topics.map(topic => {
									return <PiiCheckListItem key={topic.topicId}
									                         onClick={() => onTopicToggled(topic.topicId)}>
										<CheckBox value={editing.topicIds.includes(topic.topicId)}
										          onChange={() => onTopicToggled(topic.topicId)}/>
										<span>{topic.name}</span>
									</PiiCheckListItem>;
								})}
						</PiiCheckList>
					</PiiEditorField>
					<PiiEditorField>
						<PiiEditorLabel>Factor Type Patterns (comma separated)</PiiEditorLabel>
						<PiiEditorInput value={editing.factorTypePatterns} placeholder="id-no, mobile, email"
						                onChange={(e) => setEditing({...editing, factorTypePatterns: e.target.value})}/>
					</PiiEditorField>
					<PiiEditorField>
						<PiiEditorLabel>Keyword Patterns (comma separated)</PiiEditorLabel>
						<PiiEditorInput value={editing.keywordPatterns} placeholder="id_card, identity"
						                onChange={(e) => setEditing({...editing, keywordPatterns: e.target.value})}/>
					</PiiEditorField>
					<PiiEditorActions>
						<Button ink={ButtonInk.WAIVE} onClick={() => setEditing(null)}>Cancel</Button>
						<Button ink={ButtonInk.PRIMARY} disabled={!editing.name.trim()} onClick={onSave}>
							{editing.termId ? 'Save' : 'Create'}
						</Button>
					</PiiEditorActions>
				</PiiEditorPanel>
			</PiiEditorOverlay>
			: null}
	</>;
};
