import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { migrateAllData, validateMigration, MigrationLog, clearAllSupabaseTables, checkSupabaseStatus, testSupabaseConnection, dropAndRecreateTable } from '../services/adapters/migration';
import { getCurrentStorageType, setStorageType, trySetStorageType } from '../services/adapters/storageManager';
import { StorageType } from '../services/adapters/dataFactory';
import { DataFactory } from '../services/adapters/dataFactory';
import { SupabaseAdapter } from '../services/adapters/supabaseAdapter';
import { testConnection as testNetworkConnection, diagnoseNetworkIssues } from "../services/adapters/networkUtils";
import { IDataAdapter } from '../services/adapters/dataAdapter';
import { DataCollectionConfigModel } from '../utils/database';

// 定义从DataProcessingConfig.tsx借用的数据加工配置模型
interface DataProcessingConfigModel {
  NO?: number;
  name: string;
  sourceNodeId: number;
  inputParams: Array<{
    name: string;
    type: string;
    value?: any;
    selected?: boolean;
  }>;
  formulas: Array<{
    name: string;
    formula: string;
    description?: string;
    result?: any;
  }>;
  outputParams: Array<{
    name: string;
    type: string;
    value?: string;
  }>;
  active: boolean;
  create_time?: number;
}

// 样式
const SettingsContainer = styled.div`
  padding: 20px;
  background-color: #191919;
  border-radius: 8px;
  margin: 20px;
`;

const Title = styled.h2`
  color: #FFFFFF;
  margin-bottom: 20px;
`;

const Section = styled.div`
  margin-bottom: 30px;
  padding: 20px;
  background-color: #232323;
  border-radius: 6px;
`;

const SectionTitle = styled.h3`
  color: #F0B90B;
  margin-bottom: 15px;
`;

const FormGroup = styled.div`
  margin-bottom: 15px;
`;

const Label = styled.label`
  display: block;
  margin-bottom: 8px;
  color: #CCCCCC;
`;

const Select = styled.select`
  width: 100%;
  padding: 8px 12px;
  border-radius: 4px;
  background-color: #333333;
  border: 1px solid #444444;
  color: #FFFFFF;
  margin-bottom: 5px;
`;

const Button = styled.button`
  padding: 10px 20px;
  background-color: #F0B90B;
  color: #000000;
  border: none;
  border-radius: 4px;
  font-weight: bold;
  cursor: pointer;
  margin-right: 10px;
  
  &:disabled {
    background-color: #5A5A5A;
    cursor: not-allowed;
  }
  
  &.secondary {
    background-color: #444444;
    color: #FFFFFF;
  }
`;

const ProgressBar = styled.div`
  width: 100%;
  height: 10px;
  background-color: #333333;
  border-radius: 5px;
  margin: 10px 0;
  overflow: hidden;
`;

const ProgressFill = styled.div<{ width: string }>`
  height: 100%;
  background-color: #F0B90B;
  width: ${props => props.width};
  transition: width 0.3s ease-in-out;
`;

const Message = styled.div<{ type: 'info' | 'success' | 'error' | 'warning' }>`
  padding: 10px;
  margin: 15px 0;
  border-radius: 4px;
  color: #FFFFFF;
  
  ${props => {
    switch(props.type) {
      case 'success': 
        return `background-color: #1B5E20;`;
      case 'error': 
        return `background-color: #B71C1C;`;
      case 'warning': 
        return `background-color: #F57F17;`;
      default: 
        return `background-color: #0D47A1;`;
    }
  }}
`;

// 日志组件样式
const LogsContainer = styled.div`
  margin-top: 20px;
  max-height: 300px;
  overflow-y: auto;
  background-color: #111111;
  border-radius: 4px;
  border: 1px solid #333333;
  padding: 10px;
`;

const LogEntry = styled.div<{ type: 'info' | 'success' | 'error' | 'warning' }>`
  padding: 5px 8px;
  margin-bottom: 4px;
  font-family: monospace;
  font-size: 12px;
  line-height: 1.5;
  border-left: 3px solid ${props => {
    switch(props.type) {
      case 'success': return '#1B5E20';
      case 'error': return '#B71C1C';
      case 'warning': return '#F57F17';
      default: return '#0D47A1';
    }
  }};
  background-color: #1A1A1A;
  
  &:hover {
    background-color: #222222;
  }
`;

const LogTime = styled.span`
  color: #888888;
  margin-right: 8px;
`;

const LogMessage = styled.span<{ type: 'info' | 'success' | 'error' | 'warning' }>`
  color: ${props => {
    switch(props.type) {
      case 'success': return '#81C784';
      case 'error': return '#E57373';
      case 'warning': return '#FFD54F';
      default: return '#DDDDDD';
    }
  }};
`;

const LogsHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
`;

const LogsTitle = styled.h4`
  color: #CCCCCC;
  margin: 0;
`;

const ClearButton = styled.button`
  background-color: transparent;
  color: #AAAAAA;
  border: none;
  padding: 4px 8px;
  cursor: pointer;
  font-size: 12px;
  
  &:hover {
    color: #FFFFFF;
    text-decoration: underline;
  }
`;

const ToggleButton = styled.button<{ active: boolean }>`
  background-color: ${props => props.active ? '#333333' : 'transparent'};
  color: ${props => props.active ? '#FFFFFF' : '#AAAAAA'};
  border: 1px solid #444444;
  padding: 4px 8px;
  cursor: pointer;
  font-size: 12px;
  margin-right: 5px;
  border-radius: 4px;
  
  &:hover {
    background-color: #333333;
    color: #FFFFFF;
  }
`;

const MigrateOptions = styled.div`
  margin: 10px 0 15px;
  display: flex;
  align-items: center;
`;

const Checkbox = styled.input`
  margin-right: 8px;
`;

const CheckboxLabel = styled.label`
  color: #CCCCCC;
  font-size: 14px;
  margin-right: 20px;
  display: flex;
  align-items: center;
  cursor: pointer;
`;

// 在Button样式后添加样式组件
const ButtonGroup = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 15px;
`;

// 添加Input样式
const Input = styled.input`
  width: 100%;
  padding: 8px 12px;
  border-radius: 4px;
  background-color: #333333;
  border: 1px solid #444444;
  color: #FFFFFF;
  margin-bottom: 5px;
`;

// 格式化错误对象
const formatError = (error: any): string => {
  if (error instanceof Error) {
    return error.message;
  }
  
  // 如果是对象，尝试提取错误信息
  if (error && typeof error === 'object') {
    try {
      if (error.message) return error.message;
      if (error.error) return typeof error.error === 'string' ? error.error : JSON.stringify(error.error);
      return JSON.stringify(error, null, 2);
    } catch (e) {
      return '无法解析的错误对象';
    }
  }
  
  return String(error);
};

// 添加一个封装函数，用于获取适配器
async function getAdapter<T extends { NO?: number }>(tableName: string, storageType: StorageType): Promise<IDataAdapter<T>> {
  return await DataFactory.getAdapterAsync<T>(tableName, storageType);
}

const Settings: React.FC = () => {
  const [currentStorage, setCurrentStorage] = useState<StorageType>(getCurrentStorageType());
  const [migrateProgress, setMigrateProgress] = useState(0);
  const [migrateMessage, setMigrateMessage] = useState('');
  const [statusMessage, setStatusMessage] = useState<{text: string, type: 'info' | 'success' | 'error' | 'warning'} | null>(null);
  const [isMigrating, setIsMigrating] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [logs, setLogs] = useState<MigrationLog[]>([]);
  const [showLogs, setShowLogs] = useState(false);
  const [logFilter, setLogFilter] = useState<'all' | 'error' | 'warning' | 'success' | 'info'>('all');
  const [skipExisting, setSkipExisting] = useState(true);
  
  // Supabase配置状态
  const [supabaseConfig, setSupabaseConfig] = useState(() => SupabaseAdapter.getCurrentConfig());
  const [newSupabaseUrl, setNewSupabaseUrl] = useState(supabaseConfig.url);
  const [newSupabaseKey, setNewSupabaseKey] = useState(supabaseConfig.key);
  const [showApiKey, setShowApiKey] = useState(false);
  
  // 新增重置表状态
  const [isResettingTable, setIsResettingTable] = useState(false);
  
  // 处理存储类型变更
  const handleStorageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newType = e.target.value as StorageType;
    setCurrentStorage(newType);
    setStorageType(newType);
    setStatusMessage({
      text: `存储类型已切换为: ${newType === StorageType.IndexedDB ? '浏览器数据库' : 'Supabase云数据库'}`,
      type: 'info'
    });
  };
  
  // 迁移数据到Supabase
  const migrateToSupabase = async () => {
    if (!window.confirm('确定要将数据从IndexedDB迁移到Supabase吗？')) {
      return;
    }
    
    setIsMigrating(true);
    setLogs([]);
    setShowLogs(true);
    setStatusMessage({text: '开始迁移数据...', type: 'info'});
    
    try {
      // 第1步：检查连接
      setStatusMessage({text: '检查Supabase连接...', type: 'info'});
      const connectionResult = await testSupabaseConnection();
      
      if (!connectionResult.success) {
        setStatusMessage({text: '连接测试失败，无法继续迁移', type: 'error'});
        // 处理日志
        setLogs(prev => {
          const newLogs: MigrationLog[] = [];
          connectionResult.logs.forEach(log => {
            newLogs.push({
              time: new Date().toLocaleTimeString(),
              message: typeof log === 'string' ? log : String(log),
              type: 'info'
            });
          });
          return [...prev, ...newLogs];
        });
        setIsMigrating(false);
        return;
      }
      
      // 处理日志
      setLogs(prev => {
        const newLogs: MigrationLog[] = [];
        connectionResult.logs.forEach(log => {
          newLogs.push({
            time: new Date().toLocaleTimeString(),
            message: typeof log === 'string' ? log : String(log),
            type: 'info'
          });
        });
        return [...prev, ...newLogs];
      });
      
      // 第2步：检查并创建数据库结构
      setStatusMessage({text: '检查数据库结构...', type: 'info'});
      const structureResult = await checkSupabaseStatus();
      setLogs(prev => [...prev, ...structureResult.logs]);
      
      if (!structureResult.success) {
        setLogs(prev => [...prev, {
          time: new Date().toLocaleTimeString(),
          message: '数据库结构检查发现问题，但将继续迁移（可能导致部分数据迁移失败）',
          type: 'warning'
        }]);
      }
      
      // 第3步：先检查IndexedDB中是否有相关数据表和数据
      setStatusMessage({text: '检查IndexedDB数据...', type: 'info'});
      
      // 检查data_collection_configs表
      try {
        setLogs(prev => [...prev, {
          time: new Date().toLocaleTimeString(),
          message: '检查IndexedDB中的data_collection_configs表...',
          type: 'info'
        }]);
        
        const collectionAdapter = await getAdapter('data_collection_configs', StorageType.IndexedDB);
        const collectionData = await collectionAdapter.getAll();
        
        if (Array.isArray(collectionData) && collectionData.length > 0) {
          setLogs(prev => [...prev, {
            time: new Date().toLocaleTimeString(),
            message: `【IndexedDB】发现 ${collectionData.length} 条data_collection_configs数据`,
            type: 'info'
          }]);
          
          // 显示所有数据名称
          const namesList = collectionData.map((item: any) => {
            if (typeof item === 'object' && item !== null && 'name' in item) {
              return String(item.name || '[无名称]');
            }
            return '[无名称]';
          }).join(', ');
          
          setLogs(prev => [...prev, {
            time: new Date().toLocaleTimeString(),
            message: `【IndexedDB】数据采集配置名称列表: ${namesList}`,
            type: 'info'
          }]);
          
          // 检查是否包含目标配置
          const targetConfigs = ["sUSDe Unstake汇率", "USDT/sUSDe汇率", "USDC/sUSDe汇率"];
          const foundTargets = collectionData.filter((item: any) => 
            typeof item === 'object' && item !== null && 'name' in item &&
            targetConfigs.includes(String(item.name))
          );
          
          if (foundTargets.length > 0) {
            setLogs(prev => [...prev, {
              time: new Date().toLocaleTimeString(),
              message: `【IndexedDB】找到目标配置: ${foundTargets.map((item: any) => item.name).join(', ')}`,
              type: 'success'
            }]);
          }
        } else {
          setLogs(prev => [...prev, {
            time: new Date().toLocaleTimeString(),
            message: '【IndexedDB】中没有data_collection_configs数据',
            type: 'warning'
          }]);
        }
      } catch (error) {
        const errorMsg = formatError(error);
        if (errorMsg.includes('transaction') || errorMsg.includes('not found')) {
          setLogs(prev => [...prev, {
            time: new Date().toLocaleTimeString(),
            message: '【IndexedDB】data_collection_configs表不存在或无法访问',
            type: 'warning'
          }]);
        } else {
          setLogs(prev => [...prev, {
            time: new Date().toLocaleTimeString(),
            message: `【IndexedDB】检查data_collection_configs失败: ${errorMsg}`,
            type: 'error'
          }]);
        }
      }
      
      // 检查data_processing_configs表
      try {
        setLogs(prev => [...prev, {
          time: new Date().toLocaleTimeString(),
          message: '检查IndexedDB中的data_processing_configs表...',
          type: 'info'
        }]);
        
        const processingAdapter = await getAdapter('data_processing_configs', StorageType.IndexedDB);
        const processingData = await processingAdapter.getAll();
        
        if (Array.isArray(processingData) && processingData.length > 0) {
          setLogs(prev => [...prev, {
            time: new Date().toLocaleTimeString(),
            message: `【IndexedDB】发现 ${processingData.length} 条data_processing_configs数据`,
            type: 'info'
          }]);
          
          // 显示所有数据名称
          const namesList = processingData.map((item: any) => {
            if (typeof item === 'object' && item !== null && 'name' in item) {
              return String(item.name || '[无名称]');
            }
            return '[无名称]';
          }).join(', ');
          
          setLogs(prev => [...prev, {
            time: new Date().toLocaleTimeString(),
            message: `【IndexedDB】数据处理配置名称列表: ${namesList}`,
            type: 'info'
          }]);
          
          // 检查是否包含目标配置
          const targetConfigs = ["sUSDe Unstake汇率", "USDT/sUSDe汇率", "USDC/sUSDe汇率"];
          const foundTargets = processingData.filter((item: any) => 
            typeof item === 'object' && item !== null && 'name' in item &&
            targetConfigs.includes(String(item.name))
          );
          
          if (foundTargets.length > 0) {
            setLogs(prev => [...prev, {
              time: new Date().toLocaleTimeString(),
              message: `【IndexedDB】找到目标配置: ${foundTargets.map((item: any) => item.name).join(', ')}`,
              type: 'success'
            }]);
          }
        } else {
          setLogs(prev => [...prev, {
            time: new Date().toLocaleTimeString(),
            message: '【IndexedDB】中没有data_processing_configs数据',
            type: 'warning'
          }]);
        }
      } catch (error) {
        const errorMsg = formatError(error);
        if (errorMsg.includes('transaction') || errorMsg.includes('not found')) {
          setLogs(prev => [...prev, {
            time: new Date().toLocaleTimeString(),
            message: '【IndexedDB】data_processing_configs表不存在或无法访问',
            type: 'warning'
          }]);
        } else {
          setLogs(prev => [...prev, {
            time: new Date().toLocaleTimeString(),
            message: `【IndexedDB】检查data_processing_configs失败: ${errorMsg}`,
            type: 'error'
          }]);
        }
      }
      
      // 第4步：检查localStorage是否有数据
      setStatusMessage({text: '检查localStorage数据...', type: 'info'});
      
      // 使用已有的方法检查localStorage
      await checkLocalStorageData();
      
      // 第5步：迁移数据采集配置
      setStatusMessage({text: '迁移数据采集配置...', type: 'info'});
      await importDataCollectionConfigs();
      
      // 第6步：迁移数据处理配置
      setStatusMessage({text: '迁移数据处理配置...', type: 'info'});
      await importDataProcessingConfigs();
      
      // 第7步：迁移系统配置数据
      setStatusMessage({text: '迁移系统配置数据...', type: 'info'});
      const result = await migrateAllData(
        (percent, message) => {
          setMigrateProgress(percent);
          setMigrateMessage(message);
          setStatusMessage({text: `${message} (${percent}%)`, type: 'info'});
        },
        skipExisting  // 跳过已存在的数据
      );
      
      setLogs(prev => [...prev, ...result.logs]);
      
      if (result.success) {
        setStatusMessage({text: '数据迁移完成！', type: 'success'});
        
        // 添加建议
        setLogs(prev => [...prev, {
          time: new Date().toLocaleTimeString(),
          message: '建议：迁移完成后，请切换到"Supabase云数据库"模式使用',
          type: 'info'
        }]);
      } else {
        setStatusMessage({text: '数据迁移部分完成，有些表可能失败', type: 'warning'});
      }
    } catch (error) {
      setStatusMessage({text: `迁移失败: ${formatError(error)}`, type: 'error'});
      console.error('迁移失败:', error);
      setLogs(prev => [...prev, {
        time: new Date().toLocaleTimeString(),
        message: `迁移过程中发生错误: ${formatError(error)}`,
        type: 'error'
      }]);
      
      // 如果有堆栈信息，添加至日志
      if (error instanceof Error) {
        const stack = error.stack;
        if (stack) {
          const firstLine = stack.split('\n')[0] || stack;
          setLogs(prev => [...prev, {
            time: new Date().toLocaleTimeString(),
            message: `错误堆栈: ${firstLine}`,
            type: 'error'
          }]);
        }
      }
    } finally {
      setIsMigrating(false);
    }
  };
  
  // 清空Supabase数据库
  const clearSupabase = async () => {
    if (!window.confirm('确定要清空Supabase数据库吗？此操作不可恢复！')) {
      return;
    }
    
    try {
      setIsClearing(true);
      setStatusMessage({text: '正在清空Supabase数据库...', type: 'info'});
      setLogs([]);
      setShowLogs(true);
      
      const result = await clearAllSupabaseTables((percent, message) => {
        setMigrateProgress(percent);
        setMigrateMessage(message);
      });
      
      setLogs(result.logs);
      
      if (result.success) {
        setStatusMessage({text: '所有Supabase数据表已清空！', type: 'success'});
      } else {
        setStatusMessage({text: result.summary, type: 'warning'});
      }
    } catch (error) {
      console.error('清空数据库失败:', error);
      setStatusMessage({
        text: `清空数据库失败: ${formatError(error)}`,
        type: 'error'
      });
    } finally {
      setIsClearing(false);
    }
  };
  
  // 验证迁移结果
  const validateMigrationResult = async () => {
    try {
      setStatusMessage({text: '正在验证迁移结果...', type: 'info'});
      setLogs([]);
      setShowLogs(true);
      
      const result = await validateMigration();
      
      setLogs(result.logs);
      
      if (result.success) {
        setStatusMessage({text: '迁移验证成功！数据一致性良好。', type: 'success'});
      } else {
        setStatusMessage({text: result.summary, type: 'warning'});
      }
    } catch (error) {
      console.error('验证失败:', error);
      setStatusMessage({
        text: `验证失败: ${formatError(error)}`,
        type: 'error'
      });
    }
  };
  
  // 清除日志
  const clearLogs = () => {
    setLogs([]);
  };
  
  // 过滤日志
  const filteredLogs = logFilter === 'all'
    ? logs
    : logs.filter(log => log.type === logFilter);
  
  // 测试Supabase连接
  const testSupabaseConnection = async (): Promise<{ success: boolean; message: string; logs: MigrationLog[] }> => {
    const logs: MigrationLog[] = [];
    const addLog = (message: string, type: 'info' | 'success' | 'error' | 'warning') => {
      logs.push({
        time: new Date().toLocaleTimeString(),
        message,
        type
      });
    };
    
    addLog(`开始测试Supabase连接 (${new Date().toLocaleString()})`, 'info');
    
    try {
      const supabaseUrl = SupabaseAdapter.getCurrentConfig().url;
      addLog(`Supabase URL: ${supabaseUrl}`, 'info');
      
      // 使用网络诊断工具检查连接
      addLog(`使用网络诊断工具检查连接...`, 'info');
      const networkDiag = await diagnoseNetworkIssues();
      addLog(`浏览器网络状态: ${networkDiag.browserInfo.onLine ? '在线' : '离线'}`, 'info');
      
      if (networkDiag.issues.some(issue => !issue.includes('未检测到明显的网络问题'))) {
        addLog(`检测到网络问题:`, 'warning');
        networkDiag.issues.forEach(issue => addLog(`- ${issue}`, 'warning'));
      }
      
      // 测试连接Supabase
      addLog(`测试Supabase服务器连接...`, 'info');
      const connectionTest = await testNetworkConnection(supabaseUrl);
      
      // 添加连接测试日志
      connectionTest.logs.forEach(log => addLog(log, 'info'));
      
      if (connectionTest.success) {
        addLog(`✅ Supabase连接测试成功: ${connectionTest.message}`, 'success');
        return { 
          success: true, 
          message: '连接成功！云存储已就绪。', 
          logs 
        };
      } else {
        // 连接失败
        addLog(`❌ Supabase连接测试失败: ${connectionTest.message}`, 'error');
        
        // 添加推荐解决方案
        if (networkDiag.recommendations.length > 0) {
          addLog(`推荐解决方案:`, 'info');
          networkDiag.recommendations.forEach(rec => addLog(`- ${rec}`, 'info'));
        }
        
        return { 
          success: false, 
          message: `连接失败: ${connectionTest.message}`, 
          logs 
        };
      }
    } catch (error) {
      addLog(`❌ 连接测试过程中发生错误: ${error instanceof Error ? error.message : String(error)}`, 'error');
      console.error('测试Supabase连接时出错:', error);
      
      return { 
        success: false, 
        message: `测试过程发生错误: ${error instanceof Error ? error.message : String(error)}`, 
        logs 
      };
    }
  };
  
  // 检查Supabase数据库状态
  const checkDatabaseStatus = async () => {
    try {
      setStatusMessage({text: '正在检查Supabase数据库状态...', type: 'info'});
      setLogs([]);
      setShowLogs(true);
      
      const result = await checkSupabaseStatus();
      
      setLogs(result.logs);
      
      if (result.success) {
        setStatusMessage({text: result.summary, type: 'success'});
      } else {
        setStatusMessage({text: result.summary, type: 'warning'});
      }
    } catch (error) {
      console.error('检查数据库状态失败:', error);
      setStatusMessage({
        text: `检查数据库状态失败: ${formatError(error)}`,
        type: 'error'
      });
    }
  };
  
  // 更新Supabase配置
  const updateSupabaseConfig = () => {
    try {
      SupabaseAdapter.updateConfig(newSupabaseUrl, newSupabaseKey);
      setSupabaseConfig(SupabaseAdapter.getCurrentConfig());
      setStatusMessage({text: 'Supabase配置已更新，请重新测试连接', type: 'success'});
    } catch (error) {
      setStatusMessage({text: `更新Supabase配置失败: ${formatError(error)}`, type: 'error'});
    }
  };
  
  // 重置Supabase配置为当前值
  const resetSupabaseConfig = () => {
    const currentConfig = SupabaseAdapter.getCurrentConfig();
    setNewSupabaseUrl(currentConfig.url);
    setNewSupabaseKey(currentConfig.key);
  };
  
  // 手动迁移data_collection_configs
  const importDataCollectionConfigs = async () => {
    try {
      setLogs(prev => [...prev, {
        time: new Date().toLocaleTimeString(),
        message: '开始迁移数据采集配置...',
        type: 'info'
      }]);
      
      // 尝试从localStorage读取
      const rawData = localStorage.getItem('data_collection_configs');
      if (rawData) {
        try {
          let data = JSON.parse(rawData);
          
          if (!Array.isArray(data) || data.length === 0) {
            setLogs(prev => [...prev, {
              time: new Date().toLocaleTimeString(),
              message: 'localStorage中没有data_collection_configs数据或格式无效',
              type: 'warning'
            }]);
            return;
          }
          
          // 显示所有配置的名称，帮助调试
          const allNames = data.map((item: any) => item.name).join(', ');
          setLogs(prev => [...prev, {
            time: new Date().toLocaleTimeString(),
            message: `发现以下数据采集配置: ${allNames}`,
            type: 'info'
          }]);
          
          // 确保我们不过滤掉任何实际数据
          // 只过滤确定是测试数据的特定名称
          const testDataNames = ['测试配置', '测试数据'];
          const filteredData = data.filter((item: { name: string }) => !testDataNames.includes(item.name));
          
          setLogs(prev => [...prev, {
            time: new Date().toLocaleTimeString(),
            message: `准备迁移 ${filteredData.length} 条实际数据采集配置`,
            type: 'info'
          }]);
          
          // 处理数据，移除时间戳字段
          const processedData = filteredData.map((item: any) => {
            const newItem = {...item};
            // 删除id字段，让数据库自动生成新id
            delete newItem.id;
            delete newItem.NO;
            delete newItem.create_time;
            delete newItem.created_at;
            
            // 确保config是对象而不是字符串
            if (typeof newItem.config === 'string') {
              try {
                newItem.config = JSON.parse(newItem.config);
              } catch (e) {
                // 如果无法解析，保持原样
                console.warn(`无法解析${newItem.name}的config字段`, e);
              }
            }
            
            // 确保active是布尔值
            if (newItem.active !== undefined) {
              newItem.active = Boolean(newItem.active);
            }
            
            return newItem;
          });
          
          // 获取Supabase适配器
          const adapter = await getAdapter('data_collection_configs', StorageType.Supabase);
          
          // 获取现有数据
          const existingData = await adapter.getAll();
          const existingNames = new Set(existingData.map((item: any) => item.name));
          
          // 实际迁移的计数器
          let migratedCount = 0;
          let skippedCount = 0;
          let errorCount = 0;
          
          // 逐个迁移
          for (const item of processedData) {
            try {
              // 检查是否已存在同名记录
              if (existingNames.has(item.name)) {
                setLogs(prev => [...prev, {
                  time: new Date().toLocaleTimeString(),
                  message: `跳过已存在的记录: ${item.name}`,
                  type: 'warning'
                }]);
                skippedCount++;
                continue;
              }
              
              // 确保有必要的字段
              if (!item.name || !item.type) {
                setLogs(prev => [...prev, {
                  time: new Date().toLocaleTimeString(),
                  message: `跳过缺少必要字段的记录: ${item.name || '未命名'}`,
                  type: 'warning'
                }]);
                skippedCount++;
                continue;
              }
              
              await adapter.create({
                ...item,
                NO: undefined // 确保适配器自动生成ID
              });
              setLogs(prev => [...prev, {
                time: new Date().toLocaleTimeString(),
                message: `成功迁移数据采集配置: ${item.name}`,
                type: 'success'
              }]);
              migratedCount++;
              
              // 添加到已存在集合
              existingNames.add(item.name);
            } catch (error) {
              errorCount++;
              // 检查是否是主键冲突错误
              const errorMsg = formatError(error);
              if (errorMsg.includes('duplicate key value') || errorMsg.includes('23505')) {
                setLogs(prev => [...prev, {
                  time: new Date().toLocaleTimeString(),
                  message: `记录 "${item.name}" 出现ID冲突，尝试手动处理...`,
                  type: 'warning'
                }]);
                
                // 添加一个随机后缀到name，以区分记录
                const timestamp = new Date().getTime();
                const itemWithSuffix = {
                  ...item,
                  name: `${item.name}_备份_${timestamp}`
                };
                
                try {
                  await adapter.create({
                    ...itemWithSuffix,
                    NO: undefined // 确保适配器自动生成ID
                  });
                  setLogs(prev => [...prev, {
                    time: new Date().toLocaleTimeString(),
                    message: `成功迁移(已重命名): ${itemWithSuffix.name}`,
                    type: 'success'
                  }]);
                  migratedCount++;
                } catch (innerError) {
                  setLogs(prev => [...prev, {
                    time: new Date().toLocaleTimeString(),
                    message: `二次尝试迁移失败: ${formatError(innerError)}`,
                    type: 'error'
                  }]);
                }
              } else {
                setLogs(prev => [...prev, {
                  time: new Date().toLocaleTimeString(),
                  message: `迁移记录 "${item.name}" 失败: ${errorMsg}`,
                  type: 'error'
                }]);
              }
            }
          }
          
          // 显示迁移统计信息
          setLogs(prev => [...prev, {
            time: new Date().toLocaleTimeString(),
            message: `数据采集配置迁移总结: 成功=${migratedCount}, 跳过=${skippedCount}, 失败=${errorCount}`,
            type: migratedCount > 0 ? 'success' : 'warning'
          }]);
          
        } catch (error) {
          setLogs(prev => [...prev, {
            time: new Date().toLocaleTimeString(),
            message: `处理data_collection_configs数据失败: ${formatError(error)}`,
            type: 'error'
          }]);
        }
      } else {
        setLogs(prev => [...prev, {
          time: new Date().toLocaleTimeString(),
          message: 'localStorage中没有data_collection_configs数据',
          type: 'warning'
        }]);
      }
    } catch (error) {
      console.error("导入数据采集配置失败:", error);
      setLogs(prev => [...prev, {
        time: new Date().toLocaleTimeString(),
        message: `导入data_collection_configs失败: ${formatError(error)}`,
        type: 'error'
      }]);
    }
  };
  
  // 手动迁移data_processing_configs
  const importDataProcessingConfigs = async () => {
    try {
      setLogs(prev => [...prev, {
        time: new Date().toLocaleTimeString(),
        message: '开始迁移数据处理配置...',
        type: 'info'
      }]);
      
      // 尝试从localStorage读取
      const rawData = localStorage.getItem('data_processing_configs');
      if (rawData) {
        try {
          let data = JSON.parse(rawData);
          
          if (!Array.isArray(data) || data.length === 0) {
            setLogs(prev => [...prev, {
              time: new Date().toLocaleTimeString(),
              message: 'localStorage中没有data_processing_configs数据或格式无效',
              type: 'warning'
            }]);
            return;
          }
          
          // 显示所有配置的名称，帮助调试
          const allNames = data.map((item: any) => item.name).join(', ');
          setLogs(prev => [...prev, {
            time: new Date().toLocaleTimeString(),
            message: `发现以下数据处理配置: ${allNames}`,
            type: 'info'
          }]);
          
          // 确保我们不过滤掉任何实际数据
          // 只过滤确定是测试数据的特定名称
          const testDataNames = ['测试配置', '测试数据'];
          const filteredData = data.filter((item: { name: string }) => !testDataNames.includes(item.name));
          
          setLogs(prev => [...prev, {
            time: new Date().toLocaleTimeString(),
            message: `准备迁移 ${filteredData.length} 条实际数据处理配置`,
            type: 'info'
          }]);
          
          // 处理数据，移除时间戳字段和处理复杂字段
          const processedData = filteredData.map((item: any) => {
            const newItem = {...item};
            // 删除id字段，让数据库自动生成新id
            delete newItem.id;
            delete newItem.NO;
            delete newItem.create_time;
            delete newItem.created_at;
            
            // 确保复杂字段是对象而不是字符串
            ['inputParams', 'outputParams', 'formulas'].forEach(field => {
              if (typeof newItem[field] === 'string') {
                try {
                  newItem[field] = JSON.parse(newItem[field]);
                } catch (e) {
                  // 如果无法解析，保持原样
                  console.warn(`无法解析${newItem.name}的${field}字段`, e);
                }
              }
            });
            
            // 确保active是布尔值
            if (newItem.active !== undefined) {
              newItem.active = Boolean(newItem.active);
            }
            
            return newItem;
          });
          
          // 获取Supabase适配器
          const adapter = await getAdapter('data_processing_configs', StorageType.Supabase);
          
          // 首先尝试获取已有数据，用于检查重复项
          const existingData = await adapter.getAll();
          const existingNames = new Set(existingData.map((item: any) => item.name));
          
          // 实际迁移的计数器
          let migratedCount = 0;
          let skippedCount = 0;
          let errorCount = 0;
          
          // 逐个迁移，跳过已存在的记录(以name为标识)
          for (const item of processedData) {
            try {
              // 检查是否已存在同名记录
              if (existingNames.has(item.name)) {
                setLogs(prev => [...prev, {
                  time: new Date().toLocaleTimeString(),
                  message: `跳过已存在的记录: ${item.name}`,
                  type: 'warning'
                }]);
                skippedCount++;
                continue;
              }
              
              // 确保有必要的字段
              if (!item.name || !item.sourceNodeId || !item.inputParams || !item.formulas || !item.outputParams) {
                setLogs(prev => [...prev, {
                  time: new Date().toLocaleTimeString(),
                  message: `跳过缺少必要字段的记录: ${item.name || '未命名'}`,
                  type: 'warning'
                }]);
                skippedCount++;
                continue;
              }
              
              await adapter.create({
                ...item,
                NO: undefined // 确保适配器自动生成ID
              });
              setLogs(prev => [...prev, {
                time: new Date().toLocaleTimeString(),
                message: `成功迁移数据处理配置: ${item.name}`,
                type: 'success'
              }]);
              migratedCount++;
              
              // 添加到已存在集合中，防止下一次循环再次处理
              existingNames.add(item.name);
            } catch (error) {
              errorCount++;
              // 检查是否是主键冲突错误
              const errorMsg = formatError(error);
              if (errorMsg.includes('duplicate key value') || errorMsg.includes('23505')) {
                setLogs(prev => [...prev, {
                  time: new Date().toLocaleTimeString(),
                  message: `记录 "${item.name}" 出现ID冲突，尝试手动处理...`,
                  type: 'warning'
                }]);
                
                // 添加一个随机后缀到name，以区分记录
                const timestamp = new Date().getTime();
                const itemWithSuffix = {
                  ...item,
                  name: `${item.name}_备份_${timestamp}`
                };
                
                try {
                  await adapter.create({
                    ...itemWithSuffix,
                    NO: undefined // 确保适配器自动生成ID
                  });
                  setLogs(prev => [...prev, {
                    time: new Date().toLocaleTimeString(),
                    message: `成功迁移(已重命名): ${itemWithSuffix.name}`,
                    type: 'success'
                  }]);
                  migratedCount++;
                } catch (innerError) {
                  setLogs(prev => [...prev, {
                    time: new Date().toLocaleTimeString(),
                    message: `二次尝试迁移失败: ${formatError(innerError)}`,
                    type: 'error'
                  }]);
                }
              } else {
                setLogs(prev => [...prev, {
                  time: new Date().toLocaleTimeString(),
                  message: `迁移记录 "${item.name}" 失败: ${errorMsg}`,
                  type: 'error'
                }]);
              }
            }
          }
          
          // 显示迁移统计信息
          setLogs(prev => [...prev, {
            time: new Date().toLocaleTimeString(),
            message: `数据处理配置迁移总结: 成功=${migratedCount}, 跳过=${skippedCount}, 失败=${errorCount}`,
            type: migratedCount > 0 ? 'success' : 'warning'
          }]);
          
        } catch (error) {
          setLogs(prev => [...prev, {
            time: new Date().toLocaleTimeString(),
            message: `处理data_processing_configs数据失败: ${formatError(error)}`,
            type: 'error'
          }]);
        }
      } else {
        setLogs(prev => [...prev, {
          time: new Date().toLocaleTimeString(),
          message: 'localStorage中没有data_processing_configs数据',
          type: 'warning'
        }]);
      }
    } catch (error) {
      console.error("导入数据处理配置失败:", error);
      setLogs(prev => [...prev, {
        time: new Date().toLocaleTimeString(),
        message: `导入data_processing_configs失败: ${formatError(error)}`,
        type: 'error'
      }]);
    }
  };
  
  // 重置特定的表（完全删除并重建）
  const resetTable = async (tableName: string) => {
    if (!window.confirm(`警告: 将完全删除并重建 ${tableName} 表，所有数据将丢失！继续吗?`)) {
      return;
    }
    
    try {
      setIsResettingTable(true);
      setStatusMessage({text: `正在重置 ${tableName} 表...`, type: 'warning'});
      setLogs([]);
      setShowLogs(true);
      
      // 创建临时日志数组
      const tempLogs: MigrationLog[] = [];
      
      // 使用导出的函数，并传递日志数组
      const result = await dropAndRecreateTable(tableName, tempLogs);
      
      // 更新日志状态
      setLogs(tempLogs);
      
      if (result) {
        setStatusMessage({text: `${tableName} 表已成功重置！`, type: 'success'});
        // 不需要再添加日志，因为dropAndRecreateTable已经添加了
      } else {
        setStatusMessage({text: `重置 ${tableName} 表失败`, type: 'error'});
      }
    } catch (error) {
      console.error(`重置 ${tableName} 表失败:`, error);
      setStatusMessage({
        text: `重置表失败: ${formatError(error)}`,
        type: 'error'
      });
      setLogs(prev => [...prev, {
        time: new Date().toLocaleTimeString(),
        message: `重置表失败: ${formatError(error)}`,
        type: 'error'
      }]);
    } finally {
      setIsResettingTable(false);
    }
  };
  
  // 检查localStorage中的数据
  const checkLocalStorageData = () => {
    try {
      // 检查data_collection_configs
      const collectionData = localStorage.getItem('data_collection_configs');
      if (collectionData) {
        try {
          const parsedData = JSON.parse(collectionData);
          
          setLogs(prev => [
            ...prev, 
            {
              time: new Date().toLocaleTimeString(),
              message: `发现localStorage中有${parsedData.length}条data_collection_configs数据`,
              type: 'info'
            }
          ]);
          
          // 显示所有数据名称
          if (Array.isArray(parsedData) && parsedData.length > 0) {
            const namesList = parsedData.map((item: any) => item.name).join(', ');
            setLogs(prev => [
              ...prev,
              {
                time: new Date().toLocaleTimeString(),
                message: `数据采集配置名称列表: ${namesList}`,
                type: 'info'
              }
            ]);
          }
        } catch (e) {
          setLogs(prev => [...prev, {
            time: new Date().toLocaleTimeString(),
            message: `解析data_collection_configs数据失败: ${formatError(e)}`,
            type: 'error'
          }]);
        }
      } else {
        setLogs(prev => [...prev, {
          time: new Date().toLocaleTimeString(),
          message: 'localStorage中没有data_collection_configs数据',
          type: 'warning'
        }]);
      }
      
      // 检查data_processing_configs
      const processingData = localStorage.getItem('data_processing_configs');
      if (processingData) {
        try {
          const parsedData = JSON.parse(processingData);
          
          setLogs(prev => [
            ...prev, 
            {
              time: new Date().toLocaleTimeString(),
              message: `发现localStorage中有${parsedData.length}条data_processing_configs数据`,
              type: 'info'
            }
          ]);
          
          // 显示所有数据名称
          if (Array.isArray(parsedData) && parsedData.length > 0) {
            const namesList = parsedData.map((item: any) => item.name).join(', ');
            setLogs(prev => [
              ...prev,
              {
                time: new Date().toLocaleTimeString(),
                message: `数据处理配置名称列表: ${namesList}`,
                type: 'info'
              }
            ]);
          }
        } catch (e) {
          setLogs(prev => [...prev, {
            time: new Date().toLocaleTimeString(),
            message: `解析data_processing_configs数据失败: ${formatError(e)}`,
            type: 'error'
          }]);
        }
      } else {
        setLogs(prev => [...prev, {
          time: new Date().toLocaleTimeString(),
          message: 'localStorage中没有data_processing_configs数据',
          type: 'warning'
        }]);
      }
      
      setShowLogs(true);
    } catch (error) {
      console.error("检查LocalStorage数据失败:", error);
      setLogs(prev => [...prev, {
        time: new Date().toLocaleTimeString(),
        message: `检查LocalStorage数据失败: ${formatError(error)}`,
        type: 'error'
      }]);
    }
  };
  
  // 检查所有IndexedDB数据表
  const checkAllIndexedDBTables = async () => {
    try {
      setLogs(prev => [...prev, {
        time: new Date().toLocaleTimeString(),
        message: '开始全面检查本地数据存储...',
        type: 'info'
      }]);
      
      setShowLogs(true);
      
      // 存储发现的数据摘要信息
      let summaryInfo = {
        indexedDB: {
          tableCount: 0,
          totalRecords: 0,
          recordsByTable: {} as Record<string, number>
        },
        localStorage: {
          keysWithData: 0,
          totalRecords: 0,
          recordsByKey: {} as Record<string, number>
        }
      };
      
      // 第1部分: 检查 IndexedDB 数据库
      setLogs(prev => [...prev, {
        time: new Date().toLocaleTimeString(),
        message: '检查 IndexedDB 数据库内容...',
        type: 'info'
      }]);
      
      // 可能的存储表名称，包括常见变体
      const possibleTables = [
        'data_collection_configs',
        'data_processing_configs',
        'DataCollectionCapability',
        'DataProcessingCapability',
        'DataCollectionConfig',
        'DataProcessingConfig',
        'DataCollection',
        'DataProcessing',
        'Configuration',
        'config',
        'configs',
        'settings',
        'nodes',
        'node_configs'
      ];
      
      let foundAnyDataInIndexedDB = false;
      
      // 尝试检查每个可能的表名
      for (const tableName of possibleTables) {
        try {
          const adapter = await getAdapter(tableName, StorageType.IndexedDB);
          const data = await adapter.getAll();
          
          if (Array.isArray(data) && data.length > 0) {
            foundAnyDataInIndexedDB = true;
            summaryInfo.indexedDB.tableCount++;
            summaryInfo.indexedDB.totalRecords += data.length;
            summaryInfo.indexedDB.recordsByTable[tableName] = data.length;
            
            setLogs(prev => [...prev, {
              time: new Date().toLocaleTimeString(),
              message: `【IndexedDB】表"${tableName}"，包含 ${data.length} 条记录`,
              type: 'success'
            }]);
            
            // 显示所有配置名称，使用类型安全的方式处理
            const namesList = data.map((item: any) => {
              if (typeof item === 'object' && item !== null && 'name' in item && item.name) {
                return String(item.name);
              }
              return '[无名称]';
            }).join(', ');
            
            setLogs(prev => [...prev, {
              time: new Date().toLocaleTimeString(),
              message: `【IndexedDB】表"${tableName}"的配置名称: ${namesList}`,
              type: 'info'
            }]);
            
            // 检查是否包含我们要找的特定配置
            const targetConfigs = ["sUSDe Unstake汇率", "USDT/sUSDe汇率", "USDC/sUSDe汇率"];
            const foundTargets = data.filter((item: any) => 
              typeof item === 'object' && item !== null && 'name' in item &&
              targetConfigs.includes(String(item.name))
            );
            
            if (foundTargets.length > 0) {
              setLogs(prev => [...prev, {
                time: new Date().toLocaleTimeString(),
                message: `【发现目标配置】在IndexedDB表"${tableName}"中找到目标配置: ${foundTargets.map((item: any) => item.name).join(', ')}`,
                type: 'success'
              }]);
            }
          }
        } catch (error) {
          // 如果是无法访问表的错误，记录下来
          const errorMsg = formatError(error);
          if (errorMsg.includes('transaction') || errorMsg.includes('not found')) {
            setLogs(prev => [...prev, {
              time: new Date().toLocaleTimeString(),
              message: `【IndexedDB】表"${tableName}"不存在或无法访问`,
              type: 'warning'
            }]);
          }
          // 其他错误忽略
        }
      }
      
      if (!foundAnyDataInIndexedDB) {
        setLogs(prev => [...prev, {
          time: new Date().toLocaleTimeString(),
          message: '【IndexedDB】未找到任何数据表或所有表为空',
          type: 'warning'
        }]);
      }
      
      // 第2部分: 检查 localStorage
      setLogs(prev => [...prev, {
        time: new Date().toLocaleTimeString(),
        message: '检查 localStorage 存储内容...',
        type: 'info'
      }]);
      
      let foundAnyDataInLocalStorage = false;
      
      // 重要的键，我们需要专门检查
      const importantKeys = [
        'data_collection_configs',
        'data_processing_configs',
        'DataCollectionCapability',
        'DataProcessingCapability'
      ];
      
      // 专门检查重要的键
      for (const key of importantKeys) {
        const rawData = localStorage.getItem(key);
        if (rawData) {
          try {
            const parsedData = JSON.parse(rawData);
            
            if (Array.isArray(parsedData) && parsedData.length > 0) {
              foundAnyDataInLocalStorage = true;
              summaryInfo.localStorage.keysWithData++;
              summaryInfo.localStorage.totalRecords += parsedData.length;
              summaryInfo.localStorage.recordsByKey[key] = parsedData.length;
              
              setLogs(prev => [...prev, {
                time: new Date().toLocaleTimeString(),
                message: `【localStorage】键"${key}"，包含 ${parsedData.length} 条记录`,
                type: 'success'
              }]);
              
              // 显示所有配置名称
              if (parsedData.some((item: any) => typeof item === 'object' && item !== null && 'name' in item)) {
                const namesList = parsedData.map((item: any) => {
                  if (typeof item === 'object' && item !== null && 'name' in item) {
                    return String(item.name || '[无名称]');
                  }
                  return '[无名称]';
                }).join(', ');
                
                setLogs(prev => [...prev, {
                  time: new Date().toLocaleTimeString(),
                  message: `【localStorage】键"${key}"的配置名称列表: ${namesList}`,
                  type: 'info'
                }]);
                
                // 检查是否包含我们要找的特定配置
                const targetConfigs = ["sUSDe Unstake汇率", "USDT/sUSDe汇率", "USDC/sUSDe汇率"];
                const foundTargets = parsedData.filter((item: any) => 
                  typeof item === 'object' && item !== null && 'name' in item &&
                  targetConfigs.includes(String(item.name))
                );
                
                if (foundTargets.length > 0) {
                  setLogs(prev => [...prev, {
                    time: new Date().toLocaleTimeString(),
                    message: `【发现目标配置】在localStorage键"${key}"中找到目标配置: ${foundTargets.map((item: any) => item.name).join(', ')}`,
                    type: 'success'
                  }]);
                }
              }
              
              // 如果是data_collection_configs或data_processing_configs，检查数据结构
              if (key === 'data_collection_configs' || key === 'data_processing_configs') {
                const sampleItem = parsedData[0];
                if (sampleItem && typeof sampleItem === 'object') {
                  const fieldsInfo = Object.keys(sampleItem).join(', ');
                  setLogs(prev => [...prev, {
                    time: new Date().toLocaleTimeString(),
                    message: `【localStorage】键"${key}"的数据字段: ${fieldsInfo}`,
                    type: 'info'
                  }]);
                }
              }
            }
          } catch (error) {
            setLogs(prev => [...prev, {
              time: new Date().toLocaleTimeString(),
              message: `【localStorage】无法解析键"${key}"的内容: ${formatError(error)}`,
              type: 'error'
            }]);
          }
        } else {
          setLogs(prev => [...prev, {
            time: new Date().toLocaleTimeString(),
            message: `【localStorage】键"${key}"不存在或为空`,
            type: 'warning'
          }]);
        }
      }
      
      // 检查其他localStorage键
      const allLocalStorageKeys = Object.keys(localStorage);
      const otherKeys = allLocalStorageKeys.filter(key => !importantKeys.includes(key));
      
      if (otherKeys.length > 0) {
        setLogs(prev => [...prev, {
          time: new Date().toLocaleTimeString(),
          message: `【localStorage】发现 ${otherKeys.length} 个其他键: ${otherKeys.join(', ')}`,
          type: 'info'
        }]);
        
        // 检查其他键中是否有可能包含我们的数据
        for (const key of otherKeys) {
          try {
            const rawData = localStorage.getItem(key);
            if (rawData) {
              let data: any;
              try {
                data = JSON.parse(rawData);
              } catch {
                continue; // 跳过非JSON数据
              }
              
              if (Array.isArray(data) && data.length > 0) {
                foundAnyDataInLocalStorage = true;
                summaryInfo.localStorage.keysWithData++;
                summaryInfo.localStorage.totalRecords += data.length;
                summaryInfo.localStorage.recordsByKey[key] = data.length;
                
                // 检查是否包含我们要找的特定配置
                const targetConfigs = ["sUSDe Unstake汇率", "USDT/sUSDe汇率", "USDC/sUSDe汇率"];
                const foundTargets = data.filter((item: any) => 
                  typeof item === 'object' && item !== null && 'name' in item &&
                  targetConfigs.includes(String(item.name))
                );
                
                if (foundTargets.length > 0) {
                  setLogs(prev => [...prev, {
                    time: new Date().toLocaleTimeString(),
                    message: `【发现目标配置】在localStorage键"${key}"中找到目标配置: ${foundTargets.map((item: any) => item.name).join(', ')}`,
                    type: 'success'
                  }]);
                  
                  // 显示所有配置名称
                  const namesList = data.map((item: any) => {
                    if (typeof item === 'object' && item !== null && 'name' in item) {
                      return String(item.name || '[无名称]');
                    }
                    return '[无名称]';
                  }).join(', ');
                  
                  setLogs(prev => [...prev, {
                    time: new Date().toLocaleTimeString(),
                    message: `【localStorage】键"${key}"的配置名称列表: ${namesList}`,
                    type: 'info'
                  }]);
                }
              }
            }
          } catch (error) {
            // 忽略解析错误
          }
        }
      }
      
      if (!foundAnyDataInLocalStorage) {
        setLogs(prev => [...prev, {
          time: new Date().toLocaleTimeString(),
          message: '【localStorage】未找到任何数据或所有数据为空',
          type: 'warning'
        }]);
      }
      
      // 在日志中总结数据存储状态
      setLogs(prev => [...prev, {
        time: new Date().toLocaleTimeString(),
        message: '---- 数据存储检查摘要 ----',
        type: 'info'
      }]);
      
      setLogs(prev => [...prev, {
        time: new Date().toLocaleTimeString(),
        message: `【IndexedDB】共 ${summaryInfo.indexedDB.tableCount} 个表, ${summaryInfo.indexedDB.totalRecords} 条记录`,
        type: 'info'
      }]);
      
      setLogs(prev => [...prev, {
        time: new Date().toLocaleTimeString(),
        message: `【localStorage】共 ${summaryInfo.localStorage.keysWithData} 个数据键, ${summaryInfo.localStorage.totalRecords} 条记录`,
        type: 'info'
      }]);
      
      // 分析并给出建议
      if (summaryInfo.indexedDB.totalRecords === 0 && summaryInfo.localStorage.totalRecords > 0) {
        setLogs(prev => [...prev, {
          time: new Date().toLocaleTimeString(),
          message: '【分析】只在localStorage中发现数据，建议使用"直接从缓存迁移"功能',
          type: 'success'
        }]);
      } else if (summaryInfo.indexedDB.totalRecords > 0 && summaryInfo.localStorage.totalRecords === 0) {
        setLogs(prev => [...prev, {
          time: new Date().toLocaleTimeString(),
          message: '【分析】只在IndexedDB中发现数据，建议使用"从IndexedDB迁移到Supabase"功能',
          type: 'success'
        }]);
      } else if (summaryInfo.indexedDB.totalRecords > 0 && summaryInfo.localStorage.totalRecords > 0) {
        setLogs(prev => [...prev, {
          time: new Date().toLocaleTimeString(),
          message: '【分析】同时在IndexedDB和localStorage中发现数据，建议先使用"从IndexedDB迁移到Supabase"，再使用"直接从缓存迁移"',
          type: 'success'
        }]);
      } else {
        setLogs(prev => [...prev, {
          time: new Date().toLocaleTimeString(),
          message: '【分析】未发现任何数据。您可能需要手动创建配置或从备份恢复。',
          type: 'warning'
        }]);
      }
      
    } catch (error) {
      console.error("检查数据存储失败:", error);
      setLogs(prev => [...prev, {
        time: new Date().toLocaleTimeString(),
        message: `检查数据存储失败: ${formatError(error)}`,
        type: 'error'
      }]);
    }
  };
  
  // 迁移原始旧表数据到Supabase
  const migrateOriginalData = async () => {
    if (!window.confirm('确定要将旧表格(DataCollectionCapability)的数据迁移到Supabase吗？')) {
      return;
    }
    
    try {
      setIsMigrating(true);
      setLogs([]);
      setShowLogs(true);
      setStatusMessage({text: '开始迁移旧表数据...', type: 'info'});
      
      // 检查Supabase连接
      const connectionResult = await testSupabaseConnection();
      if (!connectionResult.success) {
        setStatusMessage({text: '连接测试失败，无法继续迁移', type: 'error'});
        // 处理日志
        setLogs(prev => {
          const newLogs: MigrationLog[] = [];
          connectionResult.logs.forEach(log => {
            newLogs.push({
              time: new Date().toLocaleTimeString(),
              message: typeof log === 'string' ? log : String(log),
              type: 'info'
            });
          });
          return [...prev, ...newLogs];
        });
        setIsMigrating(false);
        return;
      }
      
      // 处理日志
      setLogs(prev => {
        const newLogs: MigrationLog[] = [];
        connectionResult.logs.forEach(log => {
          newLogs.push({
            time: new Date().toLocaleTimeString(),
            message: typeof log === 'string' ? log : String(log),
            type: 'info'
          });
        });
        return [...prev, ...newLogs];
      });
      
      // 记录统计
      let migratedCount = 0;
      let skippedCount = 0;
      let errorCount = 0;
      
      // 迁移DataCollectionCapability -> data_collection_configs
      try {
        setLogs(prev => [...prev, {
          time: new Date().toLocaleTimeString(),
          message: '正在读取DataCollectionCapability表...',
          type: 'info'
        }]);
        
        // 获取原始数据
        const originalAdapter = await getAdapter('DataCollectionCapability', StorageType.IndexedDB);
        const originalData = await originalAdapter.getAll();
        
        if (Array.isArray(originalData) && originalData.length > 0) {
          setLogs(prev => [...prev, {
            time: new Date().toLocaleTimeString(),
            message: `找到 ${originalData.length} 条旧表格记录，准备迁移`,
            type: 'info'
          }]);
          
          // 转换数据格式并迁移
          const targetAdapter = await getAdapter('data_collection_configs', StorageType.Supabase);
          
          // 获取现有数据，用于检查重复
          const existingData = await targetAdapter.getAll();
          const existingNames = new Set(existingData.map((item: any) => item.name));
          
          for (const item of originalData) {
            try {
              // 确保item是一个对象并且不为null
              const itemObj: Record<string, any> = (typeof item === 'object' && item !== null) ? item : {};
              
              // 处理数据，转换格式，确保具有正确的属性和类型
              const newItem: {
                name: string;
                type: string;
                config: Record<string, any>;
                active: boolean;
              } = {
                name: (typeof itemObj.name === 'string') ? itemObj.name : '未命名',
                type: (typeof itemObj.type === 'string') ? itemObj.type : 'default',
                config: (() => {
                  if (itemObj.config !== undefined) {
                    if (typeof itemObj.config === 'string') {
                      try {
                        return JSON.parse(itemObj.config);
                      } catch {
                        return {};
                      }
                    }
                    return typeof itemObj.config === 'object' ? itemObj.config : {};
                  }
                  return {};
                })(),
                active: Boolean(itemObj.active)
              };
              
              // 检查是否已存在
              if (existingNames.has(newItem.name)) {
                setLogs(prev => [...prev, {
                  time: new Date().toLocaleTimeString(),
                  message: `跳过已存在的记录: ${newItem.name}`,
                  type: 'warning'
                }]);
                skippedCount++;
                continue;
              }
              
              // 写入新表
              await targetAdapter.create({
                ...newItem,
                NO: undefined // 确保适配器自动生成ID
              });
              setLogs(prev => [...prev, {
                time: new Date().toLocaleTimeString(),
                message: `成功迁移旧表记录: ${newItem.name}`,
                type: 'success'
              }]);
              migratedCount++;
              
              // 添加到已存在集合
              existingNames.add(newItem.name);
            } catch (error) {
              errorCount++;
              setLogs(prev => [...prev, {
                time: new Date().toLocaleTimeString(),
                message: `迁移旧表记录失败: ${formatError(error)}`,
                type: 'error'
              }]);
            }
          }
        } else {
          setLogs(prev => [...prev, {
            time: new Date().toLocaleTimeString(),
            message: '旧表格DataCollectionCapability中没有数据',
            type: 'warning'
          }]);
        }
      } catch (error) {
        setLogs(prev => [...prev, {
          time: new Date().toLocaleTimeString(),
          message: `迁移DataCollectionCapability失败: ${formatError(error)}`,
          type: 'error'
        }]);
      }
      
      // 显示迁移统计信息
      setLogs(prev => [...prev, {
        time: new Date().toLocaleTimeString(),
        message: `旧表数据迁移总结: 成功=${migratedCount}, 跳过=${skippedCount}, 失败=${errorCount}`,
        type: migratedCount > 0 ? 'success' : 'warning'
      }]);
      
      if (migratedCount > 0) {
        setStatusMessage({text: '旧表数据迁移完成！', type: 'success'});
      } else {
        setStatusMessage({text: '没有数据被迁移，请检查日志', type: 'warning'});
      }
    } catch (error) {
      console.error('迁移旧表数据失败:', error);
      setStatusMessage({text: `迁移失败: ${formatError(error)}`, type: 'error'});
      setLogs(prev => [...prev, {
        time: new Date().toLocaleTimeString(),
        message: `迁移过程中发生错误: ${formatError(error)}`,
        type: 'error'
      }]);
    } finally {
      setIsMigrating(false);
    }
  };
  
  // 直接从localStorage迁移数据到Supabase
  const migrateFromLocalStorageOnly = async () => {
    if (!window.confirm('确定要直接从localStorage迁移数据到Supabase吗？这会跳过IndexedDB检查。')) {
      return;
    }
    
    try {
      setIsMigrating(true);
      setLogs([]);
      setShowLogs(true);
      setStatusMessage({text: '开始从localStorage直接迁移...', type: 'info'});
      
      // 第1步：检查连接
      setStatusMessage({text: '检查Supabase连接...', type: 'info'});
      const connectionResult = await testSupabaseConnection();
      
      if (!connectionResult.success) {
        setStatusMessage({text: '连接测试失败，无法继续迁移', type: 'error'});
        // 处理日志
        setLogs(prev => {
          const newLogs: MigrationLog[] = [];
          connectionResult.logs.forEach(log => {
            newLogs.push({
              time: new Date().toLocaleTimeString(),
              message: typeof log === 'string' ? log : String(log),
              type: 'info'
            });
          });
          return [...prev, ...newLogs];
        });
        setIsMigrating(false);
        return;
      }
      
      // 处理日志
      setLogs(prev => {
        const newLogs: MigrationLog[] = [];
        connectionResult.logs.forEach(log => {
          newLogs.push({
            time: new Date().toLocaleTimeString(),
            message: typeof log === 'string' ? log : String(log),
            type: 'info'
          });
        });
        return [...prev, ...newLogs];
      });
      
      // 第2步：检查并创建数据库结构
      setStatusMessage({text: '检查数据库结构...', type: 'info'});
      const structureResult = await checkSupabaseStatus();
      setLogs(prev => [...prev, ...structureResult.logs]);
      
      // 优先处理三个需要的配置数据
      let totalMigrated = 0;
      
      // 定义明确的类型
      interface ConfigItem {
        name: string;
        type?: string;
        config?: any;
        active?: boolean;
        [key: string]: any; // 允许其他任意属性
      }
      
      let configsToMigrate: ConfigItem[] = [];
      
      // 从localStorage读取data_collection_configs
      const collectionData = localStorage.getItem('data_collection_configs');
      if (collectionData) {
        try {
          const parsedData = JSON.parse(collectionData);
          
          if (Array.isArray(parsedData) && parsedData.length > 0) {
            setLogs(prev => [...prev, {
              time: new Date().toLocaleTimeString(),
              message: `从localStorage读取 ${parsedData.length} 条data_collection_configs数据`,
              type: 'info'
            }]);
            
            // 显示发现的所有数据名称
            const allNames = parsedData.map((item: ConfigItem) => item.name).join(', ');
            setLogs(prev => [...prev, {
              time: new Date().toLocaleTimeString(),
              message: `发现的配置: ${allNames}`,
              type: 'info'
            }]);
            
            // 查找特定的配置 - 不排除"以太坊价格", "USDT余额", "质押收益率"这些有意义的配置
            const targetConfigs = parsedData.filter((item: ConfigItem) => 
              ["sUSDe Unstake汇率", "USDT/sUSDe汇率", "USDC/sUSDe汇率"].includes(item.name)
            );
            
            if (targetConfigs.length > 0) {
              setLogs(prev => [...prev, {
                time: new Date().toLocaleTimeString(),
                message: `找到 ${targetConfigs.length} 条目标配置: ${targetConfigs.map(c => c.name).join(', ')}`,
                type: 'success'
              }]);
              
              configsToMigrate.push(...targetConfigs);
            } else {
              setLogs(prev => [...prev, {
                time: new Date().toLocaleTimeString(),
                message: '未在data_collection_configs中找到目标配置',
                type: 'warning'
              }]);
            }
            
            // 添加所有其他实际配置(只排除明确的测试配置)
            const testConfigNames = ["测试配置", "测试数据"];
            const otherUsefulConfigs = parsedData.filter((item: ConfigItem) => 
              !testConfigNames.includes(item.name) && 
              !configsToMigrate.some(c => c.name === item.name)
            );
            
            if (otherUsefulConfigs.length > 0) {
              setLogs(prev => [...prev, {
                time: new Date().toLocaleTimeString(),
                message: `找到 ${otherUsefulConfigs.length} 条其他有用配置，将全部迁移`,
                type: 'info'
              }]);
              
              configsToMigrate.push(...otherUsefulConfigs);
            }
          }
        } catch (error) {
          setLogs(prev => [...prev, {
            time: new Date().toLocaleTimeString(),
            message: `解析data_collection_configs失败: ${formatError(error)}`,
            type: 'error'
          }]);
        }
      }
      
      // 还需要检查data_processing_configs，可能目标配置在这里
      const processingData = localStorage.getItem('data_processing_configs');
      if (processingData) {
        try {
          const parsedData = JSON.parse(processingData);
          
          if (Array.isArray(parsedData) && parsedData.length > 0) {
            setLogs(prev => [...prev, {
              time: new Date().toLocaleTimeString(),
              message: `从localStorage读取 ${parsedData.length} 条data_processing_configs数据`,
              type: 'info'
            }]);
            
            // 显示所有配置的名称
            const allNames = parsedData.map((item: ConfigItem) => item.name).join(', ');
            setLogs(prev => [...prev, {
              time: new Date().toLocaleTimeString(),
              message: `发现的数据处理配置: ${allNames}`,
              type: 'info'
            }]);
            
            // 查找特定的配置
            const processingTargetConfigs = parsedData.filter((item: ConfigItem) => 
              ["sUSDe Unstake汇率", "USDT/sUSDe汇率", "USDC/sUSDe汇率"].includes(item.name)
            );
            
            if (processingTargetConfigs.length > 0) {
              setLogs(prev => [...prev, {
                time: new Date().toLocaleTimeString(),
                message: `在data_processing_configs中找到 ${processingTargetConfigs.length} 条目标配置，将迁移到对应表`,
                type: 'success'
              }]);
              
              // 迁移data_processing_configs数据
              const processingAdapter = await getAdapter('data_processing_configs', StorageType.Supabase);
              
              // 获取现有数据，用于检查重复
              const existingProcessingData = await processingAdapter.getAll();
              const existingProcessingNames = new Set(existingProcessingData.map((item: any) => item.name));
              
              // 记录迁移结果
              let processingMigratedCount = 0;
              let processingSkippedCount = 0;
              let processingErrorCount = 0;
              
              // 逐个处理配置
              for (const item of processingTargetConfigs) {
                try {
                  // 处理数据，移除不需要的字段
                  const processedItem: ConfigItem = {
                    name: item.name,
                    active: Boolean(item.active)
                  };
                  
                  // 复制所有其他字段
                  for (const key in item) {
                    if (key !== 'id' && key !== 'NO' && key !== 'created_at' && key !== 'create_time') {
                      // 对于复杂字段，确保它们是对象而不是字符串
                      if (['config', 'inputParams', 'outputParams', 'formulas'].includes(key) && typeof item[key] === 'string') {
                        try {
                          processedItem[key] = JSON.parse(item[key]);
                        } catch (e) {
                          processedItem[key] = item[key];
                        }
                      } else {
                        processedItem[key] = item[key];
                      }
                    }
                  }
                  
                  // 检查是否已存在
                  if (existingProcessingNames.has(processedItem.name)) {
                    setLogs(prev => [...prev, {
                      time: new Date().toLocaleTimeString(),
                      message: `跳过已存在的数据处理配置: ${processedItem.name}`,
                      type: 'warning'
                    }]);
                    processingSkippedCount++;
                    continue;
                  }
                  
                  // 写入Supabase
                  await processingAdapter.create({
                    ...processedItem,
                    NO: undefined // 确保适配器自动生成ID
                  });
                  
                  setLogs(prev => [...prev, {
                    time: new Date().toLocaleTimeString(),
                    message: `成功迁移数据处理配置: ${processedItem.name}`,
                    type: 'success'
                  }]);
                  
                  processingMigratedCount++;
                  totalMigrated++;
                  existingProcessingNames.add(processedItem.name);
                } catch (error) {
                  processingErrorCount++;
                  setLogs(prev => [...prev, {
                    time: new Date().toLocaleTimeString(),
                    message: `迁移数据处理配置失败: ${item.name}, 错误: ${formatError(error)}`,
                    type: 'error'
                  }]);
                }
              }
              
              // 显示统计信息
              setLogs(prev => [...prev, {
                time: new Date().toLocaleTimeString(),
                message: `数据处理配置迁移总结: 成功=${processingMigratedCount}, 跳过=${processingSkippedCount}, 失败=${processingErrorCount}`,
                type: processingMigratedCount > 0 ? 'success' : 'warning'
              }]);
            }
          }
        } catch (error) {
          setLogs(prev => [...prev, {
            time: new Date().toLocaleTimeString(),
            message: `解析data_processing_configs失败: ${formatError(error)}`,
            type: 'error'
          }]);
        }
      }
      
      // 迁移找到的采集配置
      if (configsToMigrate.length > 0) {
        setLogs(prev => [...prev, {
          time: new Date().toLocaleTimeString(),
          message: `准备迁移 ${configsToMigrate.length} 条采集配置到Supabase`,
          type: 'info'
        }]);
        
        // 获取Supabase适配器
        const adapter = await getAdapter('data_collection_configs', StorageType.Supabase);
        
        // 获取现有数据，用于检查重复
        const existingData = await adapter.getAll();
        const existingNames = new Set(existingData.map((item: any) => item.name));
        
        // 记录迁移结果
        let migratedCount = 0;
        let skippedCount = 0;
        let errorCount = 0;
        
        // 逐个处理配置
        for (const item of configsToMigrate) {
          try {
            // 处理数据，移除不需要的字段
            const processedItem: ConfigItem = {
              name: item.name,
              type: item.type || 'api', // 默认类型
              config: item.config,
              active: Boolean(item.active)
            };
            
            // 确保config是对象
            if (typeof processedItem.config === 'string') {
              try {
                processedItem.config = JSON.parse(processedItem.config);
              } catch (e) {
                console.warn(`无法解析${processedItem.name}的config字段`, e);
              }
            }
            
            // 检查是否已存在
            if (existingNames.has(processedItem.name)) {
              setLogs(prev => [...prev, {
                time: new Date().toLocaleTimeString(),
                message: `跳过已存在的配置: ${processedItem.name}`,
                type: 'warning'
              }]);
              skippedCount++;
              continue;
            }
            
            // 写入Supabase
            await adapter.create({
              ...processedItem,
              NO: undefined // 确保适配器自动生成ID
            });
            
            setLogs(prev => [...prev, {
              time: new Date().toLocaleTimeString(),
              message: `成功迁移配置: ${processedItem.name}`,
              type: 'success'
            }]);
            
            migratedCount++;
            totalMigrated++;
            existingNames.add(processedItem.name);
          } catch (error) {
            errorCount++;
            setLogs(prev => [...prev, {
              time: new Date().toLocaleTimeString(),
              message: `迁移配置失败: ${item.name}, 错误: ${formatError(error)}`,
              type: 'error'
            }]);
          }
        }
        
        // 显示统计信息
        setLogs(prev => [...prev, {
          time: new Date().toLocaleTimeString(),
          message: `采集配置迁移总结: 成功=${migratedCount}, 跳过=${skippedCount}, 失败=${errorCount}`,
          type: migratedCount > 0 ? 'success' : 'warning'
        }]);
      } else {
        setLogs(prev => [...prev, {
          time: new Date().toLocaleTimeString(),
          message: '未找到需要迁移的采集配置数据',
          type: 'warning'
        }]);
      }
      
      // 迁移完成
      if (totalMigrated > 0) {
        setStatusMessage({
          text: `直接迁移完成！成功迁移 ${totalMigrated} 条配置。`, 
          type: 'success'
        });
        
        // 建议
        setLogs(prev => [...prev, {
          time: new Date().toLocaleTimeString(),
          message: '提示：迁移完成后，建议切换到"Supabase云数据库"模式使用',
          type: 'info'
        }]);
      } else {
        setStatusMessage({
          text: '未迁移任何数据，请查看日志了解详情', 
          type: 'warning'
        });
      }
    } catch (error) {
      console.error('迁移失败:', error);
      setStatusMessage({
        text: `迁移失败: ${formatError(error)}`, 
        type: 'error'
      });
      
      setLogs(prev => [...prev, {
        time: new Date().toLocaleTimeString(),
        message: `迁移过程中出现错误: ${formatError(error)}`,
        type: 'error'
      }]);
    } finally {
      setIsMigrating(false);
    }
  };
  
  // 在控制台显示localStorage内容
  const showLocalStorageInConsole = () => {
    try {
      // 检查data_processing_configs
      const processingData = localStorage.getItem('data_processing_configs');
      if (processingData) {
        try {
          const parsed = JSON.parse(processingData);
          console.log('====== data_processing_configs 内容 ======');
          console.log(parsed);
          
          // 专门检查目标配置
          const targetConfigs = ["sUSDe Unstake汇率", "USDT/sUSDe汇率", "USDC/sUSDe汇率"];
          const found = parsed.filter((item: any) => targetConfigs.includes(item.name));
          
          console.log('====== 目标配置检查 ======');
          console.log(`找到 ${found.length} 个目标配置`);
          console.log(found);
          
          // 显示所有配置名称
          console.log('====== 所有配置名称 ======');
          console.log(parsed.map((item: any) => item.name));
          
          setLogs(prev => [...prev, {
            time: new Date().toLocaleTimeString(),
            message: `已在控制台输出data_processing_configs内容，包含${parsed.length}个配置`,
            type: 'info'
          }]);
        } catch (error) {
          console.error('解析失败:', error);
          setLogs(prev => [...prev, {
            time: new Date().toLocaleTimeString(),
            message: `解析data_processing_configs失败: ${formatError(error)}`,
            type: 'error'
          }]);
        }
      } else {
        console.log('无data_processing_configs数据');
        setLogs(prev => [...prev, {
          time: new Date().toLocaleTimeString(),
          message: 'localStorage中不存在data_processing_configs数据',
          type: 'warning'
        }]);
      }
      
      // 检查data_collection_configs
      const collectionData = localStorage.getItem('data_collection_configs');
      if (collectionData) {
        try {
          const parsed = JSON.parse(collectionData);
          console.log('====== data_collection_configs 内容 ======');
          console.log(parsed);
          
          // 显示所有配置名称
          console.log('====== 所有采集配置名称 ======');
          console.log(parsed.map((item: any) => item.name));
          
          setLogs(prev => [...prev, {
            time: new Date().toLocaleTimeString(),
            message: `已在控制台输出data_collection_configs内容，包含${parsed.length}个配置`,
            type: 'info'
          }]);
        } catch (error) {
          console.error('解析失败:', error);
        }
      } else {
        console.log('无data_collection_configs数据');
      }
      
      // 尝试检查其他可能的位置
      console.log('====== 其他可能存储位置 ======');
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && !['data_processing_configs', 'data_collection_configs'].includes(key)) {
          try {
            const data = JSON.parse(localStorage.getItem(key) || '');
            if (Array.isArray(data) && data.length > 0) {
              console.log(`键名: ${key}, 包含 ${data.length} 条数据`);
              if (data[0] && typeof data[0] === 'object' && 'name' in data[0]) {
                console.log(`${key} 中的名称:`, data.map((item: any) => item.name));
              }
            }
          } catch (e) {
            // 忽略非JSON数据
          }
        }
      }
      
      setShowLogs(true);
    } catch (error) {
      console.error('检查localStorage失败:', error);
      setLogs(prev => [...prev, {
        time: new Date().toLocaleTimeString(),
        message: `检查localStorage失败: ${formatError(error)}`,
        type: 'error'
      }]);
    }
  };
  
  // 创建示例数据处理配置
  const createSampleProcessingConfigs = () => {
    if (!window.confirm('这将创建三个示例数据处理配置："sUSDe Unstake汇率"、"USDT/sUSDe汇率"和"USDC/sUSDe汇率"，确定继续吗？')) {
      return;
    }
    
    try {
      // 首先读取现有配置
      const existingData = localStorage.getItem('data_processing_configs');
      let configs = existingData ? JSON.parse(existingData) : [];
      
      // 最大NO值
      const maxNO = configs.length > 0 ? Math.max(...configs.map((c: any) => c.NO || 0)) : 0;
      
      // 检查要创建的配置是否已存在
      const targetNames = ["sUSDe Unstake汇率", "USDT/sUSDe汇率", "USDC/sUSDe汇率"];
      const existingNames = new Set(configs.map((c: any) => c.name));
      
      // 示例数据采集节点ID，假设已经有这些节点
      // 通常数据采集节点应该是API调用或区块链读取节点
      const sampleSourceNodeId = 1; // 这应该指向一个实际存在的数据采集节点
      
      // 创建示例配置
      let newConfigs = [];
      let configsAdded = 0;
      
      // sUSDe Unstake汇率配置
      if (!existingNames.has("sUSDe Unstake汇率")) {
        newConfigs.push({
          NO: maxNO + 1,
          name: "sUSDe Unstake汇率",
          sourceNodeId: sampleSourceNodeId,
          inputParams: [
            { name: "unstakeAmount", type: "number", selected: true },
            { name: "currentBalance", type: "number", selected: true }
          ],
          formulas: [
            { 
              name: "unstakeRate", 
              formula: "unstakeAmount / currentBalance * 100", 
              description: "计算sUSDe解除质押的汇率百分比" 
            }
          ],
          outputParams: [
            { name: "rate", type: "number", value: "unstakeRate" }
          ],
          active: true,
          create_time: Date.now()
        });
        configsAdded++;
      }
      
      // USDT/sUSDe汇率配置
      if (!existingNames.has("USDT/sUSDe汇率")) {
        newConfigs.push({
          NO: maxNO + 1 + configsAdded,
          name: "USDT/sUSDe汇率",
          sourceNodeId: sampleSourceNodeId,
          inputParams: [
            { name: "usdtPrice", type: "number", selected: true },
            { name: "sUsdePrice", type: "number", selected: true }
          ],
          formulas: [
            { 
              name: "exchangeRate", 
              formula: "usdtPrice / sUsdePrice", 
              description: "计算USDT对sUSDe的汇率" 
            }
          ],
          outputParams: [
            { name: "rate", type: "number", value: "exchangeRate" }
          ],
          active: true,
          create_time: Date.now()
        });
        configsAdded++;
      }
      
      // USDC/sUSDe汇率配置
      if (!existingNames.has("USDC/sUSDe汇率")) {
        newConfigs.push({
          NO: maxNO + 1 + configsAdded,
          name: "USDC/sUSDe汇率",
          sourceNodeId: sampleSourceNodeId,
          inputParams: [
            { name: "usdcPrice", type: "number", selected: true },
            { name: "sUsdePrice", type: "number", selected: true }
          ],
          formulas: [
            { 
              name: "exchangeRate", 
              formula: "usdcPrice / sUsdePrice", 
              description: "计算USDC对sUSDe的汇率" 
            }
          ],
          outputParams: [
            { name: "rate", type: "number", value: "exchangeRate" }
          ],
          active: true,
          create_time: Date.now()
        });
        configsAdded++;
      }
      
      if (newConfigs.length > 0) {
        // 合并并保存配置
        const updatedConfigs = [...configs, ...newConfigs];
        localStorage.setItem('data_processing_configs', JSON.stringify(updatedConfigs));
        
        setLogs(prev => [...prev, {
          time: new Date().toLocaleTimeString(),
          message: `成功创建 ${newConfigs.length} 个示例数据处理配置`,
          type: 'success'
        }]);
        
        // 提示使用控制台查看
        setLogs(prev => [...prev, {
          time: new Date().toLocaleTimeString(),
          message: '请点击"在控制台查看配置"按钮查看创建的配置',
          type: 'info'
        }]);
      } else {
        setLogs(prev => [...prev, {
          time: new Date().toLocaleTimeString(),
          message: '所有目标配置已存在，未创建新配置',
          type: 'info'
        }]);
      }
      
      setShowLogs(true);
    } catch (error) {
      console.error('创建示例配置失败:', error);
      setLogs(prev => [...prev, {
        time: new Date().toLocaleTimeString(),
        message: `创建示例配置失败: ${formatError(error)}`,
        type: 'error'
      }]);
    }
  };
  
  return (
    <SettingsContainer>
      <Title>系统设置</Title>
      
      {/* Supabase配置部分 */}
      <Section>
        <SectionTitle>Supabase配置</SectionTitle>
        <FormGroup>
          <Label>Supabase URL</Label>
          <Input 
            type="text" 
            value={newSupabaseUrl} 
            onChange={(e) => setNewSupabaseUrl(e.target.value)}
            placeholder="例如: https://your-project-id.supabase.co"
          />
        </FormGroup>
        <FormGroup>
          <Label>Supabase API密钥 (anon key)</Label>
          <div style={{ display: 'flex', position: 'relative' }}>
            <Input 
              type={showApiKey ? "text" : "password"} 
              value={newSupabaseKey} 
              onChange={(e) => setNewSupabaseKey(e.target.value)}
              placeholder="您的Supabase API密钥"
              style={{ paddingRight: '40px' }}
            />
            <button 
              onClick={() => setShowApiKey(!showApiKey)}
              style={{
                position: 'absolute',
                right: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: '#AAAAAA',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              {showApiKey ? '隐藏' : '显示'}
            </button>
          </div>
        </FormGroup>
        <ButtonGroup>
          <Button onClick={updateSupabaseConfig}>
            更新Supabase配置
          </Button>
          <Button className="secondary" onClick={resetSupabaseConfig}>
            重置
          </Button>
          <Button className="secondary" onClick={testSupabaseConnection}>
            测试连接
          </Button>
        </ButtonGroup>
        <Message type="info">
          请从Supabase项目设置 &gt; API中获取URL和anon key。
          配置更新后，请使用"测试连接"按钮验证连接是否正常。
        </Message>
      </Section>
      
      <Section>
        <SectionTitle>数据存储设置</SectionTitle>
        
        <FormGroup>
          <Label>当前数据存储位置</Label>
          <Select value={currentStorage} onChange={handleStorageChange}>
            <option value={StorageType.IndexedDB}>浏览器数据库 (IndexedDB)</option>
            <option value={StorageType.Supabase}>Supabase云数据库</option>
          </Select>
        </FormGroup>
        
        <FormGroup>
          <Label>数据迁移工具</Label>
          
          <MigrateOptions>
            <CheckboxLabel>
              <Checkbox 
                type="checkbox" 
                checked={skipExisting} 
                onChange={e => setSkipExisting(e.target.checked)}
              />
              跳过重复数据（避免重复添加）
            </CheckboxLabel>
          </MigrateOptions>
          
          <ButtonGroup>
            <Button 
              onClick={migrateToSupabase} 
              disabled={isMigrating || isClearing || isResettingTable}>
              {isMigrating ? '迁移中...' : '从IndexedDB迁移到Supabase'}
            </Button>
            <Button 
              className="secondary"
              onClick={validateMigrationResult}
              disabled={isMigrating || isClearing || isResettingTable}>
              验证迁移结果
            </Button>
            <Button 
              onClick={clearSupabase}
              disabled={isMigrating || isClearing || isResettingTable}
              style={{backgroundColor: '#C62828'}}>
              {isClearing ? '清空中...' : '清空Supabase数据库'}
            </Button>
            <Button 
              onClick={testSupabaseConnection}
              disabled={isMigrating || isClearing || isResettingTable}
              style={{backgroundColor: '#0D47A1'}}>
              测试Supabase连接
            </Button>
            <Button 
              onClick={checkDatabaseStatus}
              disabled={isMigrating || isClearing || isResettingTable}
              style={{backgroundColor: '#4A148C'}}>
              检查数据库结构
            </Button>
          </ButtonGroup>
          
          {/* 添加解决序列问题的按钮 */}
          <div style={{ marginTop: '15px' }}>
            <Label>高级操作 (危险)</Label>
            <ButtonGroup>
              <Button 
                onClick={() => resetTable('data_processing_configs')}
                disabled={isMigrating || isClearing || isResettingTable}
                style={{backgroundColor: '#BF360C'}}>
                {isResettingTable ? '重置中...' : '重置数据处理表'}
              </Button>
              <Button 
                onClick={() => resetTable('data_collection_configs')}
                disabled={isMigrating || isClearing || isResettingTable}
                style={{backgroundColor: '#BF360C'}}>
                {isResettingTable ? '重置中...' : '重置数据采集表'}
              </Button>
              <Button 
                onClick={checkLocalStorageData}
                disabled={isMigrating || isClearing || isResettingTable}
                style={{backgroundColor: '#455A64'}}>
                检查本地数据
              </Button>
              <Button 
                disabled={isClearing || isMigrating || isResettingTable} 
                onClick={checkAllIndexedDBTables}
              >
                全面检查数据库
              </Button>
              
              <Button 
                disabled={isClearing || isMigrating || isResettingTable} 
                onClick={showLocalStorageInConsole}
              >
                在控制台查看配置
              </Button>
              
              <Button 
                disabled={isClearing || isMigrating || isResettingTable} 
                onClick={createSampleProcessingConfigs}
                style={{backgroundColor: '#8D6E63'}}
              >
                创建示例sUSDe配置
              </Button>
            </ButtonGroup>
            
            <ButtonGroup style={{ marginTop: '10px' }}>
              <Button 
                onClick={migrateOriginalData}
                disabled={isMigrating || isClearing || isResettingTable}
                style={{backgroundColor: '#0277BD'}}>
                迁移旧表数据
              </Button>
              <Button 
                onClick={migrateFromLocalStorageOnly}
                disabled={isMigrating || isClearing || isResettingTable}
                style={{backgroundColor: '#00796B'}}>
                直接从缓存迁移
              </Button>
              <div style={{ color: '#AAAAAA', fontSize: '12px', marginTop: '5px' }}>
                尝试直接从localStorage迁移数据，这可能有助于恢复"sUSDe Unstake汇率"、"USDT/sUSDe汇率"和"USDC/sUSDe汇率"等配置
              </div>
            </ButtonGroup>
          </div>
          
          {(isMigrating || isClearing || isResettingTable) && (
            <>
              <ProgressBar>
                <ProgressFill width={`${migrateProgress}%`} />
              </ProgressBar>
              <div style={{color: '#AAAAAA'}}>{migrateMessage}</div>
            </>
          )}
        </FormGroup>
        
        {statusMessage && (
          <Message type={statusMessage.type}>
            {statusMessage.text}
          </Message>
        )}
        
        {logs.length > 0 && (
          <FormGroup>
            <button 
              onClick={() => setShowLogs(!showLogs)}
              style={{
                backgroundColor: 'transparent',
                border: 'none',
                color: '#F0B90B',
                cursor: 'pointer',
                padding: '8px 0',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              {showLogs ? '隐藏日志' : '显示详细日志'} 
              <span style={{marginLeft: '5px'}}>{showLogs ? '▲' : '▼'}</span>
            </button>
            
            {showLogs && (
              <LogsContainer>
                <LogsHeader>
                  <LogsTitle>操作日志 ({logs.length}条)</LogsTitle>
                  <div>
                    <ToggleButton 
                      active={logFilter === 'all'} 
                      onClick={() => setLogFilter('all')}
                    >
                      全部
                    </ToggleButton>
                    <ToggleButton 
                      active={logFilter === 'error'} 
                      onClick={() => setLogFilter('error')}
                    >
                      错误
                    </ToggleButton>
                    <ToggleButton 
                      active={logFilter === 'warning'} 
                      onClick={() => setLogFilter('warning')}
                    >
                      警告
                    </ToggleButton>
                    <ToggleButton 
                      active={logFilter === 'success'} 
                      onClick={() => setLogFilter('success')}
                    >
                      成功
                    </ToggleButton>
                    <ToggleButton 
                      active={logFilter === 'info'} 
                      onClick={() => setLogFilter('info')}
                    >
                      信息
                    </ToggleButton>
                    <ClearButton onClick={clearLogs}>清除日志</ClearButton>
                  </div>
                </LogsHeader>
                
                {filteredLogs.length === 0 ? (
                  <div style={{color: '#888888', padding: '10px', textAlign: 'center'}}>
                    没有符合条件的日志
                  </div>
                ) : (
                  filteredLogs.map((log, index) => (
                    <LogEntry key={index} type={log.type}>
                      <LogTime>[{log.time}]</LogTime>
                      <LogMessage type={log.type}>{log.message}</LogMessage>
                    </LogEntry>
                  ))
                )}
              </LogsContainer>
            )}
          </FormGroup>
        )}
      </Section>
      
      <Section>
        <SectionTitle>系统信息</SectionTitle>
        <p style={{color: '#AAAAAA'}}>版本: 1.0.0</p>
        <p style={{color: '#AAAAAA'}}>最后更新: {new Date().toLocaleString('zh-CN')}</p>
      </Section>
    </SettingsContainer>
  );
};

export default Settings; 