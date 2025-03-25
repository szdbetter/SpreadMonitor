import { StorageType } from './dataFactory';

/**
 * 存储类型变更监听器类型
 */
export type StorageTypeListener = (type: StorageType) => void;

/**
 * 存储类型变更监听器列表
 */
const listeners: StorageTypeListener[] = [];

/**
 * 存储localStorage中存储类型的键名
 */
const STORAGE_TYPE_KEY = 'current_storage_type';

/**
 * 获取当前存储类型
 * @param forceCheck 是否强制检查网络连接
 * @returns 当前存储类型
 */
export function getCurrentStorageType(forceCheck: boolean = false): StorageType {
  const savedType = localStorage.getItem(STORAGE_TYPE_KEY);
  
  // 如果强制检查网络或者当前是Supabase模式
  if (forceCheck || (savedType === StorageType.Supabase)) {
    // 检查网络状态 - 如果离线，自动切换到本地存储
    if (!navigator.onLine) {
      console.warn('检测到网络离线状态，自动切换到本地存储');
      localStorage.setItem(STORAGE_TYPE_KEY, StorageType.IndexedDB);
      return StorageType.IndexedDB;
    }
  }
  
  if (savedType && Object.values(StorageType).includes(savedType as StorageType)) {
    console.log(`读取到存储类型: ${savedType}`);
    return savedType as StorageType;
  }
  
  // 默认使用IndexedDB
  console.log('未找到存储类型配置，使用默认的IndexedDB');
  return StorageType.IndexedDB;
}

/**
 * 设置存储类型
 * @param type 存储类型
 */
export function setStorageType(type: StorageType): void {
  localStorage.setItem(STORAGE_TYPE_KEY, type);
  
  // 通知所有监听器
  notifyListeners(type);
}

/**
 * 尝试设置存储类型（包含自动检测网络连接）
 * @param type 存储类型
 * @returns 是否设置成功
 */
export async function trySetStorageType(type: StorageType): Promise<boolean> {
  // 如果设置为本地存储，总是可以成功
  if (type === StorageType.IndexedDB) {
    setStorageType(type);
    return true;
  }
  
  // 如果设置为云存储，需要检查网络连接
  try {
    console.log('测试Supabase连接...');
    
    // 确认网络在线状态
    if (!navigator.onLine) {
      console.error('浏览器报告网络处于离线状态');
      return false;
    }
    
    // 使用多个测试端点提高可靠性
    const testUrls = [
      'https://zuotevtiqjnhewkfmzny.supabase.co/rest/v1/',
      'https://zuotevtiqjnhewkfmzny.supabase.co/ping',
    ];
    
    // 记录连接测试日志
    const connectionLogs: string[] = [];
    connectionLogs.push(`开始测试Supabase连接: ${new Date().toLocaleString()}`);
    
    let connectionSuccess = false;
    
    // 尝试所有测试URL
    for (const url of testUrls) {
      try {
        connectionLogs.push(`尝试连接到 ${url}`);
        
        // 使用5秒超时
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(url, {
          method: 'HEAD',
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          },
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        connectionLogs.push(`连接结果: ${response.status} ${response.statusText}`);
        
        if (response.ok) {
          connectionSuccess = true;
          connectionLogs.push(`成功连接到 ${url}`);
          break;
        }
      } catch (urlError) {
        connectionLogs.push(`连接到 ${url} 失败: ${urlError instanceof Error ? urlError.message : String(urlError)}`);
      }
    }
    
    // 输出完整连接日志
    console.log(connectionLogs.join('\n'));
    
    if (connectionSuccess) {
      console.log('Supabase连接测试成功，设置云存储');
      setStorageType(type);
      return true;
    } else {
      console.error('无法连接到Supabase，保持本地存储');
      return false;
    }
  } catch (error) {
    console.error('尝试连接Supabase时出错:', error);
    return false;
  }
}

/**
 * 添加存储类型变更监听器
 * @param listener 监听器函数
 * @returns 取消监听的函数
 */
export function addStorageTypeListener(listener: StorageTypeListener): () => void {
  listeners.push(listener);
  
  // 返回取消监听的函数
  return () => {
    const index = listeners.indexOf(listener);
    if (index !== -1) {
      listeners.splice(index, 1);
    }
  };
}

/**
 * 通知所有监听器存储类型已变更
 * @param type 新的存储类型
 */
function notifyListeners(type: StorageType): void {
  listeners.forEach(listener => {
    try {
      listener(type);
    } catch (error) {
      console.error('通知存储类型变更失败:', error);
    }
  });
}

/**
 * 设置离线检测
 * 当检测到网络状态变化时，如果是离线状态且当前使用Supabase，则自动切换到IndexedDB
 */
export function setupOfflineDetection(): void {
  // 检测在线状态的函数
  const checkOnlineStatus = () => {
    if (!navigator.onLine && getCurrentStorageType() === StorageType.Supabase) {
      console.log('检测到网络离线，自动切换到本地存储');
      setStorageType(StorageType.IndexedDB);
    }
  };
  
  // 添加网络状态监听器
  window.addEventListener('online', () => {
    console.log('网络已连接');
  });
  
  window.addEventListener('offline', () => {
    console.log('网络已断开');
    checkOnlineStatus();
  });
  
  // 初始检查
  checkOnlineStatus();
} 