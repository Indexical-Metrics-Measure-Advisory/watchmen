import { ActionType } from '@/model/suggestedAction';
import { API_BASE_URL, checkResponse, getDefaultHeaders } from '@/utils/apiConfig';

class ActionTypeService {
  private static instance: ActionTypeService;

  private constructor() {}

  public static getInstance(): ActionTypeService {
    if (!ActionTypeService.instance) {
      ActionTypeService.instance = new ActionTypeService();
    }
    return ActionTypeService.instance;
  }

  async getActionTypes(): Promise<ActionType[]> {
    const response = await fetch(`${API_BASE_URL}/metricflow/action-type/all`, {
      method: 'GET',
      headers: getDefaultHeaders()
    });
    return checkResponse(response);
  }

  async getActionTypeById(id: string): Promise<ActionType> {
    const response = await fetch(`${API_BASE_URL}/metricflow/action-type/${id}`, {
      method: 'GET',
      headers: getDefaultHeaders()
    });
    return checkResponse(response);
  }

  async pageActionTypes(query: any): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/metricflow/action-type/page`, {
      method: 'POST',
      headers: getDefaultHeaders(),
      body: JSON.stringify(query)
    });
    return checkResponse(response);
  }

  async saveActionType(type: ActionType): Promise<ActionType> {
    if (type.id) {
      return this.updateActionType(type);
    } else {
      return this.createActionType(type);
    }
  }

  private async createActionType(type: ActionType): Promise<ActionType> {
    const response = await fetch(`${API_BASE_URL}/metricflow/action-type`, {
      method: 'POST',
      headers: getDefaultHeaders(),
      body: JSON.stringify(type)
    });
    return checkResponse(response);
  }

  private async updateActionType(type: ActionType): Promise<ActionType> {
    const response = await fetch(`${API_BASE_URL}/metricflow/action-type/update`, {
      method: 'POST',
      headers: getDefaultHeaders(),
      body: JSON.stringify(type)
    });
    return checkResponse(response);
  }

  async deleteActionType(id: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/metricflow/action-type/delete?action_type_id=${id}`, {
      method: 'POST',
      headers: getDefaultHeaders()
    });
    return checkResponse(response);
  }
}

export const actionTypeService = ActionTypeService.getInstance();
