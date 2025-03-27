import { ApiConfigModel } from '../services/database';

// 数据采集节点类型
export interface DataCollectionNode {
  id: string;
  key: string;
  title: string;
  value: string;
  name: string;
  config: ApiConfigModel;
  is_enabled: boolean;
}

// 处理规则类型
export interface ProcessingRule {
  id: string;
  type: 'TRANSFORM' | 'FILTER' | 'AGGREGATE';
  name: string;
  formula: string;
  outputField: string;
  active: boolean;
  config: Record<string, any>;
  conditions?: Record<string, any>[];
}

// 输出参数类型
export interface OutputParam {
  customName: string;
  displayName: string;
  jsonPath: string;
  targetField?: string;
  name: string;
  type: string;
  value: string;
}

// 数据处理配置模型
export interface DataProcessingConfigModel {
  id?: string;
  name: string;
  source_node_id: string;
  rules: ProcessingRule[];
  output_params: OutputParam[];
  is_enabled: boolean;
} 