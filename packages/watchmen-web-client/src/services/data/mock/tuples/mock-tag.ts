import {TuplePage} from '../../query/tuple-page';
import {QueryTag} from '../../tuples/query-tag-types';
import {Tag, TagId, TagType} from '../../tuples/tag-types';
import {isFakedUuid} from '../../tuples/utils';
import {getCurrentTime} from '../../utils';
const MOCK_TAGS: Array<Tag> = [
	{
		tagId: '1',
		name: 'Raw',
		type: TagType.TOPIC,
		description: 'Raw data layer',
		version: 1,
		createdAt: getCurrentTime(),
		lastModifiedAt: getCurrentTime()
	},
	{
		tagId: '2',
		name: 'ODS',
		type: TagType.TOPIC,
		description: 'Operational data store layer',
		version: 1,
		createdAt: getCurrentTime(),
		lastModifiedAt: getCurrentTime()
	},
	{
		tagId: '3',
		name: 'Domain',
		type: TagType.TOPIC,
		description: 'Domain data layer',
		version: 1,
		createdAt: getCurrentTime(),
		lastModifiedAt: getCurrentTime()
	},
	{
		tagId: '4',
		name: 'Datamart',
		type: TagType.TOPIC,
		description: 'Datamart layer',
		version: 1,
		createdAt: getCurrentTime(),
		lastModifiedAt: getCurrentTime()
	}
];

export const listMockTags = async (options: {
	search: string;
	pageNumber?: number;
	pageSize?: number;
}): Promise<TuplePage<QueryTag>> => {
	const {search = '', pageNumber = 1, pageSize = 9} = options;
	return new Promise((resolve) => {
		setTimeout(() => {
			const searchText = search.trim().toLowerCase();
			const data = MOCK_TAGS
				.filter(tag => searchText.length === 0
					|| tag.name.toLowerCase().includes(searchText)
					|| (tag.description ?? '').toLowerCase().includes(searchText))
				.map(({tagId, name, type, description, createdAt, lastModifiedAt}) => {
					return {tagId, name, type, description, createdAt, lastModifiedAt};
				});
			resolve({
				data,
				itemCount: data.length,
				pageNumber,
				pageSize,
				pageCount: 1
			});
		}, 500);
	});
};

export const fetchMockTag = async (tagId: TagId): Promise<Tag> => {
	return new Promise((resolve, reject) => {
		setTimeout(() => {
			const tag = MOCK_TAGS.find(tag => tag.tagId === tagId);
			if (tag) {
				resolve({...tag});
			} else {
				reject();
			}
		}, 500);
	});
};

let newTagId = 10000;
export const saveMockTag = async (tag: Tag): Promise<void> => {
	return new Promise((resolve) => {
		setTimeout(() => {
			if (isFakedUuid(tag)) {
				tag.tagId = `${newTagId++}`;
				MOCK_TAGS.push({...tag});
			} else {
				const index = MOCK_TAGS.findIndex(exists => exists.tagId === tag.tagId);
				if (index !== -1) {
					MOCK_TAGS[index] = {...tag, lastModifiedAt: getCurrentTime()};
				}
			}
			resolve();
		}, 500);
	});
};

export const listMockTagsByType = async (type: TagType): Promise<Array<Tag>> => {
	return new Promise((resolve) => {
		setTimeout(() => {
			resolve(MOCK_TAGS.filter(tag => tag.type === type).map(tag => ({...tag})));
		}, 500);
	});
};
