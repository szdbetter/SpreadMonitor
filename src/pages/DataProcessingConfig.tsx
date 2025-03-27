import React, { useState, useEffect, useCallback, useMemo } from 'react';
import styled from 'styled-components';
import type { DataCollectionConfigModel, DataProcessingConfigModel, ProcessingRule, OutputParam } from '../utils/database';
import { DataFactory, StorageType } from '../services/adapters/dataFactory';
import { getCurrentStorageType, addStorageTypeListener } from '../services/adapters/storageManager';
import { supabase } from '../lib/supabaseClient';
import { Button as AntButton, Select as AntSelect, Input as AntInput, Space, Card as AntCard, message } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { fetchApiData, extractFieldValues } from '../services/dataCollectionService';
import type { ApiConfigModel } from '../services/database';
import type { SelectProps } from 'antd/es/select';
import type { BaseOptionType, DefaultOptionType } from 'antd/es/select';

// 简化的数据采集节点类型
interface DataCollectionNode extends DataCollectionConfigModel {
  key: string;
  title: string;
  value: string;
}

// 初始空节点
const emptyNode: DataProcessingConfigModel = {
  id: '',
  name: '',
  source_node_id: '',
  rules: [],
  output_params: [],
  is_enabled: true
};

// 初始空规则
const emptyRule: ProcessingRule = {
  id: '',
  name: '',
  type: 'TRANSFORM',
  config: {},
  active: true
};

// 初始空输出参数
const emptyOutputParam: OutputParam = {
  customName: '',
  displayName: '',
  jsonPath: '',
  type: 'STRING',
  targetField: '',
  value: ''
};

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

const ActionButton = styled(AntButton)`
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

const NodeInfo = styled.div`
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

const Input = styled(AntInput)`
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

const Textarea = styled.textarea`
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #444444;
  border-radius: 4px;
  background-color: #2A2A2A;
  color: #FFFFFF;
  font-size: 14px;
  min-height: 80px;
  
  &:focus {
    outline: none;
    border-color: #F0B90B;
  }
`;

const Select = styled(AntSelect)<SelectProps<string>>`
  width: 100%;
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

const CheckboxLabel = styled.label`
  display: flex;
  align-items: center;
  color: #FFFFFF;
  font-size: 14px;
  cursor: pointer;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 10px;
  margin-top: 20px;
`;

const Button = styled(AntButton)`
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

const ParameterTable = styled.table`
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

const AddButton = styled.button`
  background-color: #444444;
  color: #FFFFFF;
  border: none;
  border-radius: 4px;
  padding: 5px 10px;
  font-size: 13px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  margin-top: 10px;
  
  &:hover {
    background-color: #555555;
  }
`;

const RemoveButton = styled.button`
  background-color: transparent;
  color: #AA0000;
  border: none;
  padding: 4px 8px;
  cursor: pointer;
  font-size: 14px;
  
  &:hover {
    text-decoration: underline;
  }
`;

const TestResultPanel = styled.div`
  margin-top: 20px;
  background-color: #222222;
  border-radius: 4px;
  padding: 15px;
`;

const TestResultTitle = styled.div`
  font-weight: bold;
  margin-bottom: 10px;
  color: white;
`;

const ResultItem = styled.div`
  display: flex;
  justify-content: space-between;
  padding: 5px 0;
  border-bottom: 1px solid #333333;
  
  &:last-child {
    border-bottom: none;
  }
`;

const ResultKey = styled.span`
  color: #AAAAAA;
`;

const ResultValue = styled.span`
  color: #F0B90B;
  font-family: monospace;
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #777777;
  text-align: center;
  padding: 20px;
`;

const EmptyStateTitle = styled.div`
  font-size: 18px;
  margin-bottom: 10px;
`;

const EmptyStateDescription = styled.div`
  font-size: 14px;
  margin-bottom: 20px;
  max-width: 400px;
`;

const ErrorMessage = styled.div`
  color: #FF4444;
  font-size: 13px;
  margin-top: 5px;
`;

const SuccessMessage = styled.div`
  color: #00FF00;
  font-size: 13px;
  margin-top: 5px;
`;

const Card = styled(AntCard)`
  background-color: #2A2A2A;
  border-radius: 5px;
  padding: 20px;
  margin-top: 20px;
`;

const Text = styled.p`
  color: white;
`;

interface LogMessage {
  timestamp: string;
  message: string;
  type: 'info' | 'error' | 'success';
}

interface SupabaseDataCollectionConfig {
  id?: string;
  name: string;
  config: Record<string, any>;
  type: 'contract' | 'api' | 'websocket';
  active: boolean;
}

const DataProcessingConfig: React.FC = () => {
  const [nodes, setNodes] = useState<DataProcessingConfigModel[]>([]);
  const [currentNode, setCurrentNode] = useState<DataProcessingConfigModel>(emptyNode);
  const [selectedNode, setSelectedNode] = useState<DataCollectionNode | null>(null);
  const [dataCollectionNodes, setDataCollectionNodes] = useState<DataCollectionNode[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [logs, setLogs] = useState<LogMessage[]>([]);

  // 获取所有数据处理节点
  const fetchProcessingNodes = async () => {
    try {
      addLog('正在获取数据处理节点列表...');
      const { data: rawData, error } = await supabase
        .from('data_processing_configs')
        .select('*')
        .eq('is_enabled', true);

      if (error) throw error;
      if (!rawData) {
        addLog('未获取到数据处理节点', 'error');
        return;
      }

      const validNodes = rawData as DataProcessingConfigModel[];
      setNodes(validNodes);
      addLog(`成功获取 ${validNodes.length} 个数据处理节点`, 'success');
    } catch (error) {
      addLog(`获取数据处理节点失败: ${error instanceof Error ? error.message : String(error)}`, 'error');
      message.error('获取数据处理节点失败');
    }
  };

  // 初始化加载
  useEffect(() => {
    fetchProcessingNodes();
  }, []);

  // 获取数据采集节点列表
  useEffect(() => {
    const fetchDataCollectionNodes = async () => {
      try {
        addLog('正在获取数据采集节点列表...');
        const { data: rawData, error } = await supabase
          .from('data_collection_configs')
          .select('id, name, config, type, active')
          .eq('is_enabled', true);

        if (error) throw error;
        if (!rawData) {
          addLog('未获取到数据采集节点', 'error');
          return;
        }

        const data = rawData as SupabaseDataCollectionConfig[];
        const mappedNodes: DataCollectionNode[] = data.map(item => ({
          id: item.id || '',
          name: item.name,
          config: item.config,
          type: item.type,
          active: item.active,
          key: item.id || '',
          title: item.name,
          value: item.id || ''
        }));

        setDataCollectionNodes(mappedNodes);
        addLog(`成功获取 ${mappedNodes.length} 个数据采集节点`, 'success');
      } catch (error) {
        addLog(`获取数据采集节点失败: ${error instanceof Error ? error.message : String(error)}`, 'error');
        message.error('获取数据采集节点失败');
      }
    };

    fetchDataCollectionNodes();
  }, []);

  // 处理节点选择
  const handleNodeSelect = (node: DataCollectionNode) => {
    setSelectedNode(node);
    const newNode: DataProcessingConfigModel = {
      ...emptyNode,
      source_node_id: node.id || ''
    };
    setCurrentNode(newNode);
  };

  // 保存节点
  const handleSaveNode = async () => {
    try {
      setIsLoading(true);
      addLog('正在保存节点...');

      if (!currentNode.name.trim()) {
        throw new Error('节点名称不能为空');
      }

      if (!currentNode.source_node_id) {
        throw new Error('请选择数据采集节点');
      }

      if (currentNode.id) {
        // 更新现有节点
        const { error } = await supabase
          .from('data_processing_configs')
          .update(currentNode)
          .eq('id', currentNode.id);

        if (error) throw error;

        setNodes(prev => prev.map(node => 
          node.id === currentNode.id ? currentNode : node
        ));
        addLog('节点更新成功', 'success');
      } else {
        // 创建新节点
        const { data, error } = await supabase
          .from('data_processing_configs')
          .insert([currentNode])
          .select()
          .single();

        if (error) throw error;
        if (!data) throw new Error('创建节点失败');

        const newNode = data as DataProcessingConfigModel;
        setNodes(prev => [...prev, newNode]);
        setCurrentNode(newNode);
        addLog('节点创建成功', 'success');
      }

      setIsEditing(false);
    } catch (error) {
      addLog(`保存节点失败: ${error instanceof Error ? error.message : String(error)}`, 'error');
      message.error('保存节点失败');
    } finally {
      setIsLoading(false);
    }
  };

  // 删除节点
  const handleDeleteNode = async () => {
    if (!currentNode.id || !window.confirm('确定要删除此节点吗？此操作不可恢复。')) {
      return;
    }

    try {
      setIsLoading(true);
      addLog('正在删除节点...');

      const { error } = await supabase
        .from('data_processing_configs')
        .delete()
        .eq('id', currentNode.id);

      if (error) throw error;

      setNodes(prev => prev.filter(node => node.id !== currentNode.id));
      setCurrentNode(emptyNode);
      setSelectedNode(null);
      setIsEditing(false);
      addLog('节点删除成功', 'success');
    } catch (error) {
      addLog(`删除节点失败: ${error instanceof Error ? error.message : String(error)}`, 'error');
      message.error('删除节点失败');
    } finally {
      setIsLoading(false);
    }
  };

  // 添加规则
  const handleAddRule = () => {
    const newRule: ProcessingRule = {
      ...emptyRule,
      id: `rule-${Date.now()}`
    };
    setCurrentNode(prev => ({
      ...prev,
      rules: [...prev.rules, newRule]
    }));
  };

  // 添加输出参数
  const handleAddOutputParam = () => {
    const newParam: OutputParam = {
      ...emptyOutputParam,
      customName: `param-${Date.now()}`
    };
    setCurrentNode(prev => ({
      ...prev,
      output_params: [...prev.output_params, newParam]
    }));
  };

  // 处理规则更新
  const handleRuleUpdate = (index: number, updates: Partial<ProcessingRule>) => {
    setCurrentNode(prev => {
      const updatedRules = [...prev.rules];
      updatedRules[index] = {
        ...updatedRules[index],
        ...updates
      };
      return {
        ...prev,
        rules: updatedRules
      };
    });
  };

  // 处理输出参数更新
  const handleOutputParamUpdate = (index: number, updates: Partial<OutputParam>) => {
    setCurrentNode(prev => {
      const updatedParams = [...prev.output_params];
      updatedParams[index] = {
        ...updatedParams[index],
        ...updates
      };
      return {
        ...prev,
        output_params: updatedParams
      };
    });
  };

  // 删除规则
  const handleRemoveRule = (index: number) => {
    setCurrentNode(prev => ({
      ...prev,
      rules: prev.rules.filter((_, i) => i !== index)
    }));
  };

  // 删除输出参数
  const handleRemoveOutputParam = (index: number) => {
    setCurrentNode(prev => ({
      ...prev,
      output_params: prev.output_params.filter((_, i) => i !== index)
    }));
  };

  // 添加日志的辅助函数
  const addLog = (message: string, type: 'info' | 'error' | 'success' = 'info') => {
    setLogs(prev => [...prev, {
      timestamp: new Date().toLocaleTimeString(),
      message,
      type
    }]);
  };

  return (
    <PageContainer>
      <PageHeader>
        <PageTitle>数据加工能力</PageTitle>
        <ActionButton onClick={() => setIsEditing(true)}>
          添加新节点
        </ActionButton>
      </PageHeader>
      {/* ... rest of the JSX ... */}
    </PageContainer>
  );
};

export default DataProcessingConfig; 