import ConvergenceBackground from '@/assets/convergence-background.svg';
import {Router} from '@/routes/types';
import {TuplePage} from '@/services/data/query/tuple-page';
import {TUPLE_SEARCH_PAGE_SIZE} from '@/widgets/basic/constants';
import {useEventBus} from '@/widgets/events/event-bus';
import {EventTypes} from '@/widgets/events/types';
import {Lang} from '@/widgets/langs';
import {TupleWorkbench} from '@/widgets/tuple-workbench';
import {TupleEventBusProvider, useTupleEventBus} from '@/widgets/tuple-workbench/tuple-event-bus';
import {TupleEventTypes} from '@/widgets/tuple-workbench/tuple-event-bus-types';
import React, {useEffect} from 'react';
import {Navigate} from 'react-router-dom';
import {useStoryEventBus} from '../story-event-bus';
import {StoryEventTypes} from '../story-event-bus-types';
import {renderCard} from './card';
import {QueryStory} from "@/services/data/tuples/query-story-types";
import {DataStory} from "@/services/data/tuples/story-types";
import {listStories} from "@/services/data/tuples/story";

const getKeyOfDataStory = (dataStory: QueryStory) => dataStory.storyId;
// noinspection JSUnusedLocalSymbols
const renderEditor = (dataStory: DataStory) => <Navigate to={Router.IDW_STORY_EDIT}/>;

const RealStoryList = () => {
    const {fire: fireGlobal} = useEventBus();
    const {on, off, fire} = useTupleEventBus();
    const {fire: fireStory} = useStoryEventBus();
    useEffect(() => {
        const onDoCreatStory = async () => {
            fireStory(StoryEventTypes.CREATE_STORY, (story: DataStory) => {
                fire(TupleEventTypes.TUPLE_CREATED, story);
            });
        };
        const onDoEditStory = async (queryStory: QueryStory) => {
            fireStory(StoryEventTypes.PICK_STORY, queryStory.storyId, (story: DataStory) => {
                fire(TupleEventTypes.TUPLE_LOADED, story);
            });
        };
        const onDoSearchStory = async (searchText: string, pageNumber: number) => {
            fireGlobal(EventTypes.INVOKE_REMOTE_REQUEST,
                async () => await listStories({search: searchText, pageNumber, pageSize: TUPLE_SEARCH_PAGE_SIZE}),
                (page: TuplePage<QueryStory>) => {
                    fire(TupleEventTypes.TUPLE_SEARCHED, page, searchText);
                    fireStory(StoryEventTypes.SEARCHED, page, searchText);
                });
        };
        on(TupleEventTypes.DO_CREATE_TUPLE, onDoCreatStory);
        on(TupleEventTypes.DO_EDIT_TUPLE, onDoEditStory);
        on(TupleEventTypes.DO_SEARCH_TUPLE, onDoSearchStory);
        return () => {
            off(TupleEventTypes.DO_CREATE_TUPLE, onDoCreatStory);
            off(TupleEventTypes.DO_EDIT_TUPLE, onDoEditStory);
            off(TupleEventTypes.DO_SEARCH_TUPLE, onDoSearchStory);
        };
    }, [on, off, fire, fireStory, fireGlobal]);
    useEffect(() => {
        fireStory(StoryEventTypes.ASK_SEARCHED, (page?: TuplePage<QueryStory>, searchText?: string) => {
            if (page) {
                fire(TupleEventTypes.TUPLE_SEARCHED, page, searchText ?? '');
            }
        });
    }, [fire, fireStory]);

    return <TupleWorkbench title={Lang.INDICATOR.STORY.DATA_STORY}
                           createButtonLabel={Lang.INDICATOR.STORY.NEW_STORY_PREFIX} canCreate={true}
                           searchPlaceholder={Lang.PLAIN.FIND_DATA_STORY_PLACEHOLDER}
                           tupleLabel={Lang.INDICATOR.STORY.LIST_LABEL}
                           newTupleLabelPrefix={Lang.INDICATOR.STORY.NEW_STORY_PREFIX}
                           existingTupleLabelPrefix={Lang.INDICATOR.STORY.EXISTING_STORY_PREFIX}
                           tupleImage={ConvergenceBackground} tupleImagePosition="left 120px"
                           renderEditor={renderEditor}
                           confirmEditButtonLabel={Lang.ACTIONS.CONFIRM}
                           closeEditButtonLabel={Lang.ACTIONS.CLOSE}
                           renderCard={renderCard} getKeyOfTuple={getKeyOfDataStory}
    />;
};

const StoryList = () => {
    return <TupleEventBusProvider>
        <RealStoryList/>
    </TupleEventBusProvider>;
};

export default StoryList;