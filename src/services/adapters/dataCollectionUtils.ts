export interface DataCollectionParams {
  url: string;
  method: 'GET' | 'POST';
  headers?: Record<string, string>;
  body?: any;
  params?: Record<string, string>;
  outputMapping?: Record<string, string>;
  responseType?: 'json' | 'text';
  retryTimes?: number;
  retryInterval?: number;
}

export interface DataCollectionResult {
  success: boolean;
  data: any;
  mappedData?: Record<string, any>;
  error?: string;
  timestamp: number;
}

export class DataCollectionUtils {
  /**
   * 执行数据采集
   * @param config 数据采集配置
   * @returns 采集结果
   */
  static async collect(params: DataCollectionParams): Promise<DataCollectionResult> {
    try {
      // 构建请求URL
      const url = new URL(params.url);
      if (params.params) {
        Object.entries(params.params).forEach(([key, value]) => {
          url.searchParams.append(key, value);
        });
      }

      // 构建请求选项
      const requestOptions: RequestInit = {
        method: params.method,
        headers: {
          'Content-Type': 'application/json',
          ...params.headers,
        },
      };

      if (params.body && params.method !== 'GET') {
        requestOptions.body = JSON.stringify(params.body);
      }

      // 执行请求，支持重试机制
      let response: Response | null = null;
      let retryCount = 0;
      const maxRetries = params.retryTimes || 3;
      const retryInterval = params.retryInterval || 1000;

      while (retryCount < maxRetries) {
        try {
          response = await fetch(url.toString(), requestOptions);
          if (response.ok) break;
        } catch (error) {
          console.error(`Retry ${retryCount + 1}/${maxRetries} failed:`, error);
        }
        retryCount++;
        if (retryCount < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, retryInterval));
        }
      }

      if (!response || !response.ok) {
        throw new Error(`请求失败: ${response?.statusText || '未知错误'}`);
      }

      // 解析响应数据
      const responseData = params.responseType === 'text' 
        ? await response.text()
        : await response.json();

      // 映射输出数据
      const mappedData = params.outputMapping 
        ? this.mapOutputData(responseData, params.outputMapping)
        : undefined;

      return {
        success: true,
        data: responseData,
        mappedData,
        timestamp: Date.now(),
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : '未知错误',
        timestamp: Date.now(),
      };
    }
  }

  /**
   * 根据映射规则提取数据
   * @param data 原始数据
   * @param mapping 映射规则
   * @returns 映射后的数据
   */
  private static mapOutputData(data: any, mapping: Record<string, string>): Record<string, any> {
    const result: Record<string, any> = {};
    
    for (const [key, path] of Object.entries(mapping)) {
      try {
        result[key] = this.getValueByPath(data, path);
      } catch (error) {
        console.error(`提取字段 ${key} 失败:`, error);
        result[key] = null;
      }
    }
    
    return result;
  }

  /**
   * 根据路径获取对象中的值
   * @param obj 目标对象
   * @param path 路径（支持点号分隔，如 "data.price.value"）
   * @returns 提取的值
   */
  private static getValueByPath(obj: any, path: string): any {
    return path.split('.').reduce((acc, part) => {
      if (acc === null || acc === undefined) {
        throw new Error(`路径 ${path} 不存在`);
      }
      return acc[part];
    }, obj);
  }

  /**
   * 验证数据采集配置
   * @param config 数据采集配置
   * @returns 验证结果
   */
  static validateConfig(config: DataCollectionParams): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!config.url) {
      errors.push('URL不能为空');
    } else {
      try {
        new URL(config.url);
      } catch {
        errors.push('URL格式无效');
      }
    }

    if (!['GET', 'POST'].includes(config.method)) {
      errors.push('不支持的请求方法');
    }

    if (config.retryTimes !== undefined && (config.retryTimes < 0 || !Number.isInteger(config.retryTimes))) {
      errors.push('重试次数必须是非负整数');
    }

    if (config.retryInterval !== undefined && (config.retryInterval < 0 || !Number.isInteger(config.retryInterval))) {
      errors.push('重试间隔必须是非负整数');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
} 