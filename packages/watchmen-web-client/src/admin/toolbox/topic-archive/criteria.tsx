import {fetchTopicArchivePolicies} from '@/services/data/admin/topic-archive';
import {ParameterJointType} from '@/services/data/tuples/factor-calculator-types';
import {TopicArchivePolicy} from '@/services/data/tuples/topic-archive-types';
import {DataSource} from '@/services/data/tuples/data-source-types';
import {Topic, TopicId} from '@/services/data/tuples/topic-types';
import {generateUuid} from '@/services/data/tuples/utils';
import {Page} from '@/services/data/types';
import {getCurrentTime} from '@/services/data/utils';
import {AlertLabel} from '@/widgets/alert/widgets';
import {ICON_LOADING} from '@/widgets/basic/constants';
import {ButtonInk, DropdownOption} from '@/widgets/basic/types';
import {useEventBus} from '@/widgets/events/event-bus';
import {EventTypes} from '@/widgets/events/types';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import React, {useState} from 'react';
import {EditDialog} from './edit-dialog';
import {useTopicArchiveEventBus} from './topic-archive-event-bus';
import {TopicArchiveEventTypes} from './topic-archive-event-bus-types';
import {CriteriaButtonBar, CriteriaContainer, CriteriaLabel, CriteriaSearchButton, CriteriaTopicDropdown} from './widgets';

export const Criteria = (props: { topics: Array<Topic>, dataSources: Array<DataSource> }) => {
	const {topics, dataSources} = props;

	const {fire: fireGlobal} = useEventBus();
	const {fire} = useTopicArchiveEventBus();
	const [topicId, setTopicId] = useState<TopicId | null>(null);
	const [searching, setSearching] = useState(false);

	const onChange = (option: DropdownOption) => {
		setTopicId(option.value as TopicId);
	};
	const onSearchClicked = () => {
		setSearching(true);
		fireGlobal(EventTypes.INVOKE_REMOTE_REQUEST, async () => {
			return await fetchTopicArchivePolicies(topicId ?? undefined);
		}, (policies: Page<TopicArchivePolicy>) => {
			fire(TopicArchiveEventTypes.SEARCHED, {topicId: topicId ?? undefined}, policies);
			setSearching(false);
		}, () => setSearching(false));
	};
	const onCreateClicked = () => {
		if (topicId == null) {
			fireGlobal(EventTypes.SHOW_ALERT, <AlertLabel>Please pick a topic first.</AlertLabel>);
			return;
		}
		const policy: TopicArchivePolicy = {
			policyId: generateUuid(),
			topicId,
			enabled: true,
			hotDays: 90,
			coldDays: null,
			archiveDataSourceId: '',
			batchSize: 5000,
			filter: {
				jointType: ParameterJointType.AND,
				filters: []
			},
			destroyRequiresApproval: true,
			version: 1,
			createdAt: getCurrentTime(),
			lastModifiedAt: getCurrentTime()
		};
		const onPolicyCreated = async () => {
			// refresh list after created
			fireGlobal(EventTypes.INVOKE_REMOTE_REQUEST, async () => {
				return await fetchTopicArchivePolicies(topicId);
			}, (policies: Page<TopicArchivePolicy>) => {
				fire(TopicArchiveEventTypes.SEARCHED, {topicId: topicId ?? undefined}, policies);
			});
		};
		fireGlobal(EventTypes.SHOW_DIALOG,
			<EditDialog policy={policy} topics={topics} dataSources={dataSources} onConfirm={onPolicyCreated}/>,
			{
				marginTop: '10vh',
				marginLeft: '20%',
				width: '60%',
				height: '80vh'
			});
	};

	const options = topics.map(topic => {
		return {
			value: topic.topicId,
			label: topic.name || 'Noname Topic'
		};
	}).sort((p1, p2) => {
		return (p1.label.toLowerCase()).localeCompare(p2.label.toLowerCase());
	});

	return <CriteriaContainer>
		<CriteriaLabel>Topic</CriteriaLabel>
		<CriteriaTopicDropdown value={topicId} options={options} onChange={onChange}
		                       please="To archive aged data"/>
		<span/>
		<CriteriaButtonBar>
			<CriteriaSearchButton ink={ButtonInk.INFO} onClick={onCreateClicked}>
				<span>Create New Policy</span>
			</CriteriaSearchButton>
			<CriteriaSearchButton ink={ButtonInk.PRIMARY} onClick={onSearchClicked}>
				<span>Find</span>
				{searching ? <FontAwesomeIcon icon={ICON_LOADING} spin={true}/> : null}
			</CriteriaSearchButton>
		</CriteriaButtonBar>
	</CriteriaContainer>;
};
