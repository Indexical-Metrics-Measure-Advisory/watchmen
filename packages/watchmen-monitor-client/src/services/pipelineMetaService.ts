// Pipeline Meta (definition) service — read-only consumption for the Monitor console.
// Source routers: packages/watchmen-rest-doll/.../admin/{pipeline_router,pipeline_graphic_router,pipeline_yaml_router,pipeline_agent_router}.py
// Write endpoints (POST /pipeline, rename, enabled, delete, yaml import, graphics save) are intentionally NOT exposed here.
import { API_BASE_URL, getDefaultHeaders, checkResponse } from '@/utils/apiConfig';
import type { Pipeline, PipelineGraphic } from '@/models/pipelineMeta.models';

class PipelineMetaService {
  /** GET /pipeline — load a single pipeline definition. */
  async getPipeline(pipelineId: string): Promise<Pipeline> {
    const url = `${API_BASE_URL}/pipeline?pipeline_id=${encodeURIComponent(pipelineId)}`;
    const res = await fetch(url, { method: 'GET', headers: getDefaultHeaders() });
    return checkResponse(res);
  }

  /** GET /pipeline/all — all pipelines for the tenant (used to resolve names + related-pipelines). */
  async getAllPipelines(): Promise<Pipeline[]> {
    const res = await fetch(`${API_BASE_URL}/pipeline/all`, { method: 'GET', headers: getDefaultHeaders() });
    return checkResponse(res);
  }

  /** POST /pipeline/updated — pipelines modified after a timestamp. */
  async getUpdatedPipelines(at: string): Promise<Pipeline[]> {
    const res = await fetch(`${API_BASE_URL}/pipeline/updated`, {
      method: 'POST',
      headers: getDefaultHeaders(),
      body: JSON.stringify({ at }),
    });
    return checkResponse(res);
  }

  /** GET /pipeline/yaml — YAML for a single pipeline (raw text). */
  async getPipelineYaml(pipelineId: string): Promise<string> {
    const url = `${API_BASE_URL}/pipeline/yaml?pipeline_id=${encodeURIComponent(pipelineId)}`;
    const res = await fetch(url, { method: 'GET', headers: getDefaultHeaders() });
    if (!res.ok) {
      throw new Error(`Failed to fetch pipeline yaml: ${res.status}`);
    }
    return res.text();
  }

  /** GET /pipeline/yaml/agent-view — simplified id-free YAML (raw text). */
  async getPipelineYamlAgentView(pipelineId: string): Promise<string> {
    const url = `${API_BASE_URL}/pipeline/yaml/agent-view?pipeline_id=${encodeURIComponent(pipelineId)}`;
    const res = await fetch(url, { method: 'GET', headers: getDefaultHeaders() });
    if (!res.ok) {
      throw new Error(`Failed to fetch pipeline yaml (agent-view): ${res.status}`);
    }
    return res.text();
  }

  /** GET /pipeline/graphics — current user's pipeline DAG canvas layouts. */
  async getGraphics(): Promise<PipelineGraphic[]> {
    const res = await fetch(`${API_BASE_URL}/pipeline/graphics`, { method: 'GET', headers: getDefaultHeaders() });
    return checkResponse(res);
  }
}

export const pipelineMetaService = new PipelineMetaService();
export default pipelineMetaService;
