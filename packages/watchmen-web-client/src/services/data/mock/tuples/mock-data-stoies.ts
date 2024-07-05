import {QueryStory} from "@/services/data/tuples/query-story-types";
import {getCurrentTime} from "@/services/data/utils";


const DefaultOne:QueryStory = {
    storyId: '1',
    name:"test_test",
    createdAt: getCurrentTime(),
    lastModifiedAt: getCurrentTime()
};

export const DemoQueryStories: Array<QueryStory> = [
    DefaultOne
];