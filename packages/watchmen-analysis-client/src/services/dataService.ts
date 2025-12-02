import { DataProfile, DatabaseType, DATABASE_TEMPLATES } from '@/model/dataProfile';
import { exportDataProfile, importDataProfile } from './dataProfileService';

/**
 * 表单数据接口
 */
export interface DataProfileFormData {
  name: string;
  target: string;
  output: {
    type: string;
    host?: string;
    user?: string;
    password?: string;
    port?: number;
    dbname?: string;
    schema?: string;
    threads?: number;
    keepalives_idle?: number;
    connect_timeout?: number;
    retries?: number;
    path?: string;
  };
}

/**
 * 连接测试结果接口
 */
export interface ConnectionResult {
  success: boolean;
  message: string;
}

/**
 * 数据处理服务类
 */
export class DataService {
  /**
   * 将DataProfile转换为表单数据
   */
  static profileToFormData(profile: DataProfile): DataProfileFormData {
    const firstOutput = Object.values(profile.outputs)[0];
    return {
      name: profile.name,
      target: profile.target,
      output: firstOutput
    };
  }

  /**
   * 将表单数据转换为DataProfile格式
   */
  static formDataToProfile(formData: DataProfileFormData): Omit<DataProfile, 'id'> {
    return {
      name: formData.name,
      target: formData.target,
      outputs: {
        [formData.target]: formData.output
      }
    };
  }

  /**
   * 更新表单输出字段
   */
  static updateFormOutput(
    formData: DataProfileFormData,
    field: string,
    value: any
  ): DataProfileFormData {
    return {
      ...formData,
      output: {
        ...formData.output,
        [field]: value
      }
    };
  }

  /**
   * 根据数据库类型获取默认模板
   */
  static getDefaultTemplate(databaseType: DatabaseType): any {
    return { ...DATABASE_TEMPLATES[databaseType] };
  }

  /**
   * 导出配置文件到本地
   */
  static downloadProfile(profile: DataProfile): void {
    const jsonString = exportDataProfile(profile);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${profile.name}_profile.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * 从文件导入配置
   */
  static async importProfileFromFile(file: File): Promise<DataProfileFormData> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const jsonString = e.target?.result as string;
          const importedData = importDataProfile(jsonString);
          const formData = this.profileToFormData(importedData);
          resolve(formData);
        } catch (error) {
          reject(new Error('Failed to import profile: ' + (error as Error).message));
        }
      };
      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };
      reader.readAsText(file);
    });
  }

  /**
   * 验证表单数据
   */
  static validateFormData(formData: DataProfileFormData): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!formData.name.trim()) {
      errors.push('Profile name is required');
    }

    if (!formData.target.trim()) {
      errors.push('Target environment is required');
    }

    if (!formData.output.type) {
      errors.push('Database type is required');
    }

    // 验证数据库连接参数
    if (formData.output.type !== 'duckdb' && formData.output.type !== 'sqlite') {
      if (!formData.output.host?.trim()) {
        errors.push('Host is required for this database type');
      }
      if (!formData.output.user?.trim()) {
        errors.push('Username is required for this database type');
      }
      if (!formData.output.dbname?.trim()) {
        errors.push('Database name is required for this database type');
      }
    } else {
      if (!formData.output.path?.trim()) {
        errors.push('File path is required for this database type');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * 格式化连接结果消息
   */
  static formatConnectionResult(success: boolean, message?: string): ConnectionResult {
    return {
      success,
      message: message || (success ? 'Connection successful' : 'Connection failed')
    };
  }

  /**
   * 检查是否为文件型数据库
   */
  static isFileDatabase(databaseType: string): boolean {
    return databaseType === 'duckdb' || databaseType === 'sqlite';
  }

  /**
   * 获取数据库类型显示名称
   */
  static getDatabaseDisplayName(databaseType: string): string {
    return databaseType.toUpperCase();
  }

  /**
   * 生成默认表单数据
   */
  static getDefaultFormData(): DataProfileFormData {
    return {
      name: 'default',
      target: 'dev',
      output: { ...DATABASE_TEMPLATES[DatabaseType.POSTGRES] } as any
    };
  }

  /**
   * 深度克隆表单数据
   */
  static cloneFormData(formData: DataProfileFormData): DataProfileFormData {
    return JSON.parse(JSON.stringify(formData));
  }

  /**
   * 比较两个表单数据是否相等
   */
  static isFormDataEqual(formData1: DataProfileFormData, formData2: DataProfileFormData): boolean {
    return JSON.stringify(formData1) === JSON.stringify(formData2);
  }
}

export default DataService;