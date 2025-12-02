import { HypothesisType } from "@/model/Hypothesis";
import { TestResult } from "@/model/TestResult";

export interface KnowledgeEntry {
  id: string;
  topic: string;
  content: string;
  source: 'user_feedback' | 'test_result' | 'external_data' | 'research';
  confidence: number;
  relatedHypothesisIds?: string[];
  lastUpdated: string;
}

// 内存中存储知识库条目
let knowledgeEntries: KnowledgeEntry[] = [
  {
    id: '1',
    topic: '年龄与保险购买意愿',
    content: '45-60岁年龄段的客户对特定保险产品的购买意愿明显高于其他年龄段',
    source: 'test_result',
    confidence: 85,
    relatedHypothesisIds: ['1'],
    lastUpdated: '2023-12-10T14:30:00Z'
  },
  {
    id: '2',
    topic: '高价值客户流失预测',
    content: '通过分析历史数据和客户行为模式，可以准确预测高价值客户的流失风险',
    source: 'test_result',
    confidence: 92,
    relatedHypothesisIds: ['2'],
    lastUpdated: '2023-12-05T10:15:00Z'
  },
  {
    id: '3',
    topic: '定价策略影响',
    content: '每提高1%的保险费用会导致0.7%的续保率下降，但总体收入仍然呈现正增长',
    source: 'user_feedback',
    confidence: 78,
    relatedHypothesisIds: ['3'],
    lastUpdated: '2023-11-28T16:45:00Z'
  },
  {
    id: '4',
    topic: '客户服务质量与续保率关系',
    content: '客户服务响应时间每减少10%，客户续保率平均提升2.3%。特别是对于高价值客户，这一影响更为显著。',
    source: 'research',
    confidence: 88,
    relatedHypothesisIds: ['2', '3'],
    lastUpdated: '2023-12-15T09:20:00Z'
  },
  {
    id: '5',
    topic: '数字化服务偏好',
    content: '35岁以下客户群体对完全数字化的保险服务接受度高达87%，而55岁以上客户群体仅为42%。混合服务模式在各年龄段都有较高满意度。',
    source: 'external_data',
    confidence: 76,
    relatedHypothesisIds: ['1', '5'],
    lastUpdated: '2023-12-08T11:30:00Z'
  },
  {
    id: '6',
    topic: '跨渠道营销效果',
    content: '结合至少3个不同渠道的营销策略比单一渠道策略平均提高转化率34%。社交媒体和电子邮件结合的效果最为显著。',
    source: 'test_result',
    confidence: 81,
    relatedHypothesisIds: ['5'],
    lastUpdated: '2023-11-20T15:40:00Z'
  },
  {
    id: '7',
    topic: '气候变化风险感知',
    content: '随着极端天气事件的增加，客户对包含气候相关风险保障的保险产品需求增长了28%。特别是在沿海和洪水多发地区的客户群体。',
    source: 'external_data',
    confidence: 74,
    relatedHypothesisIds: ['4'],
    lastUpdated: '2023-12-12T13:15:00Z'
  },
  {
    id: '8',
    topic: '季节性购买行为',
    content: '分析表明保险产品的购买行为存在明显的季节性模式，年初和财政年度末是两个主要购买高峰期，可能与税收规划相关。',
    source: 'research',
    confidence: 79,
    relatedHypothesisIds: ['6'],
    lastUpdated: '2023-12-01T10:50:00Z'
  },
  {
    id: '9',
    topic: '健康数据与保险定价',
    content: '使用穿戴设备收集的健康数据可以提高定价准确性达23%。自愿分享健康数据的客户平均获得15%的保费折扣。',
    source: 'test_result',
    confidence: 87,
    relatedHypothesisIds: ['4', '6'],
    lastUpdated: '2023-12-18T08:45:00Z'
  },
  {
    id: '10',
    topic: '家庭结构对保险选择的影响',
    content: '有未成年子女的家庭对生命保险和教育保险的购买意愿高出无子女家庭63%。家庭结构是保险产品选择的关键预测因素之一。',
    source: 'research',
    confidence: 90,
    relatedHypothesisIds: ['1', '3'],
    lastUpdated: '2023-12-07T14:10:00Z'
  }
];

// 模拟API延迟
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const knowledgeService = {
  // 获取所有知识条目
  getAllEntries: async (): Promise<KnowledgeEntry[]> => {
    await delay(500);
    return [...knowledgeEntries];
  },

  // 根据主题搜索知识
  searchByTopic: async (topic: string): Promise<KnowledgeEntry[]> => {
    await delay(300);
    return knowledgeEntries.filter(entry => 
      entry.topic.toLowerCase().includes(topic.toLowerCase()) ||
      entry.content.toLowerCase().includes(topic.toLowerCase())
    );
  },

  // 通过测试结果更新知识库
  updateFromTestResult: async (hypothesis: HypothesisType, testResult: TestResult): Promise<KnowledgeEntry> => {
    await delay(700);
    
    // 基于测试结果计算可信度
    const confidence = calculateConfidence(testResult);
    
    // 检查是否已存在相关主题的知识
    const existingIndex = knowledgeEntries.findIndex(entry => 
      entry.topic.toLowerCase() === hypothesis.title.toLowerCase()
    );
    
    if (existingIndex !== -1) {
      // 更新现有知识
      const updatedEntry = {
        ...knowledgeEntries[existingIndex],
        content: generateContentFromTest(hypothesis, testResult),
        confidence: confidence,
        lastUpdated: new Date().toISOString()
      };
      
      knowledgeEntries[existingIndex] = updatedEntry;
      return updatedEntry;
    } else {
      // 创建新知识条目
      const newEntry: KnowledgeEntry = {
        id: Date.now().toString(),
        topic: hypothesis.title,
        content: generateContentFromTest(hypothesis, testResult),
        source: 'test_result',
        confidence: confidence,
        relatedHypothesisIds: [hypothesis.id],
        lastUpdated: new Date().toISOString()
      };
      
      knowledgeEntries = [newEntry, ...knowledgeEntries];
      return newEntry;
    }
  },

  // 从用户反馈更新知识库
  updateFromUserFeedback: async (hypothesis: HypothesisType, rating: number, comment: string): Promise<KnowledgeEntry> => {
    await delay(600);
    
    // 基于用户评分计算可信度
    const confidence = Math.min(Math.round(rating * 20), 100);
    
    // 检查是否已存在相关主题的知识
    const existingIndex = knowledgeEntries.findIndex(entry => 
      entry.topic.toLowerCase() === hypothesis.title.toLowerCase() &&
      entry.source === 'user_feedback'
    );
    
    if (existingIndex !== -1) {
      // 更新现有知识
      const updatedEntry = {
        ...knowledgeEntries[existingIndex],
        content: comment || knowledgeEntries[existingIndex].content,
        confidence: (knowledgeEntries[existingIndex].confidence + confidence) / 2, // 平均可信度
        lastUpdated: new Date().toISOString()
      };
      
      knowledgeEntries[existingIndex] = updatedEntry;
      return updatedEntry;
    } else {
      // 创建新知识条目
      const newEntry: KnowledgeEntry = {
        id: Date.now().toString(),
        topic: hypothesis.title,
        content: comment || `关于"${hypothesis.title}"的用户反馈`,
        source: 'user_feedback',
        confidence: confidence,
        relatedHypothesisIds: [hypothesis.id],
        lastUpdated: new Date().toISOString()
      };
      
      knowledgeEntries = [newEntry, ...knowledgeEntries];
      return newEntry;
    }
  }
};

// 辅助函数：基于测试结果计算可信度
function calculateConfidence(testResult: TestResult): number {
  // 基于p值计算可信度（p值越小越好）
  const pValueConfidence = Math.min(Math.round((1 - testResult.pValue) * 100), 100);
  
  // 基于样本大小计算可信度调整
  let sampleSizeAdjustment = 0;
  if (testResult.sampleSize > 1000) sampleSizeAdjustment = 10;
  else if (testResult.sampleSize > 500) sampleSizeAdjustment = 5;
  else if (testResult.sampleSize > 100) sampleSizeAdjustment = 0;
  else sampleSizeAdjustment = -5;
  
  // 基于转化率差异计算可信度调整
  const conversionDiff = Math.abs(testResult.conversionA - testResult.conversionB);
  const conversionConfidence = Math.min(Math.round(conversionDiff * 100), 15);
  
  return Math.min(Math.max(pValueConfidence + sampleSizeAdjustment + conversionConfidence, 0), 100);
}

// 辅助函数：从测试结果生成内容
function generateContentFromTest(hypothesis: HypothesisType, testResult: TestResult): string {
  const result = testResult.conversionB > testResult.conversionA ? '支持' : '不支持';
  const difference = Math.abs(testResult.conversionB - testResult.conversionA).toFixed(2);
  
  return `测试结果${result}假设"${hypothesis.title}"。A/B测试显示差异为${difference}，p值为${testResult.pValue}，样本大小为${testResult.sampleSize}。`;
}
