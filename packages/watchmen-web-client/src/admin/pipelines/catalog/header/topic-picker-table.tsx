import {ConnectedSpace} from '@/services/data/tuples/connected-space-types';
import {IndicatorBaseOn} from '@/services/data/tuples/indicator-types';
import {CheckBox} from '@/widgets/basic/checkbox';
import {Input} from '@/widgets/basic/input';
import {useForceUpdate} from '@/widgets/basic/utils';
import React, {ChangeEvent, useState} from 'react';
import {IndicatorCandidate, SpaceCandidate, TopicCandidate} from './types';
import {
	getCandidateKey,
	getCandidateName,
	getCandidateType,
	isIndicatorCandidate,
	isSpaceCandidate,
	isTopicCandidate
} from './utils';
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

export const TopicPickerTable = (props: {
	candidates: Array<TopicCandidate | SpaceCandidate | IndicatorCandidate>;
	connectedSpaces?: Array<ConnectedSpace>
}) => {
	const {candidates, connectedSpaces = []} = props;

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
	const onSelectionChange = (candidate: TopicCandidate | SpaceCandidate | IndicatorCandidate) => (value: boolean) => {
		candidate.picked = value;
		if (isTopicCandidate(candidate) && !candidate.picked) {
			// unpick a topic, unpick related spaces as well
			candidates.filter(isSpaceCandidate).forEach(spaceCandidate => {
				// eslint-disable-next-line
				if ((spaceCandidate.space.topicIds || []).some(topicId => topicId == candidate.topic.topicId)) {
					spaceCandidate.picked = false;
					const unpickedSubjectIds = connectedSpaces
						// eslint-disable-next-line
						.filter(connectedSpace => connectedSpace.spaceId == spaceCandidate.space.spaceId)
						.map(connectedSpace => connectedSpace.subjects)
						.flat()
						.map(subject => subject.subjectId);
					candidates.filter(isIndicatorCandidate).filter(indicatorCandidate => {
						return indicatorCandidate.indicator.baseOn === IndicatorBaseOn.SUBJECT;
					}).forEach(indicatorCandidate => {
						// eslint-disable-next-line
						if (unpickedSubjectIds.some(subjectId => subjectId == indicatorCandidate.indicator.topicOrSubjectId)) {
							indicatorCandidate.picked = false;
						}
					});
				}
				candidates.filter(isIndicatorCandidate).filter(indicatorCandidate => {
					return indicatorCandidate.indicator.baseOn === IndicatorBaseOn.TOPIC;
				}).forEach(indicatorCandidate => {
					// eslint-disable-next-line
					if (indicatorCandidate.indicator.topicOrSubjectId == candidate.topic.topicId) {
						indicatorCandidate.picked = false;
					}
				});
			});
		} else if (isSpaceCandidate(candidate) && candidate.picked) {
			// pick a space, pick related topics as well
			candidates.filter(isTopicCandidate).forEach(topicCandidate => {
				// eslint-disable-next-line
				if ((candidate.space.topicIds || []).some(topicId => topicId == topicCandidate.topic.topicId)) {
					topicCandidate.picked = true;
				}
			});
		} else if (isSpaceCandidate(candidate) && !candidate.picked) {
			const unpickedSubjectIds = connectedSpaces
				// eslint-disable-next-line
				.filter(connectedSpace => connectedSpace.spaceId == candidate.space.spaceId)
				.map(connectedSpace => connectedSpace.subjects)
				.flat()
				.map(subject => subject.subjectId);
			candidates.filter(isIndicatorCandidate).filter(indicatorCandidate => {
				return indicatorCandidate.indicator.baseOn === IndicatorBaseOn.SUBJECT;
			}).forEach(indicatorCandidate => {
				// eslint-disable-next-line
				if (unpickedSubjectIds.some(subjectId => subjectId == indicatorCandidate.indicator.topicOrSubjectId)) {
					indicatorCandidate.picked = false;
				}
			});
		} else if (isIndicatorCandidate(candidate) && candidate.picked) {
			// pick an indicator, pick related spaces and topics as well
			if (candidate.indicator.baseOn === IndicatorBaseOn.TOPIC) {
				// base on topic
				candidates.filter(isTopicCandidate).forEach(topicCandidate => {
					// eslint-disable-next-line
					if (candidate.indicator.topicOrSubjectId == topicCandidate.topic.topicId) {
						topicCandidate.picked = true;
					}
				});
			} else {
				const neededConnectedSpaces = connectedSpaces.filter(connectedSpace => {
					// eslint-disable-next-line
					return (connectedSpace.subjects || []).some(subject => subject.subjectId == candidate.indicator.topicOrSubjectId);
				});
				// base on subject
				candidates.filter(isSpaceCandidate).forEach(spaceCandidate => {
					// eslint-disable-next-line
					if (neededConnectedSpaces.some(connectedSpace => connectedSpace.spaceId == spaceCandidate.space.spaceId)) {
						spaceCandidate.picked = true;
						candidates.filter(isTopicCandidate).forEach(topicCandidate => {
							// eslint-disable-next-line
							if ((spaceCandidate.space.topicIds || []).some(topicId => topicId == topicCandidate.topic.topicId)) {
								topicCandidate.picked = true;
							}
						});
					}
				});
			}
		}
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
					<PickerTableBodyCell>{getCandidateType(candidate)}</PickerTableBodyCell>
					<PickerTableBodyCell>{getCandidateName(candidate)}</PickerTableBodyCell>
				</PickerTableBodyRow>;
			})}
		</PickerTableBody>
	</>;
};