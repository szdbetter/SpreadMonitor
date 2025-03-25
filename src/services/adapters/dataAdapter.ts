/**
 * 数据适配器接口
 * 定义了所有数据存储实现必须提供的方法
 */
export interface IDataAdapter<T> {
  /**
   * 获取所有数据
   * @returns 数据列表
   */
  getAll(): Promise<T[]>;
  
  /**
   * 获取指定ID的数据
   * @param id 数据ID
   * @returns 数据对象
   */
  get(id: number): Promise<T | null>;
  
  /**
   * 创建新数据
   * @param data 数据对象
   * @returns 创建的数据对象（包含生成的ID）
   */
  create(data: T): Promise<T>;
  
  /**
   * 更新数据
   * @param data 数据对象（必须包含ID字段）
   * @returns 更新的数据对象
   */
  update(data: T): Promise<T>;
  
  /**
   * 删除数据
   * @param id 数据ID
   * @returns 是否删除成功
   */
  delete(id: number): Promise<boolean>;
  
  /**
   * 使用NO字段获取数据（兼容旧代码）
   * @param no 数据NO字段
   * @returns 数据对象
   */
  getByNo?(no: number): Promise<T | null>;
  
  /**
   * 批量创建数据
   * @param items 数据对象数组
   * @returns 创建的ID数组
   */
  bulkCreate?(items: T[]): Promise<T[]>;
  
  /**
   * 批量更新数据
   * @param updates 更新操作数组
   */
  bulkUpdate?(updates: Array<{id: number, data: T}>): Promise<void>;
} 