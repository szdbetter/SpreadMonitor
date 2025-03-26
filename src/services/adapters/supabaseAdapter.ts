import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { IDataAdapter } from './dataAdapter';

/**
 * 类型映射工具，用于处理JavaScript对象和PostgreSQL类型之间的转换
 */
const typeMapper = {
  // JavaScript到PostgreSQL的类型映射
  jsToPostgres: (value: any): any => {
    if (value === null || value === undefined) return null;
    
    // 数组和对象转换为JSONB
    if (typeof value === 'object') {
      return value; // Supabase客户端会自动处理JSON序列化
    }
    
    return value;
  },
  
  // PostgreSQL到JavaScript的类型映射
  postgrestoJs: (value: any): any => {
    if (value === null) return null;
    
    // Supabase客户端会自动处理JSON反序列化
    return value;
  },
  
  // 转换整个对象的字段
  transformObject: (obj: Record<string, any>, direction: 'toDb' | 'fromDb'): Record<string, any> => {
    const transformedObj: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(obj)) {
      // 字段名转换：驼峰命名法 <-> 蛇形命名法
      const transformedKey = direction === 'toDb' 
        ? key.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '') // 驼峰转蛇形
        : key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase()); // 蛇形转驼峰
      
      // 字段值转换
      const transformedValue = direction === 'toDb'
        ? typeMapper.jsToPostgres(value)
        : typeMapper.postgrestoJs(value);
      
      transformedObj[transformedKey] = transformedValue;
    }
    
    return transformedObj;
  }
};

/**
 * 字段名映射：IndexedDB -> Supabase
 * 确保在Supabase数据库中使用蛇形命名法
 */
const fieldNameMap: Record<string, string> = {
  'NO': 'id',
  'create_time': 'created_at',
  'apiType': 'api_type',
  'baseUrl': 'base_url',
  'apiKey': 'api_key',
  'apiSecret': 'api_secret',
  'exchangeId': 'exchange_id',
  'chainId': 'chain_id',
  'contractAddress': 'contract_address',
  'methodName': 'method_name',
  'methodParams': 'method_params',
  'isProxyContract': 'is_proxy_contract',
  'supportedChains': 'supported_chains',
  'fieldMappings': 'field_mappings',
  'customVariables': 'custom_variables',
  'addressList': 'address_list',
  'logoUrl': 'logo_url',
  'blockExplorer': 'block_explorer',
  'rpcUrls': 'rpc_urls',
  'isTestNet': 'is_test_net',
  'baseTokenId': 'base_token_id',
  'quoteTokenId': 'quote_token_id',
  'pairName': 'pair_name',
  'hasVariables': 'has_variables',
  'tokenId': 'token_id',
  'pairId': 'pair_id',
  'userId': 'user_id',
  'isPublic': 'is_public',
  'pairList': 'pair_list',
  
  // data_processing_configs表字段映射
  'sourceNodeId': 'source_node_id',
  'inputParams': 'input_params',
  'outputParams': 'output_params'
};

/**
 * 表名映射：将IndexedDB的存储名映射到Supabase的表名
 */
const tableNameMap: Record<string, string> = {
  // 基本配置
  'ChainConfig': 'chain_config',
  'TokenConfig': 'token_config',
  'TradingPairConfig': 'trading_pair_config',
  'ExchangeConfig': 'exchange_config',
  'ApiConfig': 'api_config',
  'AlertConfig': 'alert_config',
  
  // 能力配置
  'data_collection_configs': 'data_collection_configs',
  'data_processing_configs': 'data_processing_configs',
  'AlertCapability': 'alert_capability'
};

/**
 * 忽略字段列表：这些字段在保存到Supabase时会被忽略
 */
const ignoreFields: Record<string, string[]> = {
  'chain_config': ['testResults', 'test_results', 'testRpcUrl', 'test_rpc_url'],
  'api_config': ['apiData', 'api_data', 'requestLog', 'request_log'],
  'token_config': ['tempData', 'temp_data'],
  'data_collection_configs': ['tempConfig', 'temp_config'],
  'data_processing_configs': ['tempConfig', 'temp_config'],
  'alert_capability': ['tempConfig', 'temp_config']
};

/**
 * Supabase配置
 */
interface SupabaseConfig {
  url: string;
  key: string;
}

/**
 * 存储当前Supabase配置
 */
let currentConfig: SupabaseConfig = {
  url: 'https://zuotevtiqjnhewkfmzny.supabase.co',
  key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1b3RldnRpcWpuaGV3a2Ztem55Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTYzNjgyODcsImV4cCI6MjAzMTk0NDI4N30.UOuJjJbFKTeYFyuGEKVrbjRVOHZI1lKk7S_PVHX6kkM'
};

/**
 * 格式化错误对象为字符串
 * @param error 错误对象
 * @returns 格式化后的错误字符串
 */
function formatError(error: any): string {
  if (error instanceof Error) {
    return error.message;
  }
  
  if (error && typeof error === 'object') {
    try {
      if (error.message) return error.message;
      if (error.error) return typeof error.error === 'string' ? error.error : JSON.stringify(error.error);
      return JSON.stringify(error);
    } catch (e) {
      return '无法解析的错误对象';
    }
  }
  
  return String(error);
}

/**
 * Supabase适配器实现
 * 连接到Supabase数据库并提供CRUD操作
 */
export class SupabaseAdapter<T extends { NO?: number }> implements IDataAdapter<T> {
  private supabase: SupabaseClient;
  private tableName: string;
  
  /**
   * 更新Supabase配置
   * @param url Supabase URL
   * @param key Supabase API Key
   */
  static updateConfig(url: string, key: string): void {
    currentConfig = { url, key };
    console.log('已更新Supabase配置:', url);
    
    // 保存到localStorage以便下次使用
    try {
      localStorage.setItem('supabase_config', JSON.stringify(currentConfig));
    } catch (e) {
      console.warn('无法保存Supabase配置到localStorage:', e);
    }
  }
  
  /**
   * 获取当前Supabase配置
   * @returns 当前配置
   */
  static getCurrentConfig(): SupabaseConfig {
    // 尝试从localStorage读取
    try {
      const saved = localStorage.getItem('supabase_config');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.url && parsed.key) {
          currentConfig = parsed;
        }
      }
    } catch (e) {
      console.warn('无法从localStorage读取Supabase配置:', e);
    }
    
    return currentConfig;
  }
  
  /**
   * 构造函数
   * @param tableName 表名
   */
  constructor(tableName: string) {
    // 获取当前配置
    const config = SupabaseAdapter.getCurrentConfig();
    
    // 初始化Supabase客户端
    try {
      console.log(`尝试连接到Supabase：${config.url}`);
      
      // 检查URL格式
      try {
        const url = new URL(config.url);
        console.log(`Supabase URL有效，主机名: ${url.hostname}`);
      } catch (urlError) {
        console.error(`Supabase URL格式无效: ${config.url}`, urlError);
      }
      
      this.supabase = createClient(config.url, config.key, {
        global: {
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json'
          }
        }
      });
      console.log('Supabase客户端初始化成功');
    } catch (error) {
      console.error('Supabase客户端初始化失败:', error);
      throw new Error(`无法初始化Supabase客户端: ${error}`);
    }
    
    // 检查是否可以连接到Supabase
    this.testConnection().catch(error => {
      console.warn('Supabase连接测试失败:', error);
    });
    
    // 确保表名正确，使用表名映射
    const mappedTableName = tableNameMap[tableName] || tableName.toLowerCase();
    this.tableName = mappedTableName;
  }
  
  // 添加连接测试方法
  private async testConnection(): Promise<boolean> {
    try {
      // 测试DNS解析
      console.log(`测试DNS解析 ${SupabaseAdapter.getCurrentConfig().url}...`);
      
      try {
        // 分解URL
        const url = new URL(SupabaseAdapter.getCurrentConfig().url);
        console.log(`测试DNS解析: ${url.hostname}`);
        
        // 尝试ping域名
        console.log(`尝试使用fetch测试连接到 ${url.origin}/ping`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const pingResponse = await fetch(`${url.origin}/ping`, {
          method: 'GET',
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        console.log(`Ping测试结果: ${pingResponse.status} ${pingResponse.statusText}`);
      } catch (pingError) {
        console.error(`DNS解析或ping测试失败: ${pingError instanceof Error ? pingError.message : String(pingError)}`);
      }
      
      // 尝试简单查询
      const { data, error } = await this.supabase.from('_test_connection').select('*').limit(1);
      
      if (error) {
        // 如果是表不存在的错误，也视为连接成功
        if (error.message && (
          error.message.includes('does not exist') || 
          error.message.includes('permission denied')
        )) {
          console.log('Supabase连接成功（权限或表不存在错误，但连接有效）');
          return true;
        }
        
        throw error;
      }
      
      console.log('Supabase连接测试成功');
      return true;
    } catch (error) {
      console.error('Supabase连接测试失败:', error);
      return false;
    }
  }
  
  /**
   * 转换记录：JavaScript对象 -> Supabase格式
   * @param record JavaScript对象
   * @returns Supabase格式的记录
   */
  private toDbFormat(record: any): any {
    const result: any = {};
    
    // 处理每个字段
    for (const [key, value] of Object.entries(record)) {
      // 检查该字段是否在忽略列表中
      const fieldsToIgnore = ignoreFields[this.tableName] || [];
      if (fieldsToIgnore.includes(key)) {
        continue; // 跳过该字段
      }
      
      // 字段名映射
      const dbFieldName = fieldNameMap[key] || key.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '');
      
      // 值转换
      result[dbFieldName] = typeMapper.jsToPostgres(value);
    }
    
    // 特殊处理：如果有NO字段，转换为id
    if (record.NO !== undefined && record.NO !== null) {
      result.id = record.NO;
      delete result.NO; // 删除NO字段
    }
    
    // 特殊处理create_time字段 - 删除它或转换格式
    if (result.create_time !== undefined) {
      // 方案1：删除create_time字段，让数据库使用默认的created_at
      delete result.create_time;
    }
    
    // 特殊处理：针对不同表的特殊字段处理
    if (this.tableName === 'chain_config') {
      // 处理chain_config表可能缺少的字段
      if (record.rpcUrls) {
        // 如果存在rpcUrls字段，转换为JSON字符串存储在rpc_urls字段
        result.rpc_urls = JSON.stringify(record.rpcUrls);
        delete result.rpcUrls;
      }
    } else if (this.tableName === 'api_config') {
      // 处理api_config表中method字段的非空约束
      if (result.method === null || result.method === undefined) {
        result.method = 'GET'; // 提供默认值GET
      }
    } else if (this.tableName === 'data_collection_configs') {
      // 特殊处理数据采集能力表
      if (record.config && typeof record.config === 'object') {
        // 确保config是JSON格式
        result.config = JSON.stringify(record.config);
      }
    } else if (this.tableName === 'data_processing_configs') {
      // 特殊处理data_processing_configs表
      // 确保复杂对象转为JSON
      if (record.inputParams && Array.isArray(record.inputParams)) {
        result.input_params = JSON.stringify(record.inputParams);
        delete result.inputParams;
      }
      
      if (record.outputParams && Array.isArray(record.outputParams)) {
        result.output_params = JSON.stringify(record.outputParams);
        delete result.outputParams;
      }
      
      if (record.formulas && Array.isArray(record.formulas)) {
        result.formulas = JSON.stringify(record.formulas);
      }
      
      if (record.sourceNodeId !== undefined) {
        result.source_node_id = record.sourceNodeId;
        delete result.sourceNodeId;
      }
    }
    
    return result;
  }
  
  /**
   * 将数据从Supabase格式转换为业务模型格式
   * @param dbData Supabase数据
   * @returns 业务模型数据
   */
  private fromDbFormat(dbData: Record<string, any>): T {
    const result: Record<string, any> = {};
    
    // 如果dbData为空，返回空对象
    if (!dbData) {
      return {} as T;
    }
    
    // 处理ID字段
    if (dbData.id !== undefined) {
      result.NO = dbData.id;
    }
    
    // 字段名转换: 蛇形 -> 驼峰
    for (const [key, value] of Object.entries(dbData)) {
      // 忽略id，已经处理过
      if (key === 'id') continue;
      
      // 找到映射的字段名
      const mappedKey = this.getReverseFieldNameMap(key);
      
      // 类型转换
      result[mappedKey] = typeMapper.postgrestoJs(value);
    }
    
    return result as T;
  }
  
  /**
   * 将蛇形命名法转换为驼峰命名法
   * @param str 蛇形命名法字符串
   * @returns 驼峰命名法字符串
   */
  private snakeToCamel(str: string): string {
    return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
  }
  
  /**
   * 获取字段的反向映射名称
   * @param dbFieldName 数据库字段名
   * @returns 对应的业务模型字段名
   */
  private getReverseFieldNameMap(dbFieldName: string): string {
    // 反向字段名映射
    for (const [key, value] of Object.entries(fieldNameMap)) {
      if (value === dbFieldName) {
        return key;
      }
    }
    
    // 如果没有找到映射，尝试将蛇形转为驼峰
    return this.snakeToCamel(dbFieldName);
  }
  
  /**
   * 处理Supabase错误，提供更详细的错误信息
   */
  private handleError(error: any, operation: string): never {
    // 构建更详细的错误信息
    let detailedMessage = `Supabase ${operation} 操作失败`;
    
    if (error) {
      if (error.message) {
        detailedMessage += `: ${error.message}`;
      }
      
      if (error.code) {
        detailedMessage += ` (错误代码: ${error.code})`;
      }
      
      if (error.details || error.hint) {
        detailedMessage += `\n详情: ${error.details || error.hint}`;
      }
      
      // 添加可能的状态码
      if (error.status) {
        detailedMessage += `\n状态码: ${error.status}`;
      }
      
      // PostgreSQL特定错误
      if (error.code === '23505') {
        detailedMessage += ` - 唯一性约束冲突，该记录可能已存在`;
      } else if (error.code === '42P01') {
        detailedMessage += ` - 表不存在，请检查表名是否正确`;
      }
      
      console.error('Supabase错误详情:', error);
    }
    
    throw new Error(detailedMessage);
  }
  
  /**
   * 获取所有记录
   * @returns 记录列表
   */
  async getAll(): Promise<T[]> {
    try {
      console.log(`正在从Supabase获取${this.tableName}表数据...`);
      
      // 注意：不使用AbortController，因为Supabase客户端目前不支持
      // 直接发起请求
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('*')
        .order('id', { ascending: true });
      
      if (error) {
        console.error(`获取${this.tableName}数据失败:`, error);
        throw this.handleError(error, 'getAll');
      }
      
      if (!data) {
        console.warn(`获取${this.tableName}数据为空`);
        return [];
      }
      
      // 数据格式转换
      const transformedData = data.map((item: any) => this.fromDbFormat(item));
      console.log(`成功获取${this.tableName}表数据，共${transformedData.length}条记录`);
      return transformedData as T[];
    } catch (error: any) {
      // 详细分析错误类型
      if (error.message && error.message.includes('Failed to fetch')) {
        console.error(`获取${this.tableName}数据网络请求失败:`, error);
        throw new Error(`网络请求失败，无法连接到Supabase服务。请检查您的网络连接和Supabase项目是否正常运行。错误详情: ${error.message}`);
      }
      
      console.error(`获取${this.tableName}数据未知错误:`, error);
      throw this.handleError(error, 'getAll');
    }
  }
  
  /**
   * 根据ID获取单条记录
   * @param id 记录ID
   * @returns 单条记录或null
   */
  async get(id: number): Promise<T | null> {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('*')
        .eq('id', id)
        .single();
        
      if (error) {
        // 如果是找不到记录的错误，返回null
        if (error.message?.includes('PGRST116') || (error as any).code === 'PGRST116') {
          return null;
        }
        this.handleError(error, `getById(${id})`);
      }
      
      // 转换为IndexedDB格式
      return data ? this.fromDbFormat(data as Record<string, any>) as T : null;
    } catch (error) {
      console.error(`获取${this.tableName}记录(ID=${id})失败:`, error);
      throw error;
    }
  }
  
  /**
   * 兼容旧代码的方法，调用getById
   * @param no 记录编号
   * @returns 单条记录或null
   */
  async getByNo(no: number): Promise<T | null> {
    return this.get(no);
  }
  
  /**
   * 创建新记录
   * @param item 要创建的记录数据（不包含ID）
   * @returns 新创建记录的ID
   */
  async create(item: T): Promise<T> {
    try {
      console.log('开始创建记录，原始数据:', JSON.stringify(item));
      
      // 转换为Supabase格式
      const dbItem = this.toDbFormat(item);
      
      // 确保删除id字段为null的情况
      if (dbItem.id === null || dbItem.id === undefined) {
        delete dbItem.id;
        console.log('删除null的id字段，让数据库自动生成id');
      }
      
      // 处理日期/时间字段，防止PostgreSQL格式错误
      if (dbItem.create_time && typeof dbItem.create_time === 'number') {
        // 转换为PostgreSQL兼容的ISO格式
        dbItem.create_time = new Date(dbItem.create_time).toISOString();
      }
      
      // 检查所有可能的日期时间字段并转换
      for (const key in dbItem) {
        if (
          (key.endsWith('_time') || key.endsWith('_date') || key.endsWith('_at')) && 
          typeof dbItem[key] === 'number' && 
          dbItem[key] > 946684800000  // 2000年以后的时间戳（避免错误解释小数）
        ) {
          console.log(`将字段 ${key} 从 ${dbItem[key]} 转换为ISO日期格式`);
          dbItem[key] = new Date(dbItem[key]).toISOString();
        }
      }
      
      // 新增记录前，打印调试信息
      console.log(`正在创建${this.tableName}记录，处理后数据:`, JSON.stringify(dbItem));
      
      // 打印每个连接步骤的日志
      console.log(`开始向Supabase发送创建请求，URL: ${SupabaseAdapter.getCurrentConfig().url}/rest/v1/${this.tableName}`);
      console.log(`使用表名: ${this.tableName}`);
      
      // 查询数据库表结构，检查是否有自增ID字段
      try {
        // 获取表结构信息（模拟，因为supabase客户端不支持直接查询表结构）
        console.log(`检查${this.tableName}表是否有自增ID字段`);
        
        // 执行一个简单查询，检查是否能成功获取数据
        const { data: tableInfo, error: tableError } = await this.supabase
          .from(this.tableName)
          .select('id')
          .limit(1);
        
        if (tableError) {
          console.warn(`获取${this.tableName}表结构信息失败:`, tableError);
        } else {
          console.log(`${this.tableName}表结构检查成功，可以插入记录`);
        }
      } catch (e) {
        console.warn(`检查表结构失败，将继续尝试插入:`, e);
      }
      
      // 插入记录并返回ID
      const { data, error } = await this.supabase
        .from(this.tableName)
        .insert(dbItem)
        .select('*')
        .single();
      
      console.log(`Supabase响应:`, error ? `错误: ${JSON.stringify(error)}` : `数据: ${JSON.stringify(data)}`);
        
      if (error) {
        // 特殊处理日期时间错误
        if (typeof error === 'object' && error !== null && 'code' in error && error.code === '22008') {
          console.error('日期/时间格式错误，请检查所有日期字段:', error);
          throw new Error(`日期/时间字段格式错误: ${error.message || '未知错误'} - 请确保日期格式正确`);
        }
        
        // 特殊处理not-null约束错误
        if (typeof error === 'object' && error !== null && 'code' in error && error.code === '23502') {
          // 输出详细错误信息
          console.error('not-null约束错误，详细信息:', error);
          const errorMsg = `字段约束错误: ${error.message || '未知错误'} - 请检查数据完整性`;
          throw new Error(errorMsg);
        }
        
        this.handleError(error, 'create');
      }
      
      // 检查返回的数据
      if (!data) {
        throw new Error(`创建${this.tableName}记录成功，但未返回数据`);
      }
      
      console.log(`成功创建记录，返回数据:`, JSON.stringify(data));
      
      // 转换回业务模型格式并返回
      return this.fromDbFormat(data) as T;
    } catch (error) {
      console.error(`创建${this.tableName}记录失败:`, error);
      throw error;
    }
  }
  
  /**
   * 更新记录
   * @param data 数据对象（必须包含ID字段）
   * @returns 更新的数据对象
   */
  async update(data: T): Promise<T> {
    if (!data.NO && (data as any).id === undefined) {
      throw new Error('更新记录需要提供ID字段');
    }
    
    // 添加重试逻辑
    const maxRetries = 3;
    let retries = maxRetries;
    let lastError = null;
    const connectionLogs: string[] = [];
    
    connectionLogs.push(`开始更新记录(ID=${data.NO || (data as any).id})，当前时间: ${new Date().toLocaleString()}`);
    connectionLogs.push(`浏览器网络状态: ${navigator.onLine ? '在线' : '离线'}`);
    
    while (retries > 0) {
      try {
        connectionLogs.push(`更新尝试 ${maxRetries - retries + 1}/${maxRetries}`);
        
        // 先测试连接
        try {
          connectionLogs.push(`测试Supabase连接...`);
          const isConnected = await this.testConnection();
          if (!isConnected) {
            connectionLogs.push(`✗ Supabase连接测试失败`);
            throw new Error('Supabase连接测试失败');
          }
          connectionLogs.push(`✓ Supabase连接测试成功`);
        } catch (connError) {
          connectionLogs.push(`✗ Supabase连接测试失败: ${connError instanceof Error ? connError.message : String(connError)}`);
          console.error('Supabase连接测试失败:', connError);
          throw new Error(`Supabase连接失败: ${connError}`);
        }
        
        // 输出欲更新数据的详细信息
        connectionLogs.push(`准备更新数据: ${JSON.stringify(data)}`);
        
        // 转换为Supabase格式
        const dbItem = this.toDbFormat(data);
        const id = data.NO || (data as any).id;
        
        connectionLogs.push(`转换为数据库格式: ${JSON.stringify(dbItem)}`);
        connectionLogs.push(`使用表名: ${this.tableName}`);
        
        // 执行更新
        connectionLogs.push(`执行更新操作...`);
        
        // 先检查记录是否存在
        const checkResponse = await fetch(
          `${SupabaseAdapter.getCurrentConfig().url}/rest/v1/${this.tableName}?id=eq.${id}&select=id`,
          {
            method: 'GET',
            headers: {
              'apikey': SupabaseAdapter.getCurrentConfig().key,
              'Authorization': `Bearer ${SupabaseAdapter.getCurrentConfig().key}`
            }
          }
        );
        
        const existingRecords = await checkResponse.json();
        const recordExists = existingRecords && existingRecords.length > 0;
        
        // 根据记录是否存在选择使用 PATCH（更新）还是 POST（新增）
        const method = recordExists ? 'PATCH' : 'POST';
        connectionLogs.push(`记录${recordExists ? '已存在' : '不存在'}，使用 ${method} 方法`);
        
        // 发送请求
        const response = await fetch(
          `${SupabaseAdapter.getCurrentConfig().url}/rest/v1/${this.tableName}?id=eq.${id}`,
          {
            method,
            headers: {
              'apikey': SupabaseAdapter.getCurrentConfig().key,
              'Authorization': `Bearer ${SupabaseAdapter.getCurrentConfig().key}`,
              'Content-Type': 'application/json',
              'Prefer': 'return=representation'
            },
            body: JSON.stringify(dbItem)
          }
        );

        if (!response.ok) {
          const error = await response.text();
          connectionLogs.push(`✗ 更新操作失败: ${error}`);
          throw new Error(`HTTP错误 ${response.status}: ${error}`);
        }

        const updatedData = await response.json();
        
        connectionLogs.push(`✓ 更新操作成功`);
        // 返回更新后的对象
        return updatedData ? this.fromDbFormat(updatedData[0]) : data;
      } catch (error) {
        lastError = error;
        const errorMsg = error instanceof Error ? error.message : String(error);
        connectionLogs.push(`✗ 更新失败(尝试${maxRetries-retries+1}/${maxRetries}): ${errorMsg}`);
        console.error(`更新${this.tableName}记录失败(尝试${maxRetries-retries+1}/${maxRetries}):`, error);
        retries--;
        
        if (retries > 0) {
          // 等待一段时间后重试
          const retryDelay = 1000 * (maxRetries - retries); // 逐步增加重试间隔
          connectionLogs.push(`等待${retryDelay}ms后重试...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          connectionLogs.push(`正在重试更新操作(剩余尝试:${retries})...`);
        }
      }
    }
    
    // 记录完整的连接日志
    console.log('更新操作完整日志:');
    console.log(connectionLogs.join('\n'));
    
    // 所有重试都失败
    throw new Error(`无法连接到Supabase云数据库，是否使用本地存储保存？ 详情: ${formatError(lastError)}\n\n连接日志: ${connectionLogs.join('\n')}`);
  }
  
  /**
   * 删除记录
   * @param id 要删除的记录ID
   */
  async delete(id: number): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from(this.tableName)
        .delete()
        .eq('id', id);
        
      if (error) this.handleError(error, `delete(ID=${id})`);
      
      // 成功删除返回true
      return true;
    } catch (error) {
      console.error(`删除${this.tableName}记录(ID=${id})失败:`, error);
      return false;
    }
  }
  
  /**
   * 批量创建记录
   * @param items 要创建的记录列表
   * @returns 创建的记录ID列表
   */
  async bulkCreate(items: T[]): Promise<T[]> {
    try {
      // 批量转换为Supabase格式
      const dbItems = items.map(item => {
        // 确保没有NO字段，让自动递增生效
        const itemCopy = { ...item };
        if (itemCopy.NO !== undefined) {
          delete itemCopy.NO;
        }
        return this.toDbFormat(itemCopy);
      });
      
      // 打印批量创建信息
      console.log(`正在批量创建${this.tableName}记录，数量:`, dbItems.length);
      
      const { data, error } = await this.supabase
        .from(this.tableName)
        .insert(dbItems)
        .select('*');
        
      if (error) this.handleError(error, 'bulkCreate');
      
      // 转换回业务模型格式并返回
      return (data as any[])?.map(item => this.fromDbFormat(item)) || [];
    } catch (error) {
      console.error(`批量创建${this.tableName}记录失败:`, error);
      throw error;
    }
  }
  
  /**
   * 批量更新记录
   * @param updates 更新操作列表
   */
  async bulkUpdate(updates: Array<{id: number, data: T}>): Promise<void> {
    // Supabase不支持真正的批量更新，所以我们需要分批处理
    const batchSize = 50;
    const promises: Promise<void>[] = [];
    
    for (let i = 0; i < updates.length; i += batchSize) {
      const batch = updates.slice(i, i + batchSize);
      
      for (const update of batch) {
        const { id, data } = update;
        // 确保data包含id或NO字段
        const dataWithId = { ...data, NO: id } as T;
        const promise = this.update(dataWithId).then(() => {});
        promises.push(promise);
      }
      
      // 等待当前批次完成
      await Promise.all(promises);
    }
  }
  
  /**
   * 根据条件查询记录
   * @param condition 查询条件
   * @returns 符合条件的记录列表
   */
  async query(condition: Partial<T>): Promise<T[]> {
    try {
      // 转换条件为Supabase格式
      const dbCondition = this.toDbFormat(condition);
      
      let query = this.supabase
        .from(this.tableName)
        .select('*');
      
      // 添加条件
      for (const [key, value] of Object.entries(dbCondition)) {
        query = query.eq(key, value);
      }
      
      const { data, error } = await query;
      
      if (error) this.handleError(error, 'query');
      
      // 转换为IndexedDB格式
      return data ? data.map((item: any) => this.fromDbFormat(item)) as T[] : [];
    } catch (error) {
      console.error(`查询${this.tableName}记录失败:`, error);
      throw error;
    }
  }

  /**
   * 获取所有表名
   * @returns 表名列表
   */
  async getTables(): Promise<string[]> {
    try {
      // 直接列出我们知道的表名
      // 由于Supabase的权限限制，无法直接查询information_schema
      return [
        'chain_config',
        'token_config',
        'trading_pair_config',
        'exchange_config',
        'api_config',
        'alert_config',
        'data_collection_configs',
        'data_processing_configs',
        'alert_capability'
      ];
    } catch (error) {
      console.error('获取数据库表结构失败:', error);
      throw error;
    }
  }

  /**
   * 获取表结构
   * @param tableName 表名
   * @returns 表结构
   */
  async getTableStructure(tableName?: string): Promise<any> {
    try {
      // 目前Supabase JS客户端不支持直接获取表结构
      // 这里返回一个空数组
      return [];
    } catch (error) {
      throw this.handleError(error, 'getTableStructure');
    }
  }
  
  /**
   * 执行SQL查询
   * @param sql SQL查询语句
   * @returns 查询结果
   */
  async executeQuery(sql: string): Promise<any> {
    try {
      console.log('尝试执行SQL查询:', sql);
      // Supabase JavaScript客户端不直接支持执行原始SQL
      // 这个方法目前只是一个通知，实际需要在Supabase控制台执行SQL
      console.warn('请在Supabase控制台SQL编辑器中执行以下SQL:');
      console.warn(sql);
      
      // 返回成功状态，但实际上需要手动执行
      return { success: true, message: '请在Supabase控制台执行SQL' };
    } catch (error) {
      console.error('无法执行SQL查询:', error);
      console.error('原始SQL:', sql);
      throw new Error(`无法执行SQL查询。请在Supabase控制台中手动执行。错误: ${formatError(error)}`);
    }
  }
} 