import { Subscription } from '@/model/biAnalysis';
import { API_BASE_URL, getDefaultHeaders, checkResponse } from '@/utils/apiConfig';

const isMockMode = true; // Default to mock for now
const BASE_URL = `${API_BASE_URL}/subscription`;

const mockSubscriptions: Subscription[] = [];

class SubscriptionService {
  private static instance: SubscriptionService;

  private constructor() {}

  public static getInstance(): SubscriptionService {
    if (!SubscriptionService.instance) {
      SubscriptionService.instance = new SubscriptionService();
    }
    return SubscriptionService.instance;
  }

  async getSubscriptions(analysisId: string): Promise<Subscription[]> {
    if (isMockMode) {
      await new Promise(resolve => setTimeout(resolve, 300));
      return mockSubscriptions.filter(s => s.analysisId === analysisId);
    }
    const response = await fetch(`${BASE_URL}/analysis/${analysisId}`, {
      headers: getDefaultHeaders(),
    });
    return checkResponse(response);
  }

  async createSubscription(subscription: Omit<Subscription, 'id' | 'createdAt' | 'updatedAt'>): Promise<Subscription> {
    if (isMockMode) {
      await new Promise(resolve => setTimeout(resolve, 500));
      const newSubscription: Subscription = {
        ...subscription,
        id: `sub-${Date.now()}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      mockSubscriptions.push(newSubscription);
      return newSubscription;
    }
    const response = await fetch(`${BASE_URL}`, {
      method: 'POST',
      headers: getDefaultHeaders(),
      body: JSON.stringify(subscription),
    });
    return checkResponse(response);
  }

  async updateSubscription(id: string, updates: Partial<Subscription>): Promise<Subscription> {
    if (isMockMode) {
      await new Promise(resolve => setTimeout(resolve, 500));
      const index = mockSubscriptions.findIndex(s => s.id === id);
      if (index === -1) {
        throw new Error('Subscription not found');
      }
      
      mockSubscriptions[index] = {
        ...mockSubscriptions[index],
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      
      return mockSubscriptions[index];
    }
    const response = await fetch(`${BASE_URL}/update`, {
      method: 'POST',
      headers: getDefaultHeaders(),
      body: JSON.stringify({ ...updates, id }),
    });
    return checkResponse(response);
  }

  async deleteSubscription(id: string): Promise<void> {
    if (isMockMode) {
      await new Promise(resolve => setTimeout(resolve, 300));
      const index = mockSubscriptions.findIndex(s => s.id === id);
      if (index === -1) {
        throw new Error('Subscription not found');
      }
      mockSubscriptions.splice(index, 1);
      return;
    }
    const response = await fetch(`${BASE_URL}/delete/${id}`, {
      method: 'GET',
      headers: getDefaultHeaders(),
    });
    return checkResponse(response);
  }
}

export const subscriptionService = SubscriptionService.getInstance();
