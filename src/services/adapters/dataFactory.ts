import { IndexedDBAdapter } from './indexedDBAdapter';
import { SupabaseAdapter } from './supabaseAdapter';
import { IDataAdapter } from './dataAdapter';

/**
 * 存储类型枚举
 */
export enum StorageType {
  IndexedDB = 'indexeddb',
  Supabase = 'supabase'
}

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
 * 数据工厂类
 * 负责创建适当的数据适配器
 */
export class DataFactory {
  /**
   * 获取适配器（同步版本）
   * 适用于初始化静态变量的场景，不会进行网络检查
   * @param storeName 存储名称
   * @param type 存储类型
   * @returns 适配器实例
   */
  static getAdapter<T extends { NO?: number }>(
    storeName: string, 
    type: StorageType = StorageType.IndexedDB
  ): IDataAdapter<T> {
    // 根据存储类型处理表名
    const tableName = type === StorageType.Supabase 
      ? tableNameMap[storeName] || storeName.toLowerCase()
      : storeName;
    
    // 创建适配器
    switch (type) {
      case StorageType.Supabase:
        return new SupabaseAdapter<T>(tableName);
          
      case StorageType.IndexedDB:
      default:
        return new IndexedDBAdapter<T>(storeName);
    }
  }

  /**
   * 获取适配器（异步版本）
   * 适用于需要进行网络检查的场景
   * @param storeName 存储名称
   * @param type 存储类型
   * @param forceCheck 是否强制检查连接状态
   * @returns 适配器实例
   */
  static async getAdapterAsync<T extends { NO?: number }>(
    storeName: string, 
    type: StorageType = StorageType.IndexedDB,
    forceCheck: boolean = false
  ): Promise<IDataAdapter<T>> {
    console.log(`===== 创建数据适配器 =====`);
    console.log(`时间: ${new Date().toLocaleString()}`);
    console.log(`存储名称: ${storeName}`);
    console.log(`存储类型: ${type === StorageType.Supabase ? 'Supabase云数据库' : 'IndexedDB本地存储'}`);
    console.log(`强制检查连接: ${forceCheck}`);
    
    // 记录浏览器和网络信息
    const isOnline = navigator.onLine;
    console.log(`浏览器网络状态: ${isOnline ? '在线' : '离线'}`);
    console.log(`用户代理: ${navigator.userAgent}`);
    
    // 如果是Supabase类型，先检查网络连接
    if (type === StorageType.Supabase) {
      // 如果网络离线，立即降级到IndexedDB
      if (!isOnline) {
        console.warn('网络离线，自动降级到IndexedDB本地存储');
        type = StorageType.IndexedDB;
      } 
      // 如果网络在线，可以考虑进一步测试Supabase连接
      else if (forceCheck) {
        try {
          console.log('正在测试Supabase连接...');
          // 尝试Ping Supabase服务器
          const pingResponse = await fetch('https://zuotevtiqjnhewkfmzny.supabase.co/ping', {
            method: 'GET',
            headers: {
              'Cache-Control': 'no-cache'
            },
            mode: 'cors'
          });
          
          if (!pingResponse.ok) {
            console.warn(`Supabase连接测试失败: ${pingResponse.status} ${pingResponse.statusText}`);
            type = StorageType.IndexedDB;
          } else {
            console.log(`Supabase连接测试成功: ${pingResponse.status} ${pingResponse.statusText}`);
          }
        } catch (error) {
          console.warn('Supabase连接测试出错，降级到本地存储:', error);
          type = StorageType.IndexedDB;
        }
      }
    }
    
    // 根据存储类型处理表名
    const tableName = type === StorageType.Supabase 
      ? tableNameMap[storeName] || storeName.toLowerCase()
      : storeName;
    
    console.log(`映射后的表名: ${tableName}`);
    console.log(`最终选择的存储类型: ${type}`);
    
    // 创建适配器
    let adapter: IDataAdapter<T>;
    
    try {
      switch (type) {
        case StorageType.Supabase:
          console.log(`尝试创建Supabase适配器...`);
          adapter = new SupabaseAdapter<T>(tableName);
          console.log(`Supabase适配器创建成功`);
          break;
          
        case StorageType.IndexedDB:
        default:
          console.log(`尝试创建IndexedDB适配器...`);
          adapter = new IndexedDBAdapter<T>(storeName);
          console.log(`IndexedDB适配器创建成功`);
          break;
      }
      
      // 在尝试使用适配器前记录
      console.log(`适配器创建成功，类型: ${type}`);
      console.log(`===== 适配器创建完成 =====`);
      
      return adapter;
    } catch (error) {
      // 记录详细错误信息
      console.error(`创建适配器失败:`, error);
      console.error(`错误详情: ${error instanceof Error ? error.message : String(error)}`);
      console.error(`错误栈: ${error instanceof Error && error.stack ? error.stack : '无错误栈'}`);
      
      // 如果创建Supabase适配器失败，自动降级到IndexedDB
      if (type === StorageType.Supabase) {
        console.warn(`Supabase适配器创建失败，降级到IndexedDB本地存储`);
        return new IndexedDBAdapter<T>(storeName);
      }
      
      throw error; // 重新抛出错误
    }
  }
} 