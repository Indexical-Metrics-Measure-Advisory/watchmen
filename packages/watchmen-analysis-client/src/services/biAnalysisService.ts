import { BIAnalysis, BIAnalysisInput, BIAnalysisListItem, BIAnalysisTemplate } from '@/model/biAnalysis';
import { API_BASE_URL, getDefaultHeaders, checkResponse } from '@/utils/apiConfig';

const isMockMode = import.meta.env.VITE_USE_MOCK_DATA === 'true';
const BASE_URL = `${API_BASE_URL}/metricflow/bi-analysis`;

// ---- Persistence (localStorage-backed, API-ready) ----
const STORAGE_KEY = 'bi_analyses';

const readStore = (): BIAnalysis[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as BIAnalysis[];
  } catch {
    return [];
  }
};

const writeStore = (items: BIAnalysis[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
};

export const saveAnalysis = async (input: BIAnalysis): Promise<BIAnalysis> => {
  if (isMockMode) {
    const now = new Date().toISOString();
    const id = `bi_${Date.now()}`;
    const record: BIAnalysis = { 
      id, 
      userId: input.userId,
      name: input.name, 
      description: input.description, 
      cards: input.cards,
      isTemplate: input.isTemplate
    };
    const all = readStore();
    writeStore([record, ...all]);
    return record;
  }

  const response = await fetch(`${BASE_URL}`, {
    method: 'POST',
    headers: getDefaultHeaders(),
    body: JSON.stringify(input),
  });
  return checkResponse(response);
};

export const listAnalyses = async (): Promise<BIAnalysisListItem[]> => {
  if (isMockMode) {
    const all = readStore();
    return all.map(a => ({ 
      id: a.id, 
      name: a.name, 
      description: a.description, 
      cardCount: a.cards.length,
      isTemplate: a.isTemplate 
    }));
  }

  const response = await fetch(`${BASE_URL}/all`, {
    method: 'GET',
    headers: getDefaultHeaders(),
  });
  return checkResponse(response);
};

export const getAnalysis = async (id: string): Promise<BIAnalysis | undefined> => {
  if (isMockMode) {
    const all = readStore();
    return all.find(a => a.id === id);
  }

  const response = await fetch(`${BASE_URL}/${id}`, {
    method: 'GET',
    headers: getDefaultHeaders(),
  });
  // Handle 404 or other errors gracefully if needed, but checkResponse throws on error
  // For undefined return type, we might need to catch 404 specifically if backend returns 404
  try {
    return await checkResponse(response);
  } catch (e) {
    console.error("Failed to fetch analysis", e);
    return undefined;
  }
};

export const updateAnalysis = async (update: BIAnalysis): Promise<BIAnalysis | undefined> => {
  if (isMockMode) {
    const all = readStore();
    const index = all.findIndex(a => a.id === update.id);
    if (index === -1) return undefined;
    
    all[index] = { ...all[index], ...update };
    writeStore(all);
    return all[index];
  }

  console.log('update', update);

  const response = await fetch(`${BASE_URL}/update`, {
    method: 'POST', // Using POST for update as well, or could be PUT/PATCH
    headers: getDefaultHeaders(),
    body: JSON.stringify(update),
  });
  return checkResponse(response);
};

export const deleteAnalysis = async (id: string): Promise<boolean> => {
  if (isMockMode) {
    const all = readStore();
    const next = all.filter(a => a.id !== id);
    writeStore(next);
    return all.length !== next.length;
  }

  const response = await fetch(`${BASE_URL}/delete/${id}`, {
    method: 'GET', // Following getAnalysis style or specific backend requirement
    headers: getDefaultHeaders(),
  });
  await checkResponse(response);
  return true;




};
export const updateAnalysisTemplate = async (update: Partial<BIAnalysisTemplate> & { id: string }): Promise<BIAnalysis | undefined> => {
  
  const response = await fetch(`${BASE_URL}/update/template`, {
    method: 'POST', // Using POST for update as well, or could be PUT/PATCH
    headers: getDefaultHeaders(),
    body: JSON.stringify(update),
  });
  return checkResponse(response);
};

export const getSharedAnalysis = async (id: string, token?: string): Promise<BIAnalysis | undefined> => {
  if (isMockMode) {
    const all = readStore();
    return all.find(a => a.id === id);
  }

  const headers = getDefaultHeaders();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE_URL}/${id}`, {
    method: 'GET',
    headers,
  });
  return checkResponse(response);
};
