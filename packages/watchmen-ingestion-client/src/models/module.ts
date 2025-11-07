/**
 * 模块基础接口
 */
export interface Module {
    moduleId: string;
    moduleName: string;
    priority: number;
    version: string;
    tenantId: string;
    createdAt: string;
    createdBy: string;
    lastModifiedAt: string;
    lastModifiedBy: string;
}

/**
 * 创建模块请求接口
 */
export interface CreateModuleRequest {
    moduleName: string;
    priority: number;
    version: string;
    tenantId: string;
    createdBy: string;
}

/**
 * 更新模块请求接口
 */
export interface UpdateModuleRequest {
    moduleName?: string;
    priority?: number;
    version?: string;
    lastModifiedBy: string;
}

/**
 * 模块查询过滤参数
 */
export interface ModuleFilterParams {
    moduleName?: string;
    priority?: number;
    version?: string;
    tenantId?: string;
    createdBy?: string;
    lastModifiedBy?: string;
    createdAtFrom?: string;
    createdAtTo?: string;
    lastModifiedAtFrom?: string;
    lastModifiedAtTo?: string;
}

/**
 * 分页查询参数
 */
export interface ModulePaginationParams extends ModuleFilterParams {
    page?: number;
    limit?: number;
    sortBy?: keyof Module;
    sortOrder?: 'asc' | 'desc';
    search?: string;
}

/**
 * 分页响应接口
 */
export interface PaginatedModuleResponse {
    data: Module[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasNext: boolean;
        hasPrev: boolean;
    };
}

/**
 * 模块统计信息接口
 */
export interface ModuleStats {
    total: number;
    byTenant: Record<string, number>;
    byVersion: Record<string, number>;
    byPriority: Record<number, number>;
    recentlyCreated: number; 
    recentlyModified: number; 
}


export interface BatchOperationResult {
    success: string[];
    failed: Array<{
        id: string;
        error: string;
    }>;
    total: number;
    successCount: number;
    failedCount: number;
}
  