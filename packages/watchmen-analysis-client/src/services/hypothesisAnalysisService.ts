import { HypothesisType } from '@/model/Hypothesis';

const ANALYSIS_STATUS_KEY = 'hypothesis_analysis_status';

interface AnalysisStatus {
  hypothesisId: string;
  completed: boolean;
  lastAnalyzedAt?: string;
}

export class HypothesisAnalysisService {
  private static getStoredAnalysisStatuses(): AnalysisStatus[] {
    const stored = localStorage.getItem(ANALYSIS_STATUS_KEY);
    return stored ? JSON.parse(stored) : [];
  }

  private static saveAnalysisStatuses(statuses: AnalysisStatus[]): void {
    localStorage.setItem(ANALYSIS_STATUS_KEY, JSON.stringify(statuses));
  }

  static getAnalysisStatus(hypothesisId: string): AnalysisStatus | undefined {
    const statuses = this.getStoredAnalysisStatuses();
    return statuses.find(status => status.hypothesisId === hypothesisId);
  }

  static markAnalysisCompleted(hypothesisId: string): void {
    const statuses = this.getStoredAnalysisStatuses();
    const existingIndex = statuses.findIndex(status => status.hypothesisId === hypothesisId);
    
    const newStatus: AnalysisStatus = {
      hypothesisId,
      completed: true,
      lastAnalyzedAt: new Date().toISOString()
    };

    if (existingIndex >= 0) {
      statuses[existingIndex] = newStatus;
    } else {
      statuses.push(newStatus);
    }

    this.saveAnalysisStatuses(statuses);
  }

  static resetAnalysisStatus(hypothesisId: string): void {
    const statuses = this.getStoredAnalysisStatuses();
    const filteredStatuses = statuses.filter(status => status.hypothesisId !== hypothesisId);
    this.saveAnalysisStatuses(filteredStatuses);
  }
}