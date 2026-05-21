import {DataSourceType} from '@/services/data/tuples/data-source-types';
import {Topic, TopicStorageIndex} from '@/services/data/tuples/topic-types';
import {DwarfButton} from '@/widgets/basic/button';
import {ICON_ADD, ICON_DELETE} from '@/widgets/basic/constants';
import {ButtonInk} from '@/widgets/basic/types';
import {useForceUpdate} from '@/widgets/basic/utils';
import {TuplePropertyInput} from '@/widgets/tuple-workbench/tuple-editor';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {ChangeEvent} from 'react';
import styled from 'styled-components';
import {useTopicEventBus} from '../topic-event-bus';
import {TopicEventTypes} from '../topic-event-bus-types';

const DynamoIndexesContainer = styled.div`
	grid-column : span 2;
	display     : flex;
	flex-direction: column;
	gap         : calc(var(--margin) / 4);
`;
const DynamoIndexesHeader = styled.div`
	display         : flex;
	align-items     : center;
	justify-content : space-between;
	gap             : calc(var(--margin) / 2);
	> span {
		font-size : 0.8em;
		opacity   : 0.8;
	}
`;
const DynamoIndexRow = styled.div`
	display               : grid;
	grid-template-columns : 1fr 2fr 2fr auto;
	grid-column-gap       : calc(var(--margin) / 3);
	align-items           : center;
`;
const DynamoIndexHint = styled.span`
	font-size : 0.8em;
	opacity   : 0.7;
`;

const normalizeFactorList = (value: string, topic: Topic): Array<string> => {
	const available = new Set((topic.factors || [])
		.map(factor => factor?.name || '')
		.map(name => name.trim())
		.filter(name => name.length !== 0));
	return value.split(',')
		.map(item => item.trim())
		.filter(item => item.length !== 0)
		.filter(item => available.has(item));
};

const ensureAlternatorIndexes = (topic: Topic): Array<TopicStorageIndex> => {
	topic.storage = topic.storage || {};
	topic.storage.alternator = topic.storage.alternator || {};
	topic.storage.alternator.indexes = topic.storage.alternator.indexes || [];
	return topic.storage.alternator.indexes;
};

export const TopicDynamoIndexesInput = (props: {
	topic: Topic;
	dataSourceType?: DataSourceType;
}) => {
	const {topic, dataSourceType} = props;
	const isDynamoDB = dataSourceType === DataSourceType.DYNAMODB;
	const {fire} = useTopicEventBus();
	const forceUpdate = useForceUpdate();

	if (!isDynamoDB) {
		return null;
	}

	const indexes = ensureAlternatorIndexes(topic);
	const availableFactors = (topic.factors || [])
		.map(factor => factor?.name || '')
		.map(name => name.trim())
		.filter(name => name.length !== 0)
		.join(', ');

	const notifyChanged = () => {
		fire(TopicEventTypes.TOPIC_STORAGE_CHANGED, topic);
		forceUpdate();
	};
	const onAddIndexClicked = () => {
		indexes.push({
			name: `index_${indexes.length + 1}`,
			pk: [],
			sk: []
		});
		notifyChanged();
	};
	const onDeleteIndexClicked = (index: TopicStorageIndex) => {
		const idx = indexes.indexOf(index);
		if (idx === -1) {
			return;
		}
		indexes.splice(idx, 1);
		notifyChanged();
	};
	const onNameChanged = (index: TopicStorageIndex) => (event: ChangeEvent<HTMLInputElement>) => {
		const value = event.target.value.trim();
		index.name = value;
		notifyChanged();
	};
	const onPkChanged = (index: TopicStorageIndex) => (event: ChangeEvent<HTMLInputElement>) => {
		index.pk = normalizeFactorList(event.target.value, topic);
		notifyChanged();
	};
	const onSkChanged = (index: TopicStorageIndex) => (event: ChangeEvent<HTMLInputElement>) => {
		index.sk = normalizeFactorList(event.target.value, topic);
		notifyChanged();
	};

	return <DynamoIndexesContainer>
		<DynamoIndexesHeader>
			<span>{indexes.length === 0 ? 'No Dynamo index configured.' : `${indexes.length} indexes configured.`}</span>
			<DwarfButton ink={ButtonInk.PRIMARY} onClick={onAddIndexClicked}>
				<FontAwesomeIcon icon={ICON_ADD}/>
				<span>Add Index</span>
			</DwarfButton>
		</DynamoIndexesHeader>
		{indexes.map(index => {
			return <DynamoIndexRow key={index.name || `${(index.pk || []).join('_')}_${(index.sk || []).join('_')}`}>
				<TuplePropertyInput placeholder="Index Name" value={index.name || ''} onChange={onNameChanged(index)}/>
				<TuplePropertyInput
					placeholder="PK factors, comma separated"
					value={(index.pk || []).join(',')}
					onChange={onPkChanged(index)}/>
				<TuplePropertyInput
					placeholder="SK factors, comma separated"
					value={(index.sk || []).join(',')}
					onChange={onSkChanged(index)}/>
				<DwarfButton ink={ButtonInk.DANGER} onClick={() => onDeleteIndexClicked(index)}>
					<FontAwesomeIcon icon={ICON_DELETE}/>
				</DwarfButton>
			</DynamoIndexRow>;
		})}
		<DynamoIndexHint>Available factors: {availableFactors || '(none)'}</DynamoIndexHint>
	</DynamoIndexesContainer>;
};
