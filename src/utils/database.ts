import { createClient, SupabaseClient } from '@supabase/supabase-js';

// 数据采集配置模型
export interface ApiConfigModel {
  id?: string;
  name: string;
  apiType: 'HTTP' | 'CHAIN';
  baseUrl: string;
  method: 'GET' | 'POST';
  payload?: string;
  apiKey?: string;
  apiSecret?: string;
  exchangeId?: string;
  active: boolean;
  fieldMappings?: Record<string, string>;
  customVariables?: Record<string, string>;
}

export interface ProcessingRule {
  id?: string;
  name: string;
  type: 'TRANSFORM' | 'FILTER' | 'AGGREGATE';
  config: Record<string, any>;
  conditions?: Record<string, any>[];
  active: boolean;
}

export interface OutputParam {
  customName: string;
  displayName: string;
  jsonPath: string;
  type: 'STRING' | 'NUMBER' | 'BOOLEAN' | 'OBJECT' | 'ARRAY';
  targetField?: string;
  value?: string;
}

export interface DataCollectionConfigModel {
  NO?: number;
  id?: string;
  name: string;
  type: 'contract' | 'api' | 'websocket';
  config: {
    // 智能合约配置
    chainId?: string;
    contractAddress?: string;
    methodName?: string;
    abi?: string;
    contractParams?: any[];
    
    // API配置
    baseUrl?: string;
    endpoint?: string;
    apiParams?: Record<string, any>;
    headers?: Record<string, string>;
    
    // WebSocket配置
    url?: string;
    message?: any;
  };
  active: boolean;
  create_time?: number;
}

export interface DataProcessingConfigModel {
  id?: string;
  name: string;
  source_node_id: string;
  rules: ProcessingRule[];
  output_params: OutputParam[];
  is_enabled: boolean;
  created_at?: string;
  updated_at?: string;
}

export class Database {
  private db: IDBDatabase;

  constructor(db: IDBDatabase) {
    this.db = db;
  }

  // 获取所有数据采集配置
  async getAllDataCollectionConfigs(): Promise<DataCollectionConfigModel[]> {
    return await this.get('data_collection_configs') || [];
  }

  // 获取单个数据采集配置
  async getDataCollectionConfig(NO: number): Promise<DataCollectionConfigModel | null> {
    const configs = await this.getAllDataCollectionConfigs();
    return configs.find(config => config.NO === NO) || null;
  }

  // 通用的获取方法
  private async get(storeName: string): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readonly');
      const objectStore = transaction.objectStore(storeName);
      const request = objectStore.getAll();

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }
}

// 定义 Supabase 数据库表结构
interface Tables {
  data_collection_configs: {
    Row: DataCollectionConfigModel;
    Insert: Omit<DataCollectionConfigModel, 'id' | 'create_time'>;
    Update: Partial<DataCollectionConfigModel>;
  };
  data_processing_configs: {
    Row: DataProcessingConfigModel;
    Insert: Omit<DataProcessingConfigModel, 'id' | 'created_at' | 'updated_at'>;
    Update: Partial<DataProcessingConfigModel>;
  };
}

interface DatabaseSchema {
  public: {
    Tables: Tables;
  };
}

export type DatabaseTables = DatabaseSchema['public']['Tables'];
export type TableName = keyof DatabaseTables;

export type Row<T extends TableName> = DatabaseTables[T]['Row'];
export type Insert<T extends TableName> = DatabaseTables[T]['Insert'];
export type Update<T extends TableName> = DatabaseTables[T]['Update'];

export type DataCollectionConfig = Row<'data_collection_configs'>;
export type DataProcessingConfig = Row<'data_processing_configs'>;

export type { PostgrestError } from '@supabase/postgrest-js'; 