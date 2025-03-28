import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { Button, Input, Select, Layout, Menu, ConfigProvider, theme } from 'antd';
import type { SelectProps } from 'antd/es/select';
import { createClient } from '@supabase/supabase-js';
import type { DataCollectionConfigModel } from '../utils/database';
import { useNavigate, useLocation } from 'react-router-dom';
import { SupabaseAdapter } from '../services/adapters/supabaseAdapter';
import { sendRequest } from '../utils/tampermonkey';

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
  value: string;
  selected: boolean;
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

interface DataProcessingConfigModel {
  id: string;
  name: string;
  source_node_id: string;
  input_params: InputParamType[];
  output_params: OutputParamType[];
  formulas: FormulaType[];
  active: boolean;
  created_at: string;
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
    source_node_id: '',
    input_params: [],
    output_params: [],
    formulas: [],
    active: true,
    created_at: new Date().toISOString()
  };
  const [currentNode, setCurrentNode] = useState<DataProcessingConfigModel>(initialNode);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [logs, setLogs] = useState<Log[]>([]);

  // 事件处理函数
  const handleNodeSelect = (node: DataProcessingConfigModel) => {
    setCurrentNode(node);
    setIsEditing(false);
  };

  const handleSourceNodeChange = async (value: string | null) => {
    console.log('选择的数据采集节点:', value);
    if (!value) return;
    
    setIsLoading(true);
    try {
      const { data: nodeData, error } = await supabase
        .from('data_collection_configs')
        .select('*')
        .eq('id', value)
        .single();

      if (error) throw error;
      
      if (!nodeData) {
        throw new Error('未找到数据采集节点');
      }

      const rawNodeData = nodeData as NodeData;
      
      // 解析配置信息
      let configObj: NodeConfig;
      try {
        configObj = typeof rawNodeData.config === 'string' 
          ? JSON.parse(rawNodeData.config) 
          : rawNodeData.config;
      } catch (e) {
        console.error('配置解析错误:', e);
        configObj = {
          apiParams: { customConfig: '{}' },
          baseUrl: '',
          endpoint: '',
          headers: {}
        };
      }

      // 解析 customConfig 中的字段映射
      let fieldMappings: FieldMapping[] = [];
      try {
        const apiParams = configObj.apiParams || {};
        const customConfig = apiParams.customConfig ? JSON.parse(apiParams.customConfig) : {};
        fieldMappings = customConfig.fieldMappings || [];
      } catch (e) {
        console.error('字段映射解析错误:', e);
      }

      // 将字段映射转换为输入参数
      const inputParams: InputParamType[] = fieldMappings.map(mapping => ({
        name: mapping.targetField,
        displayName: mapping.description,
        jsonPath: mapping.sourceField,
        type: 'string',
        value: '',
        selected: false
      }));

      // 更新当前节点状态
      setCurrentNode(prev => ({
        ...prev,
        source_node_id: value,
        input_params: inputParams
      }));

      setLogs(prev => [{
        type: 'success',
        message: `成功解析数据采集节点参数，共 ${inputParams.length} 个参数`,
        timestamp: new Date().toLocaleString()
      }, ...prev]);
    } catch (error: any) {
      console.error('获取参数值失败:', error);
      setLogs(prev => [{
        type: 'error',
        message: `获取参数值失败: ${error.message}`,
        timestamp: new Date().toLocaleString()
      }, ...prev]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusChange: SelectProps['onChange'] = (value) => {
    setCurrentNode(prev => ({
      ...prev,
      active: value === 'true'
    }));
  };

  const handleInputParamUpdate = (index: number, updates: Partial<InputParamType>) => {
    setCurrentNode(prev => {
      const newInputParams = [...prev.input_params];
      const updatedParam = { ...newInputParams[index], ...updates };
      newInputParams[index] = updatedParam;
      return { ...prev, input_params: newInputParams };
    });
  };

  const handleOutputParamUpdate = (index: number, updates: Partial<OutputParamType>) => {
    setCurrentNode(prev => {
      const newOutputParams = [...prev.output_params];
      const updatedParam = { ...newOutputParams[index], ...updates } as OutputParamType;
      newOutputParams[index] = updatedParam;
      return { ...prev, output_params: newOutputParams };
    });
  };

  const handleFormulaUpdate = (index: number, updates: Partial<FormulaType>) => {
    setCurrentNode(prev => {
      const newFormulas = [...prev.formulas];
      const updatedFormula = { ...newFormulas[index], ...updates } as FormulaType;
      newFormulas[index] = updatedFormula;
      return { ...prev, formulas: newFormulas };
    });
  };

  const handleAddInputParam = () => {
    const newParam: InputParamType = {
      name: '',
      type: 'string',
      displayName: '',
      jsonPath: '',
      value: '',
      selected: false
    };
    
    setCurrentNode(prev => ({
      ...prev,
      input_params: [...prev.input_params, newParam]
    }));
  };

  const handleAddOutputParam = () => {
    setCurrentNode(prev => ({
      ...prev,
      output_params: [
        ...prev.output_params,
        {
          name: '',
          type: 'string',
          value: '',
          selected: false,
          description: ''
        }
      ]
    }));
  };

  const handleAddFormula = () => {
    setCurrentNode(prev => ({
      ...prev,
      formulas: [...prev.formulas, { name: '', formula: '', description: '' }]
    }));
  };

  const handleRemoveInputParam = (index: number) => {
    setCurrentNode(prev => ({
      ...prev,
      input_params: prev.input_params.filter((_, i: number) => i !== index)
    }));
  };

  const handleRemoveOutputParam = (index: number) => {
    setCurrentNode(prev => ({
      ...prev,
      output_params: prev.output_params.filter((_, i: number) => i !== index)
    }));
  };

  const handleRemoveFormula = (index: number) => {
    setCurrentNode(prev => ({
      ...prev,
      formulas: prev.formulas.filter((_, i: number) => i !== index)
    }));
  };

  const handleSaveNode = async () => {
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
        active: currentNode.active,
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
    if (!currentNode.id) return;

    if (!window.confirm('确定要删除此节点吗？此操作不可恢复。')) {
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('data_processing_configs')
        .delete()
        .eq('id', currentNode.id);

      if (error) {
        throw error;
      }

      setNodes(prev => prev.filter(n => n.id !== currentNode.id));
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

  // 修改 handleFetchParamValue 函数
  const handleFetchParamValue = async (index: number) => {
    const param = currentNode.input_params[index];
    if (!param) return;

    setIsLoading(true);
    try {
      setLogs(prev => [{
        type: 'info',
        message: `正在获取参数 "${param.displayName}" 的值...`,
        timestamp: new Date().toLocaleString()
      }, ...prev]);

      // 获取数据采集节点配置
      const { data: nodeData, error } = await supabase
        .from('data_collection_configs')
        .select('*')
        .eq('id', currentNode.source_node_id)
        .single();

      if (error) throw error;
      if (!nodeData) throw new Error('未找到数据采集节点');

      // 解析配置
      const rawNodeData = nodeData as DataCollectionNodeData;
      const config = typeof rawNodeData.config === 'string' 
        ? JSON.parse(rawNodeData.config) as DataCollectionNodeConfig
        : rawNodeData.config;
      
      // 准备调用参数
      const logs: string[] = [];
      const variables: Record<string, string> = {};
      
      // 调用封装的 API 数据获取函数
      const requestConfig = {
        url: `${config.baseUrl}${config.endpoint}`,
        method: config.method || 'GET',
        headers: config.headers || {},
        data: config.apiParams || {},
        logs
      };

      const response = await sendRequest(JSON.stringify(requestConfig));

      if (!response.success) {
        throw new Error(response.error || '获取数据失败');
      }

      // 使用 jsonPath 从响应数据中提取值
      const value = getNestedValue(response.data, param.jsonPath);
      
      // 更新参数值
      setCurrentNode(prev => {
        const newInputParams = [...prev.input_params];
        newInputParams[index] = {
          ...newInputParams[index],
          value: String(value)
        };
        return { ...prev, input_params: newInputParams };
      });

      setLogs(prev => [{
        type: 'success',
        message: `成功获取参数 "${param.displayName}" 的值: ${value}`,
        timestamp: new Date().toLocaleString()
      }, ...prev]);

      // 添加调试日志
      logs.forEach(log => {
        setLogs(prev => [{
          type: 'info',
          message: log,
          timestamp: new Date().toLocaleString()
        }, ...prev]);
      });

    } catch (error: any) {
      console.error('获取参数值失败:', error);
      setLogs(prev => [{
        type: 'error',
        message: `获取参数值失败: ${error.message}`,
        timestamp: new Date().toLocaleString()
      }, ...prev]);
    } finally {
      setIsLoading(false);
    }
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
                              value={currentNode.name} 
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCurrentNode(prev => ({
                                ...prev,
                                name: e.target.value
                              }))}
                              placeholder="请输入节点名称"
                            />
                          </FormGroup>
                        </FormRow>

                        <FormRow>
                          <FormGroup>
                            <Label>数据采集节点<span className="required">*</span></Label>
                            <StyledSelect 
                              value={currentNode.source_node_id || undefined}
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
                              value={currentNode.active ? 'true' : 'false'}
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
                        {(currentNode.input_params as InputParamType[]).map((param, index) => (
                          <FormRow key={index}>
                            <FormGroup flex={1}>
                              <Label>字段名称</Label>
                              <Input value={param.name} disabled />
                            </FormGroup>
                            <FormGroup flex={1}>
                              <Label>显示名称</Label>
                              <Input value={param.displayName} disabled />
                            </FormGroup>
                            <FormGroup flex={1}>
                              <Label>JSON路径</Label>
                              <Input value={param.jsonPath} disabled />
                            </FormGroup>
                            <FormGroup flex={1}>
                              <Label>参数值</Label>
                              <Input.Group compact>
                                <Input
                                  value={param.value}
                                  style={{ width: 'calc(100% - 100px)' }}
                                  disabled
                                />
                                <Button
                                  type="primary"
                                  onClick={() => handleFetchParamValue(index)}
                                  style={{ width: '100px' }}
                                >
                                  获取变量值
                                </Button>
                              </Input.Group>
                            </FormGroup>
                          </FormRow>
                        ))}
                      </FormSection>

                      <FormSection>
                        <SectionTitle>计算公式</SectionTitle>
                        <Button onClick={handleAddFormula} style={{ marginBottom: 16 }}>
                          添加公式
                        </Button>
                        {currentNode.formulas.map((formula, index) => (
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
                        {currentNode.id && (
                          <Button danger onClick={handleDeleteNode}>
                            删除
                          </Button>
                        )}
                      </ButtonGroup>
                    </>
                  ) : currentNode.id ? (
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