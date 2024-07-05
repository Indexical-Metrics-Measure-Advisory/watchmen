import {TuplePage} from "@/services/data/query/tuple-page";
import {QueryStory} from "@/services/data/tuples/query-story-types";
import {DemoQueryStories} from "@/services/data/mock/tuples/mock-data-stoies";


export const listMockStories = async (options: {
    search: string;
    pageNumber?: number;
    pageSize?: number;
}): Promise<TuplePage<QueryStory>> => {
    const { pageNumber = 1, pageSize = 9 } = options;
    return new Promise<TuplePage<QueryStory>>((resolve) => {
        setTimeout(() => {
            resolve({
                data: DemoQueryStories,
                itemCount: DemoQueryStories.length,
                pageNumber,
                pageSize,
                pageCount: 3,
            });
        }, 1000);
    });
};