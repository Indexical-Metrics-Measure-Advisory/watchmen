import {TuplePage} from '@/services/data/query/tuple-page';
import {QueryTag} from '@/services/data/tuples/query-tag-types';
import {fetchTag, listTags, saveTag} from '@/services/data/tuples/tag';
import {Tag} from '@/services/data/tuples/tag-types';
import {QueryTuple} from '@/services/data/tuples/tuple-types';
import {AlertLabel} from '@/widgets/alert/widgets';
import {TUPLE_SEARCH_PAGE_SIZE} from '@/widgets/basic/constants';
import {useEventBus} from '@/widgets/events/event-bus';
import {EventTypes} from '@/widgets/events/types';
import {TupleWorkbench} from '@/widgets/tuple-workbench';
import {TupleEventBusProvider, useTupleEventBus} from '@/widgets/tuple-workbench/tuple-event-bus';
import {TupleEventTypes} from '@/widgets/tuple-workbench/tuple-event-bus-types';
import React, {useEffect} from 'react';
import EnumBackground from '../../assets/enum-background.svg';
import {renderCard} from './card';
import {renderEditor} from './editor';
import {createTag} from './utils';

const getKeyOfTag = (tag: QueryTag) => tag.tagId;

const AdminTags = () => {
	const {fire: fireGlobal} = useEventBus();
	const {on, off, fire} = useTupleEventBus();
	useEffect(() => {
		const onDoCreateTag = () => {
			const tag = createTag();
			fire(TupleEventTypes.TUPLE_CREATED, tag);
		};
		const onDoEditTag = async (queryTag: QueryTag) => {
			fireGlobal(EventTypes.INVOKE_REMOTE_REQUEST,
				async () => await fetchTag(queryTag.tagId),
				(tag: Tag) => fire(TupleEventTypes.TUPLE_LOADED, tag));
		};
		const onDoSearchTag = async (searchText: string, pageNumber: number) => {
			fireGlobal(EventTypes.INVOKE_REMOTE_REQUEST,
				async () => await listTags({search: searchText, pageNumber, pageSize: TUPLE_SEARCH_PAGE_SIZE}),
				(page: TuplePage<QueryTuple>) => fire(TupleEventTypes.TUPLE_SEARCHED, page, searchText));
		};
		const onSaveTag = async (tag: Tag, onSaved: (tag: Tag, saved: boolean) => void) => {
			if (!tag.name || !tag.name.trim()) {
				fireGlobal(EventTypes.SHOW_ALERT, <AlertLabel>Tag name is required.</AlertLabel>, () => {
					onSaved(tag, false);
				});
				return;
			}
			fireGlobal(EventTypes.INVOKE_REMOTE_REQUEST,
				async () => await saveTag(tag),
				() => onSaved(tag, true),
				() => onSaved(tag, false));
		};
		on(TupleEventTypes.DO_CREATE_TUPLE, onDoCreateTag);
		on(TupleEventTypes.DO_EDIT_TUPLE, onDoEditTag);
		on(TupleEventTypes.DO_SEARCH_TUPLE, onDoSearchTag);
		on(TupleEventTypes.SAVE_TUPLE, onSaveTag);
		return () => {
			off(TupleEventTypes.DO_CREATE_TUPLE, onDoCreateTag);
			off(TupleEventTypes.DO_EDIT_TUPLE, onDoEditTag);
			off(TupleEventTypes.DO_SEARCH_TUPLE, onDoSearchTag);
			off(TupleEventTypes.SAVE_TUPLE, onSaveTag);
		};
	}, [on, off, fire, fireGlobal]);

	return <TupleWorkbench title="Tags"
	                       createButtonLabel="Create Tag" canCreate={true}
	                       searchPlaceholder="Search by tag name, description, etc."
	                       tupleLabel="Tag" tupleImage={EnumBackground} tupleImagePosition="20px 40px"
	                       renderEditor={renderEditor}
	                       renderCard={renderCard} getKeyOfTuple={getKeyOfTag}
	/>;
};
const AdminTagsIndex = () => {
	return <TupleEventBusProvider>
		<AdminTags/>
	</TupleEventBusProvider>;
};

export default AdminTagsIndex;
