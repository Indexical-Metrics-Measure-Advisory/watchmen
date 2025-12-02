
import { toast } from "@/components/ui/use-toast";

export interface UserFeedback {
  id: string;
  hypothesisId: string;
  rating: number; // 1-5
  comment: string;
  outcome: 'success' | 'failure' | 'neutral';
  createdAt: string;
}

// 内存中存储用户反馈
let userFeedbacks: UserFeedback[] = [];

// 模拟 API 延迟
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const feedbackService = {
  // 获取所有反馈
  getAllFeedback: async (): Promise<UserFeedback[]> => {
    await delay(500);
    return [...userFeedbacks];
  },

  // 根据假设ID获取反馈
  getFeedbackByHypothesisId: async (hypothesisId: string): Promise<UserFeedback[]> => {
    await delay(300);
    return userFeedbacks.filter(feedback => feedback.hypothesisId === hypothesisId);
  },

  // 添加新的反馈
  addFeedback: async (data: Omit<UserFeedback, 'id' | 'createdAt'>): Promise<UserFeedback> => {
    await delay(500);
    const newFeedback: UserFeedback = {
      ...data,
      id: Date.now().toString(),
      createdAt: new Date().toISOString()
    };
    
    userFeedbacks = [newFeedback, ...userFeedbacks];
    
    return newFeedback;
  },

  // 更新反馈
  updateFeedback: async (id: string, data: Partial<UserFeedback>): Promise<UserFeedback> => {
    await delay(500);
    const index = userFeedbacks.findIndex(f => f.id === id);
    
    if (index === -1) {
      throw new Error('反馈未找到');
    }
    
    const updatedFeedback = { ...userFeedbacks[index], ...data };
    userFeedbacks[index] = updatedFeedback;
    
    return updatedFeedback;
  },

  // 删除反馈
  deleteFeedback: async (id: string): Promise<void> => {
    await delay(500);
    userFeedbacks = userFeedbacks.filter(f => f.id !== id);
  }
};
