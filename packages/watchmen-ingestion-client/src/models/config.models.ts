// Configuration data models

export interface ModuleConfig {
  id: string;
  name: string;
  description: string;
}

export interface ModelConfig {
  id: string;
  moduleId: string;
  name: string;
  description: string;
}

export interface TableConfig {
  id: string;
  name: string;
  description: string;
  aiSuggested: boolean;
  required: boolean;
}

export interface ConfigurationData {
  module: string;
  model: string;
  tables: string[];
  aiEnabled: boolean;
}