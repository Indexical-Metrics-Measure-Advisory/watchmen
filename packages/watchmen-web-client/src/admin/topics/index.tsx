import TopicBackground from '@/assets/topic-background.svg';
import {isMultipleDataSourcesEnabled} from '@/feature-switch';
import {TuplePage} from '@/services/data/query/tuple-page';
import {listDataSourcesForHolder} from '@/services/data/tuples/data-source';
import {listEnumsForHolder} from '@/services/data/tuples/enum';
import {Factor, FactorType} from '@/services/data/tuples/factor-types';
import {QueryTopic} from '@/services/data/tuples/query-topic-types';
import {fetchTopic, listTopics, saveTopic} from '@/services/data/tuples/topic';
import {Topic} from '@/services/data/tuples/topic-types';
import {isNotRawTopic, isRawTopic} from '@/services/data/tuples/topic-utils';
import {QueryTuple} from '@/services/data/tuples/tuple-types';
import {AdminCacheData} from '@/services/local-persist/types';
import {noop} from '@/services/utils';
import {AlertLabel} from '@/widgets/alert/widgets';
import {ICON_DOWNLOAD, TUPLE_SEARCH_PAGE_SIZE} from '@/widgets/basic/constants';
import {useEventBus} from '@/widgets/events/event-bus';
import {EventTypes} from '@/widgets/events/types';
import {HELP_KEYS, useHelp} from '@/widgets/help';
import {TupleWorkbench} from '@/widgets/tuple-workbench';
import {TupleEventBusProvider, useTupleEventBus} from '@/widgets/tuple-workbench/tuple-event-bus';
import {TupleEventTypes} from '@/widgets/tuple-workbench/tuple-event-bus-types';
import React, {useEffect} from 'react';
import {useAdminCacheEventBus} from '../cache/cache-event-bus';
import {AdminCacheEventTypes} from '../cache/cache-event-bus-types';
import {renderCard} from './card';
import {renderEditor} from './editor';
import {ScriptsDownloadDialog} from './scripts-download-dialog';
import {createTopic, isFactorNameInvalid, isFactorNameTooLong, isTopicNameInvalid, isTopicNameTooLong} from './utils';

const fetchTopicAndCodes = async (queryTopic: QueryTopic) => {
	const {topic} = await fetchTopic(queryTopic.topicId);
	const enums = await listEnumsForHolder();
	const dataSources = await listDataSourcesForHolder();
	return {tuple: topic, enums, dataSources};
};

const getKeyOfTopic = (topic: QueryTopic) => topic.topicId;

const isFactorNotHold = (topic: Topic, factor: Factor): boolean => {
	const name = factor.name;
	const segments = name.split('.');
	if (segments.length === 1) {
		return false;
	}

	segments.length = segments.length - 1;
	const holderName = segments.join('.');
	const holderFactor = topic.factors.find(f => f.name === holderName);
	if (holderFactor == null) {
		return true;
	} else {
		return holderFactor.type !== FactorType.ARRAY && holderFactor.type !== FactorType.OBJECT;
	}
};

const AdminTopics = () => {
	const {fire: fireGlobal} = useEventBus();
	const {fire: fireCache} = useAdminCacheEventBus();
	const {on, off, fire} = useTupleEventBus();
	useEffect(() => {
		const onDoCreateTopic = async () => {
			const enums = await listEnumsForHolder();
			const dataSources = await listDataSourcesForHolder();
			fire(TupleEventTypes.TUPLE_CREATED, createTopic(), {enums, dataSources});
		};
		const onDoEditTopic = async (queryTopic: QueryTopic) => {
			fireGlobal(EventTypes.INVOKE_REMOTE_REQUEST,
				async () => await fetchTopicAndCodes(queryTopic),
				({tuple, enums, dataSources}) => {
					fireCache(AdminCacheEventTypes.TOPIC_LOADED, tuple);
					fire(TupleEventTypes.TUPLE_LOADED, tuple, {enums, dataSources});
				});
		};
		const onDoSearchTopic = async (searchText: string, pageNumber: number) => {
			fireGlobal(EventTypes.INVOKE_REMOTE_REQUEST,
				async () => await listTopics({search: searchText, pageNumber, pageSize: TUPLE_SEARCH_PAGE_SIZE}),
				(page: TuplePage<QueryTuple>) => fire(TupleEventTypes.TUPLE_SEARCHED, page, searchText));
		};
		const onSaveTopic = async (topic: Topic, onSaved: (topic: Topic, saved: boolean) => void) => {
			if (!topic.name || !topic.name.trim()) {
				fireGlobal(EventTypes.SHOW_ALERT, <AlertLabel>Topic name is required.</AlertLabel>, () => {
					onSaved(topic, false);
				});
				return;
			} else if (isTopicNameInvalid(topic.name)) {
				fireGlobal(EventTypes.SHOW_ALERT, <AlertLabel>
					Please use camel case or snake case for topic name.
				</AlertLabel>, () => {
					onSaved(topic, false);
				});
				return;
			} else if (isTopicNameTooLong(topic.name)) {
				fireGlobal(EventTypes.SHOW_ALERT, <AlertLabel>
					55 characters maximum for topic name.
				</AlertLabel>, () => {
					onSaved(topic, false);
				});
				return;
			} else if (isMultipleDataSourcesEnabled() && !topic.dataSourceId) {
				fireGlobal(EventTypes.SHOW_ALERT, <AlertLabel> Please select data source. </AlertLabel>, () => {
					onSaved(topic, false);
				});
				return;
			} else if (!topic.factors || topic.factors.filter(f => !!f).length === 0) {
				fireGlobal(EventTypes.SHOW_ALERT, <AlertLabel>At least one factor in topic.</AlertLabel>, () => {
					onSaved(topic, false);
				});
				return;
			} else if (topic.factors.some(f => !f.name || !f.name.trim())) {
				const indexes = topic.factors
					.map((f, index) => (!f.name || !f.name.trim()) ? (index + 1) : -1)
					.filter(index => index !== -1)
					.map(index => `#${index}`);
				fireGlobal(EventTypes.SHOW_ALERT, <AlertLabel>
					Factor name is required, please check {indexes.join(', ')}.
				</AlertLabel>, () => {
					onSaved(topic, false);
				});
				return;
			} else if (topic.factors.some(f => isFactorNameInvalid(f.name))) {
				const indexes = topic.factors
					.map((f, index) => isFactorNameInvalid(f.name) ? (index + 1) : -1)
					.filter(index => index !== -1)
					.map(index => `#${index}`);
				fireGlobal(EventTypes.SHOW_ALERT, <AlertLabel>
					Use camel case or snake case for factor name, please check {indexes.join(', ')}.
				</AlertLabel>, () => {
					onSaved(topic, false);
				});
				return;
			} else if (topic.factors.some(f => isFactorNameTooLong(topic, f))) {
				const indexes = topic.factors
					.map((f, index) => isFactorNameTooLong(topic, f) ? (index + 1) : -1)
					.filter(index => index !== -1)
					.map(index => `#${index}`);
				fireGlobal(EventTypes.SHOW_ALERT, <AlertLabel>
					60 characters maximum for factor name, please check {indexes.join(', ')}.
				</AlertLabel>, () => {
					onSaved(topic, false);
				});
				return;
			} else if (isNotRawTopic(topic) && topic.factors.some(f => f.type === FactorType.OBJECT || f.type === FactorType.ARRAY)) {
				fireGlobal(EventTypes.SHOW_ALERT, <AlertLabel>
					Object or array factor is allowed in raw topic only.
				</AlertLabel>, () => {
					onSaved(topic, false);
				});
				return;
			} else if (isRawTopic(topic) && topic.factors.some(f => isFactorNotHold(topic, f))) {
				const indexes = topic.factors
					.map((f, index) => isFactorNotHold(topic, f) ? (index + 1) : -1)
					.filter(index => index !== -1)
					.map(index => `#${index}`);
				fireGlobal(EventTypes.SHOW_ALERT, <AlertLabel>
					Hierarchical factor(s) must be declared by parent, please check {indexes.join(', ')}.
				</AlertLabel>, () => {
					onSaved(topic, false);
				});
				return;
			} else if (new Set(topic.factors.map(factor => factor.name.toUpperCase())).size !== topic.factors.length) {
				const indexes = topic.factors
					.reduce((all, f, index) => {
						if (all.names[(f.name || '').toUpperCase()]) {
							all.invalid.push(index + 1);
						} else {
							all.names[(f.name || '').toUpperCase()] = true;
						}
						return all;
					}, {
						names: {},
						invalid: []
					} as { names: Record<string, true>, invalid: Array<number> })
					.invalid
					.map(index => `#${index}`);
				fireGlobal(EventTypes.SHOW_ALERT, <AlertLabel>
					Each factor should have its unique name, please check {indexes.join(', ')}.
				</AlertLabel>, () => {
					onSaved(topic, false);
				});
				return;
			}
			fireGlobal(EventTypes.INVOKE_REMOTE_REQUEST,
				async () => await saveTopic(topic),
				() => {
					onSaved(topic, true);
					fireCache(AdminCacheEventTypes.SAVE_TOPIC, topic);
					fireCache(AdminCacheEventTypes.ASK_LOAD_MORE, noop);
				},
				() => onSaved(topic, false));
		};
		on(TupleEventTypes.DO_CREATE_TUPLE, onDoCreateTopic);
		on(TupleEventTypes.DO_EDIT_TUPLE, onDoEditTopic);
		on(TupleEventTypes.DO_SEARCH_TUPLE, onDoSearchTopic);
		on(TupleEventTypes.SAVE_TUPLE, onSaveTopic);
		return () => {
			off(TupleEventTypes.DO_CREATE_TUPLE, onDoCreateTopic);
			off(TupleEventTypes.DO_EDIT_TUPLE, onDoEditTopic);
			off(TupleEventTypes.DO_SEARCH_TUPLE, onDoSearchTopic);
			off(TupleEventTypes.SAVE_TUPLE, onSaveTopic);
		};
	}, [on, off, fire, fireGlobal, fireCache]);
	useHelp(HELP_KEYS.ADMIN_TOPIC);

	const onDownloadScriptsClicked = () => {
		const askData = () => {
			fireCache(AdminCacheEventTypes.ASK_DATA_LOADED, (loaded: boolean) => {
				if (loaded) {
					fireCache(AdminCacheEventTypes.ASK_DATA, (data?: AdminCacheData) => {
						fireGlobal(EventTypes.SHOW_DIALOG, <ScriptsDownloadDialog topics={data?.topics || []}/>,
							{
								marginTop: '10vh',
								marginLeft: '20%',
								width: '60%',
								height: '80vh'
							});
					});
				} else {
					setTimeout(() => askData(), 100);
				}
			});
		};
		askData();
	};

	return <TupleWorkbench title="Topics"
	                       createButtonLabel="Create Topic" canCreate={true}
	                       moreButtons={[{
		                       label: 'Download Scripts',
		                       icon: ICON_DOWNLOAD,
		                       action: onDownloadScriptsClicked
	                       }]}
	                       searchPlaceholder="Search by topic name, description, etc."
	                       tupleLabel="Topic" tupleImage={TopicBackground} tupleImagePosition="left 120px"
	                       renderEditor={renderEditor}
	                       renderCard={renderCard} getKeyOfTuple={getKeyOfTopic}
	/>;
};
const AdminTopicsIndex = () => {
	return <TupleEventBusProvider>
		<AdminTopics/>
	</TupleEventBusProvider>;
};

export default AdminTopicsIndex;