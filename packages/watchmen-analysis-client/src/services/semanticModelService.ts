import { SemanticModel, SemanticModelSummary } from '@/model/semanticModel';
import { API_BASE_URL, getDefaultHeaders, checkResponse } from '@/utils/apiConfig';

const mockSemanticModels: SemanticModel[] = [];

export const getSemanticModels = async (): Promise<SemanticModel[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/metricflow/semantic-models/all`, {
      method: 'GET',
      headers: getDefaultHeaders(),
    });
    
    const data = await checkResponse(response);
    return data;
  } catch (error) {
    console.error('Error fetching semantic models:', error);
    throw error;
  }
};

export const getSemanticModelById = async (id: string): Promise<SemanticModel | null> => {
  try {
    const response = await fetch(`${API_BASE_URL}/metricflow/semantic-model/${encodeURIComponent(id)}`, {
      method: 'GET',
      headers: getDefaultHeaders(),
    });
    
    if (response.status === 404) {
      return null;
    }
    
    const data = await checkResponse(response);
    return data;
  } catch (error) {
    console.error('Error fetching semantic model by ID:', error);
    throw error;
  }
};

export const createSemanticModel = async (model: SemanticModel): Promise<SemanticModel> => {
  try {
    const response = await fetch(`${API_BASE_URL}/metricflow/semantic-model`, {
      method: 'POST',
      headers: getDefaultHeaders(),
      body: JSON.stringify(model),
    });
    
    const data = await checkResponse(response);
    return data;
  } catch (error) {
    console.error('Error creating semantic model:', error);
    throw error;
  }
};

export const updateSemanticModel = async (name: string, updates: Partial<SemanticModel>): Promise<SemanticModel> => {
  try {
    const response = await fetch(`${API_BASE_URL}/metricflow/semantic-model/${encodeURIComponent(name)}`, {
      method: 'PUT',
      headers: getDefaultHeaders(),
      body: JSON.stringify(updates),
    });
    
    const data = await checkResponse(response);
    return data;
  } catch (error) {
    console.error('Error updating semantic model:', error);
    throw error;
  }
};

export const deleteSemanticModel = async (name: string): Promise<void> => {
  try {
    const response = await fetch(`${API_BASE_URL}/metricflow/semantic-models/${encodeURIComponent(name)}`, {
      method: 'DELETE',
      headers: getDefaultHeaders(),
    });
    
    await checkResponse(response);
  } catch (error) {
    console.error('Error deleting semantic model:', error);
    throw error;
  }
};

export const getSemanticModelSummary = async (): Promise<SemanticModelSummary> => {
  try {
    const response = await fetch(`${API_BASE_URL}/metricflow/semantic-models/summary`, {
      method: 'GET',
      headers: getDefaultHeaders(),
    });
    
    const data = await checkResponse(response);
    return data;
  } catch (error) {
    console.error('Error fetching semantic model summary:', error);
    throw error;
  }
};