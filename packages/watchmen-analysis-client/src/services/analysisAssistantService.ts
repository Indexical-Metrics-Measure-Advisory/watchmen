import { AssistantConfig, AssistantQuestion, AssistantTerm, AnalysisPurpose, AssistantProfile } from '@/model/analysisAssistant';

const STORAGE_KEY = 'analysis_assistant_config_v1';
const ASSISTANTS_KEY = 'analysis_assistants_v1';

const defaultTemplates: AssistantQuestion[] = [
  { id: 'q1', text: '趋势如何随时间变化？', category: '趋势', isTemplate: true },
  { id: 'q2', text: '不同客户群体之间的差异是什么？', category: '分群', isTemplate: true },
  { id: 'q3', text: '关键驱动因素有哪些？', category: '因果', isTemplate: true },
  { id: 'q4', text: '指标异常的可能原因是什么？', category: '异常', isTemplate: true },
  { id: 'q5', text: '当前策略的效果评估如何？', category: '评估', isTemplate: true },
];

const defaultConfig: AssistantConfig = {
  purposes: [
    { language: 'zh-CN', text: '明确分析目标，聚焦核心业务问题。' },
    { language: 'en', text: 'Define analysis objectives focusing on key business issues.' },
  ],
  selectedMetricIds: [],
  questions: [...defaultTemplates],
  terms: [],
};

function getNow(): string { return new Date().toISOString(); }

export async function getAssistants(): Promise<AssistantProfile[]> {
  const raw = localStorage.getItem(ASSISTANTS_KEY);
  if (raw) {
    try {
      const list = JSON.parse(raw) as AssistantProfile[];
      return Array.isArray(list) ? list : [];
    } catch {
      return [];
    }
  }
  const legacy = localStorage.getItem(STORAGE_KEY);
  if (legacy) {
    try {
      const cfg = JSON.parse(legacy) as AssistantConfig;
      const migrated: AssistantProfile = {
        id: 'assistant_default',
        name: '默认助手',
        config: cfg,
        createdAt: getNow(),
        updatedAt: getNow(),
      };
      localStorage.setItem(ASSISTANTS_KEY, JSON.stringify([migrated]));
      return [migrated];
    } catch {
      // fallthrough to create default
    }
  }
  const created: AssistantProfile = {
    id: `a_${Date.now()}`,
    name: '默认助手',
    config: defaultConfig,
    createdAt: getNow(),
    updatedAt: getNow(),
  };
  localStorage.setItem(ASSISTANTS_KEY, JSON.stringify([created]));
  return [created];
}

async function saveAssistants(list: AssistantProfile[]): Promise<void> {
  localStorage.setItem(ASSISTANTS_KEY, JSON.stringify(list));
}

export async function createAssistant(name: string): Promise<AssistantProfile> {
  const list = await getAssistants();
  const now = getNow();
  const item: AssistantProfile = {
    id: `a_${Date.now()}`,
    name,
    config: { ...defaultConfig },
    createdAt: now,
    updatedAt: now,
  };
  const next = [...list, item];
  await saveAssistants(next);
  return item;
}

export async function updateAssistantConfig(id: string, config: AssistantConfig): Promise<AssistantProfile> {
  const list = await getAssistants();
  const idx = list.findIndex(a => a.id === id);
  const now = getNow();
  let updated: AssistantProfile;
  if (idx === -1) {
    updated = { id, name: '未命名助手', config, createdAt: now, updatedAt: now };
    await saveAssistants([...list, updated]);
    return updated;
  }
  updated = { ...list[idx], config: { ...config }, updatedAt: now };
  const next = list.map(a => (a.id === id ? updated : a));
  await saveAssistants(next);
  return updated;
}

export async function deleteAssistant(id: string): Promise<void> {
  const list = await getAssistants();
  const next = list.filter(a => a.id !== id);
  await saveAssistants(next);
}

export async function duplicateAssistant(id: string, name?: string): Promise<AssistantProfile | null> {
  const list = await getAssistants();
  const src = list.find(a => a.id === id);
  if (!src) return null;
  const now = getNow();
  const copy: AssistantProfile = {
    id: `a_${Date.now()}`,
    name: name || `${src.name}副本`,
    config: JSON.parse(JSON.stringify(src.config)),
    createdAt: now,
    updatedAt: now,
  };
  await saveAssistants([...list, copy]);
  return copy;
}

export async function getAssistantConfig(): Promise<AssistantConfig> {
  const list = await getAssistants();
  return list[0]?.config || defaultConfig;
}

export async function saveAssistantConfig(config: AssistantConfig): Promise<void> {
  const list = await getAssistants();
  if (!list.length) {
    const created = await createAssistant('默认助手');
    await updateAssistantConfig(created.id, config);
    return;
  }
  await updateAssistantConfig(list[0].id, config);
}

export async function getQuestionTemplates(): Promise<AssistantQuestion[]> {
  return [...defaultTemplates];
}

export async function addCustomQuestion(question: Omit<AssistantQuestion, 'id'>): Promise<AssistantQuestion> {
  const list = await getAssistants();
  const target = list[0];
  const newItem: AssistantQuestion = { id: `q_${Date.now()}`, ...question, isTemplate: false };
  if (!target) {
    const created = await createAssistant('默认助手');
    await updateAssistantConfig(created.id, { ...defaultConfig, questions: [...defaultTemplates, newItem] });
    return newItem;
  }
  const updatedCfg = { ...target.config, questions: [...target.config.questions, newItem] };
  await updateAssistantConfig(target.id, updatedCfg);
  return newItem;
}

export async function removeQuestion(id: string): Promise<void> {
  const list = await getAssistants();
  if (!list.length) return;
  const target = list[0];
  const updatedCfg = { ...target.config, questions: target.config.questions.filter(q => q.id !== id) };
  await updateAssistantConfig(target.id, updatedCfg);
}

export async function searchQuestions(query: string, category?: string): Promise<AssistantQuestion[]> {
  const list = await getAssistants();
  const haystack = list[0]?.config.questions || [];
  const q = query.trim().toLowerCase();
  return haystack.filter(item => {
    const matchText = item.text.toLowerCase().includes(q);
    const matchCategory = category ? item.category === category : true;
    return matchText && matchCategory;
  });
}

export async function addTerm(term: Omit<AssistantTerm, 'id'>): Promise<AssistantTerm> {
  const list = await getAssistants();
  const target = list[0];
  const newItem: AssistantTerm = { id: `t_${Date.now()}`, ...term };
  if (!target) {
    const created = await createAssistant('默认助手');
    await updateAssistantConfig(created.id, { ...defaultConfig, terms: [newItem] });
    return newItem;
  }
  const updatedCfg = { ...target.config, terms: [...target.config.terms, newItem] };
  await updateAssistantConfig(target.id, updatedCfg);
  return newItem;
}

export async function updateTerm(id: string, patch: Partial<AssistantTerm>): Promise<AssistantTerm | null> {
  const list = await getAssistants();
  if (!list.length) return null;
  const target = list[0];
  const index = target.config.terms.findIndex(t => t.id === id);
  if (index === -1) return null;
  const updatedItem = { ...target.config.terms[index], ...patch };
  const updatedCfg = { ...target.config, terms: target.config.terms.map(t => (t.id === id ? updatedItem : t)) };
  await updateAssistantConfig(target.id, updatedCfg);
  return updatedItem;
}

export async function deleteTerm(id: string): Promise<void> {
  const list = await getAssistants();
  if (!list.length) return;
  const target = list[0];
  const updatedCfg = { ...target.config, terms: target.config.terms.filter(t => t.id !== id) };
  await updateAssistantConfig(target.id, updatedCfg);
}

export async function exportTermsToJson(): Promise<string> {
  const list = await getAssistants();
  const terms = list[0]?.config.terms || [];
  return JSON.stringify(terms, null, 2);
}

export async function importTermsFromJson(json: string): Promise<number> {
  const parsed = JSON.parse(json) as AssistantTerm[];
  const list = await getAssistants();
  const target = list[0];
  const merged = [...(target?.config.terms || [])];
  parsed.forEach(item => {
    const existingIndex = merged.findIndex(t => t.id === item.id || t.term === item.term);
    if (existingIndex >= 0) {
      merged[existingIndex] = { ...merged[existingIndex], ...item };
    } else {
      merged.push({ ...item, id: item.id || `t_${Date.now()}_${Math.random().toString(36).slice(2, 6)}` });
    }
  });
  if (!target) {
    const created = await createAssistant('默认助手');
    await updateAssistantConfig(created.id, { ...defaultConfig, terms: merged });
  } else {
    const updatedCfg = { ...target.config, terms: merged };
    await updateAssistantConfig(target.id, updatedCfg);
  }
  return parsed.length;
}

export async function setPurposes(purposes: AnalysisPurpose[]): Promise<void> {
  const list = await getAssistants();
  if (!list.length) {
    const created = await createAssistant('默认助手');
    await updateAssistantConfig(created.id, { ...defaultConfig, purposes });
    return;
  }
  const target = list[0];
  const updatedCfg = { ...target.config, purposes };
  await updateAssistantConfig(target.id, updatedCfg);
}