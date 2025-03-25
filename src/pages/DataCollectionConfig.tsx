import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { Database, DataCollectionConfigModel } from '../utils/database';
import { apiConfigAccess, ApiConfigModel, chainConfigAccess, ChainConfigModel } from '../services/database';
import { sendRequest, isTamperMonkeyEnvironment } from '../utils/tampermonkey';
import { ethers } from 'ethers'; // 导入ethers.js库
import { DataFactory, StorageType } from '../services/adapters/dataFactory';
import { getCurrentStorageType, addStorageTypeListener, setStorageType } from '../services/adapters/storageManager';
import { IDataAdapter } from '../services/adapters/dataAdapter';
import { SupabaseAdapter } from '../services/adapters/supabaseAdapter';
import { testConnection, diagnoseNetworkIssues } from '../services/adapters/networkUtils';
import { testSupabaseConnection } from '../services/adapters/migration';

// 添加类型扩展
declare global {
  interface Window {
    switchToLocalStorage?: () => void;
  }
}

// 样式组件
const PageContainer = styled.div`
  margin-bottom: 30px;
`;



const PageHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
`;

const PageTitle = styled.h1`
  margin: 0;
  color: white;
  font-size: 24px;
`;

const ActionButton = styled.button`
  background-color: #F0B90B;
  color: #000000;
  border: none;
  border-radius: 4px;
  padding: 8px 16px;
  font-weight: bold;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 5px;
  
  &:hover {
    background-color: #d6a50a;
  }
`;

const ContentLayout = styled.div`
  display: grid;
  grid-template-columns: 240px 1fr;
  gap: 20px;
  height: calc(100vh - 200px);
`;

const NodeList = styled.div`
  background-color: #2A2A2A;
  border-radius: 5px;
  overflow: hidden;
  height: 100%;
  display: flex;
  flex-direction: column;
`;

// 添加导航组样式
const NavGroup = styled.div`
  border-bottom: 1px solid #3A3A3A;
`;

const NavGroupHeader = styled.div<{ isOpen?: boolean }>`
  padding: 15px;
  font-size: 18px;  // 增大一级标题字体
  font-weight: bold;
  color: #F0B90B;   // 使用金色突出显示
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  background-color: #2F2F2F;
  transition: background-color 0.2s;
  
  &:hover {
    background-color: #3A3A3A;
  }
  
  &::after {
    content: '';
    width: 0;
    height: 0;
    border-left: 6px solid transparent;
    border-right: 6px solid transparent;
    border-top: 6px solid #F0B90B;
    transform: ${props => props.isOpen ? 'rotate(0deg)' : 'rotate(-90deg)'};
    transition: transform 0.3s;
  }
`;

const NavGroupContent = styled.div<{ isOpen?: boolean }>`
  max-height: ${props => props.isOpen ? '500px' : '0'};
  overflow: hidden;
  transition: all 0.3s ease-in-out;
  background-color: #252525;  // 稍微暗一点的背景色
`;

const NavLink = styled.div<{ active?: boolean; isSecondLevel?: boolean }>`
  padding: ${props => props.isSecondLevel ? '10px 15px 10px 40px' : '12px 15px'};
  cursor: pointer;
  background-color: ${props => props.active ? '#3A3A3A' : 'transparent'};
  color: ${props => {
    if (props.active) return '#F0B90B';
    return props.isSecondLevel ? '#CCCCCC' : '#FFFFFF';
  }};
  font-size: ${props => props.isSecondLevel ? '14px' : '16px'};
  font-weight: ${props => props.isSecondLevel ? 'normal' : 'bold'};
  border-left: ${props => props.active ? '3px solid #F0B90B' : '3px solid transparent'};
  transition: all 0.2s;
  
  &:hover {
    background-color: #3A3A3A;
    border-left-color: ${props => props.active ? '#F0B90B' : '#666666'};
  }
`;

const NodeListHeader = styled.div`
  padding: 15px;
  border-bottom: 1px solid #3A3A3A;
  font-size: 16px;
  font-weight: bold;
  color: white;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const NodeItem = styled.div<{ selected: boolean }>`
  padding: 12px 15px;
  border-bottom: 1px solid #3A3A3A;
  cursor: pointer;
  background-color: ${props => props.selected ? '#3A3A3A' : 'transparent'};
  
  &:hover {
    background-color: ${props => props.selected ? '#3A3A3A' : '#2F2F2F'};
  }
`;

const NodeName = styled.div<{ selected?: boolean }>`
  font-weight: ${props => props.selected ? 'bold' : 'normal'};
`;

const ApiName = styled.div`
  font-size: 12px;
  color: #AAAAAA;
  margin-top: 4px;
`;

const StatusIndicator = styled.div<{ active?: boolean }>`
  display: inline-flex;
  align-items: center;
  padding: 3px 8px;
  border-radius: 3px;
  font-size: 12px;
  min-width: 60px;
  text-align: center;
  white-space: nowrap;
  background-color: ${props => props.active ? 'rgba(0, 255, 0, 0.2)' : 'rgba(255, 0, 0, 0.2)'};
  color: ${props => props.active ? '#00FF00' : '#FF0000'};
  
  &::before {
    content: '';
    display: inline-block;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background-color: ${props => props.active ? '#00AA00' : '#AA0000'};
    margin-right: 6px;
  }
`;

const ConfigPanel = styled.div`
  background-color: #2A2A2A;
  border-radius: 5px;
  padding: 20px;
  height: 100%;
  overflow: auto;
`;

const FormSection = styled.div`
  margin-bottom: 20px;
`;

const SectionTitle = styled.h2`
  color: #F0B90B;
  font-size: 18px;
  margin-top: 0;
  margin-bottom: 15px;
  border-bottom: 1px solid #444444;
  padding-bottom: 8px;
`;

const FormRow = styled.div`
  display: flex;
  margin-bottom: 15px;
  gap: 15px;
`;

const FormGroup = styled.div<{ flex?: number; minWidth?: string }>`
  flex: ${props => props.flex || 1};
  min-width: ${props => props.minWidth || 'auto'};
`;

const Label = styled.label`
  display: block;
  margin-bottom: 8px;
  color: #FFFFFF;
  font-size: 14px;
`;

const Input = styled.input`
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #444444;
  border-radius: 4px;
  background-color: #2A2A2A;
  color: #FFFFFF;
  font-size: 14px;
  
  &:focus {
    outline: none;
    border-color: #F0B90B;
  }
`;

const Select = styled.select`
  width: 70%;
  padding: 8px 12px;
  background-color: #333333;
  border: 1px solid #444444;
  border-radius: 4px;
  color: #FFFFFF;
  font-size: 14px;
  
  &:focus {
    border-color: #F0B90B;
    outline: none;
  }
`;

const Checkbox = styled.input`
  margin-right: 8px;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 10px;
  margin-top: 20px;
`;

const Button = styled.button`
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  font-weight: bold;
  cursor: pointer;
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const PrimaryButton = styled(Button)`
  background-color: #F0B90B;
  color: #000000;
  
  &:hover:not(:disabled) {
    background-color: #d6a50a;
  }
`;

const SecondaryButton = styled(Button)`
  background-color: #444444;
  color: #FFFFFF;
  
  &:hover:not(:disabled) {
    background-color: #555555;
  }
`;

const DangerButton = styled(Button)`
  background-color: #AA0000;
  color: #FFFFFF;
  
  &:hover:not(:disabled) {
    background-color: #CC0000;
  }
`;

const FieldMappingTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  margin-top: 10px;
`;

const TableHeader = styled.th`
  text-align: left;
  padding: 8px;
  border-bottom: 1px solid #444444;
  color: #AAAAAA;
`;

const TableCell = styled.td`
  padding: 8px;
  border-bottom: 1px solid #444444;
`;

const TestResultPanel = styled.div`
  margin-top: 20px;
  background-color: #333333;
  border-radius: 5px;
  padding: 15px;
`;

const TestResultTitle = styled.h3`
  color: #F0B90B;
  margin-top: 0;
  margin-bottom: 10px;
`;

const TestResultContent = styled.pre`
  color: #FFFFFF;
  font-family: monospace;
  white-space: pre-wrap;
  max-height: 300px;
  overflow: auto;
  background-color: #222222;
  padding: 10px;
  border-radius: 4px;
`;

// 新增 API 响应结果面板
const ApiResponsePanel = styled.div`
  margin-top: 20px;
  background-color: #333333;
  border-radius: 5px;
  padding: 15px;
`;

const ApiResponseTitle = styled.h3`
  color: #F0B90B;
  margin-top: 0;
  margin-bottom: 10px;
`;

const ApiResponseContent = styled.pre`
  color: #FFFFFF;
  font-family: monospace;
  white-space: pre-wrap;
  max-height: 300px;
  overflow: auto;
  background-color: #222222;
  padding: 10px;
  border-radius: 4px;
`;

// 添加一个新的样式组件用于日志显示
const LogEntry = styled.div<{ type: 'error' | 'warning' | 'info' }>`
  padding: 5px;
  margin-bottom: 5px;
  border-bottom: 1px solid #444444;
  font-family: monospace;
  white-space: pre-wrap;
  color: ${props => props.type === 'error' ? '#FF6666' : 
                    props.type === 'warning' ? '#FFAA00' : 
                    '#FFFFFF'};
  background-color: ${props => props.type === 'error' ? 'rgba(255, 0, 0, 0.1)' : 
                              props.type === 'warning' ? 'rgba(255, 170, 0, 0.1)' : 
                              'transparent'};
`;

// 添加消息提示组件
const MessageBox = styled.div<{ type: 'success' | 'error' | 'info' }>`
  margin-top: 15px;
  padding: 10px 15px;
  border-radius: 4px;
  background-color: ${props => 
    props.type === 'success' ? 'rgba(0, 255, 0, 0.1)' : 
    props.type === 'error' ? 'rgba(255, 0, 0, 0.1)' : 
    'rgba(0, 0, 255, 0.1)'
  };
  color: ${props => 
    props.type === 'success' ? '#00FF00' : 
    props.type === 'error' ? '#FF6666' : 
    '#66CCFF'
  };
  border-left: 4px solid ${props => 
    props.type === 'success' ? '#00AA00' : 
    props.type === 'error' ? '#AA0000' : 
    '#0088CC'
  };
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  color: inherit;
  cursor: pointer;
  font-size: 16px;
  padding: 0;
  margin-left: 10px;
`;

// 添加可折叠面板组件
const CollapsiblePanel = styled.div`
  margin-bottom: 20px;
  border: 1px solid #444444;
  border-radius: 5px;
  overflow: hidden;
`;

const PanelHeader = styled.div<{ isOpen: boolean }>`
  background-color: ${props => props.isOpen ? '#3A3A3A' : '#333333'};
  padding: 12px 15px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  
  &:hover {
    background-color: #3A3A3A;
  }
`;

const PanelTitle = styled.h3<{ isOpen: boolean }>`
  margin: 0;
  color: #F0B90B;
  font-size: 16px;
  display: flex;
  align-items: center;
  
  &::before {
    content: '';
    display: inline-block;
    width: 0;
    height: 0;
    border-left: 5px solid transparent;
    border-right: 5px solid transparent;
    border-top: 5px solid #F0B90B;
    margin-right: 8px;
    transform: rotate(${props => props.isOpen ? '0deg' : '-90deg'});
    transition: transform 0.2s;
  }
`;

const PanelContent = styled.div<{ isOpen: boolean }>`
  padding: ${props => props.isOpen ? '15px' : '0'};
  max-height: ${props => props.isOpen ? '1000px' : '0'};
  overflow: hidden;
  transition: max-height 0.3s, padding 0.3s;
`;

// 添加变量输入组件
const VariableInputTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  margin-top: 10px;
`;

// 数据采集节点模型
interface DataCollectionNodeModel {
  id?: number;
  name: string;
  active: boolean;
  apiId: number;
  apiName?: string;
  apiType?: 'HTTP' | 'CHAIN';
  fieldMappings: FieldMapping[];
  params?: Array<{name: string; value: string}>;
}

// 字段映射模型
interface FieldMapping {
  id?: number;
  sourceField: string;  // JSON路径
  targetField: string;  // 自定义字段名
  description: string;  // 显示名称
}

// 测试结果模型
interface TestResult {
  success: boolean;
  message: string;
  logs: string[];
  data?: any;
}

// 新增 API 响应数据模型
interface ApiResponse {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
  logs?: string[];
  extractedFields?: Record<string, any>;
}

// 修改为使用自定义属性存储
interface CustomConfig {
  apiId: number;
  fieldMappings: FieldMapping[];
}

// 添加加载动画组件
const LoadingOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
`;

const LoadingSpinner = styled.div`
  border: 4px solid #f3f3f3;
  border-top: 4px solid #F0B90B;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const LoadingText = styled.div`
  color: #FFFFFF;
  margin-top: 10px;
  font-size: 14px;
`;

// 添加一个专门处理COW.fi API的函数
const processCowApiPayload = (payload: string, variables: Record<string, string>, logs: string[] = []): string => {
  try {
    // 解析JSON
    const jsonObj = JSON.parse(payload);
    
    // 记录原始变量
    logs.push(`[${new Date().toISOString()}] 可用变量: ${JSON.stringify(variables)}`);
    
    // 处理所有字段中的变量
    const processValue = (value: string): string => {
      if (!value) return value;
      let result = value;
      // 查找所有变量占位符 (variableName)
      const matches = result.match(/\(([^()]+)\)/g);
        if (matches) {
        matches.forEach(match => {
            const varName = match.substring(1, match.length - 1);
            if (variables[varName]) {
            result = result.replace(match, variables[varName]);
            logs.push(`[${new Date().toISOString()}] 替换变量: ${match} -> ${variables[varName]}`);
          } else {
            logs.push(`[${new Date().toISOString()}] 警告: 未找到变量 ${varName} 的值`);
          }
        });
      }
      return result;
    };
    
    // 遍历所有字段并处理变量
    Object.keys(jsonObj).forEach(key => {
      if (typeof jsonObj[key] === 'string') {
        const originalValue = jsonObj[key];
        jsonObj[key] = processValue(originalValue);
        if (originalValue !== jsonObj[key]) {
          logs.push(`[${new Date().toISOString()}] 处理字段 ${key}: ${originalValue} -> ${jsonObj[key]}`);
        }
      }
    });
    
    // 确保必要字段存在且有值
    const requiredFields = ['sellToken', 'buyToken', 'sellAmountBeforeFee'];
    const missingFields = requiredFields.filter(field => !jsonObj[field]);
    
    if (missingFields.length > 0) {
      logs.push(`[${new Date().toISOString()}] 错误: 缺少必要字段: ${missingFields.join(', ')}`);
      throw new Error(`缺少必要字段: ${missingFields.join(', ')}`);
    }
    
    // 验证地址格式
    ['sellToken', 'buyToken', 'from', 'receiver'].forEach(field => {
      if (jsonObj[field] && typeof jsonObj[field] === 'string') {
        const value = jsonObj[field].trim();
        if (!value.startsWith('0x') || value.length !== 42) {
          logs.push(`[${new Date().toISOString()}] 错误: ${field} 地址格式无效: ${value}`);
          throw new Error(`${field} 地址格式无效: ${value}`);
        }
      }
    });
    
    // 验证金额格式
    if (jsonObj.sellAmountBeforeFee) {
      const amount = jsonObj.sellAmountBeforeFee;
      if (isNaN(Number(amount))) {
        logs.push(`[${new Date().toISOString()}] 错误: sellAmountBeforeFee 不是有效的数字: ${amount}`);
        throw new Error(`sellAmountBeforeFee 不是有效的数字: ${amount}`);
      }
    }
    
    // 添加其他必要字段的默认值
    if (!jsonObj.from && jsonObj.receiver) {
      jsonObj.from = jsonObj.receiver;
    }
    if (!jsonObj.receiver && jsonObj.from) {
      jsonObj.receiver = jsonObj.from;
    }
    if (!jsonObj.validFor) {
      jsonObj.validFor = 1800; // 30分钟
    }
    if (!jsonObj.kind) {
      jsonObj.kind = 'sell';
    }
    if (jsonObj.partiallyFillable === undefined) {
      jsonObj.partiallyFillable = false;
    }
    if (!jsonObj.priceQuality) {
      jsonObj.priceQuality = 'optimal';
    }
    
    const finalPayload = JSON.stringify(jsonObj);
    logs.push(`[${new Date().toISOString()}] 最终请求体: ${finalPayload}`);
    return finalPayload;
  } catch (error) {
    logs.push(`[${new Date().toISOString()}] 处理COW.fi API payload失败: ${error instanceof Error ? error.message : String(error)}`);
    throw error; // 抛出错误以便上层处理
  }
};

// 数据采集配置组件主体
const DataCollectionConfig: React.FC = () => {
  // 状态
  const [nodes, setNodes] = useState<DataCollectionNodeModel[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<number | null>(null);
  const [currentNode, setCurrentNode] = useState<DataCollectionNodeModel>({
    id: 0, // 修改为数字类型
    name: '',
    active: true,
    apiId: 0, // 修改为数字类型
    fieldMappings: []
  });
  const [apis, setApis] = useState<ApiConfigModel[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isLoadingApi, setIsLoadingApi] = useState(false);
  const [apiResponse, setApiResponse] = useState<ApiResponse | null>(null);
  const [db, setDb] = useState<Database | null>(null);
  const [message, setMessage] = useState<{text: string, type: 'success' | 'error' | 'info'} | null>(null);
  const [dataAdapter, setDataAdapter] = useState<IDataAdapter<DataCollectionConfigModel> | null>(null);
  const [storageType, setStorageType] = useState<StorageType>(getCurrentStorageType());
  
  // 添加变量相关状态
  const [inputVariables, setInputVariables] = useState<Record<string, string>>({});
  const [isInputPanelOpen, setIsInputPanelOpen] = useState(true);
  const [isOutputPanelOpen, setIsOutputPanelOpen] = useState(true);
  const [detectedVariables, setDetectedVariables] = useState<string[]>([]);
  
  // 添加新的状态变量
  const [logs, setLogs] = useState<string[]>([]);
  const [apiResponseError, setApiResponseError] = useState<string | null>(null);
  
  // 添加缺失的状态声明
  const [extractedData, setExtractedData] = useState<Record<string, any> | null>(null);
  
  // 在 DataCollectionConfig 组件内添加状态
  const [isBasicConfigOpen, setIsBasicConfigOpen] = useState(true);
  
  // 存储类型变更监听
  useEffect(() => {
    // 添加存储类型变更监听
    const removeListener = addStorageTypeListener((newType) => {
      console.log("存储类型已变更为:", newType);
      setStorageType(newType);
    });
    
    return () => removeListener();
  }, []);
  
  // 初始化数据适配器和加载数据
  useEffect(() => {
    console.log("初始化数据适配器，当前存储类型:", storageType);
    
    const initAdapter = async () => {
      try {
        const adapter = await DataFactory.getAdapterAsync<DataCollectionConfigModel>('data_collection_configs', storageType);
        setDataAdapter(adapter);
        
        // 兼容性处理：老代码仍然需要db对象
        if (!db) {
    const request = indexedDB.open('MultiChainArbitrage', 1);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      // 创建数据采集配置存储
      if (!db.objectStoreNames.contains('data_collection_configs')) {
        db.createObjectStore('data_collection_configs', { keyPath: 'NO', autoIncrement: true });
      }
    };
    
    request.onsuccess = (event) => {
      const database = new Database((event.target as IDBOpenDBRequest).result);
      setDb(database);
    };
    
    request.onerror = (event) => {
      console.error('数据库打开失败:', (event.target as IDBOpenDBRequest).error);
      setMessage({
        text: '数据库初始化失败，请检查浏览器设置或刷新页面重试',
        type: 'error'
      });
    };
        }
        
        // 使用新创建的adapter加载数据
        await loadDataWithAdapter(adapter);
      } catch (error) {
        console.error('初始化数据适配器失败:', error);
        setMessage({
          text: `初始化失败: ${error instanceof Error ? error.message : String(error)}`,
          type: 'error'
        });
      }
    };
    
    initAdapter();
  }, [storageType]);

  // 新增一个使用指定adapter的加载数据函数
  const loadDataWithAdapter = async (adapter: IDataAdapter<DataCollectionConfigModel>) => {
    console.log("开始加载数据，当前存储类型:", storageType);
    
    setIsLoading(true);
    
    try {
      // 使用DataFactory创建API适配器，确保与当前存储类型一致
      const apiAdapter = await DataFactory.getAdapterAsync<ApiConfigModel>('ApiConfig', storageType);
      console.log("已创建API适配器");
      
      // 获取API配置
      const apiConfigs = await apiAdapter.getAll();
      console.log(`成功加载${apiConfigs.length}个API配置`);
      setApis(apiConfigs);
      
      // 加载数据采集节点
      const dataCollectionNodes = await adapter.getAll();
      console.log(`成功加载${dataCollectionNodes.length}个数据采集节点`);
      
      // 转换为内部模型
      const convertedNodes: DataCollectionNodeModel[] = dataCollectionNodes.map(node => {
        // 尝试从 apiParams 中解析自定义配置
        let apiId = 0;
        let fieldMappings: FieldMapping[] = [];
        
        try {
          if (node.config) {
            // 处理config可能是字符串的情况
            const config = typeof node.config === 'string' ? JSON.parse(node.config) : node.config;
            if (config.apiParams && config.apiParams.customConfig) {
              const customConfig = JSON.parse(config.apiParams.customConfig) as CustomConfig;
            apiId = customConfig.apiId || 0;
            fieldMappings = customConfig.fieldMappings || [];
              console.log('成功解析自定义配置:', { apiId, fieldMappings });
            }
          }
        } catch (error) {
          console.error('解析自定义配置失败:', error, '原始config:', node.config);
        }
        
        // 查找对应的API配置
        const apiConfig = apiConfigs.find(api => api.NO === apiId);
        console.log('找到API配置:', apiConfig);
        
        return {
          id: node.NO,
          name: node.name,
          active: node.active,
          apiId: apiId,
          apiName: apiConfig?.name,
          apiType: apiConfig?.apiType,
          fieldMappings: fieldMappings
        };
      });
      
      setNodes(convertedNodes);
      
      // 如果有节点数据且没有选中的节点，默认选择第一个
      if (convertedNodes.length > 0 && !selectedNodeId) {
        setSelectedNodeId(convertedNodes[0].id || null);
        setCurrentNode(convertedNodes[0]);
      }
    } catch (err) {
      console.error('加载数据失败:', err);
      setMessage({
        text: `加载数据失败: ${err instanceof Error ? err.message : String(err)}`,
        type: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 修改原来的loadData函数，使用当前的dataAdapter
  const loadData = async () => {
    if (!dataAdapter) {
      console.error("数据适配器未初始化，无法加载数据");
      return;
    }
    await loadDataWithAdapter(dataAdapter);
  };
  
  // 选择节点
  const handleSelectNode = (node: DataCollectionNodeModel) => {
    setSelectedNodeId(node.id || null);
    setCurrentNode(node);
    setTestResult(null);
    setApiResponse(null);
    
    // 如果节点有关联的API，自动加载API相关的变量
    if (node.apiId) {
      const selectedApi = apis.find(api => api.NO === node.apiId);
      if (selectedApi) {
        // 使用已有的 detectVariables 函数检测和设置变量
        detectVariables(selectedApi);
      }
    } else {
      // 如果没有选择API，清空变量
      setDetectedVariables([]);
      setInputVariables({});
    }
  };
  
  // 创建新节点
  const handleCreateNode = () => {
    const newNode: DataCollectionNodeModel = {
      name: '新数据采集节点',
      active: true,
      apiId: 0, // 初始化为0，表示未选择API
      apiType: 'HTTP', // 默认为HTTP类型
      fieldMappings: []
    };
    setSelectedNodeId(null);
    setCurrentNode(newNode);
    setTestResult(null);
    setApiResponse(null);
  };
  
  // 更新节点名称
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentNode({
      ...currentNode,
      name: e.target.value
    });
  };
  
  // 更新节点状态
  const handleStatusChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentNode({
      ...currentNode,
      active: e.target.checked
    });
  };
  
  // 更新 API ID 并自动加载字段映射和检测变量
  const handleApiChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const apiId = parseInt(e.target.value);
    const selectedApi = apis.find(api => api.NO === apiId);
    
    setCurrentNode({
      ...currentNode,
      apiId,
      apiName: selectedApi?.name,
      apiType: selectedApi?.apiType || 'HTTP',
      fieldMappings: [] // 清空字段映射，等待从API配置中加载
    });
    
    // 自动加载字段映射
    if (apiId) {
      loadFieldMappingsFromApiConfig(apiId);
    }
    
    // 检测API中的变量
    if (selectedApi) {
      detectVariables(selectedApi);
    } else {
      setDetectedVariables([]);
      setInputVariables({});
    }
    
    // 清空API响应
    setApiResponse(null);
  };
  
  // 检测API中的变量
  const detectVariables = (api: ApiConfigModel) => {
    const variables: string[] = [];
    const newInputVariables: Record<string, string> = {};
    
    // 检查URL中的变量
    if (api.baseUrl) {
      const urlVariables = extractVariables(api.baseUrl);
      variables.push(...urlVariables);
    }
    
    // 检查Payload中的变量
    if (api.method === 'POST' && api.payload) {
      const payloadVariables = extractVariables(api.payload);
      variables.push(...payloadVariables);
    }
    
    // 检查方法参数中的变量
    if (api.apiType === 'CHAIN' && api.methodParams) {
      api.methodParams.forEach(param => {
        if (param.value) {
          const paramVariables = extractVariables(param.value);
          variables.push(...paramVariables);
        }
      });
    }
    
    // 使用filter方法去重
    const uniqueVariables = variables.filter((value, index, self) => {
      return self.indexOf(value) === index;
    });
    
    // 初始化变量值
    uniqueVariables.forEach(variable => {
      // 如果API中已有自定义变量值，则使用它
      if (api.customVariables && api.customVariables[variable]) {
        newInputVariables[variable] = api.customVariables[variable];
      } else {
        newInputVariables[variable] = '';
      }
    });
    
    setDetectedVariables(uniqueVariables);
    setInputVariables(newInputVariables);
    
    // 如果有变量，自动打开输入面板
    if (uniqueVariables.length > 0) {
      setIsInputPanelOpen(true);
    }
  };
  
  // 从字符串中提取变量
  const extractVariables = (text: string): string[] => {
    const regex = /\(([^()]+)\)/g;
    const matches = [];
    let match;
    
    while ((match = regex.exec(text)) !== null) {
      matches.push(match[1]);
    }
    
    return matches;
  };
  
  // 处理变量输入变化
  const handleVariableChange = (variable: string, value: string) => {
    setInputVariables({
      ...inputVariables,
      [variable]: value
    });
  };
  
  // 替换文本中的变量，增强对 JSON 的支持，特别处理地址类型
  const replaceVariables = (text: string, variables: Record<string, string>, logs: string[] = []): string => {
    // 检查是否是 JSON 格式
    let isJson = false;
    let jsonObj: any = null;
    
    try {
      jsonObj = JSON.parse(text);
      isJson = true;
    } catch (e) {
      // 不是 JSON 格式，使用普通文本替换
      isJson = false;
    }
    
    if (isJson && typeof jsonObj === 'object') {
      // 如果是 JSON 对象，递归替换所有字符串值中的变量
      const replaceInObject = (obj: any): any => {
        if (obj === null || obj === undefined) {
          return obj;
        }
        
        if (Array.isArray(obj)) {
          return obj.map(item => replaceInObject(item));
        }
        
        if (typeof obj === 'object') {
          const result: Record<string, any> = {};
          for (const key in obj) {
            result[key] = replaceInObject(obj[key]);
          }
          return result;
        }
        
        if (typeof obj === 'string') {
          // 检查字符串是否包含变量占位符
          let containsVariable = false;
          let result = obj;
          
          Object.entries(variables).forEach(([key, value]) => {
            const placeholder = `(${key})`;
            if (result.includes(placeholder)) {
              containsVariable = true;
              logs.push(`[${new Date().toISOString()}] 替换变量: ${placeholder} -> ${value}`);
              
              // 检查是否是以太坊地址格式（0x开头的十六进制字符串）
              if (value.startsWith('0x') && /^0x[0-9a-fA-F]+$/.test(value)) {
                // 确保地址格式正确（应该是42个字符，包括0x前缀）
                if (value.length !== 42) {
                  logs.push(`[${new Date().toISOString()}] 警告: 地址 ${value} 长度不正确，应为42个字符（包括0x前缀）`);
                  // 修复地址长度问题：如果长度大于42，截取前42个字符；如果小于42，使用零地址
                  if (value.length > 42) {
                    // 确保截取后的地址是有效的以太坊地址（20字节）
                    value = value.substring(0, 2) + value.substring(2).substring(0, 40);
                    logs.push(`[${new Date().toISOString()}] 自动修复: 截取地址为 ${value}`);
                  } else {
                    value = ethers.constants.AddressZero;
                    logs.push(`[${new Date().toISOString()}] 自动修复: 使用零地址 ${value}`);
                  }
                }
                
                // 如果整个字符串就是变量占位符，直接返回值，避免引号问题
                if (result === placeholder) {
                  logs.push(`[${new Date().toISOString()}] 直接替换整个字符串: ${result} -> ${value}`);
                  result = value;
                  return;
                }
              }
              
              // 替换变量
              result = result.replace(new RegExp(placeholder, 'g'), value);
            }
          });
          
          return result;
        }
        
        return obj;
      };
      
      // 替换 JSON 对象中的所有变量
      const processedObj = replaceInObject(jsonObj);
      
      // 特殊处理某些字段，确保它们是正确的格式
      if (processedObj.sellToken && typeof processedObj.sellToken === 'string') {
        // 如果sellToken是一个地址，确保它没有额外的引号
        if (processedObj.sellToken.startsWith('"') && processedObj.sellToken.endsWith('"') && processedObj.sellToken.length > 2) {
          processedObj.sellToken = processedObj.sellToken.substring(1, processedObj.sellToken.length - 1);
          logs.push(`[${new Date().toISOString()}] 移除sellToken中的引号: ${processedObj.sellToken}`);
        }
      }
      
      if (processedObj.buyToken && typeof processedObj.buyToken === 'string') {
        // 如果buyToken是一个地址，确保它没有额外的引号
        if (processedObj.buyToken.startsWith('"') && processedObj.buyToken.endsWith('"') && processedObj.buyToken.length > 2) {
          processedObj.buyToken = processedObj.buyToken.substring(1, processedObj.buyToken.length - 1);
          logs.push(`[${new Date().toISOString()}] 移除buyToken中的引号: ${processedObj.buyToken}`);
        }
      }
      
      // 检查from和receiver字段
      ['from', 'receiver'].forEach((field: string) => {
        if (processedObj[field] && typeof processedObj[field] === 'string') {
          // 如果是一个地址，确保它没有额外的引号
          if (processedObj[field].startsWith('"') && processedObj[field].endsWith('"') && processedObj[field].length > 2) {
            processedObj[field] = processedObj[field].substring(1, processedObj[field].length - 1);
            logs.push(`[${new Date().toISOString()}] 移除${field}中的引号: ${processedObj[field]}`);
          }
        }
      });
      
      return JSON.stringify(processedObj);
    } else {
      // 普通文本替换
      let result = text;
      Object.entries(variables).forEach(([key, value]) => {
        const placeholder = `(${key})`;
        result = result.replace(new RegExp(placeholder, 'g'), value);
      });
      return result;
    }
  };
  
  // 从API配置中加载字段映射
  const loadFieldMappingsFromApiConfig = async (apiId: number) => {
    try {
      // 使用当前存储类型创建API适配器
      const apiAdapter = await DataFactory.getAdapterAsync<ApiConfigModel>('ApiConfig', storageType);
      
      // 获取API配置
      const apiConfig = await apiAdapter.get(apiId);
      if (apiConfig && apiConfig.fieldMappings && apiConfig.fieldMappings.length > 0) {
        // 转换字段映射格式
        const mappings: FieldMapping[] = apiConfig.fieldMappings.map(mapping => ({
          sourceField: mapping.jsonPath || '',
          targetField: mapping.customName || '',
          description: mapping.displayName || ''
        }));
        
        // 更新当前节点的字段映射
      setCurrentNode(prev => ({
        ...prev,
        fieldMappings: mappings
      }));
        
        console.log(`从API配置加载了${mappings.length}个字段映射`);
    } else {
        console.log(`API (ID=${apiId}) 没有字段映射配置`);
      
        // 如果API配置中没有字段映射，则尝试从已保存的节点中查找
        const savedNode = nodes.find(node => node.apiId === apiId);
        if (savedNode && savedNode.fieldMappings && savedNode.fieldMappings.length > 0) {
        setCurrentNode(prev => ({
          ...prev,
            fieldMappings: savedNode.fieldMappings
          }));
          console.log(`从已保存节点加载了${savedNode.fieldMappings.length}个字段映射`);
        }
      }
    } catch (error) {
      console.error('加载API字段映射失败:', error);
      setMessage({
        text: `加载API字段映射失败: ${error instanceof Error ? error.message : String(error)}`,
        type: 'error'
      });
    }
  };
  
  // 在文件顶部添加一个新的useEffect，用于在currentNode变化时检查当前选中的API
  useEffect(() => {
    if (currentNode && currentNode.apiId) {
      const selectedApi = apis.find(api => api.NO === currentNode.apiId);
      if (selectedApi) {
        console.log(`[${new Date().toISOString()}] 当前选中的API: ${selectedApi.name}, 类型: ${selectedApi.apiType || 'HTTP'}`);
        // 设置消息提示当前选中的API
        setMessage({
          text: `当前选中的API: ${selectedApi.name} (${selectedApi.apiType || 'HTTP'})`,
          type: 'info'
        });
      } else {
        console.log(`[${new Date().toISOString()}] 未找到ID为 ${currentNode.apiId} 的API`);
      }
    }
  }, [currentNode, apis]);
  
  // 添加一个通用的提取字段值函数
  const extractFieldValues = (responseData: any): Record<string, any> => {
    if (!responseData || !currentNode.fieldMappings) {
      return {};
    }

    // 提取字段值
    const extractedFields = extractFieldsFromResponse(responseData, currentNode.fieldMappings, []);
    return extractedFields;
  };

  // 修改 handleFetchApiData 函数
  const handleFetchApiData = async () => {
    if (!currentNode.apiId) {
      setMessage({
        text: '请选择 API',
        type: 'error'
      });
      return;
    }
    
    // 检查必填变量
    const missingVariables = detectedVariables.filter(variable => !inputVariables[variable]);
    if (missingVariables.length > 0) {
      setMessage({
        text: `请输入以下变量的值: ${missingVariables.join(', ')}`,
        type: 'error'
      });
      return;
    }
    
    try {
      setIsLoadingApi(true);
      setApiResponse(null);
      
      // 调用封装的API请求函数
      const result = await fetchApiData(currentNode.apiId, inputVariables);
      
      // 如果API调用成功，立即提取字段值
      if (result.success && result.data) {
        const extractedFields = extractFieldValues(result.data);
        result.extractedFields = extractedFields;
      }
      
      // 处理返回结果
      setApiResponse(result);
    } catch (error: any) {
      console.error('获取API数据失败:', error);
      
      setApiResponse({
        success: false,
        message: `获取数据失败: ${error instanceof Error ? error.message : String(error)}`,
        error: error instanceof Error ? error.message : String(error),
        logs: [`[${new Date().toISOString()}] 错误: ${error instanceof Error ? error.message : String(error)}`]
      });
      
      setMessage({
        text: `获取数据失败: ${error instanceof Error ? error.message : String(error)}`,
        type: 'error'
      });
    } finally {
      setIsLoadingApi(false);
    }
  };
  
  // 修改按钮点击处理函数
  const handleExtractFields = () => {
    if (!apiResponse?.data) {
      setMessage({
        type: 'error',
        text: '请先获取API数据'
      });
      return;
    }
    
    // 提取字段值
    const extractedFields = extractFieldValues(apiResponse.data);
    
    // 更新API响应
    setApiResponse(prev => ({
      ...prev!,
      extractedFields,
      success: true,
      message: '字段提取成功'
    }));
    
    // 显示成功消息
    setMessage({
      type: 'success',
      text: '已重新提取字段值'
    });
  };
  
  // 从API获取数据
  const fetchApiData = async (apiId: number, variables: Record<string, string>): Promise<ApiResponse> => {
    const logs: string[] = [];
    logs.push(`[${new Date().toISOString()}] 开始获取API数据...`);
    logs.push(`[${new Date().toISOString()}] 当前存储类型: ${storageType === StorageType.Supabase ? 'Supabase云数据库' : '浏览器本地存储'}`);
    
    try {
      // 使用当前存储类型创建API适配器
      const apiAdapter = await DataFactory.getAdapterAsync<ApiConfigModel>('ApiConfig', storageType);
      logs.push(`[${new Date().toISOString()}] 已创建API适配器`);
      
      // 获取API配置
      const selectedApi = await apiAdapter.get(apiId);
      
    if (!selectedApi) {
        logs.push(`[${new Date().toISOString()}] 错误: 未找到ID为 ${apiId} 的API配置`);
        return {
          success: false,
          message: `未找到ID为 ${apiId} 的API配置`,
          logs
        };
      }
      
      logs.push(`[${new Date().toISOString()}] 使用API: ${selectedApi.name} (${selectedApi.apiType || 'HTTP'})`);
      
      if (selectedApi.apiType) {
        logs.push(`[${new Date().toISOString()}] API类型: ${selectedApi.apiType}`);
      }
      
      if (selectedApi.chainId) {
        logs.push(`[${new Date().toISOString()}] 链ID: ${selectedApi.chainId}`);
      }
    
    // 处理链上数据类型的API
    if (selectedApi.apiType === 'CHAIN') {
        logs.push(`[${new Date().toISOString()}] 调用链上数据获取函数...`);
        const response = await fetchChainData(selectedApi, variables, logs);
        
        // 如果获取成功，立即尝试提取字段
        if (response.success && response.data && currentNode.fieldMappings && currentNode.fieldMappings.length > 0) {
          logs.push(`[${new Date().toISOString()}] 开始提取字段...`);
          const extractedFields = extractFieldsFromResponse(response.data, currentNode.fieldMappings, logs);
          response.extractedFields = extractedFields;
          logs.push(`[${new Date().toISOString()}] 字段提取完成: ${JSON.stringify(extractedFields)}`);
        }
        
        return response;
    } else {
      // 处理HTTP类型的API
        logs.push(`[${new Date().toISOString()}] 调用HTTP数据获取函数...`);
      return await fetchHttpData(selectedApi, variables, logs);
    }
    } catch (error) {
      console.error('获取API数据失败:', error);
      logs.push(`[${new Date().toISOString()}] 错误: ${error instanceof Error ? error.message : String(error)}`);
      
      return {
        success: false,
        message: `获取API数据失败: ${error instanceof Error ? error.message : String(error)}`,
        logs
      };
    }
  };
  
  // 处理HTTP类型的API数据获取
  const fetchHttpData = async (apiConfig: ApiConfigModel, variables: Record<string, string>, logs: string[]): Promise<ApiResponse> => {
    logs.push(`[${new Date().toISOString()}] 准备发送HTTP请求到 ${apiConfig.baseUrl}`);
    
    try {
      // 替换URL中的变量
      let url = apiConfig.baseUrl || '';
      Object.entries(variables).forEach(([key, value]) => {
        url = url.replace(`{${key}}`, encodeURIComponent(value));
      });
      
      logs.push(`[${new Date().toISOString()}] 处理后的URL: ${url}`);
      
      // 准备请求头
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'  // 添加 Content-Type 头部
      };
      
      if (apiConfig.apiKey) {
        headers['X-API-Key'] = apiConfig.apiKey;
        logs.push(`[${new Date().toISOString()}] 已添加API密钥`);
      }
      
      if (apiConfig.apiSecret) {
        headers['Authorization'] = `Bearer ${apiConfig.apiSecret}`;
        logs.push(`[${new Date().toISOString()}] 已添加认证信息`);
      }
      
      // 处理请求体
      let body: string | undefined = undefined;
      
      if (apiConfig.method === 'POST') {
        body = apiConfig.payload || '';
        
      // 替换变量
        if (body) {
          Object.entries(variables).forEach(([key, value]) => {
            body = body!.replace(new RegExp(`\\(${key}\\)`, 'g'), value);
          });
          
          // 如果是 COW.fi API，特殊处理 payload
          if (url.includes('api.cow.fi')) {
            body = processCowApiPayload(body, variables, logs);
            logs.push(`[${new Date().toISOString()}] 处理后的请求体: ${body}`);
          }
        }
      }
      
      // 发送请求
      logs.push(`[${new Date().toISOString()}] 发送${apiConfig.method || 'GET'}请求...`);
      logs.push(`[${new Date().toISOString()}] 请求头: ${JSON.stringify(headers)}`);
      if (body) {
        logs.push(`[${new Date().toISOString()}] 请求体: ${body}`);
      }
      
      const response = await fetch(url, {
        method: apiConfig.method || 'GET',
        headers,
        body: body
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        logs.push(`[${new Date().toISOString()}] 请求失败: HTTP ${response.status} - ${response.statusText}`);
        logs.push(`[${new Date().toISOString()}] 错误详情: ${errorText}`);
        return {
          success: false,
          message: `请求失败: HTTP ${response.status} - ${response.statusText}\n${errorText}`,
          logs
        };
      }
      
      // 解析响应
      const data = await response.json();
      logs.push(`[${new Date().toISOString()}] 请求成功，正在处理数据...`);
      
      return {
        success: true,
        message: '数据获取成功',
        data,
        logs
      };
    } catch (error) {
      logs.push(`[${new Date().toISOString()}] 错误: ${error instanceof Error ? error.message : String(error)}`);
      return {
        success: false,
        message: `HTTP请求失败: ${error instanceof Error ? error.message : String(error)}`,
        logs
      };
    }
  };
  
  // 处理链上数据类型的API获取
  const fetchChainData = async (apiConfig: ApiConfigModel, variables: Record<string, string>, logs: string[]): Promise<ApiResponse> => {
    logs.push(`[${new Date().toISOString()}] 使用区块链API查询数据`);
    
    try {
      // 确保使用相同的存储类型
      const chainAdapter = await DataFactory.getAdapterAsync<ChainConfigModel>('ChainConfig', storageType);
      logs.push(`[${new Date().toISOString()}] 已创建链配置适配器，存储类型: ${storageType === StorageType.Supabase ? 'Supabase' : 'IndexedDB'}`);
      
      // 解析链ID
      let chainId: number = 0;
      
      if (variables.chainId) {
        chainId = Number(variables.chainId);
        logs.push(`[${new Date().toISOString()}] 从变量中获取链ID: ${chainId}`);
      } else if (apiConfig.chainId) {
        chainId = Number(apiConfig.chainId);
        logs.push(`[${new Date().toISOString()}] 从API配置中获取链ID: ${chainId}`);
      }
      
      if (!chainId) {
        chainId = 1;
        logs.push(`[${new Date().toISOString()}] 未找到链ID，使用默认链ID: ${chainId} (ETH)`);
      }
      
      logs.push(`[${new Date().toISOString()}] 最终使用的链ID: ${chainId}`);
      
      // 获取所有链配置
      const allChains = await chainAdapter.getAll();
      logs.push(`[${new Date().toISOString()}] 系统中共有 ${allChains.length} 个链配置`);
      
      if (allChains.length > 0) {
        logs.push(`[${new Date().toISOString()}] 可用的链配置详情:`);
        allChains.forEach(chain => {
          logs.push(`[${new Date().toISOString()}] - 链ID: ${chain.chainId}, 名称: ${chain.name}`);
          // 解析 RPC URLs
          let rpcUrls: string[] = [];
          try {
            if (typeof chain.rpcUrls === 'string') {
              rpcUrls = JSON.parse(chain.rpcUrls);
            } else if (Array.isArray(chain.rpcUrls)) {
              rpcUrls = chain.rpcUrls;
            }
            logs.push(`[${new Date().toISOString()}] - RPC URLs: ${JSON.stringify(rpcUrls)}`);
    } catch (error) {
            logs.push(`[${new Date().toISOString()}] - 警告: RPC URLs 解析失败: ${error instanceof Error ? error.message : String(error)}`);
          }
        });
      } else {
        logs.push(`[${new Date().toISOString()}] 警告: 系统中没有配置任何链`);
      }
      
      // 查找链配置
      let chainConfig = allChains.find(chain => chain.chainId === chainId);
      
      if (!chainConfig) {
        logs.push(`[${new Date().toISOString()}] 未找到chainId为 ${chainId} 的链配置，尝试查找替代链`);
        
        const alternativeChain = allChains.find(c => 
          (chainId === 1 && (c.name.toLowerCase().includes('ethereum') || c.name.toLowerCase().includes('eth'))) ||
          (chainId === 56 && c.name.toLowerCase().includes('bsc')) ||
          (chainId === 42161 && c.name.toLowerCase().includes('arb'))
        );
        
        if (alternativeChain) {
          logs.push(`[${new Date().toISOString()}] 找到可能的替代链: ${alternativeChain.name} (chainId: ${alternativeChain.chainId})`);
          chainConfig = alternativeChain;
        } else {
          const errorMsg = `未找到chainId为 ${chainId} 的链配置。请检查配置或创建该链的配置。`;
          logs.push(`[${new Date().toISOString()}] 错误: ${errorMsg}`);
          return {
            success: false,
            message: errorMsg,
            logs
          };
        }
      }
      
      // 解析 RPC URLs
      let rpcUrls: string[] = [];
      try {
        if (typeof chainConfig.rpcUrls === 'string') {
          rpcUrls = JSON.parse(chainConfig.rpcUrls);
        } else if (Array.isArray(chainConfig.rpcUrls)) {
          rpcUrls = chainConfig.rpcUrls;
        }
      } catch (error) {
        logs.push(`[${new Date().toISOString()}] 警告: RPC URLs 解析失败: ${error instanceof Error ? error.message : String(error)}`);
      }
      
      // 验证链配置
      if (!rpcUrls || rpcUrls.length === 0) {
        const errorMsg = `链 ${chainConfig.name} (chainId: ${chainConfig.chainId}) 没有配置RPC URL`;
        logs.push(`[${new Date().toISOString()}] 错误: ${errorMsg}`);
        return {
          success: false,
          message: errorMsg,
          logs
        };
      }
      
      logs.push(`[${new Date().toISOString()}] 使用链配置: ${chainConfig.name} (chainId: ${chainConfig.chainId})`);
      logs.push(`[${new Date().toISOString()}] 可用的RPC URLs: ${JSON.stringify(rpcUrls)}`);
      
      // 尝试所有可用的RPC URL
      let provider = null;
      let connectedRpcUrl = '';
      
      for (const rpcUrl of rpcUrls) {
        try {
          logs.push(`[${new Date().toISOString()}] 尝试连接RPC URL: ${rpcUrl}`);
          provider = new ethers.providers.JsonRpcProvider(rpcUrl);
          
          // 测试连接
          const network = await provider.getNetwork();
          const blockNumber = await provider.getBlockNumber();
          
          logs.push(`[${new Date().toISOString()}] 成功连接到网络:`);
          logs.push(`[${new Date().toISOString()}] - 网络名称: ${network.name}`);
          logs.push(`[${new Date().toISOString()}] - 链ID: ${network.chainId}`);
          logs.push(`[${new Date().toISOString()}] - 当前区块: ${blockNumber}`);
          
          connectedRpcUrl = rpcUrl;
          break;
        } catch (error) {
          logs.push(`[${new Date().toISOString()}] RPC URL ${rpcUrl} 连接失败: ${error instanceof Error ? error.message : String(error)}`);
          continue;
        }
      }
      
      if (!provider || !connectedRpcUrl) {
        const errorMsg = `无法连接到任何可用的RPC节点，请检查网络连接或更新RPC配置`;
        logs.push(`[${new Date().toISOString()}] 错误: ${errorMsg}`);
        return {
          success: false,
          message: errorMsg,
          logs
        };
      }
      
      // 验证合约地址
      if (!apiConfig.contractAddress) {
        const errorMsg = '缺少合约地址';
        logs.push(`[${new Date().toISOString()}] 错误: ${errorMsg}`);
        return {
          success: false,
          message: errorMsg,
          logs
        };
      }
      
      if (!ethers.utils.isAddress(apiConfig.contractAddress)) {
        const errorMsg = `合约地址无效: ${apiConfig.contractAddress}`;
        logs.push(`[${new Date().toISOString()}] 错误: ${errorMsg}`);
        return {
          success: false,
          message: errorMsg,
          logs
        };
      }
      
      // 检查合约代码
      const code = await provider.getCode(apiConfig.contractAddress);
      if (code === '0x') {
        const errorMsg = `地址不是合约: ${apiConfig.contractAddress}`;
        logs.push(`[${new Date().toISOString()}] 错误: ${errorMsg}`);
        return {
          success: false,
          message: errorMsg,
          logs
        };
      }
      
      logs.push(`[${new Date().toISOString()}] 合约验证成功，代码大小: ${code.length} 字节`);
      
      // 验证方法名称
      if (!apiConfig.methodName) {
        const errorMsg = '缺少合约方法名称';
        logs.push(`[${new Date().toISOString()}] 错误: ${errorMsg}`);
        return {
          success: false,
          message: errorMsg,
          logs
        };
      }

      // 构建合约ABI接口
      logs.push(`[${new Date().toISOString()}] 准备调用合约方法: ${apiConfig.methodName}`);
      
      // 根据apiConfig.methodName和methodParams构建ABI接口
      // 这里假设已经存储了methodName的ABI定义
      let abiFragment = '';
      const methodName = apiConfig.methodName; // 将方法名存储在变量中
      
      if (methodName === 'balanceOf') {
        abiFragment = 'function balanceOf(address owner) view returns (uint256)';
      } else if (methodName === 'totalSupply') {
        abiFragment = 'function totalSupply() view returns (uint256)';
      } else if (methodName === 'decimals') {
        abiFragment = 'function decimals() view returns (uint8)';
      } else if (methodName === 'symbol') {
        abiFragment = 'function symbol() view returns (string)';
      } else if (methodName === 'name') {
        abiFragment = 'function name() view returns (string)';
      } else if (methodName === 'convertToAssets') {
        abiFragment = 'function convertToAssets(uint256 shares) view returns (uint256)';
        } else {
        // 对于其他方法，尝试基于方法名和参数构建一个通用接口
        abiFragment = `function ${methodName}(`;
        
        // 添加参数类型
        if (apiConfig.methodParams && apiConfig.methodParams.length > 0) {
          abiFragment += apiConfig.methodParams.map(param => `${param.type} ${param.name}`).join(', ');
        }
        
        abiFragment += ') view returns (uint256)';
      }
      
      logs.push(`[${new Date().toISOString()}] 使用ABI接口: ${abiFragment}`);
      
      // 创建合约接口
      const contractInterface = new ethers.utils.Interface([abiFragment]);
      const contract = new ethers.Contract(apiConfig.contractAddress, contractInterface, provider);
      
      // 准备方法参数
      const methodParams: any[] = [];
      
      if (apiConfig.methodParams && apiConfig.methodParams.length > 0) {
        for (const param of apiConfig.methodParams) {
          // 检查变量中是否有该参数的值
          let paramValue = param.value;
          
          if (variables[param.name]) {
            paramValue = variables[param.name];
            logs.push(`[${new Date().toISOString()}] 使用变量值 "${param.name}": ${paramValue}`);
          }
          
          if (!paramValue) {
            logs.push(`[${new Date().toISOString()}] 警告: 参数 "${param.name}" 没有值`);
            continue;
          }
          
          // 根据参数类型处理值
          if (param.type === 'address') {
            methodParams.push(paramValue); // 地址类型直接添加
          } else if (param.type.includes('int')) {
            methodParams.push(ethers.BigNumber.from(paramValue)); // 整数类型转换为BigNumber
          } else if (param.type === 'bool') {
            methodParams.push(paramValue === 'true'); // 布尔类型转换
          } else {
            methodParams.push(paramValue); // 其他类型直接添加
          }
        }
      }
      
      logs.push(`[${new Date().toISOString()}] 调用合约方法 ${methodName} 参数: ${JSON.stringify(methodParams)}`);
      
      // 调用合约方法
      try {
        // 动态调用合约方法
        let result;
        if (methodParams.length > 0) {
          result = await contract[methodName](...methodParams);
        } else {
          result = await contract[methodName]();
        }
        
        logs.push(`[${new Date().toISOString()}] 合约方法调用成功`);
        
        // 处理结果 - 对于BigNumber类型，转换为字符串
        let processedResult: any;
        
        if (ethers.BigNumber.isBigNumber(result)) {
          processedResult = result.toString();
          logs.push(`[${new Date().toISOString()}] BigNumber结果转换为字符串: ${processedResult}`);
      } else {
          processedResult = result;
        }
        
        // 构建响应数据
        const responseData = {
          chainId: chainConfig.chainId,
          chainName: chainConfig.name,
          contractAddress: apiConfig.contractAddress,
          method: apiConfig.methodName,
          params: methodParams,
          timestamp: new Date().toISOString(),
          result: processedResult
        };
        
        logs.push(`[${new Date().toISOString()}] 链上数据获取成功`);
      
      return {
        success: true,
          message: '链上数据获取成功',
        data: responseData,
          logs
      };
    } catch (error) {
        logs.push(`[${new Date().toISOString()}] 合约方法调用失败: ${error instanceof Error ? error.message : String(error)}`);
        return {
          success: false,
          message: `合约方法调用失败: ${error instanceof Error ? error.message : String(error)}`,
          logs
        };
      }
    } catch (error) {
      logs.push(`[${new Date().toISOString()}] 错误: ${error instanceof Error ? error.message : String(error)}`);
      return {
        success: false,
        message: `链上数据获取失败: ${error instanceof Error ? error.message : String(error)}`,
        logs
      };
    }
  };
  
  // 封装字段提取函数
  const extractFields = (responseData: any, fieldMappings: FieldMapping[], logs: string[]): Record<string, any> => {
    logs.push(`[${new Date().toISOString()}] 开始提取字段...`);
    
    // 提取字段
    const extractedData: Record<string, any> = {};
    fieldMappings.forEach(mapping => {
      logs.push(`[${new Date().toISOString()}] 提取字段: ${mapping.sourceField} -> ${mapping.targetField}`);
      
      try {
        // 从嵌套对象中获取值
        let value = getNestedValue(responseData, mapping.sourceField);
        
        // 如果值为undefined，尝试其他可能的路径
        if (value === undefined) {
          logs.push(`[${new Date().toISOString()}] 警告: 字段 ${mapping.sourceField} 在响应数据中不存在，尝试其他可能的路径...`);
          
          // 尝试直接从顶层对象获取
          if (responseData[mapping.targetField] !== undefined) {
            value = responseData[mapping.targetField];
            logs.push(`[${new Date().toISOString()}] 从顶层对象找到字段 ${mapping.targetField}`);
          }
          
          // 尝试从quote对象获取
          else if (responseData.quote && responseData.quote[mapping.targetField] !== undefined) {
            value = responseData.quote[mapping.targetField];
            logs.push(`[${new Date().toISOString()}] 从quote对象找到字段 ${mapping.targetField}`);
          }
          
          // 尝试从quote对象获取，使用sourceField的最后一部分
          else if (responseData.quote) {
            const lastPart = mapping.sourceField.split('.').pop();
            if (lastPart && responseData.quote[lastPart] !== undefined) {
              value = responseData.quote[lastPart];
              logs.push(`[${new Date().toISOString()}] 从quote对象找到字段 ${lastPart}`);
            }
          }
        }
        
        extractedData[mapping.targetField] = value;
        
        if (value === undefined) {
          logs.push(`[${new Date().toISOString()}] 警告: 字段 ${mapping.sourceField} 在响应数据中不存在，所有尝试都失败了`);
          // 打印响应数据的结构，帮助调试
          logs.push(`[${new Date().toISOString()}] 响应数据结构: ${JSON.stringify(Object.keys(responseData))}`);
          if (responseData.quote) {
            logs.push(`[${new Date().toISOString()}] quote对象结构: ${JSON.stringify(Object.keys(responseData.quote))}`);
          }
        } else {
          logs.push(`[${new Date().toISOString()}] 提取成功: ${mapping.targetField} = ${JSON.stringify(value)}`);
        }
      } catch (error) {
        logs.push(`[${new Date().toISOString()}] 提取失败: ${error instanceof Error ? error.message : String(error)}`);
        extractedData[mapping.targetField] = null;
      }
    });
    
    return extractedData;
  };
  
  // 从嵌套对象中获取值
  const getNestedValue = (obj: any, path: string): any => {
    // 如果路径为空或对象为null/undefined，直接返回
    if (!path || obj === null || obj === undefined) {
      return undefined;
    }
    
    // 添加调试日志
    console.log(`尝试从路径 ${path} 获取值，对象类型: ${typeof obj}`);
    
    // 处理数组索引和嵌套对象
    // 支持格式: data.items[0].name 或 data.items.0.name
    const parts = path.split('.');
    let result = obj;
    
    for (let i = 0; i < parts.length; i++) {
      let part = parts[i];
      
      // 添加调试日志
      console.log(`处理路径部分: ${part}, 当前结果类型: ${typeof result}`);
      
      // 处理数组索引格式 items[0]
      const arrayMatch = part.match(/^(.*)\[(\d+)\]$/);
      if (arrayMatch) {
        const [_, arrayName, indexStr] = arrayMatch;
        const index = parseInt(indexStr, 10);
        
        // 先获取数组
        if (arrayName && result[arrayName] === undefined) {
          console.log(`数组 ${arrayName} 不存在`);
          return undefined;
        }
        
        if (arrayName) {
          result = result[arrayName];
          console.log(`获取数组 ${arrayName}, 结果类型: ${typeof result}`);
        }
        
        // 再获取索引元素
        if (!Array.isArray(result) || index >= result.length) {
          console.log(`索引 ${index} 超出数组范围或结果不是数组`);
          return undefined;
        }
        
        result = result[index];
        console.log(`获取索引 ${index} 的元素, 结果类型: ${typeof result}`);
        continue;
      }
      
      // 检查是否为数字（可能是数组索引）
      if (/^\d+$/.test(part) && Array.isArray(result)) {
        const index = parseInt(part, 10);
        if (index >= result.length) {
          console.log(`索引 ${index} 超出数组范围`);
          return undefined;
        }
        result = result[index];
        console.log(`获取索引 ${index} 的元素, 结果类型: ${typeof result}`);
        continue;
      }
      
      // 普通对象属性
      if (result === null || result === undefined) {
        console.log(`结果为 null 或 undefined`);
        return undefined;
      }
      
      if (result[part] === undefined) {
        console.log(`属性 ${part} 在对象中不存在`);
        // 尝试打印对象的所有键，帮助调试
        if (typeof result === 'object') {
          console.log(`对象的可用键: ${Object.keys(result).join(', ')}`);
        }
        return undefined;
      }
      
      result = result[part];
      console.log(`获取属性 ${part}, 结果: ${JSON.stringify(result)}`);
    }
    
    console.log(`最终结果: ${JSON.stringify(result)}`);
    return result;
  };
  
  // 根据API响应自动生成字段映射建议
  const generateFieldMappingSuggestions = (data: any): FieldMapping[] => {
    const suggestions: FieldMapping[] = [];
    const paths: string[] = [];
    
    // 递归查找所有叶子节点路径
    const findPaths = (obj: any, currentPath: string = '') => {
      if (obj === null || obj === undefined) {
        return;
      }
      
      if (typeof obj !== 'object') {
        paths.push(currentPath);
        return;
      }
      
      for (const key in obj) {
        const newPath = currentPath ? `${currentPath}.${key}` : key;
        if (typeof obj[key] === 'object' && obj[key] !== null) {
          findPaths(obj[key], newPath);
        } else {
          paths.push(newPath);
        }
      }
    };
    
    findPaths(data);
    
    // 选择一些有意义的路径作为建议
    const interestingKeywords = ['price', 'value', 'amount', 'volume', 'change', 'percentage', 'rate', 'time', 'date', 'name', 'symbol', 'id'];
    
    paths.forEach(path => {
      // 检查路径是否包含感兴趣的关键词
      const isInteresting = interestingKeywords.some(keyword => 
        path.toLowerCase().includes(keyword.toLowerCase())
      );
      
      if (isInteresting) {
        // 从路径中提取最后一部分作为目标字段名
        const parts = path.split('.');
        const lastPart = parts[parts.length - 1];
        
        suggestions.push({
          sourceField: path,
          targetField: lastPart,
          description: `${lastPart} 数据`
        });
      }
    });
    
    // 限制建议数量
    return suggestions.slice(0, 5);
  };
  
  // 处理字段映射变更
  const handleFieldMappingChange = (index: number, field: keyof FieldMapping, value: string) => {
    setCurrentNode(prev => {
      const updatedFieldMappings = [...(prev.fieldMappings || [])];
      
      // 如果字段映射不存在，创建一个新的
      if (!updatedFieldMappings[index]) {
        updatedFieldMappings[index] = { sourceField: '', targetField: '', description: '' };
      }
      
      // 更新指定字段
      updatedFieldMappings[index] = {
        ...updatedFieldMappings[index],
      [field]: value
    };
    
      return {
        ...prev,
        fieldMappings: updatedFieldMappings
      };
    });
  };

  // 添加新的字段映射
  const handleAddFieldMapping = () => {
    setCurrentNode(prev => ({
      ...prev,
      fieldMappings: [
        ...(prev.fieldMappings || []),
        { sourceField: '', targetField: '', description: '' }
      ]
    }));
  };
  
  // 删除字段映射
  const handleDeleteFieldMapping = (index: number) => {
    setCurrentNode(prev => {
      const updatedFieldMappings = [...(prev.fieldMappings || [])];
      updatedFieldMappings.splice(index, 1);
      
      return {
        ...prev,
        fieldMappings: updatedFieldMappings
      };
    });
  };
  
  /**
   * 处理保存节点
   */
  const handleSave = async () => {
    if (!currentNode.name.trim()) {
      setMessage({ type: 'error', text: '节点名称不能为空' });
      return;
    }
    
    // 检查节点名称唯一性
    const isDuplicateName = nodes.some(node => 
      node.name === currentNode.name && node.id !== currentNode.id
    );

    if (isDuplicateName) {
      setMessage({ type: 'error', text: `节点名称 "${currentNode.name}" 已存在，请使用其他名称` });
      return;
    }

    setIsSaving(true);
    const connectionLogs: string[] = [];
    connectionLogs.push(`===== 开始保存节点 ${currentNode.name} (ID: ${currentNode.id}) =====`);
    connectionLogs.push(`当前存储类型: ${storageType === StorageType.Supabase ? 'Supabase云数据库' : '浏览器本地存储'}`);
    
    try {
      // 确定使用的存储类型
      let currentStorageType = storageType;
      
      // 如果当前存储类型是Supabase，先测试连接
      if (storageType === StorageType.Supabase) {
        connectionLogs.push(`检查Supabase连接...`);
        try {
          const connectionResult = await testSupabaseConnection();
          connectionLogs.push(`Supabase连接状态: ${connectionResult.success ? '成功' : '失败'}`);
          
          if (!connectionResult.success) {
            connectionLogs.push(`连接失败: ${connectionResult.summary}`);
            connectionLogs.push(`尝试使用浏览器本地存储作为备选方案...`);
            
            // 修改：自动切换到本地存储并继续
            currentStorageType = StorageType.IndexedDB;
            connectionLogs.push(`已切换到备选存储类型: 浏览器本地存储`);
      setMessage({
              type: 'info', 
              text: `无法连接到Supabase云数据库，将使用浏览器本地存储保存数据。` 
      });
    }
        } catch (diagError) {
          connectionLogs.push(`连接诊断出错: ${diagError instanceof Error ? diagError.message : String(diagError)}`);
          console.error('连接诊断失败:', diagError);
    
          // 同样切换到本地存储
          currentStorageType = StorageType.IndexedDB;
          connectionLogs.push(`已切换到备选存储类型: 浏览器本地存储`);
      setMessage({
            type: 'info', 
            text: `连接Supabase出错，将使用浏览器本地存储保存数据。` 
          });
        }
      } else {
        connectionLogs.push(`当前存储类型: 浏览器本地存储，跳过连接测试`);
      }
      
      // 使用可能更新后的存储类型获取适配器
      connectionLogs.push(`即将使用存储类型: ${currentStorageType === StorageType.Supabase ? 'Supabase云数据库' : '浏览器本地存储'}`);
      const adapter = await DataFactory.getAdapterAsync<any>('data_collection_configs', currentStorageType);
      
      // 准备要保存的数据模型 - 转换为数据库模型格式
      const now = new Date();
      const configToSave: any = {
        name: currentNode.name,
        type: 'api',
        config: {
          apiParams: {
            customConfig: JSON.stringify({
              apiId: currentNode.apiId,
              fieldMappings: currentNode.fieldMappings
            })
          },
          baseUrl: '',
          endpoint: '',
          headers: {}
        },
        active: currentNode.active,
        // 使用ISO 8601格式的时间字符串
        created_at: now.toISOString()
      };
      
      // 仅在编辑时添加ID字段
      if (currentNode.id) {
        configToSave.NO = currentNode.id;
      }
      
      connectionLogs.push(`准备保存数据: ${JSON.stringify(configToSave)}`);
      console.log(connectionLogs.join('\n'));

      if (currentNode.id) {
        // 修复：根据IDataAdapter接口只传递一个参数
        await adapter.update(configToSave);
        setMessage({ type: 'success', text: '数据采集配置已更新' });
        
        // 更新节点列表中的当前节点
        setNodes(prevNodes => 
          prevNodes.map(node => 
            node.id === currentNode.id ? {...currentNode} : node
          )
        );
      } else {
        // 创建新节点
        connectionLogs.push(`开始创建新节点...`);
        try {
          const newNode = await adapter.create(configToSave);
          connectionLogs.push(`创建节点成功，返回数据: ${JSON.stringify(newNode)}`);
          console.log('创建成功，完整返回:', newNode);
          
          // 更新当前节点的ID
          if (newNode && (newNode.NO || newNode.id)) {
            const nodeId = newNode.NO || newNode.id;
            connectionLogs.push(`提取节点ID: ${nodeId}`);
            const updatedNode: DataCollectionNodeModel = {
              ...currentNode,
              id: nodeId
            };
            
            setMessage({ type: 'success', text: '数据采集配置已创建' });
            setCurrentNode(updatedNode);
            setSelectedNodeId(updatedNode.id || null);
            
            // 将新节点添加到节点列表
            setNodes(prevNodes => {
              connectionLogs.push(`节点已添加到列表，当前共有 ${prevNodes.length + 1} 个节点`);
              return [...prevNodes, updatedNode];
            });
          } else {
            connectionLogs.push(`创建失败: 未返回有效数据 ${JSON.stringify(newNode)}`);
            setMessage({ type: 'error', text: '创建失败: 未返回有效数据' });
          }
        } catch (createError) {
          connectionLogs.push(`创建节点出错: ${createError instanceof Error ? createError.message : String(createError)}`);
          connectionLogs.push(`错误详情: ${JSON.stringify(createError)}`);
          console.error(connectionLogs.join('\n'));
          throw createError; // 继续抛出以便后续处理
        }
      }
      
      // 最终完整日志
      connectionLogs.push(`===== 操作完成 =====`);
      console.log(connectionLogs.join('\n'));
    } catch (error) {
      console.error('保存数据采集配置失败:', error);
      setMessage({ type: 'error', text: `保存失败: ${error instanceof Error ? error.message : String(error)}` });
    } finally {
      setIsSaving(false);
    }
  };
  
  // 显示删除确认对话框
  const handleDelete = () => {
    if (!currentNode.id) {
      setMessage({ type: 'error', text: '无法删除未保存的配置' });
      return;
    }
    setShowDeleteConfirm(true);
  };

  // 取消删除
  const handleCancelDelete = () => {
    setShowDeleteConfirm(false);
  };
  
  // 确认删除
  const handleConfirmDelete = async () => {
    if (!currentNode.id) {
      setShowDeleteConfirm(false);
      return;
    }

    try {
      setIsDeleting(true);
      
      // 获取数据适配器
      const adapter = await DataFactory.getAdapterAsync<DataCollectionConfigModel>('data_collection_configs', storageType);
      
      // 执行删除
      await adapter.delete(currentNode.id);
      
      // 更新UI
      setMessage({ type: 'success', text: `配置"${currentNode.name}"已删除` });
      setShowDeleteConfirm(false);
      
      // 刷新节点列表
      loadData();
      
      // 如果有其他节点，选择第一个；否则创建新节点
      if (nodes.length > 1) {
        const remainingNodes = nodes.filter(node => node.id !== currentNode.id);
        if (remainingNodes.length > 0) {
          setSelectedNodeId(remainingNodes[0].id || null);
          setCurrentNode(remainingNodes[0]);
        } else {
          handleCreateNode();
        }
      } else {
        handleCreateNode();
      }
    } catch (error) {
      console.error('删除数据采集配置失败:', error);
      setMessage({ type: 'error', text: `删除失败: ${error instanceof Error ? error.message : String(error)}` });
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  // 测试API
  const handleTest = async () => {
    if (!currentNode.apiId) {
      setMessage({ type: 'error', text: '请先选择API配置' });
      return;
    }
    
    // 设置测试中状态
    setIsTesting(true);
    setTestResult(null);
    const testLogs: string[] = [];
    
    testLogs.push(`[${new Date().toISOString()}] 开始测试API...`);
    testLogs.push(`[${new Date().toISOString()}] 当前存储类型: ${storageType === StorageType.Supabase ? 'Supabase云数据库' : '浏览器本地存储'}`);
    testLogs.push(`[${new Date().toISOString()}] 使用API ID: ${currentNode.apiId}`);

    try {
      // 检查必填变量
      const missingVariables = detectedVariables.filter(variable => !inputVariables[variable]);
      if (missingVariables.length > 0) {
        const errorMsg = `缺少必填变量: ${missingVariables.join(', ')}`;
        testLogs.push(`[${new Date().toISOString()}] 错误: ${errorMsg}`);
        
        setTestResult({
          success: false,
          message: errorMsg,
          logs: testLogs
        });
        
        setMessage({
          text: errorMsg,
          type: 'error'
        });
        
        setIsTesting(false);
        return;
      }
      
      testLogs.push(`[${new Date().toISOString()}] 使用变量: ${JSON.stringify(inputVariables)}`);
      
      // 调用API获取数据
      const response = await fetchApiData(currentNode.apiId, inputVariables);
      
      // 合并日志
      testLogs.push(...(response.logs || []));
      
      // 更新测试结果
      const testResult: TestResult = {
        success: response.success,
        message: response.message,
        logs: testLogs,
        data: response.data
      };
      
      setTestResult(testResult);
      
      // 如果测试成功并且有字段映射，尝试提取字段
      if (response.success && response.data && currentNode.fieldMappings && currentNode.fieldMappings.length > 0) {
        const extractedFields = extractFieldsFromResponse(response.data, currentNode.fieldMappings, testResult.logs);
        setExtractedData(extractedFields);
      }
    } catch (error) {
      console.error('API测试失败:', error);
      testLogs.push(`[${new Date().toISOString()}] 错误: ${error instanceof Error ? error.message : String(error)}`);
      
      setTestResult({
        success: false,
        message: `测试失败: ${error instanceof Error ? error.message : String(error)}`,
        logs: testLogs
      });
    } finally {
      setIsTesting(false);
    }
  };

  // 清除消息
  const handleCloseMessage = () => {
    setMessage(null);
  };

  // 提取字段函数
  const extractFieldsFromResponse = (data: any, fieldMappings: FieldMapping[], logs: string[]): Record<string, any> => {
    const result: Record<string, any> = {};
    
    logs.push(`[${new Date().toISOString()}] 开始从响应中提取字段...`);
    logs.push(`[${new Date().toISOString()}] 原始数据结构: ${JSON.stringify(Object.keys(data))}`);
    
    // 检查是否有重复的字段映射
    const targetFields = fieldMappings.map(m => m.targetField);
    const duplicateFields = targetFields.filter((field, index) => targetFields.indexOf(field) !== index);
    if (duplicateFields.length > 0) {
      logs.push(`[${new Date().toISOString()}] 警告: 发现重复的目标字段: ${duplicateFields.join(', ')}`);
    }
    
    // 添加一个函数来查找所有可能的路径
    const findAllPaths = (obj: any, parentPath = ''): string[] => {
      const paths: string[] = [];
      
      if (!obj || typeof obj !== 'object') {
        return paths;
      }
      
      Object.entries(obj).forEach(([key, value]) => {
        const currentPath = parentPath ? `${parentPath}.${key}` : key;
        paths.push(currentPath);
        
        if (value && typeof value === 'object') {
          paths.push(...findAllPaths(value, currentPath));
        }
      });
      
      return paths;
    };
    
    fieldMappings.forEach(mapping => {
      if (!mapping.sourceField || !mapping.targetField) {
        logs.push(`[${new Date().toISOString()}] 警告: 字段映射不完整，跳过处理`);
        return;
      }
      
      try {
        logs.push(`[${new Date().toISOString()}] 处理字段映射: ${mapping.sourceField} -> ${mapping.targetField}`);
        
        let value;
        const sourcePath = mapping.sourceField.split('.');
        
        // 打印路径解析信息
        logs.push(`[${new Date().toISOString()}] 路径解析: ${JSON.stringify(sourcePath)}`);
        
        // 从数据中获取值
        value = data;
        for (const key of sourcePath) {
          if (value === undefined || value === null) {
            logs.push(`[${new Date().toISOString()}] 警告: 在路径 ${mapping.sourceField} 中，${key} 之前的值为空`);
            break;
          }
          
          // 检查当前层级的所有可用键
          if (typeof value === 'object') {
            const availableKeys: string[] = Object.keys(value);
            logs.push(`[${new Date().toISOString()}] 当前层级 [${key}] 可用的键: ${availableKeys.join(', ')}`);
            
            // 检查键是否存在
            if (!availableKeys.includes(key)) {
              logs.push(`[${new Date().toISOString()}] 错误: 键 ${key} 在当前层级不存在`);
              logs.push(`[${new Date().toISOString()}] 当前层级的完整数据: ${JSON.stringify(value)}`);
              
              // 尝试模糊匹配
              const similarKeys = availableKeys.filter(k => 
                k.toLowerCase().includes(key.toLowerCase()) || 
                key.toLowerCase().includes(k.toLowerCase())
              );
              
              if (similarKeys.length > 0) {
                logs.push(`[${new Date().toISOString()}] 找到相似的键: ${similarKeys.join(', ')}`);
              }
              
              value = undefined;
              break;
            }
          }
          
          value = value[key];
          logs.push(`[${new Date().toISOString()}] 获取键 ${key} 的值: ${JSON.stringify(value)}`);
        }
        
        // 处理获取到的值
        if (value !== undefined && value !== null) {
          result[mapping.targetField] = value;
          logs.push(`[${new Date().toISOString()}] 成功提取字段 ${mapping.sourceField} 到 ${mapping.targetField}: ${JSON.stringify(value)}`);
        } else {
          logs.push(`[${new Date().toISOString()}] 警告: 路径 ${mapping.sourceField} 的值为空`);
          result[mapping.targetField] = null;
          
          // 尝试在整个数据结构中查找匹配的字段
          const allPaths = findAllPaths(data);
          const matchingPaths = allPaths.filter(path => 
            path.toLowerCase().includes(mapping.targetField.toLowerCase())
          );
          
          if (matchingPaths.length > 0) {
            logs.push(`[${new Date().toISOString()}] 建议的路径:`);
            matchingPaths.forEach(path => {
              const pathValue = getNestedValue(data, path);
              logs.push(`[${new Date().toISOString()}] - ${path} = ${JSON.stringify(pathValue)}`);
            });
          }
          }
        } catch (error) {
        logs.push(`[${new Date().toISOString()}] 错误: 提取字段 ${mapping.sourceField} 失败: ${error instanceof Error ? error.message : String(error)}`);
        result[mapping.targetField] = null;
      }
    });
    
    logs.push(`[${new Date().toISOString()}] 字段提取完成，结果: ${JSON.stringify(result)}`);
    return result;
  };
  
  // 渲染字段映射表格
  const renderFieldMappingTable = () => {
    // 获取API响应中提取的字段值
    const extractedValues = apiResponse?.extractedFields || {};
    const responseData = apiResponse?.data || {};
    
    // 添加一个函数来查找可能的路径
    const findPossiblePaths = (obj: any, targetField: string, currentPath = ''): string[] => {
      const paths: string[] = [];
      
      if (!obj || typeof obj !== 'object') return paths;
      
      // 检查当前对象的所有键
      Object.entries(obj).forEach(([key, value]) => {
        const newPath = currentPath ? `${currentPath}.${key}` : key;
        
        // 如果键名与目标字段匹配，添加路径
        if (key.toLowerCase() === targetField.toLowerCase()) {
          paths.push(newPath);
        }
        
        // 如果值是对象或数组，递归搜索
        if (value && typeof value === 'object') {
          paths.push(...findPossiblePaths(value, targetField, newPath));
        }
      });
      
      return paths;
    };
    
    return (
      <FieldMappingTable>
        <thead>
          <tr>
            <TableHeader>自定义字段名</TableHeader>
            <TableHeader>显示名称</TableHeader>
            <TableHeader>JSON路径</TableHeader>
            <TableHeader>值</TableHeader>
            <TableHeader>操作</TableHeader>
          </tr>
        </thead>
        <tbody>
          {currentNode.fieldMappings.map((mapping, index) => {
            // 获取当前字段的值
            const fieldValue = extractedValues[mapping.targetField];
            // 查找可能的路径建议
            const possiblePaths = findPossiblePaths(responseData, mapping.targetField);
            
            // 确定显示状态
            const isFieldFound = mapping.targetField in extractedValues;
            const hasValue = fieldValue !== null && fieldValue !== undefined;
            const hasSuggestions = possiblePaths.length > 0;
            
            return (
              <tr key={index}>
                <TableCell>
                  <Input
                    value={mapping.targetField}
                    onChange={(e) => handleFieldMappingChange(index, 'targetField', e.target.value)}
                    placeholder="price"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    value={mapping.description}
                    onChange={(e) => handleFieldMappingChange(index, 'description', e.target.value)}
                    placeholder="价格"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    value={mapping.sourceField}
                    onChange={(e) => handleFieldMappingChange(index, 'sourceField', e.target.value)}
                    placeholder="data.result.price"
                    style={{
                      borderColor: !isFieldFound && apiResponse ? '#FF6666' : undefined
                    }}
                  />
                </TableCell>
                <TableCell>
                  <div style={{ 
                        maxWidth: '200px', 
                    minHeight: '32px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                  }}>
                    {/* 值显示区域 */}
                    <div style={{ 
                        overflow: 'hidden', 
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      color: !isFieldFound ? '#FF6666' : hasValue ? '#66CCFF' : '#FF6666',
                      padding: '4px 0'
                    }}>
                      {!apiResponse ? (
                        <span style={{ color: '#AAAAAA' }}>未获取数据</span>
                      ) : !isFieldFound ? (
                        <span style={{ color: '#FF6666' }}>路径错误</span>
                      ) : !hasValue ? (
                        <span style={{ color: '#FF6666' }}>未找到值</span>
                      ) : (
                        <span title={
                          typeof fieldValue === 'object'
                            ? JSON.stringify(fieldValue)
                            : String(fieldValue)
                        }>
                          {typeof fieldValue === 'object'
                          ? JSON.stringify(fieldValue)
                                : String(fieldValue)
                      }
                        </span>
                      )}
                    </div>
                    
                    {/* 路径建议区域 */}
                    {!isFieldFound && apiResponse && hasSuggestions && (
                      <div style={{
                        fontSize: '12px',
                        color: '#F0B90B',
                        marginTop: '4px'
                      }}>
                        建议路径:
                        {possiblePaths.map((path, i) => (
                          <div
                            key={i}
                            style={{
                              cursor: 'pointer',
                              textDecoration: 'underline',
                              marginTop: '2px'
                            }}
                            onClick={() => handleFieldMappingChange(index, 'sourceField', path)}
                          >
                            {path}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <SecondaryButton onClick={() => handleDeleteFieldMapping(index)}>
                    删除
                  </SecondaryButton>
                </TableCell>
              </tr>
            );
          })}
        </tbody>
      </FieldMappingTable>
    );
  };
  
  // 添加千位符格式化函数
  const formatNumber = (value: any, fieldName?: string): string => {
    if (value === null || value === undefined) {
      return '';
    }
    
    // 如果是对象，使用JSON.stringify
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    
    // 根据字段名称进行特殊处理
    if (fieldName) {
      // 如果字段名包含"hex"，保持原始格式
      if (fieldName.toLowerCase().includes('hex')) {
        return String(value);
      }
      
      // 如果字段名包含"formatted"，保持原始格式
      if (fieldName.toLowerCase().includes('formatted')) {
        return String(value);
      }
      
      // 如果字段名包含"decimal"，添加千位符
      if (fieldName.toLowerCase().includes('decimal') && !isNaN(Number(value))) {
        return Number(value).toLocaleString('zh-CN');
      }
    }
    
    // 如果是数字或可以转换为数字
    if (!isNaN(Number(value))) {
      // 如果是十六进制格式，保持原始格式
      if (typeof value === 'string' && value.toLowerCase().startsWith('0x')) {
        return value;
      }
      
      // 如果是小数（包含小数点），保持原始格式
      if (typeof value === 'string' && value.includes('.')) {
        return value;
      }
      
      // 其他数字添加千位符
      return Number(value).toLocaleString('zh-CN');
    }
    
    // 其他情况直接返回字符串
    return String(value);
  };
  
  // 渲染变量输入表格
  const renderVariableInputs = () => {
    if (detectedVariables.length === 0) {
      return (
        <div style={{ color: '#AAAAAA', padding: '10px 0' }}>
          当前API没有需要输入的变量
        </div>
      );
    }
    
    return (
      <VariableInputTable>
        <thead>
          <tr>
            <TableHeader>变量名</TableHeader>
            <TableHeader>变量值</TableHeader>
          </tr>
        </thead>
        <tbody>
          {detectedVariables.map((variable, index) => (
            <tr key={index}>
              <TableCell>
                <Label>{variable}</Label>
              </TableCell>
              <TableCell>
                <Input
                  value={inputVariables[variable] || ''}
                  onChange={(e) => handleVariableChange(variable, e.target.value)}
                  placeholder={`请输入${variable}的值`}
                />
              </TableCell>
            </tr>
          ))}
        </tbody>
      </VariableInputTable>
    );
  };
  
  // 修改页面布局，使用可折叠面板
  return (
    <PageContainer>
      {/* 添加加载动画 */}
      {(isLoading || isSaving) && (
        <LoadingOverlay>
          <div style={{ textAlign: 'center' }}>
            <LoadingSpinner />
            <LoadingText>
              {isLoading ? '正在加载数据...' : '正在保存数据...'}
            </LoadingText>
          </div>
        </LoadingOverlay>
      )}
      
      <PageHeader>
        <PageTitle>数据采集配置</PageTitle>
        <ActionButton onClick={handleCreateNode}>
          新建数据采集节点
        </ActionButton>
      </PageHeader>
      
      {message && (
        <MessageBox type={message.type}>
          <div>{message.text}</div>
          <CloseButton onClick={handleCloseMessage}>×</CloseButton>
        </MessageBox>
      )}
      
      <ContentLayout>
        {/* 左侧节点列表 */}
        <NodeList>
          <NavGroup>
            <NavGroupHeader 
              isOpen={isBasicConfigOpen}
              onClick={() => setIsBasicConfigOpen(!isBasicConfigOpen)}
            >
              基础配置
            </NavGroupHeader>
            <NavGroupContent isOpen={isBasicConfigOpen}>
              <NavLink 
                active={true} 
                isSecondLevel={true}
              >
                数据采集配置
              </NavLink>
              <NavLink 
                isSecondLevel={true}
                onClick={() => window.location.href = '/alert-capability'}
              >
                告警配置
              </NavLink>
            </NavGroupContent>
          </NavGroup>
          
          <NodeListHeader>
            配置列表
            <ActionButton onClick={handleCreateNode}>
              新建
            </ActionButton>
          </NodeListHeader>
          
          {nodes.map(node => (
            <NodeItem 
              key={node.id} 
              selected={selectedNodeId === node.id}
              onClick={() => handleSelectNode(node)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <NodeName selected={selectedNodeId === node.id}>
                  {node.name}
                </NodeName>
                <StatusIndicator active={node.active}>
                  {node.active ? '启用' : '禁用'}
                </StatusIndicator>
              </div>
              <ApiName>
                API: {node.apiName ? `${node.apiName} (${node.apiType})` : '未选择'}
              </ApiName>
            </NodeItem>
          ))}
          
          {nodes.length === 0 && (
            <div style={{ padding: '20px', color: '#AAAAAA', textAlign: 'center' }}>
              暂无配置，点击"新建"按钮创建
            </div>
          )}
        </NodeList>
        
        {/* 右侧配置面板 */}
        <ConfigPanel>
          <FormSection>
            <SectionTitle>基本信息</SectionTitle>
            
            <FormRow>
              <FormGroup>
                <Label>节点名称</Label>
                <Input
                  value={currentNode.name}
                  onChange={handleNameChange}
                  placeholder="输入节点名称"
                />
              </FormGroup>
              <FormGroup>
                <Label>状态</Label>
                <div>
                  <Checkbox
                    type="checkbox"
                    checked={currentNode.active}
                    onChange={handleStatusChange}
                  />
                  启用
                </div>
              </FormGroup>
            </FormRow>
            
            <FormRow>
              <FormGroup>
                <Label>选择 API</Label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <Select
                    value={currentNode.apiId || ''}
                    onChange={handleApiChange}
                  >
                    <option value="">-- 请选择 API --</option>
                    {apis.map(api => (
                      <option key={api.NO} value={api.NO}>
                        {api.name} ({api.apiType || 'HTTP'})
                      </option>
                    ))}
                  </Select>
                </div>
              </FormGroup>
            </FormRow>
          </FormSection>
          
          {/* 传入参数面板 */}
          <CollapsiblePanel>
            <PanelHeader 
              isOpen={isInputPanelOpen}
              onClick={() => setIsInputPanelOpen(!isInputPanelOpen)}
            >
              <PanelTitle isOpen={isInputPanelOpen}>传入参数</PanelTitle>
            </PanelHeader>
            <PanelContent isOpen={isInputPanelOpen}>
              {renderVariableInputs()}
              
              <div style={{ marginTop: '15px', display: 'flex', justifyContent: 'flex-end' }}>
                <PrimaryButton
                  onClick={handleFetchApiData}
                  disabled={isLoadingApi || !currentNode.apiId}
                >
                  {isLoadingApi ? '获取中...' : '获取API数据'}
                </PrimaryButton>
              </div>
            </PanelContent>
          </CollapsiblePanel>
          
          {/* 传出参数面板 */}
          <CollapsiblePanel>
            <PanelHeader 
              isOpen={isOutputPanelOpen}
              onClick={() => setIsOutputPanelOpen(!isOutputPanelOpen)}
            >
              <PanelTitle isOpen={isOutputPanelOpen}>传出参数</PanelTitle>
            </PanelHeader>
            <PanelContent isOpen={isOutputPanelOpen}>
              {renderFieldMappingTable()}
              
              <div style={{ marginTop: '10px' }}>
                <SecondaryButton onClick={handleAddFieldMapping}>
                  添加字段
                </SecondaryButton>
              </div>
            </PanelContent>
          </CollapsiblePanel>
          
          {/* 渲染底部操作按钮 */}
          <ButtonGroup>
            <PrimaryButton onClick={handleSave} disabled={isSaving}>
              {isSaving ? '保存中...' : '保存'}
            </PrimaryButton>
            {currentNode.id && (
              <DangerButton onClick={handleDelete} disabled={isDeleting}>
                删除
            </DangerButton>
            )}
            <Button 
              onClick={handleExtractFields}
              disabled={!apiResponse?.data}
              style={{ fontWeight: 'bold', backgroundColor: '#4CAF50', color: 'white' }}
            >
              获取传出参数值
            </Button>
          </ButtonGroup>
          
          {/* 测试结果和API响应面板保持不变 */}
          {testResult && (
            <TestResultPanel>
              <TestResultTitle>
                测试结果: {testResult.success ? '成功' : '失败'}
              </TestResultTitle>
              
              <div style={{ marginBottom: '15px' }}>
                <strong>消息:</strong> {testResult.message}
              </div>
              
              {testResult.data && Object.keys(testResult.data).length > 0 && (
                <div style={{ marginBottom: '15px' }}>
                  <strong>提取的数据:</strong>
                  <TestResultContent>
                    {JSON.stringify(testResult.data, null, 2)}
                  </TestResultContent>
                </div>
              )}
              
              <div>
                <strong>测试日志:</strong>
                <TestResultContent>
                  {testResult.logs.join('\n')}
                </TestResultContent>
              </div>
            </TestResultPanel>
          )}
          
          {apiResponse && (
            <ApiResponsePanel>
              <ApiResponseTitle>
                API 响应结果: {apiResponse.success ? '成功' : '失败'}
              </ApiResponseTitle>
              
              {/* 添加数据结构树显示 */}
              <div style={{ marginBottom: '15px' }}>
                <strong>数据结构树:</strong>
                <ApiResponseContent>
                  {(() => {
                    const printTree = (obj: any, level = 0): string[] => {
                      if (!obj || typeof obj !== 'object') return [];
                      
                      return Object.entries(obj).flatMap(([key, value]) => {
                        const indent = '  '.repeat(level);
                        const valueType = typeof value;
                        const isObject = value && typeof value === 'object';
                        
                        if (isObject) {
                          return [
                            `${indent}${key} (${Array.isArray(value) ? 'Array' : 'Object'}):`,
                            ...printTree(value, level + 1)
                          ];
                        } else {
                          const displayValue = value === null ? 'null' : 
                            value === undefined ? 'undefined' : 
                            valueType === 'string' ? `"${value}"` : 
                            String(value);
                          return [`${indent}${key}: ${displayValue} (${valueType})`];
                        }
                      });
                    };
                    
                    return printTree(apiResponse.data).join('\n');
                  })()}
                </ApiResponseContent>
              </div>
              
              {/* 其他响应内容保持不变 */}
              <div style={{ marginBottom: '15px' }}>
                <strong>状态:</strong> {apiResponse.success ? '成功' : '失败'}
              </div>
              
              {apiResponse.data && (
                <div style={{ marginBottom: '15px' }}>
                  <strong>响应数据:</strong>
                  <ApiResponseContent>
                    {JSON.stringify(apiResponse.data, null, 2)}
                  </ApiResponseContent>
                </div>
              )}
              
              {apiResponse.extractedFields && Object.keys(apiResponse.extractedFields).length > 0 && (
                <div style={{ marginBottom: '15px' }}>
                  <strong>提取的字段:</strong>
                  <ApiResponseContent>
                    {JSON.stringify(apiResponse.extractedFields, null, 2)}
                  </ApiResponseContent>
                </div>
              )}
            </ApiResponsePanel>
          )}
          
          {/* 添加单独的日志显示区域，即使没有API响应也能显示 */}
          {logs && logs.length > 0 && !apiResponse && (
            <ApiResponsePanel>
              <ApiResponseTitle>API 交互日志</ApiResponseTitle>
              <ApiResponseContent>
                {logs.join('\n')}
              </ApiResponseContent>
            </ApiResponsePanel>
          )}
          
          {apiResponseError && !apiResponse && (
            <ApiResponsePanel>
              <ApiResponseTitle>错误</ApiResponseTitle>
              <ApiResponseContent>
                <div style={{ color: '#FF6666' }}>{apiResponseError}</div>
              </ApiResponseContent>
            </ApiResponsePanel>
          )}
        </ConfigPanel>
      </ContentLayout>
      
      {/* 删除确认对话框保持不变 */}
      {showDeleteConfirm && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: '#2A2A2A',
            padding: '20px',
            borderRadius: '5px',
            width: '400px'
          }}>
            <h3 style={{ color: '#F0B90B', marginTop: 0 }}>确认删除</h3>
            <p style={{ color: '#FFFFFF' }}>
              确定要删除数据采集节点 "{currentNode.name}" 吗？此操作不可恢复。
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
              <SecondaryButton onClick={handleCancelDelete}>
                取消
              </SecondaryButton>
              <DangerButton onClick={handleConfirmDelete} disabled={isDeleting}>
                {isDeleting ? '删除中...' : '确认删除'}
              </DangerButton>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
};

export default DataCollectionConfig;
