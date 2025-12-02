import { DataProfile, CreateDataProfileRequest, UpdateDataProfileRequest, DatabaseType } from '@/model/dataProfile';
import { API_BASE_URL, getDefaultHeaders } from '@/utils/apiConfig';

// 获取所有数据配置文件
export const getAllDataProfiles = async (): Promise<DataProfile[]> => {
  const response = await fetch(`${API_BASE_URL}/data-profiles`, {
    method: 'GET',
    headers: getDefaultHeaders(),
  });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch data profiles: ${response.status} ${response.statusText}`);
  }
  
  return await response.json();
};

// 根据ID获取数据配置文件
export const getDataProfileById = async (id: string): Promise<DataProfile | null> => {
  const response = await fetch(`${API_BASE_URL}/data-profiles/${id}`, {
    method: 'GET',
    headers: getDefaultHeaders(),
  });
  
  if (!response.ok) {
    if (response.status === 404) {
      return null;
    }
    throw new Error(`Failed to fetch data profile: ${response.status} ${response.statusText}`);
  }
  
  return await response.json();
};

// 获取租户的数据配置文件（每个租户只有一个数据配置文件）
export const getTenantDataProfile = async (): Promise<DataProfile | null> => {
  const response = await fetch(`${API_BASE_URL}/profile`, {
    method: 'GET',
    headers: getDefaultHeaders(),
  });

  console.log('getTenantDataProfile response:', response);
  
  // if (!response.ok) {
  //   if (response.status === 404) {
  //     return null;
  //   }
  //   throw new Error(`Failed to fetch tenant data profile: ${response.status} ${response.statusText}`);
  // }
  
  return await response.json();
};

// 创建新的数据配置文件
export const createDataProfile = async (profileData: CreateDataProfileRequest): Promise<DataProfile> => {
  const response = await fetch(`${API_BASE_URL}/profile`, {
    method: 'POST',
    headers: {
      ...getDefaultHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(profileData),
  });
  
  if (!response.ok) {
    throw new Error(`Failed to create data profile: ${response.status} ${response.statusText}`);
  }
  
  return await response.json();
};

// 为租户创建数据配置文件
export const createTenantDataProfile = async (tenantId: string, profileData: CreateDataProfileRequest): Promise<DataProfile> => {
  const response = await fetch(`${API_BASE_URL}/data-profile/tenant/${tenantId}`, {
    method: 'POST',
    headers: {
      ...getDefaultHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(profileData),
  });
  
  if (!response.ok) {
    throw new Error(`Failed to create tenant data profile: ${response.status} ${response.statusText}`);
  }
  
  return await response.json();
};

// 更新数据配置文件
export const updateDataProfile = async (id: string, profileData: UpdateDataProfileRequest): Promise<DataProfile> => {
  const response = await fetch(`${API_BASE_URL}/data-profiles/${id}`, {
    method: 'PUT',
    headers: {
      ...getDefaultHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(profileData),
  });
  
  if (!response.ok) {
    throw new Error(`Failed to update data profile: ${response.status} ${response.statusText}`);
  }
  
  return await response.json();
};

// 更新租户的数据配置文件
export const updateTenantDataProfile = async (tenantId: string, profileData: UpdateDataProfileRequest): Promise<DataProfile> => {
  const response = await fetch(`${API_BASE_URL}/data-profile/tenant/${tenantId}`, {
    method: 'PUT',
    headers: {
      ...getDefaultHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(profileData),
  });
  
  if (!response.ok) {
    throw new Error(`Failed to update tenant data profile: ${response.status} ${response.statusText}`);
  }
  
  return await response.json();
};

// 删除数据配置文件
export const deleteDataProfile = async (id: string): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/data-profiles/${id}`, {
    method: 'DELETE',
    headers: getDefaultHeaders(),
  });
  
  if (!response.ok) {
    throw new Error(`Failed to delete data profile: ${response.status} ${response.statusText}`);
  }
};

// 删除租户的数据配置文件
export const deleteTenantDataProfile = async (tenantId: string): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/data-profile/tenant/${tenantId}`, {
    method: 'DELETE',
    headers: getDefaultHeaders(),
  });
  
  if (!response.ok) {
    throw new Error(`Failed to delete tenant data profile: ${response.status} ${response.statusText}`);
  }
};

// 测试数据库连接
export const testDatabaseConnection = async (output: any): Promise<{ success: boolean; message: string }> => {
  const response = await fetch(`${API_BASE_URL}/data-profiles/test-connection`, {
    method: 'POST',
    headers: {
      ...getDefaultHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(output),
  });
  
  if (!response.ok) {
    throw new Error(`Failed to test connection: ${response.status} ${response.statusText}`);
  }
  
  return await response.json();
};

// 导出数据配置文件为JSON
export const exportDataProfile = (profile: DataProfile): string => {
  const exportData = {
    name: profile.name,
    target: profile.target,
    outputs: profile.outputs
  };
  return JSON.stringify(exportData, null, 2);
};

// 从JSON导入数据配置文件
export const importDataProfile = (jsonString: string): CreateDataProfileRequest => {
  try {
    const data = JSON.parse(jsonString);
    
    if (!data.name || !data.target || !data.outputs) {
      throw new Error('Invalid data profile format');
    }
    
    return {
      name: data.name,
      target: data.target,
      outputs: data.outputs
    };
  } catch (error) {
    throw new Error('Failed to parse JSON: ' + (error as Error).message);
  }
};