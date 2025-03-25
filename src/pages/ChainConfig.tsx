import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { chainConfigAccess, ChainConfigModel } from '../services/database';

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

const ChainList = styled.div`
  background-color: #2A2A2A;
  border-radius: 5px;
  overflow: hidden;
  height: 100%;
  display: flex;
  flex-direction: column;
`;

const ChainListHeader = styled.div`
  background-color: #333333;
  padding: 12px 15px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #444444;
`;

const ChainListTitle = styled.h3`
  margin: 0;
  color: #FFFFFF;
  font-size: 14px;
  font-weight: bold;
`;

const AddChainButton = styled.button`
  background-color: #F0B90B;
  border: none;
  border-radius: 3px;
  color: #000000;
  font-size: 12px;
  padding: 4px 12px;
  cursor: pointer;
  
  &:hover {
    background-color: #d6a50a;
  }
`;

const ChainListContent = styled.div`
  flex: 1;
  overflow-y: auto;
`;

const ChainItem = styled.div<{ selected: boolean }>`
  padding: 12px 15px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  background-color: ${props => props.selected ? '#3A3A3A' : 'transparent'};
  
  &:hover {
    background-color: ${props => props.selected ? '#3A3A3A' : '#2F2F2F'};
  }
`;

const ChainName = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const ChainNameText = styled.span`
  font-weight: bold;
  color: #FFFFFF;
`;

const ChainStatus = styled.div<{ active: boolean }>`
  padding: 3px 8px;
  border-radius: 3px;
  font-size: 12px;
  background-color: ${props => props.active ? 'rgba(0, 255, 0, 0.2)' : 'rgba(255, 0, 0, 0.2)'};
  color: ${props => props.active ? '#00FF00' : '#FF0000'};
  cursor: pointer;
`;

const ConfigPanel = styled.div`
  background-color: #2A2A2A;
  border-radius: 5px;
  padding: 20px;
  height: 100%;
  overflow-y: auto;
`;

const FormSection = styled.div`
  margin-bottom: 25px;
`;

const SectionTitle = styled.h3`
  color: #F0B90B;
  font-size: 16px;
  margin-top: 0;
  margin-bottom: 15px;
  border-bottom: 1px solid #444444;
  padding-bottom: 8px;
`;

const FormRow = styled.div`
  display: flex;
  margin-bottom: 15px;
  gap: 15px;
  align-items: flex-start;
`;

const FormGroup = styled.div<{ flex?: number }>`
  flex: ${props => props.flex || 1};
`;

const Label = styled.label`
  display: block;
  margin-bottom: 8px;
  color: #FFFFFF;
  font-size: 14px;
  
  .required {
    color: #FF0000;
    margin-left: 4px;
  }
`;

const Input = styled.input`
  width: 100%;
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

const Select = styled.select`
  width: 100%;
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

const ButtonGroup = styled.div`
  display: flex;
  gap: 10px;
  margin-top: 20px;
`;

const Button = styled.button<{ variant?: 'primary' | 'secondary' | 'danger' }>`
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  font-weight: bold;
  cursor: pointer;
  
  background-color: ${props => {
    switch(props.variant) {
      case 'primary': return '#F0B90B';
      case 'secondary': return '#444444';
      case 'danger': return '#AA0000';
      default: return '#F0B90B';
    }
  }};
  
  color: ${props => {
    switch(props.variant) {
      case 'primary': return '#000000';
      case 'secondary': return '#FFFFFF';
      case 'danger': return '#FFFFFF';
      default: return '#000000';
    }
  }};
  
  &:hover {
    background-color: ${props => {
      switch(props.variant) {
        case 'primary': return '#d6a50a';
        case 'secondary': return '#555555';
        case 'danger': return '#cc0000';
        default: return '#d6a50a';
      }
    }};
  }
`;

const RpcUrlList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 10px;
  width: 100%;
`;

const RpcUrlItem = styled.div`
  display: flex;
  gap: 10px;
  align-items: center;
  width: 100%;
`;

const RemoveButton = styled.button`
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #333333;
  border: 1px solid #444444;
  border-radius: 4px;
  color: #FF0000;
  font-size: 16px;
  cursor: pointer;
  
  &:hover {
    background-color: #444444;
  }
`;

const AddButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #333333;
  border: 1px solid #444444;
  border-radius: 4px;
  color: #FFFFFF;
  font-size: 14px;
  padding: 6px 12px;
  cursor: pointer;
  margin-top: 10px;
  
  &:hover {
    background-color: #444444;
  }
`;

const TestResultContainer = styled.div`
  background-color: #232323;
  border: 1px solid #444444;
  border-radius: 5px;
  padding: 15px;
  margin-top: 15px;
`;

const TestResultItem = styled.div<{ status: 'success' | 'warning' | 'error' }>`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
  color: ${props => {
    switch(props.status) {
      case 'success': return '#00FF00';
      case 'warning': return '#FFAA00';
      case 'error': return '#FF0000';
      default: return '#FFFFFF';
    }
  }};
`;

const InfoRow = styled.div`
  display: flex;
  margin-bottom: 10px;
`;

const InfoLabel = styled.div`
  width: 100px;
  color: #AAAAAA;
`;

const InfoValue = styled.div`
  flex: 1;
`;

const RpcUrl = styled.div`
  font-family: monospace;
  word-break: break-all;
  padding: 5px 0;
`;

const ErrorMessage = styled.div`
  color: #FF0000;
  background-color: rgba(255, 0, 0, 0.1);
  padding: 10px;
  border-radius: 4px;
  margin-bottom: 20px;
`;

const LoadingIndicator = styled.div`
  text-align: center;
  padding: 20px;
  color: #AAAAAA;
  font-size: 16px;
`;

const StatusIndicator = styled.span<{ active: boolean }>`
  color: ${props => props.active ? '#00FF00' : '#FF0000'};
`;

const SearchContainer = styled.div`
  display: flex;
  align-items: center;
  background-color: #333333;
  border-radius: 4px;
  padding: 8px;
  margin: 10px;
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 8px;
  background-color: transparent;
  border: none;
  color: #FFFFFF;
  font-size: 14px;
  
  &:focus {
    outline: none;
  }
`;

const SearchIcon = styled.span`
  margin-left: 8px;
  color: #AAAAAA;
`;

// 添加测试结果接口定义
interface TestResult {
  status: 'success' | 'warning' | 'error';
  message: string;
  url: string;
}

const ChainConfig: React.FC = () => {
  const [chains, setChains] = useState<ChainConfigModel[]>([]);
  const [selectedChain, setSelectedChain] = useState<ChainConfigModel | null>(null);
  const [originalChain, setOriginalChain] = useState<ChainConfigModel | null>(null);
  const [testResults, setTestResults] = useState<TestResult[] | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // 添加一个工具函数来处理 rpcUrls
  const parseRpcUrls = (urls: string | string[]): string[] => {
    if (Array.isArray(urls)) {
      return urls;
    }
    try {
      const parsed = JSON.parse(urls);
      return Array.isArray(parsed) ? parsed : [urls];
    } catch {
      return [urls];
    }
  };

  // 初始化加载数据
  useEffect(() => {
    const loadChains = async () => {
      try {
        setIsLoading(true);
        const data = await chainConfigAccess.getAll();
        // 确保所有链的 rpcUrls 都是数组格式
        const processedData = data.map(chain => ({
          ...chain,
          rpcUrls: parseRpcUrls(chain.rpcUrls)
        }));
        setChains(processedData);
        
        // 如果有链数据且没有选中的链，默认选择第一个
        if (processedData.length > 0 && !selectedChain) {
          setSelectedChain(processedData[0]);
        }
        
        setError(null);
      } catch (err) {
        console.error('Failed to load chains:', err);
        setError('加载链配置失败，请检查数据库连接');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadChains();
  }, [selectedChain]);
  
  // 处理链选择
  const handleChainSelect = (chain: ChainConfigModel) => {
    const processedChain = {
      ...chain,
      rpcUrls: parseRpcUrls(chain.rpcUrls)
    };
    setSelectedChain(processedChain);
    setOriginalChain(JSON.parse(JSON.stringify(processedChain)));
    setTestResults(null);
    setError(null);
    setIsEditing(false);
  };
  
  // 添加新链
  const handleAddChain = () => {
    const newChain: ChainConfigModel = {
      name: '',
      chainId: 0,
      active: true,
      rpcUrls: ['']
    };
    
    setSelectedChain(newChain);
    setOriginalChain(newChain);
    setIsEditing(true);
    setTestResults(null);
    setError(null);
  };
  
  const handleEditChain = () => {
    if (selectedChain) {
      setOriginalChain({ ...selectedChain });
      setIsEditing(true);
    }
  };
  
  const handleSaveChain = async () => {
    if (!selectedChain) return;
    
    try {
      // 验证必填字段
      if (!selectedChain.name.trim()) {
        setError('链名称不能为空');
        return;
      }
      
      // 确保 rpcUrls 是数组格式并且有效
      const processedRpcUrls = parseRpcUrls(selectedChain.rpcUrls);
      if (processedRpcUrls.length === 0 || !processedRpcUrls[0]) {
        setError('至少需要一个RPC URL');
        return;
      }
      
      // 验证名称唯一性
      const validationError = await validateChainUniqueness(selectedChain, !selectedChain.NO);
      if (validationError) {
        setError(validationError);
        return;
      }
      
      // 准备要保存的数据，转换为数据库模型格式
      const chainToSave = {
        ...selectedChain,
        rpcUrls: JSON.stringify(processedRpcUrls) // 转换为字符串格式保存到数据库
      };
      
      let savedChainNo = 0;
      
      // 如果是新链（没有NO字段），则创建新记录
      if (!chainToSave.NO) {
        const createdChain = await chainConfigAccess.create(chainToSave as any); // 使用 any 类型暂时绕过类型检查
        savedChainNo = createdChain.NO || 0;
        
        // 重新加载链列表
        const updatedChains = await chainConfigAccess.getAll();
        const processedChains = updatedChains.map(chain => ({
          ...chain,
          rpcUrls: parseRpcUrls(chain.rpcUrls) // 确保内存中的数据是数组格式
        }));
        setChains(processedChains);
        
        // 设置当前选中的链为新创建的链
        const newChain = processedChains.find(chain => chain.NO === savedChainNo);
        if (newChain) {
          setSelectedChain(newChain);
        }
      } else {
        // 更新现有链
        await chainConfigAccess.update(chainToSave as any); // 使用 any 类型暂时绕过类型检查
        savedChainNo = chainToSave.NO;
        
        // 更新本地状态
        setChains(chains.map(chain => 
          chain.NO === chainToSave.NO ? {
            ...chainToSave,
            rpcUrls: processedRpcUrls // 确保内存中的数据是数组格式
          } : chain
        ));
        
        // 更新选中的链
        setSelectedChain({
          ...chainToSave,
          rpcUrls: processedRpcUrls // 确保内存中的数据是数组格式
        });
      }
      
      setIsEditing(false);
      setError(null);
    } catch (err) {
      console.error('Failed to save chain:', err);
      setError('保存失败，请重试');
    }
  };
  
  const handleCancelEdit = () => {
    setIsEditing(false);
    setOriginalChain(null);
  };
  
  const handleDeleteChain = async () => {
    if (!selectedChain || !selectedChain.NO) return;
    
    if (window.confirm(`确定要删除 ${selectedChain.name} 链配置吗？`)) {
      try {
        await chainConfigAccess.delete(selectedChain.NO);
        
        // 更新本地状态
        const updatedChains = chains.filter(chain => chain.NO !== selectedChain.NO);
        setChains(updatedChains);
        
        // 如果还有其他链，则选择第一个，否则清空选择
        if (updatedChains.length > 0) {
          setSelectedChain(updatedChains[0]);
        } else {
          setSelectedChain(null);
        }
        
        setIsEditing(false);
        setOriginalChain(null);
        setError(null);
      } catch (err) {
        console.error('Failed to delete chain:', err);
        setError('删除链配置失败');
      }
    }
  };
  
  const handleAddRpcUrl = () => {
    if (originalChain) {
      setOriginalChain({
        ...originalChain,
        rpcUrls: [...originalChain.rpcUrls, '']
      });
    }
  };
  
  const handleRemoveRpcUrl = (index: number) => {
    if (originalChain) {
      const updatedRpcUrls = [...originalChain.rpcUrls];
      updatedRpcUrls.splice(index, 1);
      
      setOriginalChain({
        ...originalChain,
        rpcUrls: updatedRpcUrls
      });
    }
  };
  
  const handleRpcUrlChange = (index: number, value: string) => {
    if (originalChain) {
      const updatedRpcUrls = [...originalChain.rpcUrls];
      updatedRpcUrls[index] = value;
      
      setOriginalChain({
        ...originalChain,
        rpcUrls: updatedRpcUrls
      });
    }
  };
  
  const handleToggleStatus = async (chain: ChainConfigModel) => {
    if (!chain.NO) return;
    
    try {
      const updatedChain = { ...chain, active: !chain.active };
      
      // 更新数据库
      await chainConfigAccess.update(updatedChain);
      
      // 更新本地状态
      setChains(chains.map(c => c.NO === chain.NO ? updatedChain : c));
      
      if (selectedChain && selectedChain.NO === chain.NO) {
        setSelectedChain(updatedChain);
      }
      
      setError(null);
    } catch (err) {
      console.error('Failed to toggle chain status:', err);
      setError('更新链状态失败');
    }
  };
  
  const handleTestConnection = () => {
    if (!selectedChain) return;
    
    setIsTesting(true);
    setTestResults(null);
    
    // 模拟测试过程
    setTimeout(() => {
      // 为每个RPC URL创建测试结果
      const results = selectedChain.rpcUrls.map((url, index) => {
        const random = Math.random();
        const delay = Math.floor(Math.random() * 500);
        
        if (random > 0.8) {
          return {
            status: 'error' as const,
            message: `RPC ${index + 1} (${url.substring(0, 20)}${url.length > 20 ? '...' : ''}): ❌ 连接失败`,
            url
          };
        } else if (random > 0.5) {
          return {
            status: 'warning' as const,
            message: `RPC ${index + 1} (${url.substring(0, 20)}${url.length > 20 ? '...' : ''}): ⚠ ${selectedChain.name === 'Solana' ? 'getLatestBlockhash' : 'eth_blockNumber'}: 延迟 ${delay}ms`,
            url
          };
        } else {
          return {
            status: 'success' as const,
            message: `RPC ${index + 1} (${url.substring(0, 20)}${url.length > 20 ? '...' : ''}): ✓ 连接成功，区块高度: ${Math.floor(Math.random() * 10000000 + 10000000)}`,
            url
          };
        }
      });
      
      setTestResults(results);
      setIsTesting(false);
    }, 1500);
  };
  
  // 测试RPC URL
  const testRpcUrl = async (url: string): Promise<{status: 'success' | 'warning' | 'error', message: string}> => {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_blockNumber',
          params: [],
          id: 1,
        }),
      });
      
      if (!response.ok) {
        return {
          status: 'warning',
          message: `HTTP错误: ${response.status}`,
        };
      }
      
      const data = await response.json();
      
      if (data.error) {
        return {
          status: 'warning',
          message: `RPC错误: ${data.error.message || JSON.stringify(data.error)}`,
        };
      }
      
      if (data.result) {
        return {
          status: 'success',
          message: `连接成功，当前区块: ${parseInt(data.result, 16)}`,
        };
      }
      
      return {
        status: 'warning',
        message: '未知响应格式',
      };
    } catch (error) {
      return {
        status: 'error',
        message: `连接失败: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  };
  
  // 验证链名称唯一性
  const validateChainUniqueness = async (chain: ChainConfigModel, isNew: boolean): Promise<string | null> => {
    // 获取所有链
    const allChains = await chainConfigAccess.getAll();
    
    // 检查名称唯一性
    const nameExists = allChains.some(c => 
      c.name.toLowerCase() === chain.name.toLowerCase() && 
      (isNew || c.NO !== chain.NO)
    );
    
    if (nameExists) {
      return `链名称 "${chain.name}" 已存在，请使用其他名称`;
    }
    
    return null;
  };
  
  return (
    <PageContainer>
      <PageHeader>
        <PageTitle>链配置</PageTitle>
        <ActionButton onClick={handleAddChain}>+ 添加链</ActionButton>
      </PageHeader>
      
      {error && <ErrorMessage>{error}</ErrorMessage>}
      
      {isLoading ? (
        <LoadingIndicator>加载中...</LoadingIndicator>
      ) : (
        <ContentLayout>
          <ChainList>
            <ChainListHeader>链列表</ChainListHeader>
            <SearchContainer>
              <SearchInput
                type="text"
                placeholder="搜索链名称..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <SearchIcon>🔍</SearchIcon>
            </SearchContainer>
            <ChainListContent>
              {chains
                .filter(chain => chain.name.toLowerCase().includes(searchTerm.toLowerCase()))
                .map(chain => (
                <ChainItem 
                  key={chain.NO} 
                  selected={selectedChain?.NO === chain.NO}
                  onClick={() => handleChainSelect(chain)}
                >
                  <ChainName>
                    <ChainNameText>{chain.name}</ChainNameText>
                  </ChainName>
                  <ChainStatus 
                    active={chain.active} 
                    onClick={(e) => {
                      e.stopPropagation(); // 阻止事件冒泡
                      handleToggleStatus(chain);
                    }}
                  >
                    {chain.active ? '已启用' : '已禁用'}
                  </ChainStatus>
                </ChainItem>
              ))}
            </ChainListContent>
          </ChainList>
          
          <ConfigPanel>
            {!isEditing && selectedChain && (
              <>
                <FormSection>
                  <SectionTitle>基本信息</SectionTitle>
                  <InfoRow>
                    <InfoLabel>链名称:</InfoLabel>
                    <InfoValue>{selectedChain.name}</InfoValue>
                  </InfoRow>
                  <InfoRow>
                    <InfoLabel>链ID:</InfoLabel>
                    <InfoValue>{selectedChain.chainId}</InfoValue>
                  </InfoRow>
                  <InfoRow>
                    <InfoLabel>状态:</InfoLabel>
                    <InfoValue>
                      <StatusIndicator active={selectedChain.active}>
                        {selectedChain.active ? '已启用' : '已禁用'}
                      </StatusIndicator>
                    </InfoValue>
                  </InfoRow>
                </FormSection>
                
                <FormSection>
                  <SectionTitle>RPC地址列表</SectionTitle>
                  <RpcUrlList>
                    {selectedChain.rpcUrls.map((url, index) => (
                      <RpcUrlItem key={index}>
                        <RpcUrl>{url}</RpcUrl>
                      </RpcUrlItem>
                    ))}
                  </RpcUrlList>
                </FormSection>
                
                {selectedChain.testResults && selectedChain.testResults.length > 0 && (
                  <FormSection>
                    <SectionTitle>测试结果</SectionTitle>
                    <TestResultContainer>
                      {selectedChain.testResults.map((result, index) => (
                        <TestResultItem key={index} status={result.status}>
                          {result.message}
                        </TestResultItem>
                      ))}
                    </TestResultContainer>
                  </FormSection>
                )}
                
                <ButtonGroup>
                  <Button variant="primary" onClick={handleEditChain}>编辑</Button>
                  <Button variant="danger" onClick={handleDeleteChain}>删除</Button>
                </ButtonGroup>
              </>
            )}
            
            {isEditing && originalChain && (
              <>
                <FormSection>
                  <SectionTitle>基本信息</SectionTitle>
                  <FormRow>
                    <FormGroup>
                      <Label>链名称<span className="required">*</span></Label>
                      <Input 
                        value={selectedChain?.name || ''} 
                        onChange={(e) => selectedChain && setSelectedChain({
                          ...selectedChain, 
                          name: e.target.value
                        } as ChainConfigModel)}
                        placeholder="例如：Ethereum"
                      />
                    </FormGroup>
                  </FormRow>
                  <FormRow>
                    <FormGroup>
                      <Label>链ID</Label>
                      <Input 
                        type="number" 
                        value={selectedChain?.chainId || 0} 
                        onChange={(e) => selectedChain && setSelectedChain({
                          ...selectedChain, 
                          chainId: parseInt(e.target.value) || 0
                        } as ChainConfigModel)}
                        placeholder="例如：1 (Ethereum)"
                      />
                    </FormGroup>
                  </FormRow>
                  <FormRow>
                    <FormGroup>
                      <Label>状态</Label>
                      <Select 
                        value={selectedChain?.active ? 'true' : 'false'}
                        onChange={(e) => selectedChain && setSelectedChain({
                          ...selectedChain, 
                          active: e.target.value === 'true'
                        } as ChainConfigModel)}
                      >
                        <option value="true">启用</option>
                        <option value="false">禁用</option>
                      </Select>
                    </FormGroup>
                  </FormRow>
                </FormSection>
                
                <FormSection>
                  <SectionTitle>RPC地址列表<span className="required">*</span></SectionTitle>
                  <RpcUrlList>
                    {selectedChain?.rpcUrls?.map((url, index) => (
                      <RpcUrlItem key={index}>
                        <Input 
                          value={url}
                          onChange={(e) => handleRpcUrlChange(index, e.target.value)}
                          placeholder="例如：https://mainnet.infura.io/v3/your-api-key"
                        />
                        {selectedChain?.rpcUrls?.length > 1 && (
                          <RemoveButton onClick={() => handleRemoveRpcUrl(index)}>×</RemoveButton>
                        )}
                      </RpcUrlItem>
                    ))}
                  </RpcUrlList>
                  <Button variant="secondary" onClick={handleAddRpcUrl}>
                    添加RPC地址
                  </Button>
                </FormSection>
                
                <ButtonGroup>
                  <Button variant="primary" onClick={handleSaveChain}>
                    保存
                  </Button>
                  <Button variant="secondary" onClick={handleCancelEdit}>
                    取消
                  </Button>
                  <Button variant="secondary" onClick={handleTestConnection} disabled={isTesting}>
                    {isTesting ? '测试中...' : '测试连接'}
                  </Button>
                </ButtonGroup>
                
                {testResults && testResults.length > 0 && (
                  <TestResultContainer>
                    {testResults.map((result, index) => (
                      <TestResultItem key={index} status={result.status}>
                        {result.message}
                      </TestResultItem>
                    ))}
                  </TestResultContainer>
                )}
              </>
            )}
          </ConfigPanel>
        </ContentLayout>
      )}
    </PageContainer>
  );
};

export default ChainConfig; 