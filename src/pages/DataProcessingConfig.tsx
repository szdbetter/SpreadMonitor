import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { Button, Input, Select, Layout, Menu, ConfigProvider, theme, message, Table, Space, Empty, Modal, Form } from 'antd';
import type { SelectProps } from 'antd/es/select';
import { createClient } from '@supabase/supabase-js';
import type { DataCollectionConfigModel } from '../utils/database';
import { useNavigate, useLocation } from 'react-router-dom';
import { SupabaseAdapter } from '../services/adapters/supabaseAdapter';
import { sendRequest } from '../utils/tampermonkey';
import { apiConfigAccess, ApiConfigModel } from '../services/database';
// @ts-ignore
import _ from 'lodash';

const { Content, Sider } = Layout;

// 创建 Supabase 客户端
const config = SupabaseAdapter.getCurrentConfig();
const supabase = createClient(config.url, config.key);

// 类型定义
interface Log {
  type: 'success' | 'error' | 'info';
  message: string;
  timestamp: string;
}

type DataCollectionNodeType = DataCollectionConfigModel['type'];

interface OutputParamConfig {
  name: string;
  type: string;
  description?: string;
}

interface DataCollectionNodeConfig {
  baseUrl: string;
  endpoint: string;
  method?: string;
  headers?: Record<string, string>;
  apiParams?: Record<string, any>;
}

interface DataCollectionNodeData {
  id: string;
  name: string;
  type: string;
  config: string | DataCollectionNodeConfig;
  active: boolean;
  created_at: string;
}

// 修改类型定义
interface BaseParam {
  name: string;
  type: string;
  value?: any;
  selected?: boolean;
}

interface InputParamType extends BaseParam {
  displayName: string;
  jsonPath: string;
}

interface OutputParamType extends BaseParam {
  description?: string;
}

interface FormulaType {
  name: string;
  formula: string;
  description?: string;
  result?: any;
}

interface ApiConfig {
  id: string;
  url?: string;
  method?: string;
  headers?: string | Record<string, string>;
  body?: string | Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

interface DataProcessingConfigModel {
  id: string;
  name: string;
  description?: string;
  api_config_id?: string;
  source_node_id?: string;
  input_params: InputParamType[];
  output_params?: OutputParamType[];
  formulas?: FormulaType[];
  active?: boolean;
  created_at?: string;
  updated_at?: string;
}

// 添加类型定义
interface NodeConfig {
  apiParams?: Record<string, any>;
  baseUrl?: string;
  endpoint?: string;
  headers?: Record<string, any>;
}

// 修改 NodeData 接口
interface NodeData {
  id: string;
  name: string;
  type: string;
  config: {
    baseUrl: string;
    endpoint: string;
    method?: string;
    headers?: Record<string, string>;
    apiParams?: Record<string, any>;
  };
  active: boolean;
  created_at: string;
}

interface ExtendedDataCollectionNode extends Omit<DataCollectionConfigModel, 'type'> {
  type: DataCollectionNodeType;
  key: string;
  title: string;
  value: string;
  is_enabled: boolean;
}

// 添加新的类型定义
interface FieldMapping {
  sourceField: string;
  targetField: string;
  description: string;
}

interface ApiParams {
  customConfig: string;
  fieldMappings?: FieldMapping[];
}

interface NodeConfigType {
  apiParams: {
    customConfig: string;
  };
  baseUrl: string;
  endpoint: string;
  headers: Record<string, string>;
}

// 修改数据采集节点配置类型
interface CollectionNodeConfig {
  apiParams?: {
    customConfig?: string;
    output_fields?: string | any[];
    [key: string]: any;
  };
  baseUrl?: string;
  endpoint?: string;
  headers?: Record<string, string>;
  [key: string]: any;
}

// 修改数据采集节点类型
interface CollectionNode {
  id: string;
  name: string;
  type: string;
  config: string | CollectionNodeConfig;
  api_config_id?: string;
  created_at?: string;
  updated_at?: string;
}

// 修改 StyledSelect 定义
const StyledSelect = styled(Select)`
  width: 300px !important;
  &.ant-select .ant-select-selector {
    width: 300px !important;
  }
` as typeof Select;

// 样式组件定义
const LoadingIndicator = styled.div`
  text-align: center;
  padding: 20px;
  color: #fff;
`;

const PageContainer = styled.div`
  padding: 20px;
  background-color: #141414;
  color: #fff;
  min-height: 100vh;
`;

const PageHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
`;

const PageTitle = styled.h1`
  margin: 0;
  font-size: 24px;
  color: #fff;
`;

const ContentLayout = styled.div`
  display: grid;
  grid-template-columns: 300px 1fr;
  gap: 20px;
`;

const NodeList = styled.div`
  border: 1px solid #303030;
  border-radius: 4px;
  background-color: #1f1f1f;
`;

const NodeListHeader = styled.div`
  padding: 16px;
  font-weight: bold;
  border-bottom: 1px solid #303030;
  color: #fff;
`;

const NodeListContent = styled.div`
  max-height: calc(100vh - 200px);
  overflow-y: auto;
`;

const NodeItem = styled.div<{ selected?: boolean }>`
  padding: 12px 16px;
  cursor: pointer;
  background-color: ${props => props.selected ? '#177ddc' : 'transparent'};
  border-bottom: 1px solid #303030;
  color: #fff;
  &:hover {
    background-color: ${props => props.selected ? '#177ddc' : '#303030'};
  }
`;

const NodeName = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const StatusIndicator = styled.span<{ active?: boolean }>`
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 10px;
  background-color: ${props => props.active ? '#49aa19' : '#595959'};
  color: white;
`;

const ConfigPanel = styled.div`
  padding: 20px;
  border: 1px solid #303030;
  border-radius: 4px;
  background-color: #1f1f1f;
`;

const FormSection = styled.div`
  margin-bottom: 24px;
`;

const SectionTitle = styled.h2`
  font-size: 18px;
  margin-bottom: 16px;
  color: #fff;
`;

const FormRow = styled.div`
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
`;

const FormGroup = styled.div<{ flex?: number }>`
  flex: ${props => props.flex || 1};
`;

const Label = styled.label`
  display: block;
  margin-bottom: 8px;
  color: #fff;
  .required {
    color: #ff4d4f;
    margin-left: 4px;
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 8px;
  margin-top: 24px;
`;

const EmptyState = styled.div`
  text-align: center;
  color: #888;
  padding: 40px;
`;

const LogPanel = styled.div`
  margin-top: 20px;
  padding: 16px;
  border: 1px solid #303030;
  border-radius: 4px;
  background-color: #1f1f1f;
`;

const LogMessage = styled.div<{ type: 'success' | 'error' | 'info' }>`
  margin-bottom: 8px;
  color: ${props => {
    switch (props.type) {
      case 'success': return '#49aa19';
      case 'error': return '#ff4d4f';
      default: return '#888';
    }
  }};
`;

const InfoRow = styled.div`
  margin-bottom: 12px;
  color: #fff;
`;

const InfoLabel = styled.span`
  font-weight: bold;
  margin-right: 8px;
  color: #fff;
`;

const InfoValue = styled.span`
  color: #fff;
`;

// 添加计算公式相关的组件
const FormulaEditor = styled.div`
  margin-top: 16px;
  padding: 16px;
  border: 1px solid #303030;
  border-radius: 4px;
  background-color: #1f1f1f;
`;

const FormulaRow = styled.div`
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
  align-items: flex-start;
`;

const FormulaInput = styled(Input.TextArea)`
  flex: 1;
`;

const OperatorButton = styled(Button)`
  min-width: 40px;
`;

// 添加 getNestedValue 函数
const getNestedValue = (obj: any, path: string): any => {
  const keys = path.split('.');
  let result = obj;
  
  for (const key of keys) {
    if (result === null || result === undefined) {
      return undefined;
    }
    result = result[key];
  }
  
  return result;
};

const DataProcessingConfig: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [nodes, setNodes] = useState<DataProcessingConfigModel[]>([]);
  const [dataCollectionNodes, setDataCollectionNodes] = useState<ExtendedDataCollectionNode[]>([]);
  const initialNode: DataProcessingConfigModel = {
    id: '',
    name: '',
    input_params: [],
    output_params: [],
    formulas: [],
    active: false,
    created_at: new Date().toISOString()
  };
  const [currentNode, setCurrentNode] = useState<DataProcessingConfigModel | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [logs, setLogs] = useState<Log[]>([]);

  // 事件处理函数
  const handleNodeSelect = (node: DataProcessingConfigModel) => {
    setCurrentNode(node);
  };

  const handleSourceNodeChange = async (value: string) => {
    console.log('选择数据采集节点，ID:', value);
    if (!value || !currentNode) {
      console.error('无效的数据采集节点ID或当前节点为空');
      return;
    }

    try {
      // 获取数据采集节点配置
      console.log('正在获取数据采集节点配置...');
      const { data: collectionNode, error: collectionError } = await supabase
        .from('data_collection_configs')
        .select('*')
        .eq('id', value)
        .single();

      if (collectionError) {
        console.error('获取数据采集节点配置失败:', collectionError);
        throw collectionError;
      }
      if (!collectionNode) {
        console.error('未找到数据采集节点配置');
        throw new Error('未找到数据采集节点');
      }

      console.log('选择的数据采集节点:', JSON.stringify(collectionNode, null, 2));

      // 解析配置
      const typedCollectionNode = collectionNode as CollectionNode;
      let nodeConfig: CollectionNodeConfig;
      
      try {
        if (typeof typedCollectionNode.config === 'string') {
          console.log('解析数据采集节点配置(字符串):', typedCollectionNode.config);
          nodeConfig = JSON.parse(typedCollectionNode.config);
        } else {
          console.log('解析数据采集节点配置(对象):', JSON.stringify(typedCollectionNode.config, null, 2));
          nodeConfig = typedCollectionNode.config;
        }
        
        console.log('解析后的节点配置:', JSON.stringify(nodeConfig, null, 2));
      } catch (error) {
        console.error('解析数据采集节点配置失败:', error);
        throw new Error(`解析数据采集节点配置失败: ${error instanceof Error ? error.message : String(error)}`);
      }

      // 从 customConfig 中提取字段映射
      let inputParams: InputParamType[] = [];
      
      // 确保 apiParams 存在
      if (!nodeConfig.apiParams) {
        console.warn('节点配置中没有 apiParams 字段');
        nodeConfig.apiParams = { customConfig: '{}' };
      }
      
      // 确保 customConfig 存在
      if (!nodeConfig.apiParams.customConfig) {
        console.warn('apiParams 中没有 customConfig 字段');
        nodeConfig.apiParams.customConfig = '{}';
      }
      
      console.log('customConfig 原始内容:', nodeConfig.apiParams.customConfig);
      
      // 解析 customConfig
      let customConfigObj: any = {};
      try {
        if (typeof nodeConfig.apiParams.customConfig === 'string') {
          customConfigObj = JSON.parse(nodeConfig.apiParams.customConfig);
          console.log('成功解析 customConfig 为JSON对象');
        } else {
          customConfigObj = nodeConfig.apiParams.customConfig || {};
          console.log('customConfig 已经是对象');
        }
      } catch (e) {
        console.error('解析 customConfig 失败，使用空对象:', e);
        customConfigObj = {};
      }
      
      console.log('解析后的自定义配置:', JSON.stringify(customConfigObj, null, 2));
      
      // 1. 尝试从 fieldMappings 提取参数
      try {
        // 检查 fieldMappings 是否存在
        if (!customConfigObj.fieldMappings) {
          console.warn('自定义配置中没有 fieldMappings 字段');
          customConfigObj.fieldMappings = {};
        }
        
        console.log('字段映射:', JSON.stringify(customConfigObj.fieldMappings, null, 2));
        
        // 从字段映射中提取输入参数
        if (typeof customConfigObj.fieldMappings === 'object' && 
            !Array.isArray(customConfigObj.fieldMappings) && 
            Object.keys(customConfigObj.fieldMappings).length > 0) {
          // 对象形式的字段映射
          console.log('从字段映射对象中提取参数');
          inputParams = Object.entries(customConfigObj.fieldMappings).map(([key, value]) => {
            console.log(`映射字段: ${key} => ${value}`);
            return {
              name: key,
              type: 'string',
              displayName: key,
              jsonPath: value as string,
              value: '',
              selected: true
            };
          });
        } else if (Array.isArray(customConfigObj.fieldMappings) && 
                  customConfigObj.fieldMappings.length > 0) {
          // 数组形式的字段映射
          console.log('从字段映射数组中提取参数');
          inputParams = customConfigObj.fieldMappings.map((mapping: any) => {
            console.log(`映射字段: ${mapping.sourceField || mapping.name} => ${mapping.targetField || mapping.path || mapping.jsonPath}`);
            return {
              name: mapping.sourceField || mapping.name || `field_${Math.random().toString(36).substring(7)}`,
              type: 'string',
              displayName: mapping.sourceField || mapping.name || '未命名字段',
              jsonPath: mapping.targetField || mapping.path || mapping.jsonPath || '',
              value: '',
              selected: true
            };
          });
        }
        
        console.log('从 fieldMappings 提取的输入参数:', JSON.stringify(inputParams, null, 2));
      } catch (error) {
        console.error('解析自定义配置中的字段映射失败:', error);
      }

      // 2. 如果没有从 fieldMappings 找到参数，尝试从 output_fields 获取
      if (inputParams.length === 0 && nodeConfig.apiParams && nodeConfig.apiParams.output_fields) {
        console.log('尝试从 output_fields 中提取参数');
        try {
          const outputFields = typeof nodeConfig.apiParams.output_fields === 'string'
            ? JSON.parse(nodeConfig.apiParams.output_fields)
            : nodeConfig.apiParams.output_fields;
            
          console.log('output_fields:', JSON.stringify(outputFields, null, 2));
          
          if (Array.isArray(outputFields)) {
            inputParams = outputFields.map(field => ({
              name: field.name || field.field || `field_${Math.random().toString(36).substring(7)}`,
              type: field.type || 'string',
              displayName: field.displayName || field.name || field.field || '未命名字段',
              jsonPath: field.path || field.jsonPath || '',
              value: '',
              selected: true
            }));
            console.log('从 output_fields 提取的参数:', JSON.stringify(inputParams, null, 2));
          }
        } catch (e) {
          console.error('解析 output_fields 失败:', e);
        }
      }
      
      // 3. 尝试从 customConfig 直接获取字段
      if (inputParams.length === 0 && customConfigObj && typeof customConfigObj === 'object') {
        console.log('尝试从 customConfig 对象本身提取字段');
        const fields = Object.keys(customConfigObj).filter(key => 
          key !== 'fieldMappings' && 
          typeof customConfigObj[key] !== 'object' && 
          typeof customConfigObj[key] !== 'function'
        );
        
        if (fields.length > 0) {
          console.log('从 customConfig 找到的字段:', fields);
          inputParams = fields.map(field => ({
            name: field,
            type: 'string',
            displayName: field,
            jsonPath: field,
            value: customConfigObj[field] || '',
            selected: true
          }));
        }
      }

      // 4. 最后尝试从节点配置的顶层提取字段
      if (inputParams.length === 0) {
        console.log('尝试从节点配置的顶层获取字段');
        const fields = Object.keys(nodeConfig).filter(key => 
          key !== 'apiParams' && 
          key !== 'headers' && 
          typeof nodeConfig[key] !== 'object' && 
          typeof nodeConfig[key] !== 'function'
        );
        
        if (fields.length > 0) {
          console.log('从节点配置顶层找到的字段:', fields);
          inputParams = fields.map(field => ({
            name: field,
            type: 'string',
            displayName: field,
            jsonPath: field,
            value: nodeConfig[field] || '',
            selected: true
          }));
        }
      }

      // 更新当前节点
      setCurrentNode(prev => {
        if (!prev) return prev;
        const updatedNode = {
          ...prev,
          source_node_id: value,
          api_config_id: typedCollectionNode.api_config_id,
          input_params: inputParams.length > 0 ? inputParams : prev.input_params
        };
        console.log('更新后的节点数据:', JSON.stringify(updatedNode, null, 2));
        return updatedNode;
      });
      
      console.log(`已更新数据采集节点ID: ${value}，共提取 ${inputParams.length} 个输入参数`);
      if (inputParams.length === 0) {
        message.warning('未从数据采集节点找到可用的字段映射，请手动添加参数');
      } else {
        message.success(`已从数据采集节点提取 ${inputParams.length} 个参数`);
      }

    } catch (error) {
      console.error('获取数据采集节点配置失败:', error);
      message.error(`获取数据采集节点配置失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const handleStatusChange: SelectProps['onChange'] = (value) => {
    setCurrentNode(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        active: value === 'true'
      };
    });
  };

  const handleInputParamUpdate = (index: number, updates: Partial<InputParamType>) => {
    setCurrentNode(prev => {
      if (!prev) return prev;
      const newInputParams = [...prev.input_params];
      const updatedParam = { ...newInputParams[index], ...updates };
      newInputParams[index] = updatedParam;
      return { ...prev, input_params: newInputParams };
    });
  };

  const handleOutputParamUpdate = (index: number, updates: Partial<OutputParamType>) => {
    setCurrentNode(prev => {
      if (!prev) return prev;
      const newOutputParams = [...(prev.output_params || [])];
      const updatedParam = { ...newOutputParams[index], ...updates } as OutputParamType;
      newOutputParams[index] = updatedParam;
      return { ...prev, output_params: newOutputParams };
    });
  };

  const handleFormulaUpdate = (index: number, updates: Partial<FormulaType>) => {
    setCurrentNode(prev => {
      if (!prev) return prev;
      const newFormulas = [...(prev.formulas || [])];
      const updatedFormula = { ...newFormulas[index], ...updates } as FormulaType;
      newFormulas[index] = updatedFormula;
      return { ...prev, formulas: newFormulas };
    });
  };

  const handleAddInputParam = () => {
    // 创建临时状态保存新参数值
    let tempName = '';
    let tempDisplayName = '';
    let tempJsonPath = '';
    let tempType = 'string';
    
    Modal.confirm({
      title: '添加输入参数',
      width: 500,
      content: (
        <Form layout="vertical" style={{ marginTop: '16px' }}>
          <Form.Item label="参数名称" required>
            <Input 
              placeholder="请输入参数名称" 
              onChange={(e) => tempName = e.target.value}
            />
          </Form.Item>
          <Form.Item label="显示名称" required>
            <Input 
              placeholder="请输入显示名称" 
              onChange={(e) => tempDisplayName = e.target.value}
            />
          </Form.Item>
          <Form.Item label="JSON 路径" required>
            <Input 
              placeholder="例如：data.result.price" 
              onChange={(e) => tempJsonPath = e.target.value}
            />
          </Form.Item>
          <Form.Item label="参数类型">
            <Select 
              defaultValue="string" 
              style={{ width: '100%' }}
              onChange={(val) => tempType = val}
            >
              <Select.Option value="string">字符串</Select.Option>
              <Select.Option value="number">数字</Select.Option>
              <Select.Option value="boolean">布尔值</Select.Option>
              <Select.Option value="object">对象</Select.Option>
              <Select.Option value="array">数组</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      ),
      okText: '添加',
      cancelText: '取消',
      onOk: () => {
        if (!tempName || !tempDisplayName || !tempJsonPath) {
          message.error('请填写所有必填字段');
          return Promise.reject();
        }
        
        const newParam: InputParamType = {
          name: tempName,
          displayName: tempDisplayName,
          jsonPath: tempJsonPath,
          type: tempType,
          value: '',
          selected: true
        };
        
        setCurrentNode(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            input_params: [...prev.input_params, newParam]
          };
        });
        
        message.success(`已添加参数: ${tempName}`);
        return Promise.resolve();
      }
    });
  };

  const handleAddOutputParam = () => {
    setCurrentNode(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        output_params: [
          ...(prev.output_params || []),
          {
            name: '',
            type: 'string',
            value: '',
            selected: false,
            description: ''
          }
        ]
      };
    });
  };

  const handleAddFormula = () => {
    setCurrentNode(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        formulas: [...(prev.formulas || []), { name: '', formula: '', description: '' }]
      };
    });
  };

  const handleRemoveInputParam = (index: number) => {
    setCurrentNode(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        input_params: prev.input_params.filter((_, i: number) => i !== index)
      };
    });
  };

  const handleRemoveOutputParam = (index: number) => {
    setCurrentNode(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        output_params: (prev.output_params || []).filter((_, i: number) => i !== index)
      };
    });
  };

  const handleRemoveFormula = (index: number) => {
    setCurrentNode(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        formulas: (prev.formulas || []).filter((_, i: number) => i !== index)
      };
    });
  };

  const handleSaveNode = async () => {
    if (!currentNode) return;

    if (!currentNode.name) {
      setLogs(prev => [{
        type: 'error',
        message: '请输入节点名称',
        timestamp: new Date().toLocaleString()
      }, ...prev]);
      return;
    }

    if (!currentNode.source_node_id) {
      setLogs(prev => [{
        type: 'error',
        message: '请选择数据源节点',
        timestamp: new Date().toLocaleString()
      }, ...prev]);
      return;
    }

    setIsLoading(true);
    try {
      const now = new Date().toISOString();
      const nodeToSave = {
        name: currentNode.name,
        source_node_id: currentNode.source_node_id,
        input_params: JSON.stringify(currentNode.input_params || []),
        output_params: JSON.stringify(currentNode.output_params || []),
        formulas: JSON.stringify(currentNode.formulas || []),
        active: currentNode.active || false,
        created_at: currentNode.created_at || now
      };

      let result;
      if (currentNode.id) {
        // 更新现有节点
        result = await supabase
          .from('data_processing_configs')
          .update({ ...nodeToSave, id: currentNode.id })
          .eq('id', currentNode.id)
          .select()
          .single();
      } else {
        // 创建新节点
        result = await supabase
          .from('data_processing_configs')
          .insert(nodeToSave)
          .select()
          .single();
      }

      if (result.error) {
        throw result.error;
      }

      const rawData = result.data as unknown as DataProcessingConfigModel;
      const savedNode: DataProcessingConfigModel = {
        ...rawData,
        input_params: JSON.parse(rawData.input_params as unknown as string || '[]'),
        output_params: JSON.parse(rawData.output_params as unknown as string || '[]'),
        formulas: JSON.parse(rawData.formulas as unknown as string || '[]')
      };

      setNodes(prev => {
        const index = prev.findIndex(n => n.id === savedNode.id);
        if (index >= 0) {
          return prev.map(n => n.id === savedNode.id ? savedNode : n);
        }
        return [...prev, savedNode];
      });

      setCurrentNode(savedNode);
      setIsEditing(false);
      setLogs(prev => [{
        type: 'success',
        message: `节点${currentNode.id ? '更新' : '创建'}成功`,
        timestamp: new Date().toLocaleString()
      }, ...prev]);
    } catch (error: any) {
      console.error('保存节点失败:', error);
      setLogs(prev => [{
        type: 'error',
        message: `节点${currentNode.id ? '更新' : '创建'}失败: ${error.message}`,
        timestamp: new Date().toLocaleString()
      }, ...prev]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteNode = async () => {
    if (!currentNode?.id) return;

    if (!window.confirm('确定要删除此节点吗？此操作不可恢复。')) {
      return;
    }

    setIsLoading(true);
    try {
      const nodeId = currentNode.id;  // 保存 ID 的副本
      const { error } = await supabase
        .from('data_processing_configs')
        .delete()
        .eq('id', nodeId);

      if (error) {
        throw error;
      }

      setNodes(prev => prev.filter(n => n.id !== nodeId));
      setCurrentNode(initialNode);
      setIsEditing(false);
      setLogs(prev => [{
        type: 'success',
        message: '节点删除成功',
        timestamp: new Date().toLocaleString()
      }, ...prev]);
    } catch (error: any) {
      console.error('删除节点失败:', error);
      setLogs(prev => [{
        type: 'error',
        message: `删除节点失败: ${error.message}`,
        timestamp: new Date().toLocaleString()
      }, ...prev]);
    } finally {
      setIsLoading(false);
    }
  };

  // 处理参数更新
  const handleFetchAllParamValues = async () => {
    if (!currentNode) return;
    if (!currentNode.source_node_id) {
      message.error('请先选择数据采集节点');
      return;
    }

    setIsLoading(true);

    try {
      // 先获取数据采集节点详细信息
      const { data: collectionNode, error: collectionNodeError } = await supabase
        .from('data_collection_configs')
        .select('*')
        .eq('id', currentNode.source_node_id)
        .single();
      
      if (collectionNodeError) {
        throw new Error(`获取数据采集节点失败: ${collectionNodeError.message}`);
      }
      
      if (!collectionNode) {
        throw new Error('未找到数据采集节点');
      }
      
      console.log('数据采集节点信息:', collectionNode);
      
      // 解析数据采集节点配置
      const typedCollectionNode = collectionNode as CollectionNode;
      const nodeConfig = typeof typedCollectionNode.config === 'string' 
        ? JSON.parse(typedCollectionNode.config)
        : typedCollectionNode.config;
      
      if (!typedCollectionNode.id) {
        throw new Error('数据采集节点ID不存在');
      }
      
      // 获取 API 配置
      const { data: apiConfig, error: apiConfigError } = await supabase
        .from('api_config')
        .select('*')
        .eq('id', typedCollectionNode.api_config_id)
        .single();

      if (apiConfigError) {
        throw new Error(`获取 API 配置失败: ${apiConfigError.message}`);
      }

      if (!apiConfig) {
        throw new Error('未找到 API 配置');
      }

      const typedApiConfig = apiConfig as ApiConfig;
      console.log('API配置信息:', typedApiConfig);

      // 解析 API 配置
      const url = typedApiConfig.url?.trim();
      if (!url) {
        throw new Error('API URL 未配置');
      }

      // 解析请求头
      let headers: Record<string, string> = {};
      if (typedApiConfig.headers) {
        try {
          headers = typeof typedApiConfig.headers === 'string' 
            ? JSON.parse(typedApiConfig.headers) 
            : typedApiConfig.headers;
        } catch (e) {
          console.warn('解析请求头失败:', e);
        }
      }

      // 解析请求体
      let body: any = null;
      if (typedApiConfig.body) {
        try {
          body = typeof typedApiConfig.body === 'string' 
            ? JSON.parse(typedApiConfig.body) 
            : typedApiConfig.body;
        } catch (e) {
          console.warn('解析请求体失败:', e);
        }
      }

      // 发送请求
      console.log('发送请求配置:', { url, method: typedApiConfig.method || 'GET', headers, body });
      const response = await sendRequest(
        url,
        (typedApiConfig.method as 'GET' | 'POST') || 'GET',
        headers,
        body
      );

      // 更新参数值
      const updatedParams = currentNode.input_params.map(param => {
        const value = _.get(response, param.jsonPath);
        return {
          ...param,
          value: value !== undefined ? value : null
        };
      });

      setCurrentNode(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          input_params: updatedParams
        };
      });

      message.success('获取参数值成功');
    } catch (error) {
      console.error('获取参数值失败:', error);
      message.error(`获取参数值失败: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
    }
  };

  // 处理参数更新
  const handleUpdateParam = (param: InputParamType) => {
    if (!currentNode) return;

    const updatedParams = currentNode.input_params.map(p => 
      p.name === param.name ? param : p
    );

    setCurrentNode(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        input_params: updatedParams
      };
    });
  };

  // 处理参数删除
  const handleDeleteParam = (param: InputParamType) => {
    if (!currentNode) return;

    const updatedParams = currentNode.input_params.filter(p => p.name !== param.name);
    setCurrentNode(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        input_params: updatedParams
      };
    });
  };

  // 处理名称变更
  const handleNameChange = (name: string) => {
    if (!currentNode) return;
    setCurrentNode(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        name
      };
    });
  };

  // 处理参数编辑
  const handleEditParam = (param: InputParamType) => {
    if (!currentNode) return;
    // 实现参数编辑逻辑
    console.log('编辑参数:', param);
  };

  // 添加一个调试功能，查看数据采集节点配置
  const handleDebugNodeConfig = async () => {
    if (!currentNode?.source_node_id) {
      message.error('请先选择数据采集节点');
      return;
    }

    try {
      // 获取数据采集节点配置
      const { data: collectionNode, error: collectionError } = await supabase
        .from('data_collection_configs')
        .select('*')
        .eq('id', currentNode.source_node_id)
        .single();

      if (collectionError) throw collectionError;
      if (!collectionNode) throw new Error('未找到数据采集节点');

      // 转换为 CollectionNode 类型
      const typedNode = collectionNode as CollectionNode;
      
      // 格式化显示配置
      let configStr = '';
      let configObj: any = null;
      
      try {
        if (typeof typedNode.config === 'string') {
          configObj = JSON.parse(typedNode.config);
          configStr = JSON.stringify(configObj, null, 2);
        } else {
          configObj = typedNode.config;
          configStr = JSON.stringify(configObj, null, 2);
        }
      } catch (e: any) {
        configStr = String(typedNode.config);
      }
      
      Modal.info({
        title: '数据采集节点配置',
        width: 800,
        content: (
          <div>
            <h3>节点基本信息</h3>
            <pre style={{ background: '#1a1a1a', padding: '8px', borderRadius: '4px', maxHeight: '200px', overflow: 'auto' }}>
              {JSON.stringify({
                id: typedNode.id,
                name: typedNode.name,
                type: typedNode.type,
                api_config_id: typedNode.api_config_id,
                created_at: typedNode.created_at,
                updated_at: typedNode.updated_at
              }, null, 2)}
            </pre>
            
            <h3>配置详情</h3>
            <pre style={{ background: '#1a1a1a', padding: '8px', borderRadius: '4px', maxHeight: '400px', overflow: 'auto' }}>
              {configStr}
            </pre>
            
            {configObj?.apiParams?.customConfig && (
              <>
                <h3>自定义配置</h3>
                <pre style={{ background: '#1a1a1a', padding: '8px', borderRadius: '4px', maxHeight: '200px', overflow: 'auto' }}>
                  {typeof configObj.apiParams.customConfig === 'string' 
                    ? configObj.apiParams.customConfig 
                    : JSON.stringify(configObj.apiParams.customConfig, null, 2)}
                </pre>
                
                <h4>解析后的自定义配置</h4>
                <pre style={{ background: '#1a1a1a', padding: '8px', borderRadius: '4px', maxHeight: '200px', overflow: 'auto' }}>
                  {(() => {
                    try {
                      const parsed = typeof configObj.apiParams.customConfig === 'string'
                        ? JSON.parse(configObj.apiParams.customConfig)
                        : configObj.apiParams.customConfig;
                      return JSON.stringify(parsed, null, 2);
                    } catch (e: any) {
                      return `解析失败: ${e.message}`;
                    }
                  })()}
                </pre>
              </>
            )}
            
            {configObj?.apiParams?.output_fields && (
              <>
                <h3>输出字段</h3>
                <pre style={{ background: '#1a1a1a', padding: '8px', borderRadius: '4px', maxHeight: '200px', overflow: 'auto' }}>
                  {typeof configObj.apiParams.output_fields === 'string'
                    ? configObj.apiParams.output_fields
                    : JSON.stringify(configObj.apiParams.output_fields, null, 2)}
                </pre>
              </>
            )}
          </div>
        ),
        onOk() {},
      });
    } catch (error) {
      console.error('获取数据采集节点配置失败:', error);
      message.error(`获取数据采集节点配置失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  // 渲染参数表格
  const renderParamsTable = () => {
    if (!currentNode?.input_params?.length) {
      return <Empty description="暂无参数" />;
    }

    const columns = [
      {
        title: '参数名',
        dataIndex: 'name',
        key: 'name',
      },
      {
        title: '显示名称',
        dataIndex: 'displayName',
        key: 'displayName',
      },
      {
        title: 'JSON 路径',
        dataIndex: 'jsonPath',
        key: 'jsonPath',
      },
      {
        title: '值',
        dataIndex: 'value',
        key: 'value',
        render: (value: any) => value || '-'
      },
      {
        title: '操作',
        key: 'action',
        render: (_: unknown, record: InputParamType) => (
          <Space>
            <Button onClick={() => handleEditParam(record)}>编辑</Button>
            <Button danger onClick={() => handleDeleteParam(record)}>删除</Button>
          </Space>
        )
      }
    ];

    return (
      <Table
        dataSource={currentNode.input_params}
        columns={columns}
        rowKey="name"
      />
    );
  };

  // 加载数据
  useEffect(() => {
    const fetchNodes = async () => {
      setIsLoading(true);
      try {
        if (!config.url || !config.key) {
          throw new Error('请先配置 Supabase 环境变量');
        }

        // 获取数据处理节点
        const { data: processingNodes, error: processingError } = await supabase
          .from('data_processing_configs')
          .select('*');

        if (processingError) throw processingError;

        console.log('获取到的数据处理节点:', processingNodes);

        const parsedNodes = (processingNodes || []).map((node: any) => ({
          ...node,
          input_params: JSON.parse(node.input_params || '[]'),
          output_params: JSON.parse(node.output_params || '[]'),
          formulas: JSON.parse(node.formulas || '[]')
        }));

        console.log('解析后的数据处理节点:', parsedNodes);
        setNodes(parsedNodes);

        // 只获取类型为 'api' 或 'contract' 的数据采集节点
        const { data: collectionNodes, error: collectionError } = await supabase
          .from('data_collection_configs')
          .select('*')
          .in('type', ['api', 'contract']);

        if (collectionError) throw collectionError;

        console.log('获取到的数据采集节点:', collectionNodes);

        const extendedCollectionNodes = (collectionNodes || []).map((node: any) => ({
          ...node,
          key: node.id,
          title: node.name,
          value: node.id,
          type: node.type,
          config: node.config || {},
          is_enabled: true
        }));

        console.log('处理后的数据采集节点:', extendedCollectionNodes);
        setDataCollectionNodes(extendedCollectionNodes);

        // 添加到日志
        setLogs(prev => [{
          type: 'info',
          message: `加载了 ${extendedCollectionNodes.length} 个数据采集节点`,
          timestamp: new Date().toLocaleString()
        }, ...prev]);
      } catch (error: any) {
        console.error('加载数据失败:', error);
        setLogs(prev => [{
          type: 'error',
          message: `加载数据失败: ${error.message}`,
          timestamp: new Date().toLocaleString()
        }, ...prev]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchNodes();
  }, []);

  // 添加导航菜单项
  const menuItems = [
    {
      key: '/capability/data-collection',
      label: '数据采集能力',
    },
    {
      key: '/capability/data-processing',
      label: '数据加工能力',
    },
  ];

  return (
    <ConfigProvider
      theme={{
        algorithm: theme.darkAlgorithm,
        token: {
          colorBgContainer: '#1f1f1f',
          colorBorder: '#303030',
          colorText: '#fff',
          colorTextSecondary: '#888',
        },
      }}
    >
      <Layout style={{ minHeight: '100vh', background: '#141414' }}>
        <Sider width={200} theme="dark">
          <Menu
            mode="inline"
            selectedKeys={[location.pathname]}
            items={menuItems}
            onClick={({ key }) => navigate(key)}
            style={{ height: '100%', borderRight: 0 }}
            theme="dark"
          />
        </Sider>
        <Layout style={{ background: '#141414' }}>
          <Content style={{ padding: '24px', minHeight: 280 }}>
            <PageContainer>
              <PageHeader>
                <PageTitle>数据加工能力</PageTitle>
                <Button type="primary" onClick={() => setIsEditing(true)}>
                  添加新节点
                </Button>
              </PageHeader>

              {isLoading && <LoadingIndicator>加载中...</LoadingIndicator>}

              <ContentLayout>
                <NodeList>
                  <NodeListHeader>节点列表</NodeListHeader>
                  <NodeListContent>
                    {nodes.map(node => (
                      <NodeItem 
                        key={node.id} 
                        selected={currentNode?.id === node.id}
                        onClick={() => handleNodeSelect(node)}
                      >
                        <NodeName>
                          {node.name}
                          <StatusIndicator active={node.active}>
                            {node.active ? '已启用' : '已禁用'}
                          </StatusIndicator>
                        </NodeName>
                      </NodeItem>
                    ))}
                  </NodeListContent>
                </NodeList>

                <ConfigPanel>
                  {isEditing ? (
                    <>
                      <FormSection>
                        <SectionTitle>基本信息</SectionTitle>
                        <FormRow>
                          <FormGroup>
                            <Label>节点名称<span className="required">*</span></Label>
                            <Input 
                              value={currentNode?.name || ''} 
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleNameChange(e.target.value)}
                              placeholder="请输入节点名称"
                            />
                          </FormGroup>
                        </FormRow>

                        <FormRow>
                          <FormGroup>
                            <Label>数据采集节点<span className="required">*</span></Label>
                            <StyledSelect 
                              value={currentNode?.source_node_id} 
                              onChange={handleSourceNodeChange}
                              placeholder="请选择数据采集节点"
                              style={{ width: '300px' }}
                            >
                              {dataCollectionNodes.map((node: ExtendedDataCollectionNode) => (
                                <Select.Option key={node.id} value={node.id}>
                                  {node.name}
                                </Select.Option>
                              ))}
                            </StyledSelect>
                          </FormGroup>
                        </FormRow>

                        <FormRow>
                          <FormGroup>
                            <Label>状态</Label>
                            <Select 
                              value={currentNode?.active ? 'true' : 'false'}
                              onChange={handleStatusChange}
                            >
                              <Select.Option value="true">启用</Select.Option>
                              <Select.Option value="false">禁用</Select.Option>
                            </Select>
                          </FormGroup>
                        </FormRow>
                      </FormSection>

                      <FormSection>
                        <SectionTitle>输入参数</SectionTitle>
                        <div style={{ marginBottom: '16px', display: 'flex', gap: '8px' }}>
                          <Button
                            type="primary"
                            onClick={handleFetchAllParamValues}
                            loading={isLoading}
                            disabled={isLoading}
                          >
                            {isLoading ? '正在获取...' : '获取所有参数值'}
                          </Button>
                          <Button onClick={handleAddInputParam}>
                            添加输入参数
                          </Button>
                          <Button 
                            onClick={handleDebugNodeConfig}
                            style={{ background: '#177ddc', color: 'white', fontWeight: 'bold' }}
                          >
                            🔍 查看节点配置
                          </Button>
                        </div>
                        {renderParamsTable()}
                      </FormSection>

                      <FormSection>
                        <SectionTitle>计算公式</SectionTitle>
                        <Button onClick={handleAddFormula} style={{ marginBottom: 16 }}>
                          添加公式
                        </Button>
                        {currentNode?.formulas?.map((formula, index) => (
                          <FormulaEditor key={index}>
                            <FormRow>
                              <FormGroup>
                                <Label>公式名称</Label>
                                <Input
                                  value={formula.name}
                                  onChange={(e) => handleFormulaUpdate(index, { name: e.target.value })}
                                  placeholder="请输入公式名称"
                                />
                              </FormGroup>
                              <Button danger onClick={() => handleRemoveFormula(index)}>删除</Button>
                            </FormRow>
                            <FormulaRow>
                              <FormulaInput
                                value={formula.formula}
                                onChange={(e) => handleFormulaUpdate(index, { formula: e.target.value })}
                                placeholder="请输入计算公式"
                                autoSize={{ minRows: 2 }}
                              />
                            </FormulaRow>
                            <FormRow>
                              <FormGroup>
                                <Label>公式说明</Label>
                                <Input
                                  value={formula.description}
                                  onChange={(e) => handleFormulaUpdate(index, { description: e.target.value })}
                                  placeholder="请输入公式说明"
                                />
                              </FormGroup>
                            </FormRow>
                            <div style={{ marginTop: 8 }}>
                              <OperatorButton onClick={() => handleFormulaUpdate(index, { formula: formula.formula + ' + ' })}>+</OperatorButton>
                              <OperatorButton onClick={() => handleFormulaUpdate(index, { formula: formula.formula + ' - ' })}>-</OperatorButton>
                              <OperatorButton onClick={() => handleFormulaUpdate(index, { formula: formula.formula + ' * ' })}>*</OperatorButton>
                              <OperatorButton onClick={() => handleFormulaUpdate(index, { formula: formula.formula + ' / ' })}>/</OperatorButton>
                              <OperatorButton onClick={() => handleFormulaUpdate(index, { formula: formula.formula + ' ( ' })}>(</OperatorButton>
                              <OperatorButton onClick={() => handleFormulaUpdate(index, { formula: formula.formula + ' ) ' })}>)</OperatorButton>
                            </div>
                          </FormulaEditor>
                        ))}
                      </FormSection>

                      <ButtonGroup>
                        <Button type="primary" onClick={handleSaveNode}>
                          保存
                        </Button>
                        <Button onClick={() => setIsEditing(false)}>
                          取消
                        </Button>
                        {currentNode?.id && (
                          <Button danger onClick={handleDeleteNode}>
                            删除
                          </Button>
                        )}
                      </ButtonGroup>
                    </>
                  ) : currentNode?.id ? (
                    <>
                      <FormSection>
                        <SectionTitle>基本信息</SectionTitle>
                        <InfoRow>
                          <InfoLabel>节点名称:</InfoLabel>
                          <InfoValue>{currentNode.name}</InfoValue>
                        </InfoRow>
                        <InfoRow>
                          <InfoLabel>数据采集节点:</InfoLabel>
                          <InfoValue>
                            {dataCollectionNodes.find((node: ExtendedDataCollectionNode) => node.id === currentNode.source_node_id)?.name || '未知'}
                          </InfoValue>
                        </InfoRow>
                        <InfoRow>
                          <InfoLabel>状态:</InfoLabel>
                          <InfoValue>
                            <StatusIndicator active={currentNode.active}>
                              {currentNode.active ? '已启用' : '已禁用'}
                            </StatusIndicator>
                          </InfoValue>
                        </InfoRow>
                      </FormSection>

                      <ButtonGroup>
                        <Button type="primary" onClick={() => setIsEditing(true)}>
                          编辑
                        </Button>
                        <Button danger onClick={handleDeleteNode}>
                          删除
                        </Button>
                      </ButtonGroup>
                    </>
                  ) : (
                    <EmptyState>
                      请选择一个节点或点击"添加新节点"按钮创建新节点
                    </EmptyState>
                  )}
                </ConfigPanel>
              </ContentLayout>

              {logs.length > 0 && (
                <LogPanel>
                  <SectionTitle>操作日志</SectionTitle>
                  {logs.map((log, index) => (
                    <LogMessage key={index} type={log.type}>
                      [{log.timestamp}] {log.message}
                    </LogMessage>
                  ))}
                </LogPanel>
              )}
            </PageContainer>
          </Content>
        </Layout>
      </Layout>
    </ConfigProvider>
  );
};

export default DataProcessingConfig; 