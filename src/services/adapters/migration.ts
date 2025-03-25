import { initDatabase } from '../database';
import { DataFactory, StorageType } from './dataFactory';
import { ChainConfigModel, TokenConfigModel, TradingPairConfigModel, ExchangeConfigModel, ApiConfigModel, AlertConfigModel } from '../database';
import { IDataAdapter } from './dataAdapter';
import { SupabaseAdapter } from './supabaseAdapter';

/**
 * 进度回调类型
 */
type ProgressCallback = (percent: number, message: string) => void;

/**
 * 日志类型
 */
export type MigrationLog = {
  time: string;
  message: string;
  type: 'info' | 'success' | 'error' | 'warning';
};

/**
 * 迁移结果类型
 */
export type MigrationResult = {
  success: boolean;
  logs: MigrationLog[];
  summary: string;
};

/**
 * 获取所有存储名称
 * @returns 存储名称列表
 */
const getStoreNames = (): string[] => {
  return [
    "ChainConfig",
    "TokenConfig",
    "TradingPairConfig",
    "ExchangeConfig",
    "ApiConfig",
    "AlertConfig"
    // 移除不存在的表
    // "data_collection_configs",
    // "data_processing_configs", 
    // "AlertCapability"
  ];
};

/**
 * 添加日志
 * @param logs 日志数组
 * @param message 消息
 * @param type 类型
 */
function addLog(logs: MigrationLog[], message: string, type: 'info' | 'success' | 'error' | 'warning'): void {
  logs.push({
    time: new Date().toLocaleTimeString(),
    message,
    type
  });
}

/**
 * 格式化错误对象
 * @param error 错误对象
 * @returns 格式化后的错误信息
 */
function formatError(error: any): string {
  if (error instanceof Error) {
    return error.message;
  }
  
  // 如果是Supabase错误，可能包含code和details属性
  if (error && typeof error === 'object') {
    try {
      // 尝试格式化错误对象
      if (error.message) return error.message;
      if (error.error) return typeof error.error === 'string' ? error.error : JSON.stringify(error.error);
      if (error.details) return typeof error.details === 'string' ? error.details : JSON.stringify(error.details);
      if (error.code) return `错误代码: ${error.code}`;
      
      // 尝试完整序列化对象（排除循环引用）
      return JSON.stringify(error, (key, value) => {
        if (key === 'stack') return undefined; // 排除堆栈跟踪
        return value;
      }, 2);
    } catch (e) {
      return '无法解析的错误对象';
    }
  }
  
  return String(error);
}

/**
 * 迁移单个存储
 * @param storeName 存储名称
 * @param onProgress 进度回调
 * @param logs 日志数组
 * @param skipExisting 是否跳过已存在的数据
 * @returns 是否成功
 */
async function migrateStore<T extends { NO?: number }>(
  storeName: string, 
  onProgress: ProgressCallback,
  logs: MigrationLog[],
  skipExisting: boolean = true
): Promise<boolean> {
  try {
    const message = `开始迁移 ${storeName}...`;
    onProgress(0, message);
    addLog(logs, message, 'info');
    
    // 检查是否存储在localStorage中的特殊表
    if (storeName === 'data_processing_configs') {
      // 处理localStorage存储的数据处理配置
      return await migrateLocalStorageData(
        storeName, 
        'data_processing_configs', 
        onProgress, 
        logs, 
        skipExisting
      );
    }
    
    // 检查源表是否存在
    try {
      const db = await initDatabase();
      if (!db.objectStoreNames.contains(storeName)) {
        const notExistMessage = `表 ${storeName} 在IndexedDB中不存在，跳过迁移`;
        onProgress(100, notExistMessage);
        addLog(logs, notExistMessage, 'warning');
        return true; // 返回true表示处理完成（虽然没有实际迁移）
      }
    } catch (error) {
      const errorMessage = `检查表 ${storeName} 是否存在时出错: ${formatError(error)}`;
      onProgress(0, errorMessage);
      addLog(logs, errorMessage, 'error');
      return false;
    }
    
    // 获取源和目标适配器
    const sourceAdapter = await DataFactory.getAdapterAsync<T>(storeName, StorageType.IndexedDB);
    const targetAdapter = await DataFactory.getAdapterAsync<T>(storeName, StorageType.Supabase);
    
    // 获取所有数据
    const allData = await sourceAdapter.getAll();
    const progressMessage = `读取到 ${allData.length} 条 ${storeName} 记录`;
    onProgress(25, progressMessage);
    addLog(logs, progressMessage, 'info');
    
    if (allData.length === 0) {
      const completeMessage = `✅ ${storeName} 没有数据需要迁移`;
      onProgress(100, completeMessage);
      addLog(logs, completeMessage, 'success');
      return true;
    }
    
    // 检查目标是否有数据
    const existingData = await targetAdapter.getAll();
    
    if (existingData.length > 0) {
      if (skipExisting) {
        // 如果设置了跳过已存在数据，则过滤掉已存在的记录
        // 创建一个已存在记录的ID集合，用于快速查找
        const existingIds = new Set(existingData.map((item: any) => item.NO || item.id));
        
        // 过滤出不存在于目标数据库的记录
        const newData = allData.filter((item: any) => !existingIds.has(item.NO));
        
        if (newData.length === 0) {
          const skipMessage = `✅ ${storeName} 所有记录已存在，跳过迁移`;
          onProgress(100, skipMessage);
          addLog(logs, skipMessage, 'success');
          return true;
        }
        
        const existingMessage = `目标数据库已有 ${existingData.length} 条记录，将只迁移 ${newData.length} 条新记录`;
        onProgress(30, existingMessage);
        addLog(logs, existingMessage, 'warning');
        
        // 使用过滤后的数据继续迁移
        return await migrateData(newData, targetAdapter, storeName, onProgress, logs);
      } else {
        const existingMessage = `目标数据库已有 ${existingData.length} 条记录，将尝试迁移全部 ${allData.length} 条记录`;
        onProgress(30, existingMessage);
        addLog(logs, existingMessage, 'warning');
        addLog(logs, `注意：可能会因主键冲突导致部分记录迁移失败`, 'warning');
      }
    }
    
    // 使用全部数据进行迁移
    return await migrateData(allData, targetAdapter, storeName, onProgress, logs);
  } catch (error) {
    const errorMessage = `❌ 迁移 ${storeName} 失败: ${formatError(error)}`;
    onProgress(0, errorMessage);
    console.error(`迁移 ${storeName} 失败:`, error);
    addLog(logs, errorMessage, 'error');
    return false;
  }
}

/**
 * 从localStorage迁移数据到Supabase
 * @param storeName 源表名
 * @param localStorageKey localStorage键名
 * @param onProgress 进度回调
 * @param logs 日志数组
 * @param skipExisting 是否跳过已存在的数据
 * @returns 是否成功
 */
async function migrateLocalStorageData(
  storeName: string,
  localStorageKey: string,
  onProgress: ProgressCallback,
  logs: MigrationLog[],
  skipExisting: boolean = true
): Promise<boolean> {
  try {
    // 从localStorage读取数据
    const storedData = localStorage.getItem(localStorageKey);
    
    if (!storedData) {
      const noDataMessage = `✅ localStorage中没有${localStorageKey}数据，跳过迁移`;
      onProgress(100, noDataMessage);
      addLog(logs, noDataMessage, 'success');
      return true;
    }
    
    // 解析数据
    const parsedData = JSON.parse(storedData);
    const allData = Array.isArray(parsedData) ? parsedData : [parsedData];
    
    // 确保每条记录有唯一ID
    const processedData = allData.map((item, index) => {
      if (!item.NO && !item.id) {
        item.NO = index + 1;
      }
      return item;
    });
    
    const progressMessage = `从localStorage读取到 ${processedData.length} 条 ${storeName} 记录`;
    onProgress(25, progressMessage);
    addLog(logs, progressMessage, 'info');
    
    // 获取Supabase适配器
    const targetAdapter = await DataFactory.getAdapterAsync<any>(storeName, StorageType.Supabase);
    
    // 检查目标是否有数据
    const existingData = await targetAdapter.getAll();
    
    if (existingData.length > 0 && skipExisting) {
      // 如果设置了跳过已存在数据，则过滤掉已存在的记录
      const existingIds = new Set(existingData.map((item: any) => item.NO || item.id));
      
      // 过滤出不存在于目标数据库的记录
      const newData = processedData.filter((item: any) => !existingIds.has(item.NO));
      
      if (newData.length === 0) {
        const skipMessage = `✅ ${storeName} 所有记录已存在，跳过迁移`;
        onProgress(100, skipMessage);
        addLog(logs, skipMessage, 'success');
        return true;
      }
      
      const existingMessage = `目标数据库已有 ${existingData.length} 条记录，将只迁移 ${newData.length} 条新记录`;
      onProgress(30, existingMessage);
      addLog(logs, existingMessage, 'warning');
      
      // 使用过滤后的数据继续迁移
      return await migrateData(newData, targetAdapter, storeName, onProgress, logs);
    }
    
    // 使用全部数据进行迁移
    return await migrateData(processedData, targetAdapter, storeName, onProgress, logs);
  } catch (error) {
    const errorMessage = `❌ 从localStorage迁移 ${storeName} 失败: ${formatError(error)}`;
    onProgress(0, errorMessage);
    console.error(errorMessage, error);
    addLog(logs, errorMessage, 'error');
    return false;
  }
}

/**
 * 迁移数据
 * @param dataArray 要迁移的数据
 * @param targetAdapter 目标适配器
 * @param storeName 存储名称
 * @param onProgress 进度回调
 * @param logs 日志数组
 * @returns 是否成功
 */
async function migrateData<T extends { NO?: number }>(
  dataArray: T[],
  targetAdapter: IDataAdapter<T>,
  storeName: string,
  onProgress: ProgressCallback,
  logs: MigrationLog[]
): Promise<boolean> {
  // 迁移计数器
  let migratedCount = 0;
  let totalCount = dataArray.length;
  
  // 尝试使用批量创建
  if (typeof targetAdapter.bulkCreate === 'function') {
    try {
      // 预处理数据：移除ID字段
      const preparedData = dataArray.map(item => {
        // 创建一个新对象，可能会保留NO字段，但由bulkCreate处理
        return { ...item };
      });
      
      const totalCount = preparedData.length;
      const bulkMessage = `尝试批量迁移 ${storeName} 数据，共 ${totalCount} 条`;
      addLog(logs, bulkMessage, 'info');
      
      const createdItems = await targetAdapter.bulkCreate(preparedData);
      migratedCount = totalCount;
      
      const successMessage = `✅ ${storeName} 迁移完成，共 ${migratedCount} 条记录（批量方式）`;
      addLog(logs, successMessage, 'success');
      
      return true;
    } catch (error) {
      // 批量迁移失败，回退到单个迁移
      const errorDetails = formatError(error);
      const errorMessage = `批量迁移失败，回退到单条迁移: ${errorDetails}`;
      console.warn(errorMessage, error);
      addLog(logs, errorMessage, 'warning');
      
      // 如果有堆栈信息，记录第一行
      if (error instanceof Error && error.stack) {
        addLog(logs, `错误详情: ${error.stack.split('\n')[0]}`, 'warning');
      }
      // 回退到单条迁移
    }
  }
  
  // 单条迁移
  const singleMessage = `使用单条方式迁移 ${totalCount} 条记录...`;
  onProgress(40, singleMessage);
  addLog(logs, singleMessage, 'info');
  
  const errors: string[] = [];
  
  for (const item of dataArray) {
    try {
      const { NO, ...rest } = item as any;
      await targetAdapter.create(rest);
      migratedCount++;
      
      // 更新进度
      const percent = Math.floor((migratedCount / totalCount) * 60) + 40;
      onProgress(percent, `已迁移 ${migratedCount}/${totalCount} 条 ${storeName} 记录`);
    } catch (error) {
      const errorDetails = formatError(error);
      const errorMessage = `迁移记录失败 [${storeName}]: ${errorDetails}`;
      console.error(errorMessage, error);
      addLog(logs, errorMessage, 'error');
      
      // 如果有堆栈信息，记录第一行
      if (error instanceof Error && error.stack) {
        addLog(logs, `错误详情: ${error.stack.split('\n')[0]}`, 'error');
      }
      errors.push(errorMessage);
      // 继续迁移其他记录
    }
  }
  
  const resultMessage = `✅ ${storeName} 迁移完成，成功 ${migratedCount}/${totalCount} 条记录`;
  onProgress(100, resultMessage);
  addLog(logs, resultMessage, migratedCount === totalCount ? 'success' : 'warning');
  
  if (errors.length > 0) {
    addLog(logs, `${storeName} 迁移过程中有 ${errors.length} 条记录失败`, 'warning');
  }
  
  return migratedCount === totalCount;
}

/**
 * 清空Supabase数据表
 * @param storeName 存储名称
 * @returns 是否成功
 */
export async function clearSupabaseTable(storeName: string): Promise<boolean> {
  try {
    const targetAdapter = await DataFactory.getAdapterAsync(storeName, StorageType.Supabase);
    
    // 获取现有数据
    const existingData = await targetAdapter.getAll();
    
    if (existingData.length === 0) {
      // 表已经为空
      return true;
    }
    
    // 使用Supabase适配器中的delete方法逐个删除
    for (const item of existingData) {
      const id = (item as any).id || (item as any).NO;
      if (id) {
        await targetAdapter.delete(id);
      }
    }
    
    // 再次检查是否已清空
    const remainingData = await targetAdapter.getAll();
    return remainingData.length === 0;
  } catch (error) {
    console.error(`清空 ${storeName} 表失败:`, error);
    return false;
  }
}

/**
 * 清空所有Supabase数据表
 * @param onProgress 进度回调
 * @returns 清空结果
 */
export async function clearAllSupabaseTables(onProgress: ProgressCallback): Promise<MigrationResult> {
  const logs: MigrationLog[] = [];
  
  try {
    addLog(logs, '开始清空Supabase数据表...', 'info');
    onProgress(0, '开始清空Supabase数据表...');
    
    const storeNames = getStoreNames();
    let successCount = 0;
    
    for (let i = 0; i < storeNames.length; i++) {
      const storeName = storeNames[i];
      const progress = Math.floor((i / storeNames.length) * 100);
      onProgress(progress, `正在清空 ${storeName} 表...`);
      
      addLog(logs, `正在清空 ${storeName} 表...`, 'info');
      const success = await clearSupabaseTable(storeName);
      
      if (success) {
        addLog(logs, `✅ ${storeName} 表已清空`, 'success');
        successCount++;
      } else {
        addLog(logs, `❌ ${storeName} 表清空失败`, 'error');
      }
    }
    
    const success = successCount === storeNames.length;
    const summary = success
      ? '所有数据表已清空'
      : `部分数据表清空失败，成功: ${successCount}/${storeNames.length}`;
    
    onProgress(100, summary);
    addLog(logs, summary, success ? 'success' : 'warning');
    
    return {
      success,
      logs,
      summary
    };
  } catch (error) {
    const errorMessage = `清空数据表失败: ${formatError(error)}`;
    onProgress(0, errorMessage);
    console.error('清空数据表失败:', error);
    addLog(logs, errorMessage, 'error');
    
    return {
      success: false,
      logs,
      summary: errorMessage
    };
  }
}

/**
 * 处理时间戳字段，避免PostgreSQL时间戳错误
 * @param data 要处理的数据
 * @param storeName 存储名称
 * @returns 处理后的数据
 */
function handleTimestampFields(data: any[], storeName: string): any[] {
  // 处理data_processing_configs和data_collection_configs表
  if (storeName !== 'data_processing_configs' && storeName !== 'data_collection_configs') {
    return data;
  }
  
  return data.map(item => {
    // 深拷贝以避免修改原始数据
    const newItem = JSON.parse(JSON.stringify(item));
    
    // 删除所有可能导致时间戳错误的字段
    delete newItem.create_time;
    delete newItem.created_at;
    
    // 确保active字段是布尔值
    if (newItem.active !== undefined) {
      newItem.active = Boolean(newItem.active);
    }
    
    // 处理特定字段，比如确保config是对象
    if (storeName === 'data_collection_configs' && typeof newItem.config === 'string') {
      try {
        newItem.config = JSON.parse(newItem.config);
      } catch (e) {
        // 如果无法解析，保持原样
      }
    }
    
    return newItem;
  });
}

/**
 * 迁移所有数据
 * @param onProgress 进度回调
 * @param skipExisting 是否跳过已存在的数据
 * @returns 迁移结果
 */
export async function migrateAllData(
  onProgress: ProgressCallback,
  skipExisting: boolean = true
): Promise<MigrationResult> {
  const logs: MigrationLog[] = [];
  
  try {
    // 确保IndexedDB初始化
    await initDatabase();
    onProgress(0, '数据库初始化完成');
    addLog(logs, '数据库初始化完成', 'info');
    
    // 获取所有存储名称
    const storeNames = getStoreNames();
    let successCount = 0;
    
    // 遍历每个存储，进行迁移
    for (let i = 0; i < storeNames.length; i++) {
      const storeName = storeNames[i];
      const progress = Math.floor((i / storeNames.length) * 100);
      onProgress(progress, `迁移中 ${i+1}/${storeNames.length}: ${storeName}`);
      
      try {
        // 创建适配器
        const sourceAdapter = await DataFactory.getAdapterAsync<any>(storeName, StorageType.IndexedDB);
        const targetAdapter = await DataFactory.getAdapterAsync<any>(storeName, StorageType.Supabase);
        
        // 尝试从IndexedDB获取数据
        let sourceData: any[] = [];
        try {
          sourceData = await sourceAdapter.getAll();
          addLog(logs, `读取到 ${sourceData.length} 条 ${storeName} 记录`, 'info');
        } catch (error) {
          // 如果是因为表不存在而抛出异常，则跳过该表
          if (error instanceof Error && 
              (error.message.includes('does not exist') || 
               error.message.includes('not exist') ||
               error.message.includes('不存在'))) {
            addLog(logs, `表 ${storeName} 在IndexedDB中不存在，跳过迁移`, 'info');
            
            // 尝试从localStorage获取数据（对于特定的表）
            if (storeName === 'data_processing_configs' || storeName === 'data_collection_configs') {
              // 尝试从localStorage获取
              try {
                const rawData = localStorage.getItem(storeName);
                if (rawData) {
                  let parsedData = JSON.parse(rawData);
                  if (Array.isArray(parsedData) && parsedData.length > 0) {
                    // 不再过滤测试数据
                    sourceData = parsedData;
                    
                    // 处理时间戳字段
                    sourceData = handleTimestampFields(sourceData, storeName);
                    
                    addLog(logs, `从localStorage读取到 ${sourceData.length} 条 ${storeName} 记录（包含所有数据）`, 'info');
                  } else {
                    addLog(logs, `${storeName} 中没有数据，localStorage存储为空或格式无效`, 'warning');
                  }
                }
              } catch (e) {
                addLog(logs, `从localStorage读取 ${storeName} 数据失败: ${formatError(e)}`, 'error');
              }
            }
            
            if (sourceData.length === 0) {
              continue; // 跳过这个表
            }
          } else {
            // 其他异常，记录错误
            throw error;
          }
        }
        
        // 如果没有数据，跳过
        if (sourceData.length === 0) {
          addLog(logs, `✅ ${storeName} 没有数据需要迁移`, 'success');
          successCount++;
          continue;
        }
        
        // 处理时间戳字段
        if (storeName === 'data_processing_configs') {
          sourceData = handleTimestampFields(sourceData, storeName);
        }
        
        // 检查目标是否有数据
        const existingData = await targetAdapter.getAll();
        
        if (existingData.length > 0) {
          if (skipExisting) {
            // 如果设置了跳过已存在数据，则过滤掉已存在的记录
            // 创建一个已存在记录的ID集合，用于快速查找
            const existingIds = new Set(existingData.map((item: any) => item.NO || item.id));
            
            // 过滤出不存在于目标数据库的记录
            const newData = sourceData.filter((item: any) => !existingIds.has(item.NO));
            
            if (newData.length === 0) {
              const skipMessage = `✅ ${storeName} 所有记录已存在，跳过迁移`;
              onProgress(100, skipMessage);
              addLog(logs, skipMessage, 'success');
              successCount++;
              continue;
            }
            
            const existingMessage = `目标数据库已有 ${existingData.length} 条记录，将只迁移 ${newData.length} 条新记录`;
            onProgress(30, existingMessage);
            addLog(logs, existingMessage, 'warning');
            
            // 使用过滤后的数据继续迁移
            await migrateData(newData, targetAdapter, storeName, onProgress, logs);
          } else {
            const existingMessage = `目标数据库已有 ${existingData.length} 条记录，将尝试迁移全部 ${sourceData.length} 条记录`;
            onProgress(30, existingMessage);
            addLog(logs, existingMessage, 'warning');
            addLog(logs, `注意：可能会因主键冲突导致部分记录迁移失败`, 'warning');
          }
        }
        
        // 使用全部数据进行迁移
        await migrateData(sourceData, targetAdapter, storeName, onProgress, logs);
        successCount++;
      } catch (error) {
        const errorMessage = `迁移 ${storeName} 失败: ${formatError(error)}`;
        onProgress(0, errorMessage);
        console.error(`迁移 ${storeName} 失败:`, error);
        addLog(logs, errorMessage, 'error');
      }
    }
    
    // 返回迁移结果
    const allSuccess = successCount === storeNames.length;
    const summary = allSuccess 
      ? '所有数据迁移完成' 
      : `部分数据迁移失败，成功: ${successCount}/${storeNames.length}`;
    
    onProgress(100, summary);
    addLog(logs, summary, allSuccess ? 'success' : 'warning');
    
    return {
      success: allSuccess,
      logs,
      summary
    };
  } catch (error) {
    const errorMessage = `数据迁移失败: ${formatError(error)}`;
    onProgress(0, errorMessage);
    console.error("数据迁移失败:", error);
    addLog(logs, errorMessage, 'error');
    
    return {
      success: false,
      logs,
      summary: errorMessage
    };
  }
}

/**
 * 迁移验证
 * @returns 验证结果
 */
export async function validateMigration(): Promise<MigrationResult> {
  const logs: MigrationLog[] = [];
  
  try {
    addLog(logs, '开始验证数据迁移结果...', 'info');
    const storeNames = getStoreNames();
    let validCount = 0;
    let totalCount = 0; // 实际存在的表数量
    const errors: string[] = [];
    
    // 验证每个存储的数据一致性
    for (const storeName of storeNames) {
      addLog(logs, `正在验证 ${storeName} 数据...`, 'info');
      
      // 检查源表是否存在
      try {
        const db = await initDatabase();
        if (!db.objectStoreNames.contains(storeName)) {
          const notExistMessage = `表 ${storeName} 在IndexedDB中不存在，跳过验证`;
          addLog(logs, notExistMessage, 'warning');
          // 不增加总数，因为表不存在
          continue;
        }
        
        // 表存在，增加总数
        totalCount++;
      } catch (error) {
        const errorMessage = `检查表 ${storeName} 是否存在时出错: ${formatError(error)}`;
        addLog(logs, errorMessage, 'error');
        errors.push(errorMessage);
        continue;
      }
      
      // 获取源和目标适配器
      const sourceAdapter = await DataFactory.getAdapterAsync(storeName, StorageType.IndexedDB);
      const targetAdapter = await DataFactory.getAdapterAsync(storeName, StorageType.Supabase);
      
      try {
        // 获取数据
        const sourceData = await sourceAdapter.getAll();
        const targetData = await targetAdapter.getAll();
        
        // 检查数据数量
        if (sourceData.length > targetData.length) {
          const errorMessage = `${storeName} 数据数量不一致: IndexedDB ${sourceData.length}, Supabase ${targetData.length}`;
          console.error(errorMessage);
          addLog(logs, errorMessage, 'error');
          errors.push(errorMessage);
        } else {
          addLog(logs, `${storeName} 数据验证通过: ${targetData.length} 条记录`, 'success');
          validCount++;
        }
      } catch (error) {
        const errorMessage = `${storeName} 验证出错: ${formatError(error)}`;
        console.error(errorMessage);
        addLog(logs, errorMessage, 'error');
        errors.push(errorMessage);
      }
    }
    
    const success = validCount === totalCount && totalCount > 0;
    const summary = success 
      ? '迁移验证成功！数据一致性良好。' 
      : `迁移验证失败，${validCount}/${totalCount} 个存储验证通过`;
    
    addLog(logs, summary, success ? 'success' : 'warning');
    
    if (errors.length > 0) {
      addLog(logs, `验证过程中发现 ${errors.length} 个问题`, 'warning');
    }
    
    return {
      success,
      logs,
      summary
    };
  } catch (error) {
    const errorMessage = `迁移验证失败: ${formatError(error)}`;
    console.error("迁移验证失败:", error);
    addLog(logs, errorMessage, 'error');
    
    return {
      success: false,
      logs,
      summary: errorMessage
    };
  }
}

/**
 * 检查Supabase表是否存在
 * @param tableName 表名
 * @returns 是否存在
 */
export async function checkSupabaseTable(tableName: string): Promise<boolean> {
  try {
    const adapter = await DataFactory.getAdapterAsync<any>(tableName, StorageType.Supabase);
    await adapter.getAll();
    return true;
  } catch (error: any) {
    // 检查错误消息是否表示表不存在
    if (error.message && (
      error.message.includes('does not exist') || 
      error.message.includes('表不存在')
    )) {
      return false;
    }
    // 其他错误重新抛出
    throw error;
  }
}

/**
 * 检查Supabase数据库状态，并提供建议
 * @returns 数据库状态信息
 */
export async function checkSupabaseStatus(): Promise<MigrationResult> {
  const logs: MigrationLog[] = [];
  const tables = [
    "ChainConfig",
    "TokenConfig",
    "TradingPairConfig",
    "ExchangeConfig", 
    "ApiConfig",
    "AlertConfig"
  ];
  
  // 额外要检查的Supabase表
  const additionalTables = [
    "data_collection_configs",
    "data_processing_configs"
  ];
  
  try {
    addLog(logs, '开始检查Supabase数据库状态...', 'info');
    
    let allTablesExist = true;
    // 检查主要表
    for (const tableName of tables) {
      // 获取Supabase表名
      const supabaseTable = tableName.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '');
      
      try {
        const exists = await checkSupabaseTable(tableName);
        if (exists) {
          addLog(logs, `✓ 表 ${supabaseTable} 存在`, 'success');
        } else {
          addLog(logs, `❌ 表 ${supabaseTable} 不存在`, 'error');
          allTablesExist = false;
        }
      } catch (error) {
        const errorMessage = `检查表 ${supabaseTable} 是否存在时出错: ${formatError(error)}`;
        addLog(logs, errorMessage, 'error');
        allTablesExist = false;
      }
    }
    
    // 检查额外表
    for (const tableName of additionalTables) {
      try {
        const exists = await checkSupabaseTable(tableName);
        if (exists) {
          addLog(logs, `✓ 表 ${tableName} 存在`, 'success');
        } else {
          addLog(logs, `❌ 表 ${tableName} 不存在`, 'warning');
          
          // 如果表不存在，尝试创建
          if (tableName === 'data_collection_configs') {
            // 检查并创建数据采集能力表
            const createDataCollectionConfigsTableSql = `
              CREATE TABLE IF NOT EXISTS data_collection_configs (
                id SERIAL PRIMARY KEY,
                NO INTEGER,
                name TEXT NOT NULL,
                type TEXT NOT NULL,
                config JSONB,
                active BOOLEAN DEFAULT true,
                create_time BIGINT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
              );`;
            addLog(logs, '尝试创建data_collection_configs表', 'info');
            await executeSupabaseQuery(createDataCollectionConfigsTableSql, logs);
            
            // 重置序列到1
            await executeSupabaseQuery(
              'ALTER SEQUENCE data_collection_configs_id_seq RESTART WITH 1;', 
              logs
            );
            addLog(logs, '重置data_collection_configs表ID序列到1', 'info');
          }
          
          if (tableName === 'data_processing_configs') {
            // 检查并创建数据处理能力表
            const createDataProcessingConfigsTableSql = `
              CREATE TABLE IF NOT EXISTS data_processing_configs (
                id SERIAL PRIMARY KEY,
                name TEXT NOT NULL,
                source_node_id INTEGER NOT NULL,
                input_params JSONB NOT NULL,
                formulas JSONB NOT NULL,
                output_params JSONB NOT NULL,
                active BOOLEAN DEFAULT true,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
              );`;
            addLog(logs, '尝试创建data_processing_configs表', 'info');
            await executeSupabaseQuery(createDataProcessingConfigsTableSql, logs);
            
            // 重置序列到1
            await executeSupabaseQuery(
              'ALTER SEQUENCE data_processing_configs_id_seq RESTART WITH 1;', 
              logs
            );
            addLog(logs, '重置data_processing_configs表ID序列到1', 'info');
          }
        }
      } catch (error) {
        addLog(logs, `检查表 ${tableName} 出错: ${formatError(error)}`, 'warning');
      }
    }
    
    const summary = allTablesExist 
      ? 'Supabase数据库状态良好，所有表都存在。' 
      : '部分表不存在，已尝试创建缺失的表。';
    
    addLog(logs, summary, allTablesExist ? 'success' : 'warning');
    
    return {
      success: allTablesExist,
      logs,
      summary
    };
  } catch (error) {
    const errorMessage = `检查Supabase数据库状态失败: ${formatError(error)}`;
    console.error("检查Supabase数据库状态失败:", error);
    addLog(logs, errorMessage, 'error');
    
    return {
      success: false,
      logs,
      summary: errorMessage
    };
  }
}

/**
 * 测试Supabase连接
 * @returns 连接测试结果
 */
export async function testSupabaseConnection(): Promise<MigrationResult> {
  const logs: MigrationLog[] = [];
  
  try {
    addLog(logs, '开始测试Supabase连接...', 'info');
    
    try {
      // 尝试简单查询
      const adapter = await DataFactory.getAdapterAsync<any>('ChainConfig', StorageType.Supabase);
      
      // 尝试获取数据
      await adapter.getAll();
      
      addLog(logs, '✅ Supabase连接测试成功！可以正常连接到服务器', 'success');
      return {
        success: true,
        logs,
        summary: 'Supabase连接测试成功'
      };
    } catch (error) {
      const errorMessage = `❌ Supabase连接测试失败: ${formatError(error)}`;
      addLog(logs, errorMessage, 'error');
      
      // 提供恢复建议
      addLog(logs, '可能的原因:', 'warning');
      addLog(logs, '1. Supabase项目可能已被暂停或删除', 'warning');
      addLog(logs, '2. Supabase URL或API密钥可能不正确', 'warning');
      addLog(logs, '3. 网络连接问题', 'warning');
      addLog(logs, '4. DNS解析问题，无法解析Supabase域名', 'warning');
      
      addLog(logs, '建议的解决方案:', 'info');
      addLog(logs, '1. 检查Supabase项目是否仍然可用', 'info');
      addLog(logs, '2. 尝试更换Supabase URL格式或使用IP地址', 'info');
      addLog(logs, '3. 检查您的网络连接', 'info');
      
      return {
        success: false,
        logs,
        summary: '无法连接到Supabase'
      };
    }
  } catch (error) {
    const errorMessage = `测试Supabase连接时发生错误: ${formatError(error)}`;
    addLog(logs, errorMessage, 'error');
    
    return {
      success: false,
      logs,
      summary: errorMessage
    };
  }
}

/**
 * 获取可能有效的Supabase URL格式列表
 * @param baseUrl 基本URL（项目ID）
 * @returns URL列表
 */
export function getSupabaseUrlFormats(baseUrl: string): string[] {
  // 提取项目ID
  let projectId = baseUrl;
  if (baseUrl.includes('https://')) {
    projectId = baseUrl.replace('https://', '').split('.')[0];
  }
  
  return [
    `https://${projectId}.supabase.co`,
    `https://${projectId}.supabase.co/rest/v1`,
    `https://db.${projectId}.supabase.co`,
    // 可以添加其他格式
  ];
}

/**
 * 执行Supabase SQL查询
 * @param sql SQL查询语句
 * @param logs 日志数组
 */
async function executeSupabaseQuery(sql: string, logs: MigrationLog[]): Promise<void> {
  try {
    // 创建一个临时adapter访问Supabase
    const adapter = await DataFactory.getAdapterAsync<any>('ChainConfig', StorageType.Supabase);
    
    // 如果适配器是SupabaseAdapter类型且有executeQuery方法
    if (adapter instanceof SupabaseAdapter && typeof (adapter as any).executeQuery === 'function') {
      await (adapter as any).executeQuery(sql);
      addLog(logs, `SQL执行成功: ${sql.substring(0, 50)}...`, 'success');
    } else {
      addLog(logs, '无法执行SQL，适配器不支持executeQuery方法', 'warning');
    }
  } catch (error) {
    addLog(logs, `SQL执行失败: ${formatError(error)}`, 'error');
    console.error('SQL执行错误:', error);
  }
}

/**
 * 完全删除并重建表，重置序列
 * @param tableName 表名
 * @param logs 日志数组
 * @returns 是否成功
 */
export async function dropAndRecreateTable(tableName: string, logs: MigrationLog[]): Promise<boolean> {
  try {
    if (tableName === 'chain_config') {
      // 删除表
      const dropTableSql = `DROP TABLE IF EXISTS chain_config CASCADE;`;
      addLog(logs, '正在删除chain_config表...', 'warning');
      await executeSupabaseQuery(dropTableSql, logs);
      
      // 重建表
      const createTableSql = `
        CREATE TABLE IF NOT EXISTS chain_config (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          chain_id INTEGER NOT NULL,
          rpc_urls JSONB NOT NULL,
          active BOOLEAN DEFAULT true,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );`;
      addLog(logs, '正在重建chain_config表...', 'info');
      await executeSupabaseQuery(createTableSql, logs);
      
      addLog(logs, '✅ chain_config表已成功重建', 'success');
      return true;
    } 
    else if (tableName === 'token_config') {
      // 删除表
      const dropTableSql = `DROP TABLE IF EXISTS token_config CASCADE;`;
      addLog(logs, '正在删除token_config表...', 'warning');
      await executeSupabaseQuery(dropTableSql, logs);
      
      // 重建表
      const createTableSql = `
        CREATE TABLE IF NOT EXISTS token_config (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          symbol TEXT,
          decimals INTEGER,
          address_list JSONB,
          active BOOLEAN DEFAULT true,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );`;
      addLog(logs, '正在重建token_config表...', 'info');
      await executeSupabaseQuery(createTableSql, logs);
      
      addLog(logs, '✅ token_config表已成功重建', 'success');
      return true;
    }
    else if (tableName === 'trading_pair_config') {
      // 删除表
      const dropTableSql = `DROP TABLE IF EXISTS trading_pair_config CASCADE;`;
      addLog(logs, '正在删除trading_pair_config表...', 'warning');
      await executeSupabaseQuery(dropTableSql, logs);
      
      // 重建表
      const createTableSql = `
        CREATE TABLE IF NOT EXISTS trading_pair_config (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          pair_list JSONB,
          active BOOLEAN DEFAULT true,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );`;
      addLog(logs, '正在重建trading_pair_config表...', 'info');
      await executeSupabaseQuery(createTableSql, logs);
      
      addLog(logs, '✅ trading_pair_config表已成功重建', 'success');
      return true;
    }
    else if (tableName === 'exchange_config') {
      // 删除表
      const dropTableSql = `DROP TABLE IF EXISTS exchange_config CASCADE;`;
      addLog(logs, '正在删除exchange_config表...', 'warning');
      await executeSupabaseQuery(dropTableSql, logs);
      
      // 重建表
      const createTableSql = `
        CREATE TABLE IF NOT EXISTS exchange_config (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          base_url TEXT,
          logo TEXT,
          supported_chains JSONB,
          active BOOLEAN DEFAULT true,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );`;
      addLog(logs, '正在重建exchange_config表...', 'info');
      await executeSupabaseQuery(createTableSql, logs);
      
      addLog(logs, '✅ exchange_config表已成功重建', 'success');
      return true;
    }
    else if (tableName === 'api_config') {
      // 删除表
      const dropTableSql = `DROP TABLE IF EXISTS api_config CASCADE;`;
      addLog(logs, '正在删除api_config表...', 'warning');
      await executeSupabaseQuery(dropTableSql, logs);
      
      // 重建表
      const createTableSql = `
        CREATE TABLE IF NOT EXISTS api_config (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          method TEXT DEFAULT 'GET',
          url TEXT NOT NULL,
          headers JSONB,
          body TEXT,
          field_mappings JSONB,
          custom_variables JSONB,
          active BOOLEAN DEFAULT true,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );`;
      addLog(logs, '正在重建api_config表...', 'info');
      await executeSupabaseQuery(createTableSql, logs);
      
      addLog(logs, '✅ api_config表已成功重建', 'success');
      return true;
    }
    else if (tableName === 'alert_config') {
      // 删除表
      const dropTableSql = `DROP TABLE IF EXISTS alert_config CASCADE;`;
      addLog(logs, '正在删除alert_config表...', 'warning');
      await executeSupabaseQuery(dropTableSql, logs);
      
      // 重建表
      const createTableSql = `
        CREATE TABLE IF NOT EXISTS alert_config (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          type TEXT NOT NULL,
          conditions JSONB,
          recipients JSONB,
          api_keys JSONB,
          alert_config JSONB,
          active BOOLEAN DEFAULT true,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );`;
      addLog(logs, '正在重建alert_config表...', 'info');
      await executeSupabaseQuery(createTableSql, logs);
      
      addLog(logs, '✅ alert_config表已成功重建', 'success');
      return true;
    }
    else if (tableName === 'data_collection_configs') {
      // 删除表
      const dropTableSql = `DROP TABLE IF EXISTS data_collection_configs CASCADE;`;
      addLog(logs, '正在删除data_collection_configs表...', 'warning');
      await executeSupabaseQuery(dropTableSql, logs);
      
      // 重建表
      const createTableSql = `
        CREATE TABLE IF NOT EXISTS data_collection_configs (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          type TEXT NOT NULL,
          config JSONB,
          active BOOLEAN DEFAULT true,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );`;
      addLog(logs, '正在重建data_collection_configs表...', 'info');
      await executeSupabaseQuery(createTableSql, logs);
      
      addLog(logs, '✅ data_collection_configs表已成功重建', 'success');
      return true;
    } 
    else if (tableName === 'data_processing_configs') {
      // 删除表
      const dropTableSql = `DROP TABLE IF EXISTS data_processing_configs CASCADE;`;
      addLog(logs, '正在删除data_processing_configs表...', 'warning');
      await executeSupabaseQuery(dropTableSql, logs);
      
      // 重建表
      const createTableSql = `
        CREATE TABLE IF NOT EXISTS data_processing_configs (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          source_node_id INTEGER NOT NULL,
          input_params JSONB NOT NULL,
          formulas JSONB NOT NULL,
          output_params JSONB NOT NULL,
          active BOOLEAN DEFAULT true,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );`;
      addLog(logs, '正在重建data_processing_configs表...', 'info');
      await executeSupabaseQuery(createTableSql, logs);
      
      addLog(logs, '✅ data_processing_configs表已成功重建', 'success');
      return true;
    }
    
    addLog(logs, `不支持重建表: ${tableName}`, 'error');
    return false;
  } catch (error) {
    const errorMessage = `重建表 ${tableName} 失败: ${formatError(error)}`;
    console.error(errorMessage, error);
    addLog(logs, errorMessage, 'error');
    return false;
  }
}
