import {findAccount} from '../account';
import {Apis, get, page, post} from '../apis';
import {fetchMockTag, listMockTags, listMockTagsByType, saveMockTag} from '../mock/tuples/mock-tag';
import {TuplePage} from '../query/tuple-page';
import {isMockService} from '../utils';
import {QueryTag} from './query-tag-types';
import {Tag, TagId, TagType} from './tag-types';
import {isFakedUuid} from './utils';

export const listTags = async (options: {
	search: string;
	pageNumber?: number;
	pageSize?: number;
}): Promise<TuplePage<QueryTag>> => {
	const {search = '', pageNumber = 1, pageSize = 9} = options;

	if (isMockService()) {
		return listMockTags(options);
	} else {
		return await page({api: Apis.TAG_LIST_BY_NAME, search: {search}, pageable: {pageNumber, pageSize}});
	}
};

export const fetchTag = async (tagId: TagId): Promise<Tag> => {
	if (isMockService()) {
		return fetchMockTag(tagId);
	} else {
		return await get({api: Apis.TAG_GET, search: {tagId}});
	}
};

export const saveTag = async (tag: Tag): Promise<void> => {
	if (isMockService()) {
		await saveMockTag(tag);
	} else if (isFakedUuid(tag)) {
		tag.tenantId = findAccount()?.tenantId;
		const data = await post({api: Apis.TAG_CREATE, data: tag});
		tag.tagId = data.tagId;
		tag.version = data.version;
		tag.tenantId = data.tenantId;
		tag.lastModifiedAt = data.lastModifiedAt;
	} else {
		const data = await post({api: Apis.TAG_SAVE, data: tag});
		tag.version = data.version;
		tag.tenantId = data.tenantId;
		tag.lastModifiedAt = data.lastModifiedAt;
	}
};

export const listTagsByType = async (type: TagType): Promise<Array<Tag>> => {
	if (isMockService()) {
		return listMockTagsByType(type);
	} else {
		return await get({api: Apis.TAG_LIST_BY_TYPE, search: {type}});
	}
};
