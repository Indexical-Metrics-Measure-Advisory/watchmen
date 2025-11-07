export interface Model {
    modelId: string;
    modelName: string;
    dependOn: string;
    rawTopicCode: string;
    isParalleled: boolean;
    version: string;
    tenantId: string;
    createdAt: string;
    createdBy: string;
    lastModifiedAt: string;
    lastModifiedBy: string;
    moduleId: string;
    priority: number;
  }