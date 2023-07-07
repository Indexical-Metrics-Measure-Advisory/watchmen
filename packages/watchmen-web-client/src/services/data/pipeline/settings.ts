import {Dayjs} from 'dayjs';
import {Apis, post} from '../apis';
import {fetchPipelinesGraphics} from '../tuples/pipeline';
import {PipelinesGraphics, PipelinesGraphicsId} from '../tuples/pipeline-types';
import {isMockService} from '../utils';
import {fetchAllDataSources} from './all-data-sources';
import {fetchAllExternalWriters} from './all-external-writers';
import {fetchAllPipelines, fetchUpdatedPipelines} from './all-pipelines';
import {fetchAllTopics, fetchUpdatedTopics} from './all-topics';
import {PipelinesSettings} from './settings-types';

export const fetchPipelinesSettingsData = async (): Promise<PipelinesSettings> => {
	const [pipelines, topics, graphics, dataSources, externalWriters] = await Promise.all([
		fetchAllPipelines(),
		fetchAllTopics(),
		fetchPipelinesGraphics(),
		fetchAllDataSources(),
		fetchAllExternalWriters()
	]);

	return {pipelines, topics, graphics, dataSources, externalWriters};
};

const fetchUpdatedPipelinesGraphics = async (lastModifiedTime: Dayjs, existingGraphicsIds: Array<PipelinesGraphicsId>): Promise<{
	updated: Array<PipelinesGraphics>,
	removed: Array<PipelinesGraphicsId>
}> => {
	if (isMockService()) {
		return {updated: [], removed: []};
	} else {
		try {
			return await post({
				api: Apis.PIPELINE_GRAPHICS_MINE_UPDATED,
				data: {at: lastModifiedTime.format('YYYY/MM/DD HH:mm:ss'), existingGraphicIds: existingGraphicsIds}
			});
		} catch {
			return {
				updated: await fetchPipelinesGraphics(),
				removed: []
			};
		}
	}
};

export const fetchUpdatedPipelinesSettingsData = async (options: {
	lastModifiedTimeOfPipelines: Dayjs,
	lastModifiedTimeOfTopics: Dayjs,
	lastModifiedTimeOfGraphics: Dayjs,
	existsGraphicsIds: Array<PipelinesGraphicsId>
}): Promise<Partial<PipelinesSettings> & { removedGraphics: Array<PipelinesGraphicsId> }> => {
	const {
		lastModifiedTimeOfPipelines,
		lastModifiedTimeOfTopics,
		lastModifiedTimeOfGraphics,
		existsGraphicsIds
	} = options;

	const [pipelines, topics, {
		updated: updated_graphics,
		removed: removed_graphic_ids
	}, dataSources, externalWriters] = await Promise.all([
		fetchUpdatedPipelines(lastModifiedTimeOfPipelines),
		fetchUpdatedTopics(lastModifiedTimeOfTopics),
		fetchUpdatedPipelinesGraphics(lastModifiedTimeOfGraphics, existsGraphicsIds),
		fetchAllDataSources(),
		fetchAllExternalWriters()
	]);

	// fetch updated pipelines settings data
	return {
		pipelines,
		topics,
		graphics: updated_graphics,
		dataSources,
		externalWriters,
		removedGraphics: removed_graphic_ids
	};
};