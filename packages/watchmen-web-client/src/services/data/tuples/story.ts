import {Apis, page} from '../apis';
import {TuplePage} from '../query/tuple-page';
import {isMockService} from '../utils';
import {QueryStory} from "@/services/data/tuples/query-story-types";
import {listMockStories} from "@/services/data/mock/tuples/mock-story";
//
// type StoryOnServer = Omit<DataStory, 'storyId'> & { storyIds: Array<StoryId> };
//
// const transformFromServer = (convergence: ConvergenceOnServer): Convergence => {
//     const {groupIds, ...rest} = convergence;
//     return {userGroupIds: groupIds, ...rest};
// };
// export const transformToServer = (story: DataStory): StoryOnServer => {
//     const {storyId, ...rest} = story;
//     return {
//         storyId: storyId,
//         ...rest
//     };
// };

export const listStories = async (options: {
    search: string;
    pageNumber?: number;
    pageSize?: number;
}): Promise<TuplePage<QueryStory>> => {
    const {search = '', pageNumber = 1, pageSize = 9} = options;

    if (isMockService()) {
        return listMockStories(options);
    } else {
        return await page({api: Apis.STORY_LIST_BY_NAME, search: {search}, pageable: {pageNumber, pageSize}});

    }
};
//
// export const listConvergencesForHolder = async (search: string): Promise<Array<QueryConvergenceForHolder>> => {
//     if (isMockService()) {
//         return listMockConvergencesForHolder(search);
//     } else {
//         return (await get({api: Apis.CONVERGENCE_LIST_FOR_HOLDER_BY_NAME, search: {search}}))
//             .map((convergence: ConvergenceOnServer) => transformFromServer(convergence));
//     }
// };
//
// export const fetchConvergence = async (convergenceId: ConvergenceId): Promise<Convergence> => {
//     if (isMockService()) {
//         return await fetchMockConvergence(convergenceId);
//     } else {
//         const convergence = await get({api: Apis.CONVERGENCE_GET, search: {convergenceId}});
//         return transformFromServer(convergence);
//     }
// };
//
// export const saveConvergence = async (convergence: Convergence): Promise<void> => {
//     convergence.tenantId = findAccount()?.tenantId;
//     if (isMockService()) {
//         return saveMockConvergence(convergence);
//     } else if (isFakedUuid(convergence)) {
//         const data = await post({api: Apis.CONVERGENCE_CREATE, data: transformToServer(convergence)});
//         convergence.convergenceId = data.convergenceId;
//         convergence.tenantId = data.tenantId;
//         convergence.version = data.version;
//         convergence.lastModifiedAt = data.lastModifiedAt;
//     } else {
//         const data = await post({api: Apis.CONVERGENCE_SAVE, data: transformToServer(convergence)});
//         convergence.tenantId = data.tenantId;
//         convergence.version = data.version;
//         convergence.lastModifiedAt = data.lastModifiedAt;
//     }
// };
//
// export const askConvergenceValues = async (convergenceId: ConvergenceId): Promise<ConvergenceData> => {
//     if (isMockService()) {
//         return askMockConvergenceValues(convergenceId);
//     } else {
//         return await get({api: Apis.CONVERGENCE_VALUES, search: {convergenceId}});
//     }
// };
