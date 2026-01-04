import { SuggestedAction } from '@/model/suggestedAction';
import { API_BASE_URL, checkResponse, getDefaultHeaders } from '@/utils/apiConfig';

class SuggestedActionService {
  private static instance: SuggestedActionService;

  private constructor() {}

  public static getInstance(): SuggestedActionService {
    if (!SuggestedActionService.instance) {
      SuggestedActionService.instance = new SuggestedActionService();
    }
    return SuggestedActionService.instance;
  }

  async getSuggestedActions(): Promise<SuggestedAction[]> {
    const response = await fetch(`${API_BASE_URL}/metricflow/suggested-action/all`, {
      method: 'GET',
      headers: getDefaultHeaders()
    });
    return checkResponse(response);
  }

  async getSuggestedActionById(id: string): Promise<SuggestedAction> {
    const response = await fetch(`${API_BASE_URL}/metricflow/suggested-action/${id}`, {
      method: 'GET',
      headers: getDefaultHeaders()
    });
    return checkResponse(response);
  }

  async pageSuggestedActions(query: any): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/metricflow/suggested-action/page`, {
      method: 'POST',
      headers: getDefaultHeaders(),
      body: JSON.stringify(query)
    });
    return checkResponse(response);
  }

  async saveSuggestedAction(action: SuggestedAction): Promise<SuggestedAction> {
    if (action.id) {
      return this.updateSuggestedAction(action);
    } else {
      return this.createSuggestedAction(action);
    }
  }

  private async createSuggestedAction(action: SuggestedAction): Promise<SuggestedAction> {
    const response = await fetch(`${API_BASE_URL}/metricflow/suggested-action`, {
      method: 'POST',
      headers: getDefaultHeaders(),
      body: JSON.stringify(action)
    });
    return checkResponse(response);
  }

  private async updateSuggestedAction(action: SuggestedAction): Promise<SuggestedAction> {
    const response = await fetch(`${API_BASE_URL}/metricflow/suggested-action/update`, {
      method: 'POST',
      headers: getDefaultHeaders(),
      body: JSON.stringify(action)
    });
    return checkResponse(response);
  }

  async deleteSuggestedAction(id: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/metricflow/suggested-action/delete?suggested_action_id=${id}`, {
      method: 'POST',
      headers: getDefaultHeaders()
    });
    return checkResponse(response);
  }
}

export const suggestedActionService = SuggestedActionService.getInstance();
