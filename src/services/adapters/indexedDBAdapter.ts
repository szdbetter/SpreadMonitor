import { IDataAdapter } from './dataAdapter';

/**
 * IndexedDB 数据适配器实现
 */
export class IndexedDBAdapter<T extends {NO?: number}> implements IDataAdapter<T> {
  private readonly storeName: string;
  private readonly dbName: string = 'CryptoArbitrageDB';
  private readonly dbVersion: number = 1;

  /**
   * 构造函数
   * @param storeName 存储名称（表名）
   */
  constructor(storeName: string) {
    this.storeName = storeName;
  }

  /**
   * 获取IndexedDB实例
   * @returns DB实例
   */
  private async getDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);
      
      request.onerror = (event) => {
        console.error('打开IndexedDB失败:', event);
        reject(new Error('无法打开数据库'));
      };
      
      request.onsuccess = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        resolve(db);
      };
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // 如果表不存在则创建
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: 'NO', autoIncrement: true });
          console.log(`创建表: ${this.storeName}`);
        }
      };
    });
  }

  /**
   * 获取所有数据
   */
  async getAll(): Promise<T[]> {
    try {
      const db = await this.getDB();
      
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(this.storeName, 'readonly');
        const store = transaction.objectStore(this.storeName);
        const request = store.getAll();
        
        request.onsuccess = () => {
          resolve(request.result);
          db.close();
        };
        
        request.onerror = (event) => {
          console.error('获取数据失败:', event);
          reject(new Error('获取数据失败'));
          db.close();
        };
      });
    } catch (error) {
      console.error(`获取${this.storeName}所有数据失败:`, error);
      return [];
    }
  }

  /**
   * 获取指定ID的数据
   */
  async get(id: number): Promise<T | null> {
    try {
      const db = await this.getDB();
      
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(this.storeName, 'readonly');
        const store = transaction.objectStore(this.storeName);
        const request = store.get(id);
        
        request.onsuccess = () => {
          resolve(request.result || null);
          db.close();
        };
        
        request.onerror = (event) => {
          console.error('获取数据失败:', event);
          reject(new Error('获取数据失败'));
          db.close();
        };
      });
    } catch (error) {
      console.error(`获取${this.storeName}数据(ID=${id})失败:`, error);
      return null;
    }
  }

  /**
   * 等待IndexedDB请求完成
   * @param request IDBRequest对象
   * @returns 请求结果
   */
  private waitForRequest<T>(request: IDBRequest): Promise<T> {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        resolve(request.result as T);
      };
      
      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  /**
   * 创建新记录
   * @param item 要创建的数据
   * @returns 创建的记录
   */
  async create(item: T): Promise<T> {
    try {
      // 打印开始创建记录的日志
      console.log(`正在向IndexedDB存储 ${this.storeName} 创建记录:`, item);
      
      // 确保没有NO字段，让autoIncrement生效
      const itemCopy = { ...item } as any;
      if ('NO' in itemCopy) {
        delete itemCopy.NO;
      }
      
      // 添加创建时间（如果未提供）
      if (!itemCopy.create_time) {
        itemCopy.create_time = new Date().getTime();
      }
      
      // 打开数据库
      const db = await this.getDB();
      
      // 开始事务
      const transaction = db.transaction(this.storeName, 'readwrite');
      const objectStore = transaction.objectStore(this.storeName);
      
      // 添加记录
      console.log(`IndexedDB准备保存数据:`, itemCopy);
      const request = objectStore.add(itemCopy);
      
      // 等待添加完成
      return new Promise((resolve, reject) => {
        request.onsuccess = () => {
          // 获取生成的ID
          const newId = request.result as number;
          console.log(`IndexedDB创建记录成功，ID: ${newId}`);
          
          // 添加ID到返回的对象
          const result = { 
            ...itemCopy, 
            NO: newId,
            id: newId // 兼容Supabase适配器返回格式
          } as T;
          
          db.close();
          resolve(result);
        };
        
        request.onerror = () => {
          console.error('创建记录失败:', request.error);
          db.close();
          reject(new Error(`创建记录失败: ${request.error?.message || '未知错误'}`));
        };
      });
    } catch (error) {
      console.error(`创建${this.storeName}记录失败:`, error);
      throw new Error(`创建记录失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 更新数据
   */
  async update(data: T): Promise<T> {
    if (!data.NO) {
      throw new Error('更新数据时必须提供NO字段');
    }
    
    try {
      const db = await this.getDB();
      
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(this.storeName, 'readwrite');
        const store = transaction.objectStore(this.storeName);
        
        // 确保NO字段不为undefined
        if (data.NO === undefined) {
          reject(new Error('更新数据时NO字段不能为undefined'));
          db.close();
          return;
        }
        
        // 先检查数据是否存在
        const getRequest = store.get(data.NO);
        
        getRequest.onsuccess = () => {
          if (!getRequest.result) {
            reject(new Error(`未找到要更新的数据: NO=${data.NO}`));
            db.close();
            return;
          }
          
          // 更新数据
          const updateRequest = store.put(data);
          
          updateRequest.onsuccess = () => {
            resolve(data);
            db.close();
          };
          
          updateRequest.onerror = (event) => {
            console.error('更新数据失败:', event);
            reject(new Error('更新数据失败'));
            db.close();
          };
        };
        
        getRequest.onerror = (event) => {
          console.error('检查数据存在失败:', event);
          reject(new Error('检查数据存在失败'));
          db.close();
        };
      });
    } catch (error) {
      console.error(`更新${this.storeName}数据失败:`, error);
      throw error;
    }
  }

  /**
   * 删除数据
   */
  async delete(id: number): Promise<boolean> {
    try {
      const db = await this.getDB();
      
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(this.storeName, 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const request = store.delete(id);
        
        request.onsuccess = () => {
          resolve(true);
          db.close();
        };
        
        request.onerror = (event) => {
          console.error('删除数据失败:', event);
          reject(new Error('删除数据失败'));
          db.close();
        };
      });
    } catch (error) {
      console.error(`删除${this.storeName}数据(ID=${id})失败:`, error);
      return false;
    }
  }
} 