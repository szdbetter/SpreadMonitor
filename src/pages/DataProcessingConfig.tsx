import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { Button, Input, Select, Layout, Menu, ConfigProvider, theme } from 'antd';
import type { SelectProps } from 'antd/es/select';
import { createClient } from '@supabase/supabase-js';
import type { DataProcessingConfigModel, DataCollectionConfigModel } from '../utils/database';
import { useNavigate, useLocation } from 'react-router-dom';

const { Content, Sider } = Layout;

// 创建 Supabase 客户端
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'your-anon-key';

const supabase = createClient(supabaseUrl, supabaseKey);

// 类型定义
interface Log {
  type: 'success' | 'error' | 'info';
  message: string;
  timestamp: string;
}

type DataCollectionNodeType = DataCollectionConfigModel['type'];

interface ExtendedDataCollectionNode extends Omit<DataCollectionConfigModel, 'type'> {
  type: DataCollectionNodeType;
  key: string;
  title: string;
  value: string;
}

interface InputParamType {
  name: string;
  type: string;
  value?: any;
  selected?: boolean;
}

interface OutputParamType {
  name: string;
  type: string;
  value?: string;
}

interface FormulaType {
  name: string;
  formula: string;
  description?: string;
  result?: any;
}

interface RawDataProcessingConfig extends Omit<DataProcessingConfigModel, 'input_params' | 'output_params' | 'formulas'> {
  input_params: string;
  output_params: string;
  formulas: string;
}

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

const DataProcessingConfig: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [nodes, setNodes] = useState<DataProcessingConfigModel[]>([]);
  const [dataCollectionNodes, setDataCollectionNodes] = useState<ExtendedDataCollectionNode[]>([]);
  const [currentNode, setCurrentNode] = useState<DataProcessingConfigModel>({
    id: '',
    name: '',
    source_node_id: '',
    input_params: [],
    output_params: [],
    formulas: [],
    active: true,
    created_at: '',
    updated_at: ''
  });
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [logs, setLogs] = useState<Log[]>([]);

  // 事件处理函数
  const handleNodeSelect = (node: DataProcessingConfigModel) => {
    setCurrentNode(node);
    setIsEditing(false);
  };

  const handleSourceNodeChange: SelectProps['onChange'] = (value) => {
    setCurrentNode(prev => ({
      ...prev,
      source_node_id: value as string
    }));
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
      const updatedParam = { ...newInputParams[index], ...updates } as InputParamType;
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
    setCurrentNode(prev => ({
      ...prev,
      input_params: [...prev.input_params, { name: '', type: 'string', value: '' }]
    }));
  };

  const handleAddOutputParam = () => {
    setCurrentNode(prev => ({
      ...prev,
      output_params: [...prev.output_params, { name: '', type: 'string', value: '' }]
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
      const nodeToSave: RawDataProcessingConfig = {
        ...currentNode,
        input_params: JSON.stringify(currentNode.input_params),
        output_params: JSON.stringify(currentNode.output_params),
        formulas: JSON.stringify(currentNode.formulas)
      };

      let result;
      if (currentNode.id) {
        // 更新现有节点
        result = await supabase
          .from('data_processing_nodes')
          .update(nodeToSave)
          .eq('id', currentNode.id)
          .select()
          .single();
      } else {
        // 创建新节点
        result = await supabase
          .from('data_processing_nodes')
          .insert(nodeToSave)
          .select()
          .single();
      }

      if (result.error) {
        throw result.error;
      }

      const rawData = result.data as RawDataProcessingConfig;
      const savedNode: DataProcessingConfigModel = {
        ...rawData,
        input_params: JSON.parse(rawData.input_params || '[]'),
        output_params: JSON.parse(rawData.output_params || '[]'),
        formulas: JSON.parse(rawData.formulas || '[]')
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
        .from('data_processing_nodes')
        .delete()
        .eq('id', currentNode.id);

      if (error) {
        throw error;
      }

      setNodes(prev => prev.filter(n => n.id !== currentNode.id));
      setCurrentNode({
        id: '',
        name: '',
        source_node_id: '',
        input_params: [],
        output_params: [],
        formulas: [],
        active: true,
        created_at: '',
        updated_at: ''
      });
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

  // 加载数据
  useEffect(() => {
    const fetchNodes = async () => {
      setIsLoading(true);
      try {
        // 检查 Supabase 配置
        if (!supabaseUrl || !supabaseKey) {
          throw new Error('请先配置 Supabase 环境变量');
        }

        // 尝试获取数据处理节点
        const { data: processingNodes, error: processingError } = await supabase
          .from('data_processing_nodes')
          .select('*');

        if (processingError) {
          throw processingError;
        }

        // 设置空数组作为默认值
        const parsedNodes = (processingNodes || []).map((node: any) => ({
          ...node,
          input_params: JSON.parse(node.input_params || '[]'),
          output_params: JSON.parse(node.output_params || '[]'),
          formulas: JSON.parse(node.formulas || '[]')
        }));

        setNodes(parsedNodes);

        // 尝试获取数据采集节点
        const { data: collectionNodes, error: collectionError } = await supabase
          .from('data_collection_nodes')
          .select('*');

        if (collectionError) {
          throw collectionError;
        }

        // 设置空数组作为默认值
        const extendedCollectionNodes: ExtendedDataCollectionNode[] = (collectionNodes || []).map((node: any) => ({
          ...node,
          key: node.id,
          title: node.name,
          value: node.id,
          type: node.type || 'api',
          config: node.config || {},
          is_enabled: true
        }));

        setDataCollectionNodes(extendedCollectionNodes);
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
                            <Label>数据源节点<span className="required">*</span></Label>
                            <Select 
                              value={currentNode.source_node_id}
                              onChange={handleSourceNodeChange}
                            >
                              <Select.Option value="">请选择数据源节点</Select.Option>
                              {dataCollectionNodes.map((node: ExtendedDataCollectionNode) => (
                                <Select.Option key={node.id} value={node.id}>
                                  {node.name}
                                </Select.Option>
                              ))}
                            </Select>
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
                          <InfoLabel>数据源节点:</InfoLabel>
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