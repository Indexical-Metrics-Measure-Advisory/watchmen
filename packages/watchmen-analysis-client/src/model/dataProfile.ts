// 数据配置文件相关的数据模型

// 数据库输出配置接口
export interface DatabaseOutput {
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
  path?: string; // for duckdb
}

// 数据配置文件接口
export interface DataProfile {
  id?: string;
  name: string;
  target: string;
  outputs: {
    [key: string]: DatabaseOutput;
  };
  created_at?: string;
  updated_at?: string;
}

// 数据配置文件创建请求接口
export interface CreateDataProfileRequest {
  name: string;
  target: string;
  outputs: {
    [key: string]: DatabaseOutput;
  };
}

// 数据配置文件更新请求接口
export interface UpdateDataProfileRequest {
  name?: string;
  target?: string;
  outputs?: {
    [key: string]: DatabaseOutput;
  };
}

// 数据库类型枚举
export enum DatabaseType {
  POSTGRES = 'postgres',
  DUCKDB = 'duckdb',
  MYSQL = 'mysql',
  SQLITE = 'sqlite'
}

// 预定义的数据库配置模板
export const DATABASE_TEMPLATES: Record<DatabaseType, Partial<DatabaseOutput>> = {
  [DatabaseType.POSTGRES]: {
    type: 'postgres',
    host: '127.0.0.1',
    port: 5432,
    user: 'postgres',
    dbname: 'postgres',
    schema: 'public',
    threads: 4,
    keepalives_idle: 0,
    connect_timeout: 10,
    retries: 1
  },
  [DatabaseType.DUCKDB]: {
    type: 'duckdb',
    path: './data/database.duckdb'
  },
  [DatabaseType.MYSQL]: {
    type: 'mysql',
    host: '127.0.0.1',
    port: 3306,
    user: 'root',
    dbname: 'database'
  },
  [DatabaseType.SQLITE]: {
    type: 'sqlite',
    path: './data/database.sqlite'
  }
};