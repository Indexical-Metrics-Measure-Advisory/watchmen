import {findAccount} from '../account';
import {Apis, get, post} from '../apis';
import {
	deleteMockPipelineGraphics,
	fetchMockPipelinesGraphics,
	renameMockPipeline,
	saveMockPipeline,
	saveMockPipelinesGraphics,
	toggleMockPipelineEnabled
} from '../mock/tuples/mock-pipeline';
import {isMockService} from '../utils';
import {Pipeline, PipelineId, PipelinesGraphics, PipelinesGraphicsId} from './pipeline-types';
import {isFakedUuid, isFakedUuidForGraphics} from './utils';

export const fetchPipelinesGraphics = async (): Promise<Array<PipelinesGraphics>> => {
	if (isMockService()) {
		return fetchMockPipelinesGraphics();
	} else {
		return await get({api: Apis.PIPELINE_GRAPHICS_MINE});
	}
};

export const savePipelinesGraphics = async (graphics: PipelinesGraphics): Promise<void> => {
	if (isMockService()) {
		return saveMockPipelinesGraphics(graphics);
	} else if (isFakedUuidForGraphics(graphics)) {
		const data = await post({api: Apis.PIPELINE_GRAPHICS_SAVE, data: graphics});
		graphics.pipelineGraphId = data.pipelineGraphId;
		graphics.lastModifiedAt = data.lastModifiedAt;
	} else {
		const data = await post({api: Apis.PIPELINE_GRAPHICS_SAVE, data: graphics});
		graphics.lastModifiedAt = data.lastModifiedAt;
	}
};

export const deletePipelineGraphics = async (pipelineGraphId: PipelinesGraphicsId): Promise<void> => {
	if (isMockService()) {
		await deleteMockPipelineGraphics(pipelineGraphId);
	} else {
		await get({api: Apis.PIPELINE_GRAPHICS_DELETE, search: {pipelineGraphId}});
	}
};

export const fetchPipeline = async (pipelineId: PipelineId): Promise<{ pipeline: Pipeline }> => {
	if (isMockService()) {
		// return nothing
		return {} as { pipeline: Pipeline };
	} else {
		const pipeline = await get({api: Apis.PIPELINE_GET, search: {pipelineId}});
		return {pipeline};
	}
};

export const savePipeline = async (pipeline: Pipeline): Promise<void> => {
	pipeline.tenantId = findAccount()?.tenantId;
	if (isMockService()) {
		return saveMockPipeline(pipeline);
	} else if (isFakedUuid(pipeline)) {
		const data = await post({api: Apis.PIPELINE_CREATE, data: pipeline});
		pipeline.pipelineId = data.pipelineId;
		pipeline.version = data.version;
		pipeline.tenantId = data.tenantId;
		pipeline.lastModifiedAt = data.lastModified;
	} else {
		const data = await post({api: Apis.PIPELINE_SAVE, data: pipeline});
		pipeline.version = data.version;
		pipeline.tenantId = data.tenantId;
		pipeline.lastModifiedAt = data.lastModifiedAt;
	}
};

export const renamePipeline = async (pipelineId: PipelineId, name: string): Promise<void> => {
	if (isMockService()) {
		return renameMockPipeline(pipelineId, name);
	} else {
		await get({api: Apis.PIPELINE_RENAME, search: {pipelineId, name}});
	}
};

export const togglePipelineEnabled = async (pipelineId: PipelineId, enabled: boolean): Promise<void> => {
	if (isMockService()) {
		return toggleMockPipelineEnabled(pipelineId, enabled);
	} else {
		await get({api: Apis.PIPELINE_ENABLE, search: {pipelineId, enabled}});
	}
};

export const importPipelines = async (pipelines: Array<Pipeline>): Promise<Array<Pipeline>> => {
	if (isMockService()) {
		pipelines.forEach(saveMockPipeline);
		return pipelines;
	} else {
		return await post({api: Apis.IMPORT_PIPELINES, data: pipelines});
	}
};
