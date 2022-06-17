import {Topic} from '@/services/data/tuples/topic-types';
import {CheckBox} from '@/widgets/basic/checkbox';
import {Input} from '@/widgets/basic/input';
import {useForceUpdate} from '@/widgets/basic/utils';
import React, {ChangeEvent, useState} from 'react';
import {
	PickerTableBody,
	PickerTableBodyCell,
	PickerTableBodyRow,
	PickerTableHeader,
	PickerTableHeaderCell
} from './widgets';

interface Filter {
	value: string;
	handler?: number;
}

export interface TopicCandidate {
	topic: Topic;
	picked: boolean;
}

const getCandidateKey = (candidate: TopicCandidate): string => {
	return `topic-${candidate.topic.topicId}`;
};
const getCandidateName = (candidate: TopicCandidate, askDefault: boolean = true): string => {
	return candidate.topic.name || (askDefault ? 'Noname Topic' : '');
};

export const TopicPickerTable = (props: { candidates: Array<TopicCandidate> }) => {
	const {candidates} = props;

	const [items, setItems] = useState(candidates);
	const [filter, setFilter] = useState<Filter>({value: ''});
	const forceUpdate = useForceUpdate();

	const onFilterTextChanged = (event: ChangeEvent<HTMLInputElement>) => {
		const {value} = event.target;
		if (filter.handler) {
			window.clearTimeout(filter.handler);
		}
		setFilter({
			value, handler: window.setTimeout(() => {
				delete filter.handler;
				const text = value.trim().toLowerCase();
				if (text === '') {
					setItems(candidates);
				} else {
					setItems(candidates.filter(candidate => getCandidateName(candidate).toLowerCase().includes(text)));
				}
			}, 300)
		});
	};
	const onAllSelectionChange = () => {
		const allSelected = items.every(item => item.picked);
		if (allSelected) {
			items.forEach(item => item.picked = false);
		} else {
			items.forEach(item => item.picked = true);
		}
		forceUpdate();
	};
	const onSelectionChange = (candidate: TopicCandidate) => (value: boolean) => {
		candidate.picked = value;
		forceUpdate();
	};
	const onCandidateNameChange = (candidate: TopicCandidate) => (event: ChangeEvent<HTMLInputElement>) => {
		const {value} = event.target;
		candidate.topic.name = value;
		forceUpdate();
	};

	const allSelected = items.every(item => item.picked);

	return <>
		<PickerTableHeader>
			<PickerTableHeaderCell>#</PickerTableHeaderCell>
			<PickerTableHeaderCell>
				<CheckBox value={allSelected} data-checked={allSelected} onChange={onAllSelectionChange}/>
			</PickerTableHeaderCell>
			<PickerTableHeaderCell>Tuple Type</PickerTableHeaderCell>
			<PickerTableHeaderCell>
				<span>Name</span>
				<Input placeholder="Filter by name..."
				       value={filter.value} onChange={onFilterTextChanged}/>
			</PickerTableHeaderCell>
		</PickerTableHeader>
		<PickerTableBody>
			{items.map((candidate, index) => {
				return <PickerTableBodyRow key={getCandidateKey(candidate)}>
					<PickerTableBodyCell>{index + 1}</PickerTableBodyCell>
					<PickerTableBodyCell>
						<CheckBox value={candidate.picked} data-checked={candidate.picked}
						          onChange={onSelectionChange(candidate)}/>
					</PickerTableBodyCell>
					<PickerTableBodyCell>Topic</PickerTableBodyCell>
					<PickerTableBodyCell>
						<Input value={getCandidateName(candidate)} onChange={onCandidateNameChange(candidate)}/>
					</PickerTableBodyCell>
				</PickerTableBodyRow>;
			})}
		</PickerTableBody>
	</>;
};