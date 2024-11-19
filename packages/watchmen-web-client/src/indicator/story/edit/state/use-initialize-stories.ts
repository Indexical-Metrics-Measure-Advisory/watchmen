import {useEffect, useState} from 'react';
import {createStory} from '../../utils';
import {DataStory} from "@/services/data/tuples/story-types";
import {useStoryEventBus} from "@/indicator/story/story-event-bus";
import {StoryEventTypes} from "@/indicator/story/story-event-bus-types";

export const useInitializeStories = (): DataStory | null => {
    const {fire} = useStoryEventBus();
    const [story, setStory] = useState<DataStory | null>(null);
    useEffect(() => {
        fire(StoryEventTypes.ASK_STORY, (story?: DataStory) => {
            if (story == null) {
                setStory(createStory());
            } else {
                setStory(story);

            }
        });
    }, [fire]);

    return story;
};
