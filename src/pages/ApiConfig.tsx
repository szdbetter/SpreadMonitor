import React, { useState, useEffect, useMemo, useRef } from 'react';
import styled from 'styled-components';
import { 
  apiConfigAccess, 
  ApiConfigModel, 
  exchangeConfigAccess, 
  ExchangeConfigModel,
  tokenConfigAccess,
  TokenConfigModel,
  ChainConfigModel,
  chainConfigAccess
} from '../services/database';
import { initDatabase, initSampleData } from '../services/database';
import { ethers } from 'ethers'; // 导入ethers.js库
import { keccak256 } from 'js-sha3'; // 导入keccak256哈希函数

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

const ApiList = styled.div`
  background-color: #2A2A2A;
  border-radius: 5px;
  overflow: hidden;
  height: 100%;
`;

const ApiListHeader = styled.div`
  padding: 15px;
  border-bottom: 1px solid #3A3A3A;
  font-size: 16px;
  font-weight: bold;
  color: white;
`;

const ApiItem = styled.div<{ selected: boolean }>`
  padding: 12px 15px;
  border-bottom: 1px solid #3A3A3A;
  cursor: pointer;
  background-color: ${props => props.selected ? '#3A3A3A' : 'transparent'};
  
  &:hover {
    background-color: ${props => props.selected ? '#3A3A3A' : '#2F2F2F'};
  }
`;

const ApiName = styled.div<{ selected?: boolean }>`
  font-weight: ${props => props.selected ? 'bold' : 'normal'};
`;

const ExchangeName = styled.div`
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

const CollapsibleSection = styled.div`
  margin-bottom: 20px;
`;

const CollapsibleHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  background-color: #2A2A2A;
  border-radius: 4px;
  cursor: pointer;
  
  &:hover {
    background-color: #333333;
  }
`;

const CollapsibleTitle = styled.h3`
  margin: 0;
  font-size: 16px;
  color: #F0B90B;
`;

const CollapsibleContent = styled.div<{ isOpen: boolean }>`
  padding: ${props => props.isOpen ? '15px' : '0'};
  max-height: ${props => props.isOpen ? '1000px' : '0'};
  overflow: hidden;
  transition: all 0.3s ease;
  opacity: ${props => props.isOpen ? '1' : '0'};
  border: ${props => props.isOpen ? '1px solid #444444' : 'none'};
  border-top: none;
  border-radius: 0 0 4px 4px;
`;

const CollapsibleIcon = styled.span`
  font-size: 18px;
  transition: transform 0.3s ease;
  
  &.open {
    transform: rotate(180deg);
  }
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

const Textarea = styled.textarea`
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #444444;
  border-radius: 4px;
  background-color: #2A2A2A;
  color: #FFFFFF;
  font-size: 14px;
  resize: vertical;
  min-height: 120px;
  
  &:focus {
    outline: none;
    border-color: #F0B90B;
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

const ApiItems = styled.div`
  overflow-y: auto;
  flex: 1;
`;

const InfoRow = styled.div`
  display: flex;
  margin-bottom: 10px;
`;

const InfoLabel = styled.div`
  width: 120px;
  color: #AAAAAA;
`;

const InfoValue = styled.div`
  flex: 1;
`;

const FieldRow = styled.div`
  display: flex;
  gap: 10px;
  padding: 10px;
  background-color: #333333;
  border-radius: 4px;
  margin-bottom: 10px;
  align-items: center;
`;

const FieldInput = styled.div`
  flex: 1;
`;

const RemoveButton = styled.button`
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  color: #FF0000;
  font-size: 16px;
`;

const AddButton = styled.button`
  background-color: transparent;
  color: #F0B90B;
  border: 1px dashed #F0B90B;
  border-radius: 4px;
  padding: 8px 16px;
  cursor: pointer;
  margin-top: 10px;
  
  &:hover {
    background-color: rgba(240, 185, 11, 0.1);
  }
`;

const EmptyMessage = styled.div`
  color: #AAAAAA;
  font-style: italic;
  padding: 10px;
`;

const ResultContainer = styled.div<{ success: boolean }>`
  background-color: ${props => props.success ? '#1e3a2f' : '#3a1e1e'};
  border: 1px solid ${props => props.success ? '#2c5c46' : '#5c2c2c'};
  border-radius: 5px;
  padding: 15px;
  margin-top: 10px;
  overflow-x: auto;
  
  pre {
    margin: 0;
    color: #e0e0e0;
    font-family: 'Courier New', monospace;
    font-size: 14px;
  }
`;

const LogContainer = styled.div`
  background-color: #1e1e2e;
  border: 1px solid #2a2a3a;
  border-radius: 5px;
  padding: 10px;
  margin-top: 10px;
  max-height: 300px;
  overflow-y: auto;
  font-family: 'Courier New', monospace;
`;

const LogItem = styled.div`
  display: flex;
  margin-bottom: 5px;
  line-height: 1.5;
`;

const LogNumber = styled.span`
  color: #7f7f7f;
  margin-right: 10px;
  min-width: 30px;
  text-align: right;
`;

const LogText = styled.span`
  color: #e0e0e0;
`;

const DetailItem = styled.div`
  display: flex;
  margin-bottom: 10px;
`;

const DetailLabel = styled.div`
  width: 120px;
  color: #AAAAAA;
`;

const DetailValue = styled.div`
  flex: 1;
`;

const SearchContainer = styled.div`
  display: flex;
  align-items: center;
  padding: 8px;
  border: 1px solid #444444;
  border-radius: 4px;
  background-color: #2A2A2A;
`;

const SearchInput = styled.input`
  background: none;
  border: none;
  outline: none;
  color: #FFFFFF;
  font-size: 14px;
  flex: 1;
`;

const SearchIcon = styled.div`
  color: #AAAAAA;
  font-size: 16px;
`;

const CustomFieldsContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  background-color: #2A2A2A;
  border-radius: 4px;
  padding: 10px;
`;

const CustomFieldItem = styled.div`
  display: flex;
  flex-direction: column;
  padding: 8px;
  border-radius: 4px;
  background-color: #333333;
`;

const CustomFieldName = styled.div`
  font-weight: bold;
  margin-bottom: 4px;
  color: #F0B90B;
`;

const CustomFieldValue = styled.div<{ success: boolean }>`
  font-family: monospace;
  padding: 4px;
  background-color: ${props => props.success ? 'rgba(0, 128, 0, 0.1)' : 'rgba(255, 0, 0, 0.1)'};
  border-radius: 2px;
  color: ${props => props.success ? '#FFFFFF' : '#FF6B6B'};
`;

const ErrorContainer = styled.div`
  background-color: rgba(255, 0, 0, 0.1);
  border-radius: 4px;
  padding: 10px;
  margin-bottom: 15px;
`;

const SuccessContainer = styled.div`
  background-color: rgba(0, 128, 0, 0.1);
  border-radius: 4px;
  padding: 10px;
  margin-bottom: 15px;
`;

const ProxyToggle = styled.div`
  display: flex;
  align-items: center;
  gap: 5px;
`;

const SuggestionContainer = styled.div`
  margin-top: 10px;
  padding: 10px;
  background-color: #333333;
  border-radius: 4px;
`;

const SuggestionTitle = styled.h5`
  margin-bottom: 10px;
  color: #F0B90B;
`;

const SuggestionList = styled.ul`
  list-style: none;
  padding: 0;
`;

const SuggestionItem = styled.li`
  cursor: pointer;
  color: #F0B90B;
  margin-bottom: 5px;
  
  &:hover {
    text-decoration: underline;
  }
`;

const ArrayValueContainer = styled.div`
  margin-top: 5px;
  padding: 5px;
  border: 1px solid #444444;
  border-radius: 4px;
  background-color: #333333;
`;

const ArrayValueHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 5px;
`;

const ArrayValueList = styled.ul`
  list-style: none;
  padding: 0;
  margin-top: 5px;
  max-height: 100px;
  overflow-y: auto;
  transition: max-height 0.3s ease;
  
  &:not(.expanded) {
    max-height: 100px;
    overflow-y: hidden;
  }
  
  &.expanded {
    max-height: 300px;
  }
`;

const ArrayValueItem = styled.li`
  margin-bottom: 5px;
`;

const ArrayValueIndex = styled.span`
  font-weight: bold;
  margin-right: 5px;
`;

const ArrayValueContent = styled.span`
  font-family: monospace;
  padding: 4px;
  background-color: #2A2A2A;
  border-radius: 2px;
  color: #FFFFFF;
`;

const ArrayToggle = styled.span`
  cursor: pointer;
  color: #AAAAAA;
  font-size: 12px;
`;

// 添加哈希计算相关的样式组件
const HashCalculatorContainer = styled.div`
  margin-top: 15px;
  padding: 15px;
  background-color: #2A2A2A;
  border-radius: 4px;
  border: 1px solid #444444;
`;

const HashTitle = styled.h3`
  margin-top: 0;
  margin-bottom: 10px;
  font-size: 16px;
  color: #F0B90B;
`;

const HashInputRow = styled.div`
  display: flex;
  margin-bottom: 10px;
  gap: 10px;
`;

const HashInput = styled.input`
  flex: 1;
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

const HashSelect = styled.select`
  padding: 8px 12px;
  border: 1px solid #444444;
  border-radius: 4px;
  background-color: #2A2A2A;
  color: #FFFFFF;
  font-size: 14px;
  min-width: 150px;
  
  &:focus {
    outline: none;
    border-color: #F0B90B;
  }
`;

const HashButton = styled.button`
  padding: 8px 15px;
  background-color: #F0B90B;
  color: #000000;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
  
  &:hover {
    background-color: #d6a50a;
  }
  
  &:disabled {
    background-color: #5a5a5a;
    cursor: not-allowed;
  }
`;

const HashResult = styled.div`
  margin-top: 10px;
  word-break: break-all;
  font-family: monospace;
  padding: 10px;
  background-color: #1A1A1A;
  border-radius: 4px;
  border: 1px solid #333333;
`;

const HashVerification = styled.div<{ isValid: boolean }>`
  margin-top: 10px;
  padding: 8px;
  border-radius: 4px;
  background-color: ${props => props.isValid ? 'rgba(0, 255, 0, 0.1)' : 'rgba(255, 0, 0, 0.1)'};
  color: ${props => props.isValid ? '#00FF00' : '#FF0000'};
  font-weight: bold;
  text-align: center;
`;

// 预设API配置
const PRESET_APIS = [
  {
    name: "Binance 价格API",
    baseUrl: "https://api.binance.com/api/v3/ticker/price",
    fieldMappings: [
      { customName: "symbol", displayName: "交易对", jsonPath: "symbol" },
      { customName: "price", displayName: "价格", jsonPath: "price" }
    ]
  },
  {
    name: "Ethereum Gas API",
    baseUrl: "https://api.etherscan.io/api?module=gastracker&action=gasoracle",
    fieldMappings: [
      { customName: "fastGas", displayName: "快速Gas价格", jsonPath: "result.FastGasPrice" },
      { customName: "standardGas", displayName: "标准Gas价格", jsonPath: "result.ProposeGasPrice" },
      { customName: "slowGas", displayName: "慢速Gas价格", jsonPath: "result.SafeGasPrice" }
    ]
  }
];

const ApiConfig: React.FC = () => {
  const [apis, setApis] = useState<ApiConfigModel[]>([]);
  const [exchanges, setExchanges] = useState<ExchangeConfigModel[]>([]);
  const [tokens, setTokens] = useState<TokenConfigModel[]>([]);
  const [chains, setChains] = useState<ChainConfigModel[]>([]);
  const [selectedApi, setSelectedApi] = useState<ApiConfigModel | null>(null);
  const [editedApi, setEditedApi] = useState<ApiConfigModel | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{success: boolean, data: any} | null>(null);
  const [testVariables, setTestVariables] = useState<{[key: string]: string}>({});
  const [detectedVariables, setDetectedVariables] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [useProxyToggle, setUseProxyToggle] = useState(false);
  
  // 合约方法列表
  const [contractMethods, setContractMethods] = useState<{name: string, inputs: {name: string, type: string}[]}[]>([]);
  const [isLoadingMethods, setIsLoadingMethods] = useState(false);
  
  // 手动添加参数相关状态
  const [newParamName, setNewParamName] = useState('');
  const [newParamType, setNewParamType] = useState('');
  const [newParamValue, setNewParamValue] = useState('');
  const [showAddParam, setShowAddParam] = useState(false);
  
  // 折叠状态
  const [isApiKeySectionOpen, setIsApiKeySectionOpen] = useState(false);
  const [isExchangeSectionOpen, setIsExchangeSectionOpen] = useState(false);
  const [isFieldMappingSectionOpen, setIsFieldMappingSectionOpen] = useState(true);
  const [isHashCalculatorOpen, setIsHashCalculatorOpen] = useState(false); // 哈希计算器折叠状态，默认收缩
  
  // 添加哈希计算相关的状态
  const [hashInput, setHashInput] = useState('');
  const [hashResult, setHashResult] = useState('');
  const [hashVerification, setHashVerification] = useState('');
  const [isHashValid, setIsHashValid] = useState(false);
  const [selectedField, setSelectedField] = useState('');
  const [expectedHash, setExpectedHash] = useState('');
  
  // 加载数据
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        setError(null); // 清除之前的错误
        
        console.log("ApiConfig: 开始加载数据...");
        
        // 确保数据库已初始化
        const db = await initDatabase();
        console.log("ApiConfig: 数据库初始化完成", db);
        
        // 初始化示例数据（如果需要）
        await initSampleData();
        
        // 获取API数据
        console.log("ApiConfig: 正在获取API数据...");
        const apisData = await apiConfigAccess.getAll();
        console.log("ApiConfig: 获取到API数据", apisData);
        setApis(apisData);
        
        // 获取交易所数据
        console.log("ApiConfig: 正在获取交易所数据...");
        const exchangesData = await exchangeConfigAccess.getAll();
        console.log("ApiConfig: 获取到交易所数据", exchangesData);
        setExchanges(exchangesData);
        
        // 获取Token数据
        console.log("ApiConfig: 正在获取Token数据...");
        const tokensData = await tokenConfigAccess.getAll();
        console.log("ApiConfig: 获取到Token数据", tokensData);
        setTokens(tokensData);
        
        // 获取链配置数据
        console.log("ApiConfig: 正在获取链配置数据...");
        const chainsData = await chainConfigAccess.getAll();
        console.log("ApiConfig: 获取到链配置数据", chainsData);
        setChains(chainsData);
        
        // 如果有API数据且没有选中的API，默认选择第一个
        if (apisData.length > 0 && !selectedApi) {
          setSelectedApi(apisData[0]);
        }
        
        setIsLoading(false);
      } catch (err) {
        setIsLoading(false);
        setError('加载数据失败: ' + (err instanceof Error ? err.message : String(err)));
        console.error('加载API配置数据失败:', err);
      }
    };
    
    loadData();
  }, [selectedApi]);
  
  // 监听 editedApi 变化，更新变量
  useEffect(() => {
    if (editedApi) {
      updateDetectedVariables();
    }
  }, [editedApi?.baseUrl, editedApi?.payload, editedApi?.method]);
  
  // 验证API名称唯一性
  const validateApiUniqueness = async (api: ApiConfigModel, isNew: boolean): Promise<string | null> => {
    // 获取所有API
    const allApis = await apiConfigAccess.getAll();
    
    // 检查名称唯一性
    const nameExists = allApis.some(a => 
      a.name.toLowerCase() === api.name.toLowerCase() && 
      (isNew || a.NO !== api.NO)
    );
    
    if (nameExists) {
      return `API名称 "${api.name}" 已存在，请使用其他名称`;
    }
    
    return null;
  };
  
  // 处理预设API选择
  const handlePresetApiSelect = (preset: typeof PRESET_APIS[0]) => {
    if (editedApi) {
      setEditedApi({
        ...editedApi,
        name: preset.name,
        baseUrl: preset.baseUrl,
        fieldMappings: preset.fieldMappings ? [...preset.fieldMappings] : undefined
      });
      
      // 延迟更新变量，确保 editedApi 已经更新
      setTimeout(updateDetectedVariables, 100);
    }
  };
  
  // 选择API
  const handleApiSelect = (api: ApiConfigModel) => {
    // 直接在当前页面设置选中的API，不进行导航
    setSelectedApi(api);
    setTestResult(null);
    setError(null);
    setTestVariables(api.customVariables || {});
    
    // 使用updateDetectedVariables更新变量
    if (api) {
      // 临时将editedApi设为当前API以便检测变量
      setEditedApi(api);
      setTimeout(updateDetectedVariables, 100);
    }
  };
  
  // 添加API
  const handleAddApi = () => {
    // 创建新的API配置
    const newApi: ApiConfigModel = {
      name: '',
      baseUrl: '',
      method: 'GET',
      apiType: 'HTTP', // 默认为HTTP类型
      active: true,
      fieldMappings: []
    };
    
    setSelectedApi(null);
    setEditedApi(newApi);
    setIsEditing(true);
    setTestResult(null);
    setTestVariables({});
    setError(null);
    
    // 重置折叠状态
    setIsApiKeySectionOpen(false);
    setIsExchangeSectionOpen(false);
    setIsFieldMappingSectionOpen(true);
    setIsHashCalculatorOpen(false); // 确保哈希计算器默认收缩
    
    // 清空变量列表
    setDetectedVariables([]);
  };
  
  // 编辑API
  const handleEditApi = () => {
    if (!selectedApi) return;
    
    // 创建一个深拷贝，避免直接修改selectedApi
    setEditedApi(JSON.parse(JSON.stringify(selectedApi)));
    
    // 如果有保存的自定义变量值，加载它们
    if (selectedApi.customVariables) {
      setTestVariables(selectedApi.customVariables);
    } else {
      setTestVariables({});
    }
    
    setIsEditing(true);
    setTestResult(null);
    setError(null);
    
    // 重置折叠状态
    setIsApiKeySectionOpen(false);
    setIsExchangeSectionOpen(false);
    setIsFieldMappingSectionOpen(true);
    setIsHashCalculatorOpen(false); // 确保哈希计算器默认收缩
    
    // 延迟更新变量，确保 editedApi 已经设置
    setTimeout(updateDetectedVariables, 100);
  };
  
  // 保存API
  const handleSaveApi = async () => {
    if (!editedApi) return;
    
    // 验证必填字段
    if (!editedApi.name.trim()) {
      setError('API名称不能为空');
      return;
    }
    
    // 根据API类型验证必填字段
    if (editedApi.apiType === 'HTTP') {
      // HTTP类型API需要验证基础URL
      if (!editedApi.baseUrl.trim()) {
        setError('API基础URL不能为空');
        return;
      }
    } else if (editedApi.apiType === 'CHAIN') {
      // 链上数据类型API需要验证链ID和合约地址
      if (!editedApi.chainId) {
        setError('请选择链');
        return;
      }
      
      if (!editedApi.contractAddress) {
        setError('请输入合约地址');
        return;
      }
      
      if (!editedApi.methodName) {
        setError('请输入方法名称');
        return;
      }
      
      // 对于链上数据类型API，如果没有设置baseUrl，设置一个默认值
      if (!editedApi.baseUrl.trim()) {
        editedApi.baseUrl = `chain://${editedApi.chainId}/${editedApi.contractAddress}/${editedApi.methodName}`;
      }
      
      // 确保方法参数被正确保存
      if (editedApi.methodParams && editedApi.methodParams.length > 0) {
        // 验证每个参数是否有名称和类型
        for (const param of editedApi.methodParams) {
          if (!param.name.trim()) {
            setError('参数名称不能为空');
            return;
          }
          if (!param.type.trim()) {
            setError('参数类型不能为空');
            return;
          }
        }
        
        // 确保methodParams是一个数组，而不是undefined
        editedApi.methodParams = [...editedApi.methodParams];
      } else if (editedApi.methodName) {
        // 如果有方法名但没有参数，初始化为空数组
        editedApi.methodParams = [];
      }
    }
    
    // 验证字段映射（如果有）
    if (editedApi.fieldMappings && editedApi.fieldMappings.length > 0) {
      for (const mapping of editedApi.fieldMappings) {
        if (!mapping.customName.trim()) {
          setError('自定义字段名不能为空');
          return;
        }
        
        if (!mapping.displayName.trim()) {
          setError('显示名称不能为空');
          return;
        }
        
        if (!mapping.jsonPath.trim()) {
          setError('JSON路径不能为空');
          return;
        }
      }
    }
    
    try {
      // 验证API名称唯一性
      const validationError = await validateApiUniqueness(editedApi, !editedApi.NO);
      if (validationError) {
        setError(validationError);
        return;
      }
      
      // 保存用户输入的自定义变量值
      // 将testVariables保存到editedApi中
      if (Object.keys(testVariables).length > 0) {
        editedApi.customVariables = testVariables;
      }
      
      let savedApiNo: number;
      
      // 如果是新API（没有NO字段），则创建新记录
      if (!editedApi.NO) {
        const createdApi = await apiConfigAccess.create(editedApi);
        savedApiNo = createdApi.NO || 0;
        
        // 获取最新的API列表
        const updatedApis = await apiConfigAccess.getAll();
        setApis(updatedApis);
        
        // 查找并选择新创建的API
        const newApi = updatedApis.find(a => a.NO === savedApiNo);
        if (newApi) {
          setSelectedApi(newApi);
        }
      } else {
        // 如果是编辑现有API，则更新记录
        await apiConfigAccess.update(editedApi);
        
        // 获取最新的API列表
        const updatedApis = await apiConfigAccess.getAll();
        setApis(updatedApis);
        
        // 更新选中的API
        const updatedApi = updatedApis.find(a => a.NO === editedApi.NO);
        if (updatedApi) {
          setSelectedApi(updatedApi);
        }
      }
      
      setIsEditing(false);
      setError(null);
    } catch (err) {
      console.error('Failed to save API:', err);
      setError('保存API失败，请检查输入数据');
    }
  };
  
  // 取消编辑
  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedApi(null);
    
    // 如果是新建的API且尚未保存，则清除选中状态
    if (selectedApi && !selectedApi.NO) {
      setSelectedApi(apis.length > 0 ? apis[0] : null);
    }
  };
  
  // 删除API
  const handleDeleteApi = async () => {
    if (!selectedApi || !selectedApi.NO) return;
    
    if (window.confirm(`确定要删除 ${selectedApi.name} 吗？`)) {
      try {
        await apiConfigAccess.delete(selectedApi.NO);
        
        // 获取最新的API列表
        const updatedApis = await apiConfigAccess.getAll();
        setApis(updatedApis);
        
        // 如果还有API，选择第一个；否则清空选择
        if (updatedApis.length > 0) {
          setSelectedApi(updatedApis[0]);
        } else {
          setSelectedApi(null);
        }
        
        setError(null);
      } catch (err) {
        console.error('Failed to delete API:', err);
        setError('删除API失败');
      }
    }
  };
  
  // 切换API状态
  const handleToggleStatus = async (api: ApiConfigModel) => {
    try {
      const updatedApi = { ...api, active: !api.active };
      
      // 更新数据库
      await apiConfigAccess.update(updatedApi);
      
      // 刷新列表
      const updatedApis = await apiConfigAccess.getAll();
      setApis(updatedApis);
      
      // 如果当前选中的是被修改的API，更新选中状态
      if (selectedApi && selectedApi.NO === api.NO) {
        setSelectedApi(updatedApi);
      }
    } catch (err) {
      console.error('切换API状态失败', err);
      setError('切换API状态失败');
    }
  };
  
  // 提取URL或Payload中的变量
  const extractVariables = (text: string) => {
    if (!text) return [];
    
    // 修改正则表达式，使用()作为变量标识符，包括双引号内的变量
    // 例如："sellToken":"(sellToken)" 中的 (sellToken)
    const regex = /\(([^()]+)\)/g;
    const matches = text.match(regex) || [];
    
    // 提取变量名，不再过滤appData相关的匹配
    // 因为现在我们需要检测到如 "appDataHash": "(appData)" 这样的变量
    return matches.map(match => match.slice(1, -1));
  };
  
  // 替换URL或Payload中的变量
  const replaceVariables = (text: string, variables: Record<string, string>) => {
    if (!text) return text;
    
    // 创建一个新的文本副本
    let result = text;
    
    // 处理普通变量替换，使用()作为变量标识符，包括双引号内的变量
    Object.entries(variables).forEach(([key, value]) => {
      // 创建一个正则表达式，匹配包括在双引号内的变量
      // 例如："sellToken":"(sellToken)" 中的 (sellToken)
      const regex = new RegExp(`\\(${key}\\)`, 'g');
      
      // 如果变量值是地址或数字，直接替换
      // 如果是在双引号内的变量，需要保留双引号
      if (result.includes(`"(${key})"`)) {
        // 在双引号内的变量，例如："(sellToken)"
        const quotedRegex = new RegExp(`"\\(${key}\\)"`, 'g');
        // 如果值看起来像地址（0x开头），不添加额外的引号
        if (value.startsWith('0x')) {
          result = result.replace(quotedRegex, `"${value}"`);
        } else {
          // 尝试解析为数字，如果是数字则不添加引号
          const numValue = Number(value);
          if (!isNaN(numValue)) {
            result = result.replace(quotedRegex, `${numValue}`);
          } else {
            result = result.replace(quotedRegex, `"${value}"`);
          }
        }
      }
      
      // 处理非双引号内的变量
      result = result.replace(regex, value);
    });
    
    return result;
  };
  
  // 实时解析并更新变量列表
  const updateDetectedVariables = () => {
    if (!editedApi) return;
    
    // 提取URL中的变量
    const urlVariables = extractVariables(editedApi.baseUrl);
    
    // 提取Payload中的变量（如果有）
    const payloadVariables = editedApi.method === 'POST' && editedApi.payload 
      ? extractVariables(editedApi.payload) 
      : [];
    
    // 合并所有变量并去重
    const allVariables = Array.from(new Set([...urlVariables, ...payloadVariables]));
    
    // 更新检测到的变量列表
    setDetectedVariables(allVariables);
    
    // 初始化新变量的值
    const updatedVariables = { ...testVariables };
    let hasNewVariables = false;
    
    allVariables.forEach(variable => {
      if (!(variable in updatedVariables)) {
        updatedVariables[variable] = '';
        hasNewVariables = true;
      }
    });
    
    // 如果有新变量，更新测试变量对象
    if (hasNewVariables) {
      setTestVariables(updatedVariables);
    }
    
    // 调试输出，帮助排查问题
    console.log('检测到的变量:', allVariables);
    console.log('URL变量:', urlVariables);
    console.log('Payload变量:', payloadVariables);
  };
  
  // 测试API
  const handleTestApi = async () => {
    if (!editedApi) return;
    
    try {
      setIsTesting(true);
      setTestResult(null);
      setError(null);
      
      // 替换变量
      let targetUrl = editedApi.baseUrl;
      let payload = editedApi.payload;
      
      if (editedApi.apiType === 'CHAIN') {
        // 链上数据类型API测试
        if (!editedApi.chainId) {
          throw new Error('请选择链');
        }
        
        if (!editedApi.contractAddress) {
          throw new Error('请输入合约地址');
        }
        
        if (!editedApi.methodName) {
          throw new Error('请输入方法名称');
        }
        
        // 记录访问过程
        const logs: string[] = [];
        logs.push(`开始测试链上数据API - 合约地址: ${editedApi.contractAddress}, 链ID: ${editedApi.chainId}, 方法: ${editedApi.methodName}`);
        
        // 查找选中的链
        const selectedChain = chains.find(chain => chain.chainId === editedApi.chainId);
        if (!selectedChain || !selectedChain.rpcUrls || selectedChain.rpcUrls.length === 0) {
          throw new Error(`找不到链ID为 ${editedApi.chainId} 的RPC URL`);
        }
        
        const rpcUrl = selectedChain.rpcUrls[0];
        logs.push(`使用RPC URL: ${rpcUrl}`);
        
        // 使用ethers.js连接到区块链
        logs.push(`正在连接到区块链...`);
        const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
        
        try {
          // 检查连接
          logs.push(`正在检查区块链连接...`);
          const blockNumber = await provider.getBlockNumber();
          logs.push(`连接成功，当前区块高度: ${blockNumber}`);
        } catch (error) {
          logs.push(`连接失败: ${error instanceof Error ? error.message : String(error)}`);
          throw new Error(`连接到区块链失败: ${error instanceof Error ? error.message : String(error)}`);
        }
        
        // 检查合约地址是否有效
        logs.push(`正在验证合约地址...`);
        if (!ethers.utils.isAddress(editedApi.contractAddress)) {
          logs.push(`合约地址无效: ${editedApi.contractAddress}`);
          throw new Error(`合约地址无效: ${editedApi.contractAddress}`);
        }
        
        logs.push(`正在获取合约代码...`);
        const code = await provider.getCode(editedApi.contractAddress);
        if (code === '0x') {
          logs.push(`地址 ${editedApi.contractAddress} 不是合约地址`);
          throw new Error(`地址 ${editedApi.contractAddress} 不是合约地址`);
        }
        
        logs.push(`合约代码长度: ${code.length} 字节`);
        
        // 准备方法参数
        const methodParams = editedApi.methodParams || [];
        const params = methodParams.map(param => {
          // 替换变量
          let value = param.value || '';
          if (value.includes('(') && value.includes(')')) {
            // 提取变量名
            const variableName = value.match(/\(([^()]+)\)/)?.[1];
            if (variableName && testVariables[variableName]) {
              value = value.replace(`(${variableName})`, testVariables[variableName]);
            }
          }
          
          // 根据参数类型转换值
          if (param.type.includes('int')) {
            // 对于整数类型，尝试转换为数字
            return ethers.BigNumber.from(value || '0');
          } else if (param.type === 'address') {
            // 对于地址类型，确保是有效的地址
            if (!value || !ethers.utils.isAddress(value)) {
              logs.push(`警告: 参数 ${param.name} 不是有效的地址，使用零地址代替`);
              return ethers.constants.AddressZero;
            }
            return value;
          } else if (param.type === 'bool') {
            // 对于布尔类型，转换为布尔值
            return value.toLowerCase() === 'true';
          } else {
            // 其他类型，如字符串，直接使用
            return value;
          }
        });
        
        logs.push(`方法参数准备完成: ${JSON.stringify(params)}`);
        
        // 创建接口和合约实例
        logs.push(`正在创建合约实例...`);
        
        // 常见的只读方法列表
        const commonViewMethods = [
          'name', 'symbol', 'decimals', 'totalSupply', 'balanceOf', 'allowance',
          'getOwner', 'owner', 'implementation', 'getImplementation',
          // ERC4626只读方法
          'asset', 'totalAssets', 'convertToShares', 'convertToAssets',
          'maxDeposit', 'previewDeposit', 'maxMint', 'previewMint',
          'maxWithdraw', 'previewWithdraw', 'maxRedeem', 'previewRedeem'
        ];
        
        // 创建方法签名
        let methodSignature = `function ${editedApi.methodName}(${methodParams.map((p: any) => `${p.type} ${p.name}`).join(', ')})`;
        
        // 如果是常见的只读方法，添加view修饰符
        if (commonViewMethods.includes(editedApi.methodName)) {
          if (editedApi.methodName === 'decimals') {
            methodSignature = `function ${editedApi.methodName}() view returns (uint8)`;
          } else if (editedApi.methodName === 'totalSupply' || editedApi.methodName === 'balanceOf' || editedApi.methodName === 'allowance') {
            methodSignature = `function ${editedApi.methodName}(${methodParams.map((p: any) => `${p.type} ${p.name}`).join(', ')}) view returns (uint256)`;
          } else if (editedApi.methodName === 'owner' || editedApi.methodName === 'getOwner' || editedApi.methodName === 'implementation' || editedApi.methodName === 'getImplementation') {
            methodSignature = `function ${editedApi.methodName}(${methodParams.map((p: any) => `${p.type} ${p.name}`).join(', ')}) view returns (address)`;
          } else if (editedApi.methodName === 'asset') {
            methodSignature = `function ${editedApi.methodName}() view returns (address)`;
          } else if (editedApi.methodName === 'totalAssets' || editedApi.methodName === 'convertToShares' || editedApi.methodName === 'convertToAssets' || 
                     editedApi.methodName === 'maxDeposit' || editedApi.methodName === 'previewDeposit' || 
                     editedApi.methodName === 'maxMint' || editedApi.methodName === 'previewMint' || 
                     editedApi.methodName === 'maxWithdraw' || editedApi.methodName === 'previewWithdraw' || 
                     editedApi.methodName === 'maxRedeem' || editedApi.methodName === 'previewRedeem') {
            methodSignature = `function ${editedApi.methodName}(${methodParams.map((p: any) => `${p.type} ${p.name}`).join(', ')}) view returns (uint256)`;
          } else {
            methodSignature = `function ${editedApi.methodName}(${methodParams.map((p: any) => `${p.type} ${p.name}`).join(', ')}) view returns (string)`;
          }
        }
        
        logs.push(`方法签名: ${methodSignature}`);
        
        try {
          // 创建接口
          const iface = new ethers.utils.Interface([methodSignature]);
          
          // 创建合约实例
          const contract = new ethers.Contract(editedApi.contractAddress, iface, provider);
          
          // 调用合约方法
          logs.push(`正在调用合约方法 ${editedApi.methodName}...`);
          const startTime = Date.now();
          
          // 检查方法是否是只读方法
          const isReadOnly = methodSignature.includes('view') || methodSignature.includes('pure') || commonViewMethods.includes(editedApi.methodName);
          logs.push(`方法类型: ${isReadOnly ? '只读方法' : '需要签名的方法'}`);
          
          let result;
          try {
            // 使用callStatic来调用所有方法，避免需要签名者
            result = await contract.callStatic[editedApi.methodName](...params);
            logs.push(`调用成功，耗时: ${Date.now() - startTime}ms`);
            logs.push(`返回结果: ${result.toString()}`);
          } catch (callError) {
            logs.push(`调用失败: ${callError instanceof Error ? callError.message : String(callError)}`);
            throw new Error(`调用失败: ${callError instanceof Error ? callError.message : String(callError)}`);
          }
          
          // 设置测试结果
          setTestResult({
            success: true,
            data: {
              result: result.toString(),
              method: editedApi.methodName,
              params: params.map((p: any) => p.toString()),
              contractAddress: editedApi.contractAddress,
              rpcUrl,
              isReadOnly: methodSignature.includes("view") || methodSignature.includes("pure") || commonViewMethods.includes(editedApi.methodName),
              logs
            }
          });
        } catch (error) {
          logs.push(`调用合约方法失败: ${error instanceof Error ? error.message : String(error)}`);
          
          // 如果是代理合约，尝试通过ERC1967代理调用
          if (editedApi.isProxyContract) {
            logs.push(`检测到代理合约设置，尝试获取实现合约地址...`);
            
            try {
              // 尝试获取实现合约地址
              const implementationSlot = '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc'; // ERC1967代理实现槽
              const implementationData = await provider.getStorageAt(editedApi.contractAddress, implementationSlot);
              const implementationAddress = ethers.utils.getAddress('0x' + implementationData.slice(-40));
              
              logs.push(`找到实现合约地址: ${implementationAddress}`);
              
              // 创建实现合约实例
              const implIface = new ethers.utils.Interface([methodSignature]);
              const implContract = new ethers.Contract(implementationAddress, implIface, provider);
              
              // 调用实现合约方法
              logs.push(`正在通过实现合约调用方法 ${editedApi.methodName}...`);
              const implStartTime = Date.now();
              
              let implResult;
              try {
                // 使用callStatic来调用所有方法，避免需要签名者
                implResult = await implContract.callStatic[editedApi.methodName](...params);
                logs.push(`调用成功，耗时: ${Date.now() - implStartTime}ms`);
                logs.push(`返回结果: ${implResult.toString()}`);
              } catch (callError) {
                logs.push(`调用失败: ${callError instanceof Error ? callError.message : String(callError)}`);
                throw new Error(`调用失败: ${callError instanceof Error ? callError.message : String(callError)}`);
              }
              
              // 设置测试结果
              setTestResult({
                success: true,
                data: {
                  result: implResult.toString(),
                  method: editedApi.methodName,
                  params: params.map((p: any) => p.toString()),
                  contractAddress: editedApi.contractAddress,
                  implementationAddress,
                  rpcUrl,
                  logs,
                  isReadOnly: methodSignature.includes("view") || methodSignature.includes("pure") || commonViewMethods.includes(editedApi.methodName),
                  isProxy: true
                }
              });
              
              return;
            } catch (proxyError) {
              logs.push(`通过代理合约调用失败: ${proxyError instanceof Error ? proxyError.message : String(proxyError)}`);
            }
          }
          
          // 设置测试结果，显示错误信息
          setTestResult({
            success: false,
            data: {
              error: '调用合约方法失败',
              message: error instanceof Error ? error.message : String(error),
              method: editedApi.methodName,
              params: params.map((p: any) => p.toString()),
              contractAddress: editedApi.contractAddress,
              rpcUrl,
              logs
            }
          });
          
          throw error;
        }
      } else {
        // HTTP类型API测试
        // 替换URL和Payload中的变量
        targetUrl = replaceVariables(targetUrl, testVariables);
        
        if (editedApi.method === 'POST' && payload) {
          payload = replaceVariables(payload, testVariables);
        }
        
        // 准备请求头
        const headers: Record<string, string> = {
          'Content-Type': 'application/json'
        };
        
        // 如果有API密钥，添加到请求头
        if (editedApi.apiKey) {
          headers['X-API-KEY'] = editedApi.apiKey;
        }
        
        // 使用本地代理发送请求
        if (useProxyToggle) {
          await handleLocalProxyRequest(targetUrl, editedApi.method, headers, payload);
        } else {
          // 直接发送请求
          const options: RequestInit = {
            method: editedApi.method,
            headers
          };
          
          // 如果是POST请求且有payload，添加body
          if (editedApi.method === 'POST' && payload) {
            options.body = payload;
          }
          
          // 发送请求
          const response = await fetch(targetUrl, options);
          
          // 处理响应
          await handleApiResponse(response, targetUrl, editedApi);
        }
      }
      
      setIsTesting(false);
    } catch (err) {
      console.error('测试API失败:', err);
      setIsTesting(false);
      
      if (err instanceof Error) {
        if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
          // 处理CORS错误
          handleCorsError(editedApi.baseUrl, err);
        } else {
          setError('测试API失败: ' + err.message);
        }
      } else {
        setError('测试API失败，请检查配置');
      }
      
      setTestResult({
        success: false,
        data: {
          error: '请求失败',
          message: err instanceof Error ? err.message : '未知错误',
          solutions: [
            '检查API URL是否正确',
            '检查网络连接',
            '尝试使用本地代理'
          ]
        }
      });
    }
  };
  
  // 通过本地后端服务转发请求
  const handleLocalProxyRequest = async (
    targetUrl: string, 
    method: string, 
    headers: Record<string, string>, 
    payload?: string
  ) => {
    try {
      // 构建代理请求URL
      // 假设本地服务在localhost:3000上，并有一个/api/proxy端点用于转发请求
      const proxyUrl = 'http://localhost:3000/api/proxy';
      
      console.log('通过本地代理发送请求:', { 
        proxyUrl, 
        targetUrl, 
        method, 
        headers, 
        payload 
      });
      
      // 构建代理请求体
      const proxyRequestBody = {
        url: targetUrl,
        method,
        headers,
        body: payload
      };
      
      // 发送请求到本地代理服务
      const response = await fetch(proxyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(proxyRequestBody)
      });
      
      // 检查代理响应状态
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`代理请求失败: ${response.status} ${response.statusText} - ${errorText}`);
      }
      
      // 解析代理响应
      const proxyResponse = await response.json();
      
      // 创建模拟的Response对象
      const mockResponse = new Response(
        JSON.stringify(proxyResponse.data),
        {
          status: proxyResponse.status,
          statusText: proxyResponse.statusText,
          headers: new Headers(proxyResponse.headers)
        }
      );
      
      // 处理响应
      await handleApiResponse(mockResponse, targetUrl, editedApi!, proxyUrl);
    } catch (error) {
      console.error('本地代理请求失败:', error);
      
      setTestResult({
        success: false,
        data: {
          error: '本地代理请求失败',
          message: error instanceof Error ? error.message : String(error),
          solutions: [
            '1. 确保本地后端服务正在运行 (localhost:3000)',
            '2. 确保后端服务实现了 /api/proxy 端点',
            '3. 检查后端代理服务的日志以获取更多信息'
          ],
          details: {
            proxyUrl: 'http://localhost:3000/api/proxy',
            targetUrl,
            recommendation: '您需要在后端服务中实现一个代理端点来转发API请求'
          }
        }
      });
    }
  };
  
  // 处理API响应
  const handleApiResponse = async (response: Response, targetUrl: string, api: ApiConfigModel, proxyUrl?: string) => {
    // 尝试解析响应为JSON
    let data;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      // 如果不是JSON，则获取文本内容
      const text = await response.text();
      data = { text, contentType };
    }
    
    // 提取自定义字段的值
    const customFields: Record<string, any> = {};
    if (api.fieldMappings && api.fieldMappings.length > 0) {
      try {
        // 确保 data 是对象
        const jsonData = typeof data === 'object' ? data : 
                        (typeof data === 'string' ? JSON.parse(data) : {});
        
        // 查找整个响应中的所有字段名称，用于智能建议
        const allFieldPaths = findAllFieldPaths(jsonData);
        
        // 使用 jsonPath 提取字段值
        api.fieldMappings.forEach(mapping => {
          try {
            // 尝试使用用户提供的 jsonPath 获取值
            const value = getValueByJsonPath(jsonData, mapping.jsonPath);
            
            if (value !== undefined) {
              // 成功找到值
              customFields[mapping.customName] = {
                displayName: mapping.displayName,
                value: value
              };
            } else {
              // 未找到值，尝试智能建议
              const fieldName = mapping.jsonPath.split('.').pop() || '';
              const suggestions = findSuggestions(allFieldPaths, fieldName);
              
              customFields[mapping.customName] = {
                displayName: mapping.displayName,
                value: '未找到',
                suggestions: suggestions.length > 0 ? suggestions : undefined
              };
            }
          } catch (e) {
            customFields[mapping.customName] = {
              displayName: mapping.displayName,
              value: '解析错误',
              error: e instanceof Error ? e.message : String(e)
            };
          }
        });
      } catch (e) {
        console.error('提取自定义字段时出错:', e);
      }
    }
    
    // 提取重要的响应头
    const responseHeaders = {
      'content-type': response.headers.get('content-type') || '',
      'content-length': response.headers.get('content-length') || '',
      'cache-control': response.headers.get('cache-control') || '',
      'access-control-allow-origin': response.headers.get('access-control-allow-origin') || ''
    };
    
    // 设置测试结果
    setTestResult({
      success: response.ok,
      data: {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
        customFields: Object.keys(customFields).length > 0 ? customFields : undefined,
        originalUrl: targetUrl,
        proxyUrl: proxyUrl,
        data
      }
    });
  };
  
  // 根据 JSON 路径获取值
  const getValueByJsonPath = (obj: any, path: string): any => {
    // 检查是否包含数组通配符 [*]
    if (path.includes('[*]')) {
      // 处理数组通配符
      return getArrayValues(obj, path);
    }
    
    // 处理普通路径（单个值）
    // 处理数组索引，例如 data[0].address
    const normalizedPath = path.replace(/\[(\d+)\]/g, '.$1');
    const parts = normalizedPath.split('.');
    
    let current = obj;
    for (const part of parts) {
      if (current === null || current === undefined) {
        return undefined;
      }
      
      // 处理数组
      if (Array.isArray(current) && !isNaN(Number(part))) {
        const index = Number(part);
        current = current[index];
        continue;
      }
      
      // 处理对象
      if (typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        // 特殊处理：如果当前是数组且包含对象，尝试在第一个元素中查找
        if (Array.isArray(current) && current.length > 0 && typeof current[0] === 'object') {
          // 例如，用户写了 data.address，但实际是 data[0].address
          current = current[0][part];
        } else {
          return undefined;
        }
      }
    }
    
    return current;
  };
  
  // 获取数组中所有元素的特定字段值
  const getArrayValues = (obj: any, path: string): any[] => {
    // 将路径拆分为前缀、通配符和后缀
    // 例如：data[*].address 拆分为 data、[*]、address
    const match = path.match(/(.+?)\[\*\](.+)/);
    if (!match) return [];
    
    const [_, prefix, suffix] = match;
    
    // 获取数组
    const array = getValueByJsonPath(obj, prefix);
    if (!Array.isArray(array)) return [];
    
    // 从每个数组元素中提取字段值
    const results = array.map((item, index) => {
      // 构建每个元素的完整路径
      const itemPath = `${prefix}[${index}]${suffix}`;
      return getValueByJsonPath(obj, itemPath);
    }).filter(value => value !== undefined);
    
    return results;
  };
  
  // 查找整个响应中的所有字段路径
  const findAllFieldPaths = (obj: any, prefix = ''): string[] => {
    if (obj === null || obj === undefined) {
      return [];
    }
    
    const paths: string[] = [];
    
    if (Array.isArray(obj)) {
      // 对于数组，我们只处理第一个元素作为示例
      if (obj.length > 0) {
        const arrayPaths = findAllFieldPaths(obj[0], `${prefix}[0]`);
        paths.push(...arrayPaths);
      }
    } else if (typeof obj === 'object') {
      // 对于对象，遍历所有属性
      for (const key in obj) {
        const newPrefix = prefix ? `${prefix}.${key}` : key;
        paths.push(newPrefix);
        
        const nestedPaths = findAllFieldPaths(obj[key], newPrefix);
        paths.push(...nestedPaths);
      }
    }
    
    return paths;
  };
  
  // 查找字段名称的建议路径
  const findSuggestions = (allPaths: string[], fieldName: string): string[] => {
    // 查找包含字段名的路径
    const suggestions = allPaths.filter(path => {
      const parts = path.split('.');
      const lastPart = parts[parts.length - 1];
      return lastPart === fieldName || lastPart.endsWith(`]${fieldName}`);
    });
    
    // 添加数组通配符建议
    const arrayPatterns = new Set<string>();
    suggestions.forEach(path => {
      // 检查路径中是否包含数组索引，例如 data[0].address
      const match = path.match(/(.+?\[)(\d+)(\].+)/);
      if (match) {
        // 将数字索引替换为通配符 *
        const [_, prefix, __, suffix] = match;
        const wildcardPath = `${prefix}*${suffix}`;
        arrayPatterns.add(wildcardPath);
      }
    });
    
    // 合并普通建议和通配符建议
    const allSuggestions = [...suggestions, ...Array.from(arrayPatterns)];
    
    // 限制建议数量，但确保通配符建议优先显示
    const wildcardSuggestions = allSuggestions.filter(s => s.includes('[*]'));
    const normalSuggestions = allSuggestions.filter(s => !s.includes('[*]'));
    
    return [...wildcardSuggestions, ...normalSuggestions].slice(0, 5);
  };
  
  // 处理跨域错误
  const handleCorsError = (targetUrl: string, error: Error) => {
    setTestResult({
      success: false,
      data: {
        error: '跨域请求失败 (CORS)',
        message: '由于浏览器的安全限制，无法直接访问外部API。',
        solutions: [
          '1. 在API服务器端添加CORS头: Access-Control-Allow-Origin: *',
          '2. 使用后端代理转发请求',
          '3. 在开发环境中配置代理服务器',
          '4. 使用浏览器插件临时禁用CORS限制（仅用于测试）'
        ],
        details: {
          url: targetUrl,
          errorMessage: error.message,
          recommendation: '建议在项目中添加一个代理服务器来转发API请求'
        }
      }
    });
  };
  
  // 添加字段映射
  const handleAddFieldMapping = () => {
    if (editedApi) {
      setEditedApi({
        ...editedApi,
        fieldMappings: [
          ...(editedApi.fieldMappings || []),
          { customName: '', displayName: '', jsonPath: '' }
        ]
      });
    }
  };
  
  // 删除字段映射
  const handleRemoveFieldMapping = (index: number) => {
    if (editedApi) {
      const updatedMappings = [...(editedApi.fieldMappings || [])];
      updatedMappings.splice(index, 1);
      
      setEditedApi({
        ...editedApi,
        fieldMappings: updatedMappings
      });
    }
  };
  
  // 修改字段映射
  const handleFieldMappingChange = (index: number, field: string, value: string) => {
    if (editedApi) {
      const updatedMappings = [...(editedApi.fieldMappings || [])];
      updatedMappings[index] = {
        ...updatedMappings[index],
        [field]: value
      };
      
      setEditedApi({
        ...editedApi,
        fieldMappings: updatedMappings
      });
    }
  };
  
  // 获取交易所名称
  const getExchangeName = (exchangeId?: number): string => {
    if (!exchangeId) return '无';
    
    const exchange = exchanges.find(e => e.NO === exchangeId);
    return exchange ? exchange.name : `交易所ID: ${exchangeId}`;
  };
  
  // 计算Keccak-256哈希
  const calculateHash = () => {
    try {
      let inputToHash = hashInput;
      
      // 如果选择了字段，则使用该字段的值
      if (selectedField && editedApi?.payload) {
        try {
          const payloadObj = JSON.parse(editedApi.payload);
          if (payloadObj[selectedField] !== undefined) {
            inputToHash = typeof payloadObj[selectedField] === 'string' 
              ? payloadObj[selectedField] 
              : JSON.stringify(payloadObj[selectedField]);
          }
        } catch (error) {
          console.error('解析Payload失败:', error);
        }
      }
      
      // 计算哈希
      const hash = '0x' + keccak256(inputToHash);
      setHashResult(hash);
      
      // 验证哈希
      if (expectedHash) {
        const isValid = hash.toLowerCase() === expectedHash.toLowerCase();
        setIsHashValid(isValid);
        setHashVerification(isValid ? '哈希验证通过！' : '哈希验证失败！');
      } else {
        setIsHashValid(false);
        setHashVerification('');
      }
    } catch (error) {
      console.error('计算哈希失败:', error);
      setHashResult('计算哈希失败: ' + (error instanceof Error ? error.message : String(error)));
      setIsHashValid(false);
      setHashVerification('');
    }
  };
  
  // 从Payload中提取字段
  const payloadFields = useMemo(() => {
    if (!editedApi?.payload) return [];
    
    try {
      const payloadObj = JSON.parse(editedApi.payload);
      return Object.keys(payloadObj);
    } catch (error) {
      console.error('解析Payload失败:', error);
      return [];
    }
  }, [editedApi?.payload]);
  
  // 获取Token预设值选项
  const getTokenPresets = useMemo(() => {
    const presets: { label: string; value: string; chainId: string; address: string }[] = [];
    
    // 遍历所有Token
    tokens.forEach(token => {
      if (token.active) {
        // 遍历Token的地址列表
        token.addressList.forEach(addressInfo => {
          // 查找对应的链名称
          const chain = chains.find(c => c.chainId.toString() === addressInfo.chainId);
          if (chain) {
            presets.push({
              label: `${token.name}(${chain.name})`,
              value: addressInfo.address,
              chainId: addressInfo.chainId,
              address: addressInfo.address
            });
          }
        });
      }
    });
    
    return presets;
  }, [tokens, chains]);
  
  // 处理预设值选择
  const handlePresetSelect = (variable: string, value: string) => {
    setTestVariables({
      ...testVariables,
      [variable]: value
    });
  };
  
  // 获取链上方法参数
  const fetchContractMethods = async (contractAddress: string, chainId: number) => {
    try {
      setIsLoadingMethods(true);
      setError(null);
      setTestResult(null);
      
      // 记录访问过程
      const logs: string[] = [];
      logs.push(`开始获取合约方法 - 合约地址: ${contractAddress}, 链ID: ${chainId}`);
      
      // 查找选中的链
      const selectedChain = chains.find(chain => chain.chainId === chainId);
      if (!selectedChain || !selectedChain.rpcUrls || selectedChain.rpcUrls.length === 0) {
        throw new Error(`找不到链ID为 ${chainId} 的RPC URL`);
      }
      
      // 获取合约ABI
      const rpcUrl = selectedChain.rpcUrls[0];
      logs.push(`使用RPC URL: ${rpcUrl}`);
      
      // 使用ethers.js连接到区块链
      logs.push(`正在连接到区块链...`);
      const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
      
      try {
        // 检查连接
        logs.push(`正在检查区块链连接...`);
        const blockNumber = await provider.getBlockNumber();
        logs.push(`连接成功，当前区块高度: ${blockNumber}`);
      } catch (error) {
        logs.push(`连接失败: ${error instanceof Error ? error.message : String(error)}`);
        throw new Error(`连接到区块链失败: ${error instanceof Error ? error.message : String(error)}`);
      }
      
      // 检查合约地址是否有效
      logs.push(`正在验证合约地址...`);
      if (!ethers.utils.isAddress(contractAddress)) {
        logs.push(`合约地址无效: ${contractAddress}`);
        throw new Error(`合约地址无效: ${contractAddress}`);
      }
      
      logs.push(`正在获取合约代码...`);
      const code = await provider.getCode(contractAddress);
      if (code === '0x') {
        logs.push(`地址 ${contractAddress} 不是合约地址`);
        throw new Error(`地址 ${contractAddress} 不是合约地址`);
      }
      
      logs.push(`合约代码长度: ${code.length} 字节`);
      
      // 尝试获取合约ABI
      logs.push(`正在尝试获取合约ABI...`);
      
      // 由于无法直接从链上获取ABI，我们使用常见的ERC20接口作为基础
      const erc20Interface = new ethers.utils.Interface([
        // ERC20标准方法
        'function name() view returns (string)',
        'function symbol() view returns (string)',
        'function decimals() view returns (uint8)',
        'function totalSupply() view returns (uint256)',
        'function balanceOf(address owner) view returns (uint256)',
        'function transfer(address to, uint256 amount) returns (bool)',
        'function allowance(address owner, address spender) view returns (uint256)',
        'function approve(address spender, uint256 amount) returns (bool)',
        'function transferFrom(address from, address to, uint256 amount) returns (bool)',
        // 常见的其他方法
        'function mint(address to, uint256 amount) returns (bool)',
        'function burn(uint256 amount) returns (bool)',
        'function owner() view returns (address)',
        'function getOwner() view returns (address)',
        'function implementation() view returns (address)'
      ]);
      
      logs.push(`使用ERC20标准接口和常见方法`);
      
      // 检查合约是否支持这些方法
      const methods = [];
      for (const fragment of Object.values(erc20Interface.functions) as any[]) {
        try {
          if (fragment.name && fragment.inputs) {
            logs.push(`正在检查方法: ${fragment.name}`);
            methods.push({
              name: fragment.name,
              inputs: fragment.inputs.map((input: any) => ({
                name: input.name,
                type: input.type
              }))
            });
          }
        } catch (error) {
          logs.push(`检查方法 ${fragment.name} 时出错: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
      
      logs.push(`找到 ${methods.length} 个可能的方法`);
      
      // 更新合约方法列表
      setContractMethods(methods);
      setIsLoadingMethods(false);
      
      // 设置测试结果，显示访问过程
      setTestResult({
        success: true,
        data: {
          result: `成功获取 ${methods.length} 个可能的方法`,
          logs,
          methods: methods.map((m: any) => m.name)
        }
      });
      
      return methods;
    } catch (error) {
      console.error('获取合约方法失败:', error);
      setIsLoadingMethods(false);
      const errorMessage = '获取合约方法失败: ' + (error instanceof Error ? error.message : String(error));
      setError(errorMessage);
      
      // 设置测试结果，显示错误信息
      setTestResult({
        success: false,
        data: {
          error: '获取合约方法失败',
          message: error instanceof Error ? error.message : String(error),
          logs: ['获取合约方法失败', error instanceof Error ? error.message : String(error)]
        }
      });
      
      throw error;
    }
  };
  
  // 处理合约方法选择
  const handleMethodSelect = async (methodName: string) => {
    if (!editedApi || !editedApi.contractAddress || !editedApi.chainId) return;
    
    try {
      // 获取合约方法列表
      const methods = await fetchContractMethods(editedApi.contractAddress, editedApi.chainId);
      
      // 查找选中的方法
      const selectedMethod = methods.find(method => method.name === methodName);
      if (!selectedMethod) return;
      
      // 更新方法参数
      const methodParams = selectedMethod.inputs.map((input: any) => ({
        name: input.name,
        type: input.type,
        value: ''
      }));
      
      setEditedApi({
        ...editedApi,
        methodName,
        methodParams
      });
      
      // 重置添加参数状态
      setShowAddParam(false);
    } catch (error) {
      console.error('处理方法选择失败:', error);
      setError('获取方法参数失败: ' + (error instanceof Error ? error.message : String(error)));
    }
  };
  
  // 处理方法参数值变更
  const handleParamValueChange = (index: number, value: string) => {
    if (!editedApi || !editedApi.methodParams) return;
    
    const updatedParams = [...editedApi.methodParams];
    updatedParams[index] = {
      ...updatedParams[index],
      value
    };
    
    setEditedApi({
      ...editedApi,
      methodParams: updatedParams
    });
  };
  
  return (
    <PageContainer>
      <PageHeader>
        <PageTitle>API配置</PageTitle>
        <ActionButton onClick={handleAddApi}>+ 添加API</ActionButton>
      </PageHeader>
      
      {error && <ErrorMessage>{error}</ErrorMessage>}
      
      {isLoading ? (
        <LoadingIndicator>加载中...</LoadingIndicator>
      ) : (
        <ContentLayout>
          <ApiList>
            <ApiListHeader>API列表</ApiListHeader>
            <SearchContainer>
              <SearchInput
                type="text"
                placeholder="搜索API名称..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <SearchIcon>🔍</SearchIcon>
            </SearchContainer>
            <ApiItems>
              {apis
                .filter(api => api.name.toLowerCase().includes(searchTerm.toLowerCase()))
                .map(api => (
                <ApiItem 
                  key={api.NO || api.name} 
                  selected={selectedApi?.NO === api.NO}
                  onClick={() => handleApiSelect(api)}
                >
                  <ApiName selected={selectedApi?.NO === api.NO}>{api.name}</ApiName>
                  {api.exchangeId && (
                    <ExchangeName>{getExchangeName(api.exchangeId)}</ExchangeName>
                  )}
                  <StatusIndicator 
                    active={api.active} 
                    onClick={(e) => {
                      e.stopPropagation(); // 阻止事件冒泡
                      handleToggleStatus(api);
                    }}
                  >
                    {api.active ? '已启用' : '已禁用'}
                  </StatusIndicator>
                </ApiItem>
              ))}
              
              {apis.length === 0 && (
                <EmptyMessage>暂无API配置</EmptyMessage>
              )}
            </ApiItems>
          </ApiList>
          
          <ConfigPanel>
            {!isEditing && selectedApi && (
              <>
                <FormSection>
                  <SectionTitle>基本信息</SectionTitle>
                  <InfoRow>
                    <InfoLabel>API名称:</InfoLabel>
                    <InfoValue>{selectedApi.name}</InfoValue>
                  </InfoRow>
                  <InfoRow>
                    <InfoLabel>API基础URL:</InfoLabel>
                    <InfoValue>{selectedApi.baseUrl}</InfoValue>
                  </InfoRow>
                  <InfoRow>
                    <InfoLabel>关联交易所:</InfoLabel>
                    <InfoValue>{getExchangeName(selectedApi.exchangeId)}</InfoValue>
                  </InfoRow>
                  <InfoRow>
                    <InfoLabel>状态:</InfoLabel>
                    <InfoValue>
                      <StatusIndicator active={selectedApi.active}>
                        {selectedApi.active ? '已启用' : '已禁用'}
                      </StatusIndicator>
                    </InfoValue>
                  </InfoRow>
                </FormSection>
                
                <FormSection>
                  <SectionTitle>字段映射</SectionTitle>
                  {selectedApi.fieldMappings && selectedApi.fieldMappings.length > 0 ? (
                    selectedApi.fieldMappings.map((mapping, index) => (
                      <FieldRow key={index}>
                        <InfoLabel>字段名:</InfoLabel>
                        <InfoValue>{mapping.customName}</InfoValue>
                        <InfoLabel>显示名:</InfoLabel>
                        <InfoValue>{mapping.displayName}</InfoValue>
                        <InfoLabel>JSON路径:</InfoLabel>
                        <InfoValue>{mapping.jsonPath}</InfoValue>
                      </FieldRow>
                    ))
                  ) : (
                    <EmptyMessage>暂无字段映射</EmptyMessage>
                  )}
                </FormSection>
                
                <DetailItem>
                  <DetailLabel>API基础URL</DetailLabel>
                  <DetailValue>{selectedApi.baseUrl}</DetailValue>
                </DetailItem>
                
                <DetailItem>
                  <DetailLabel>请求方法</DetailLabel>
                  <DetailValue>{selectedApi.method}</DetailValue>
                </DetailItem>
                
                {selectedApi.method === 'POST' && selectedApi.payload && (
                  <DetailItem>
                    <DetailLabel>请求负载 (Payload)</DetailLabel>
                    <DetailValue>
                      <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                        {selectedApi.payload}
                      </pre>
                    </DetailValue>
                  </DetailItem>
                )}
                
                <DetailItem>
                  <DetailLabel>API密钥</DetailLabel>
                  <DetailValue>{selectedApi.apiKey || '无'}</DetailValue>
                </DetailItem>
                
                <ButtonGroup>
                  <Button variant="primary" onClick={handleEditApi}>编辑</Button>
                  <Button variant="danger" onClick={handleDeleteApi}>删除</Button>
                </ButtonGroup>
              </>
            )}
            
            {isEditing && editedApi && (
              <>
                <FormSection>
                  <SectionTitle>基本信息</SectionTitle>
                  <FormRow>
                    <FormGroup>
                      <Label>API名称<span className="required">*</span></Label>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <Input 
                          value={editedApi.name} 
                          onChange={(e) => setEditedApi({...editedApi, name: e.target.value})}
                          placeholder="例如：Binance 价格API"
                          style={{ flex: 1 }}
                        />
                        <Select 
                          value="" 
                          onChange={(e) => {
                            if (e.target.value) {
                              const selectedPreset = PRESET_APIS.find(p => p.name === e.target.value);
                              if (selectedPreset) {
                                handlePresetApiSelect(selectedPreset);
                              }
                            }
                          }}
                          style={{ width: '120px' }}
                        >
                          <option value="">选择预设</option>
                          {PRESET_APIS.map(api => (
                            <option key={api.name} value={api.name}>{api.name}</option>
                          ))}
                        </Select>
                      </div>
                    </FormGroup>
                  </FormRow>
                  
                  <FormRow>
                    <FormGroup>
                      <Label>API类型<span className="required">*</span></Label>
                      <Select 
                        value={editedApi.apiType || 'HTTP'} 
                        onChange={(e) => setEditedApi({
                          ...editedApi, 
                          apiType: e.target.value as 'HTTP' | 'CHAIN',
                          // 清除不相关的字段
                          ...(e.target.value === 'HTTP' 
                            ? { chainId: undefined, contractAddress: undefined, methodName: undefined, methodParams: undefined } 
                            : {})
                        })}
                      >
                        <option value="HTTP">HTTP</option>
                        <option value="CHAIN">链上数据</option>
                      </Select>
                    </FormGroup>
                  </FormRow>
                  
                  {/* 根据API类型显示不同的配置选项 */}
                  {(editedApi.apiType === 'HTTP' || !editedApi.apiType) ? (
                    <>
                      <FormRow>
                        <FormGroup>
                          <Label>API基础URL<span className="required">*</span></Label>
                          <Input 
                            value={editedApi.baseUrl} 
                            onChange={(e) => {
                              setEditedApi({...editedApi, baseUrl: e.target.value});
                              // 立即更新变量，确保能检测到所有变量
                              updateDetectedVariables();
                            }}
                            placeholder="例如：https://api.binance.com/api/v3/ticker/price"
                          />
                          <small>支持变量格式：(变量名)</small>
                        </FormGroup>
                      </FormRow>
                      <FormRow>
                        <FormGroup>
                          <Label>请求方法<span className="required">*</span></Label>
                          <Select 
                            value={editedApi.method} 
                            onChange={(e) => setEditedApi({...editedApi, method: e.target.value as 'GET' | 'POST'})}
                          >
                            <option value="GET">GET</option>
                            <option value="POST">POST</option>
                          </Select>
                        </FormGroup>
                      </FormRow>
                      {editedApi.method === 'POST' && (
                        <FormRow>
                          <FormGroup>
                            <Label>请求负载 (Payload)</Label>
                            <Textarea 
                              value={editedApi.payload || ''} 
                              onChange={(e) => {
                                setEditedApi({...editedApi, payload: e.target.value});
                                // 立即更新变量，确保能检测到所有变量
                                updateDetectedVariables();
                              }}
                              placeholder='{"key": "value", "example": "(变量名)"}'
                              rows={8}
                            />
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '5px' }}>
                              <small>支持变量格式：(变量名)</small>
                              <Button 
                                variant="secondary" 
                                onClick={() => {
                                  updateDetectedVariables();
                                  console.log('手动触发变量检测');
                                }}
                                style={{ padding: '3px 8px', fontSize: '12px' }}
                              >
                                检测变量
                              </Button>
                            </div>
                          </FormGroup>
                        </FormRow>
                      )}
                    </>
                  ) : (
                    <>
                      {/* 链上数据配置 */}
                      <FormRow>
                        <FormGroup>
                          <Label>选择链<span className="required">*</span></Label>
                          <Select 
                            value={editedApi.chainId?.toString() || ''} 
                            onChange={(e) => setEditedApi({
                              ...editedApi, 
                              chainId: e.target.value ? parseInt(e.target.value) : undefined,
                              // 清除方法相关信息，因为不同链的合约方法可能不同
                              methodName: undefined,
                              methodParams: undefined
                            })}
                          >
                            <option value="">请选择链</option>
                            {chains.filter(chain => chain.active).map(chain => (
                              <option key={chain.chainId} value={chain.chainId.toString()}>
                                {chain.name} (RPC: {chain.rpcUrls[0]})
                              </option>
                            ))}
                          </Select>
                        </FormGroup>
                      </FormRow>
                      <FormRow>
                        <FormGroup>
                          <Label>合约地址<span className="required">*</span></Label>
                          <div style={{ display: 'flex', gap: '10px' }}>
                            <Input 
                              value={editedApi.contractAddress || ''} 
                              onChange={(e) => setEditedApi({
                                ...editedApi, 
                                contractAddress: e.target.value,
                                // 清除方法相关信息，因为不同合约的方法不同
                                methodName: undefined,
                                methodParams: undefined
                              })}
                              placeholder="例如：0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984"
                              style={{ flex: 3 }}
                            />
                            <Select
                              value=""
                              onChange={(e) => {
                                if (e.target.value) {
                                  setEditedApi({
                                    ...editedApi,
                                    contractAddress: e.target.value,
                                    // 清除方法相关信息，因为不同合约的方法不同
                                    methodName: undefined,
                                    methodParams: undefined
                                  });
                                }
                              }}
                              style={{ flex: 1 }}
                            >
                              <option value="">选择预设合约</option>
                              {tokens
                                .filter(token => token.active && token.addressList.some(addr => 
                                  addr.chainId === editedApi.chainId?.toString()))
                                .map(token => {
                                  const addressInfo = token.addressList.find(addr => 
                                    addr.chainId === editedApi.chainId?.toString());
                                  if (!addressInfo) return null;
                                  
                                  const chain = chains.find(c => c.chainId.toString() === addressInfo.chainId);
                                  const chainName = chain ? chain.name : addressInfo.chainId;
                                  
                                  return (
                                    <option key={token.NO} value={addressInfo.address}>
                                      {token.name}({chainName})
                                    </option>
                                  );
                                })
                                .filter(Boolean)}
                            </Select>
                          </div>
                        </FormGroup>
                      </FormRow>
                      {editedApi.chainId && editedApi.contractAddress && (
                        <FormRow>
                          <FormGroup>
                            <Label>方法名称<span className="required">*</span></Label>
                            <div style={{ display: 'flex', gap: '10px' }}>
                              <Input 
                                value={editedApi.methodName || ''} 
                                onChange={(e) => {
                                  // 如果清空方法名，则清空参数数组
                                  if (!e.target.value) {
                                    setEditedApi({
                                      ...editedApi,
                                      methodName: '',
                                      methodParams: undefined
                                    });
                                  } else {
                                    // 只更新方法名，不自动创建参数数组
                                    setEditedApi({
                                      ...editedApi,
                                      methodName: e.target.value
                                    });
                                  }
                                  // 重置添加参数状态
                                  setShowAddParam(false);
                                }}
                                placeholder="输入方法名称或从右侧选择"
                                style={{ flex: 3 }}
                              />
                              <div style={{ display: 'flex', gap: '5px', flex: 2 }}>
                                <Select 
                                  value=""
                                  onChange={(e) => {
                                    if (e.target.value) {
                                      handleMethodSelect(e.target.value);
                                    }
                                  }}
                                  style={{ flex: 1 }}
                                >
                                  <option value="">选择方法</option>
                                  {contractMethods.map((method, index) => (
                                    <option key={index} value={method.name}>
                                      {method.name}
                                    </option>
                                  ))}
                                </Select>
                                <Button 
                                  variant="secondary" 
                                  onClick={() => fetchContractMethods(editedApi.contractAddress || '', editedApi.chainId || 0)
                                    .then(methods => {
                                      // 更新方法选择下拉框已在fetchContractMethods中处理
                                      console.log('获取到合约方法:', methods);
                                    })
                                    .catch(error => {
                                      setError('获取合约方法失败: ' + (error instanceof Error ? error.message : String(error)));
                                    })
                                  }
                                  style={{ whiteSpace: 'nowrap' }}
                                  disabled={isLoadingMethods || !editedApi.contractAddress || !editedApi.chainId}
                                >
                                  {isLoadingMethods ? '加载中...' : '读取方法'}
                                </Button>
                              </div>
                            </div>
                            <div style={{ marginTop: '5px', display: 'flex', justifyContent: 'space-between' }}>
                              <small>输入方法名称或点击"读取方法"按钮获取合约方法</small>
                              <label style={{ display: 'flex', alignItems: 'center', fontSize: '14px' }}>
                                <input 
                                  type="checkbox" 
                                  checked={editedApi.isProxyContract || false}
                                  onChange={(e) => setEditedApi({
                                    ...editedApi,
                                    isProxyContract: e.target.checked
                                  })}
                                  style={{ marginRight: '5px' }}
                                />
                                代理合约
                              </label>
                            </div>
                          </FormGroup>
                        </FormRow>
                      )}
                      {editedApi.methodName && (
                        <FormSection>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <SectionTitle>方法参数</SectionTitle>
                            <Button 
                              variant="primary" 
                              onClick={() => {
                                // 显示添加参数的行
                                setShowAddParam(true);
                              }}
                              style={{ padding: '2px 10px', fontSize: '14px' }}
                            >
                              + 添加参数
                            </Button>
                          </div>
                          
                          {/* 显示现有参数 */}
                          {(editedApi.methodParams || []).map((param, index) => (
                            <FormRow key={index} style={{ alignItems: 'center' }}>
                              <div style={{ flex: 1, display: 'flex', gap: '10px', alignItems: 'center' }}>
                                <div style={{ width: '25%' }}>
                                  <strong>{param.name}</strong> <small>({param.type})</small>
                                </div>
                                <div style={{ flex: 1 }}>
                                  <Input 
                                    value={param.value || ''} 
                                    onChange={(e) => handleParamValueChange(index, e.target.value)}
                                    placeholder={`请输入${param.type}类型的值`}
                                  />
                                </div>
                                <Button 
                                  variant="danger" 
                                  onClick={() => {
                                    const updatedParams = [...(editedApi.methodParams || [])];
                                    updatedParams.splice(index, 1);
                                    setEditedApi({
                                      ...editedApi,
                                      methodParams: updatedParams
                                    });
                                  }}
                                  style={{ padding: '2px 8px', fontSize: '12px' }}
                                >
                                  删除
                                </Button>
                              </div>
                            </FormRow>
                          ))}
                          
                          {/* 添加新参数的行 */}
                          {showAddParam && (
                            <FormRow style={{ marginTop: '10px', alignItems: 'center' }}>
                              <div style={{ flex: 1, display: 'flex', gap: '10px', alignItems: 'center' }}>
                                <div style={{ width: '25%', display: 'flex', gap: '5px' }}>
                                  <Input 
                                    value={newParamName} 
                                    onChange={(e) => setNewParamName(e.target.value)}
                                    placeholder="参数名称"
                                    style={{ flex: 1 }}
                                  />
                                </div>
                                <div style={{ width: '25%' }}>
                                  <Select
                                    value={newParamType}
                                    onChange={(e) => setNewParamType(e.target.value)}
                                    style={{ width: '100%' }}
                                  >
                                    <option value="">选择类型</option>
                                    <option value="uint256">uint256</option>
                                    <option value="address">address</option>
                                    <option value="bool">bool</option>
                                    <option value="string">string</option>
                                    <option value="bytes">bytes</option>
                                    <option value="uint8">uint8</option>
                                    <option value="uint128">uint128</option>
                                    <option value="int256">int256</option>
                                  </Select>
                                </div>
                                <div style={{ flex: 1, display: 'flex', gap: '5px' }}>
                                  <Input 
                                    value={newParamValue} 
                                    onChange={(e) => setNewParamValue(e.target.value)}
                                    placeholder="参数值"
                                    style={{ flex: 1 }}
                                  />
                                  <Button 
                                    variant="primary" 
                                    onClick={() => {
                                      if (!newParamName || !newParamType) {
                                        setError('请输入参数名称和类型');
                                        return;
                                      }
                                      
                                      const updatedParams = [...(editedApi.methodParams || [])];
                                      updatedParams.push({
                                        name: newParamName,
                                        type: newParamType,
                                        value: newParamValue
                                      });
                                      
                                      setEditedApi({
                                        ...editedApi,
                                        methodParams: updatedParams
                                      });
                                      
                                      // 清空输入
                                      setNewParamName('');
                                      setNewParamType('');
                                      setNewParamValue('');
                                      setShowAddParam(false);
                                    }}
                                    disabled={!newParamName || !newParamType}
                                  >
                                    确定
                                  </Button>
                                  <Button 
                                    variant="secondary" 
                                    onClick={() => {
                                      setNewParamName('');
                                      setNewParamType('');
                                      setNewParamValue('');
                                      setShowAddParam(false);
                                    }}
                                  >
                                    取消
                                  </Button>
                                </div>
                              </div>
                            </FormRow>
                          )}
                          
                          <div style={{ marginTop: '5px' }}>
                            <small>支持变量格式：(变量名)</small>
                          </div>
                        </FormSection>
                      )}
                    </>
                  )}
                  
                  {/* API密钥/Secret（可折叠） */}
                  {(editedApi.apiType === 'HTTP' || !editedApi.apiType) && (
                  <CollapsibleSection>
                    <CollapsibleHeader onClick={() => setIsApiKeySectionOpen(!isApiKeySectionOpen)}>
                      <CollapsibleTitle>API密钥/Secret（可选）</CollapsibleTitle>
                      <CollapsibleIcon className={isApiKeySectionOpen ? 'open' : ''}>▼</CollapsibleIcon>
                    </CollapsibleHeader>
                    <CollapsibleContent isOpen={isApiKeySectionOpen}>
                      <FormRow>
                        <FormGroup>
                          <Label>API密钥</Label>
                          <Input 
                            value={editedApi.apiKey || ''} 
                            onChange={(e) => setEditedApi({...editedApi, apiKey: e.target.value})}
                            placeholder="可选，填写API密钥"
                          />
                        </FormGroup>
                      </FormRow>
                      <FormRow>
                        <FormGroup>
                          <Label>API密钥Secret</Label>
                          <Input 
                            type="password"
                            value={editedApi.apiSecret || ''} 
                            onChange={(e) => setEditedApi({...editedApi, apiSecret: e.target.value})}
                            placeholder="可选，填写API密钥对应的Secret"
                          />
                        </FormGroup>
                      </FormRow>
                    </CollapsibleContent>
                  </CollapsibleSection>
                  )}
                  
                  {/* 关联交易所（可折叠） */}
                  {(editedApi.apiType === 'HTTP' || !editedApi.apiType) && (
                  <CollapsibleSection>
                    <CollapsibleHeader onClick={() => setIsExchangeSectionOpen(!isExchangeSectionOpen)}>
                      <CollapsibleTitle>关联交易所（可选）</CollapsibleTitle>
                      <CollapsibleIcon className={isExchangeSectionOpen ? 'open' : ''}>▼</CollapsibleIcon>
                    </CollapsibleHeader>
                    <CollapsibleContent isOpen={isExchangeSectionOpen}>
                      <FormRow>
                        <FormGroup>
                          <Label>关联交易所</Label>
                          <Select 
                            value={editedApi.exchangeId?.toString() || ''} 
                            onChange={(e) => setEditedApi({...editedApi, exchangeId: e.target.value ? parseInt(e.target.value) : undefined})}
                          >
                            <option value="">不关联交易所</option>
                            {exchanges.map(exchange => (
                              <option key={exchange.NO} value={exchange.NO?.toString()}>
                                {exchange.name}
                              </option>
                            ))}
                          </Select>
                        </FormGroup>
                      </FormRow>
                    </CollapsibleContent>
                  </CollapsibleSection>
                  )}
                  
                  <FormRow>
                    <FormGroup minWidth="120px">
                      <Label>状态</Label>
                      <Select 
                        value={editedApi.active ? 'true' : 'false'}
                        onChange={(e) => setEditedApi({...editedApi, active: e.target.value === 'true'})}
                      >
                        <option value="true">启用</option>
                        <option value="false">禁用</option>
                      </Select>
                    </FormGroup>
                  </FormRow>
                </FormSection>
                
                {/* 字段映射（可折叠） */}
                {(editedApi.apiType === 'HTTP' || !editedApi.apiType) && (
                <CollapsibleSection>
                  <CollapsibleHeader onClick={() => setIsFieldMappingSectionOpen(!isFieldMappingSectionOpen)}>
                    <CollapsibleTitle>字段映射（可选）</CollapsibleTitle>
                    <CollapsibleIcon className={isFieldMappingSectionOpen ? 'open' : ''}>▼</CollapsibleIcon>
                  </CollapsibleHeader>
                  <CollapsibleContent isOpen={isFieldMappingSectionOpen}>
                    {(editedApi.fieldMappings || []).map((mapping, index) => (
                      <FieldRow key={index}>
                        <FieldInput>
                          <Label>自定义字段名<span className="required">*</span></Label>
                          <Input 
                            value={mapping.customName} 
                            onChange={(e) => handleFieldMappingChange(index, 'customName', e.target.value)}
                            placeholder="例如：price"
                          />
                        </FieldInput>
                        <FieldInput>
                          <Label>显示名称<span className="required">*</span></Label>
                          <Input 
                            value={mapping.displayName} 
                            onChange={(e) => handleFieldMappingChange(index, 'displayName', e.target.value)}
                            placeholder="例如：价格"
                          />
                        </FieldInput>
                        <FieldInput>
                          <Label>JSON路径<span className="required">*</span></Label>
                          <Input 
                            value={mapping.jsonPath} 
                            onChange={(e) => handleFieldMappingChange(index, 'jsonPath', e.target.value)}
                            placeholder="例如：data.price"
                          />
                        </FieldInput>
                        <RemoveButton onClick={() => handleRemoveFieldMapping(index)}>×</RemoveButton>
                      </FieldRow>
                    ))}
                    <Button onClick={handleAddFieldMapping}>+ 添加字段映射</Button>
                  </CollapsibleContent>
                </CollapsibleSection>
                )}
                
                {/* 变量输入区域 */}
                {detectedVariables.length > 0 && (
                  <FormSection>
                    <SectionTitle>API变量</SectionTitle>
                    <p>在URL或Payload中检测到以下变量，请提供测试值：</p>
                    {detectedVariables.map(variable => (
                      <FormRow key={variable}>
                        <FormGroup>
                          <Label>{variable}</Label>
                          <div style={{ display: 'flex', gap: '10px' }}>
                            <Input 
                              value={testVariables[variable] || ''} 
                              onChange={(e) => setTestVariables({
                                ...testVariables,
                                [variable]: e.target.value
                              })}
                              placeholder={`请输入${variable}的值`}
                              style={{ flex: 3 }} /* 增加输入框的比例 */
                            />
                            <Select
                              value=""
                              onChange={(e) => handlePresetSelect(variable, e.target.value)}
                              style={{ flex: 1, minWidth: 'auto', maxWidth: '150px' }} /* 使用flex布局并限制最大宽度 */
                            >
                              <option value="">预设值</option> /* 简化选项文本 */
                              <optgroup label="Token">
                                {getTokenPresets.map((preset, index) => (
                                  <option key={index} value={preset.value}>
                                    {preset.label}
                                  </option>
                                ))}
                              </optgroup>
                            </Select>
                          </div>
                        </FormGroup>
                      </FormRow>
                    ))}
                    
                    {/* Keccak-256哈希计算器（可折叠） */}
                    <CollapsibleSection>
                      <CollapsibleHeader onClick={() => setIsHashCalculatorOpen(!isHashCalculatorOpen)}>
                        <CollapsibleTitle>Keccak-256哈希计算器</CollapsibleTitle>
                        <CollapsibleIcon className={isHashCalculatorOpen ? 'open' : ''}>▼</CollapsibleIcon>
                      </CollapsibleHeader>
                      <CollapsibleContent isOpen={isHashCalculatorOpen}>
                        <HashInputRow>
                          <HashSelect 
                            value={selectedField} 
                            onChange={(e) => setSelectedField(e.target.value)}
                          >
                            <option value="">直接输入值</option>
                            {payloadFields.map(field => (
                              <option key={field} value={field}>{field}</option>
                            ))}
                          </HashSelect>
                          <HashInput 
                            value={hashInput} 
                            onChange={(e) => setHashInput(e.target.value)}
                            placeholder={selectedField ? "已选择字段，此输入将被忽略" : "输入要计算哈希的值"}
                            disabled={!!selectedField}
                          />
                          <HashButton onClick={calculateHash}>计算哈希</HashButton>
                        </HashInputRow>
                        <HashInputRow>
                          <HashInput 
                            value={expectedHash} 
                            onChange={(e) => setExpectedHash(e.target.value)}
                            placeholder="输入期望的哈希值进行验证（可选）"
                          />
                        </HashInputRow>
                        {hashResult && (
                          <HashResult>
                            {hashResult}
                          </HashResult>
                        )}
                        {hashVerification && (
                          <HashVerification isValid={isHashValid}>
                            {hashVerification}
                          </HashVerification>
                        )}
                      </CollapsibleContent>
                    </CollapsibleSection>
                  </FormSection>
                )}
                
                <FormSection>
                  <SectionTitle>API测试</SectionTitle>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '15px', gap: '10px' }}>
                      <Button 
                        onClick={handleTestApi} 
                        disabled={isTesting || detectedVariables.some(v => !testVariables[v])}
                      >
                        {isTesting ? '测试中...' : '测试API'}
                      </Button>
                      
                      <ProxyToggle>
                        <input
                          type="checkbox"
                          id="proxyToggle"
                          checked={useProxyToggle}
                          onChange={(e) => setUseProxyToggle(e.target.checked)}
                        />
                        <label htmlFor="proxyToggle">
                          使用本地代理 ({useProxyToggle ? '已启用' : '已禁用'})
                        </label>
                      </ProxyToggle>
                    </div>
                    
                    {/* 测试结果显示 */}
                    {testResult && (
                      <div>
                        <h4>测试结果</h4>
                        
                        {/* 错误解决方案 */}
                        {!testResult.success && testResult.data.solutions && (
                          <div style={{ marginBottom: '15px' }}>
                            <ErrorContainer>
                              <h5>{testResult.data.error}</h5>
                              <p>{testResult.data.message}</p>
                              <ul>
                                {testResult.data.solutions.map((solution: string, index: number) => (
                                  <li key={index}>{solution}</li>
                                ))}
                              </ul>
                              {testResult.data.originalUrl && (
                                <div>
                                  <p><strong>原始URL:</strong> {testResult.data.originalUrl}</p>
                                  {testResult.data.proxyUrl && (
                                    <p><strong>代理URL:</strong> {testResult.data.proxyUrl}</p>
                                  )}
                                </div>
                              )}
                            </ErrorContainer>
                          </div>
                        )}
                        
                        {/* 访问过程日志 */}
                        {testResult.data.logs && (
                          <div style={{ marginBottom: '15px' }}>
                            <h5>访问过程</h5>
                            <LogContainer>
                              {testResult.data.logs.map((log: string, index: number) => (
                                <LogItem key={index}>
                                  <LogNumber>{index + 1}.</LogNumber>
                                  <LogText>{log}</LogText>
                                </LogItem>
                              ))}
                            </LogContainer>
                          </div>
                        )}
                        
                        {/* 链上数据调用成功信息 */}
                        {testResult.success && testResult.data.method && !testResult.data.proxyUrl && (
                          <div style={{ marginBottom: '15px' }}>
                            <SuccessContainer>
                              <h5>合约方法调用成功</h5>
                              <p>成功调用合约方法并获取返回值。</p>
                              <div>
                                <p><strong>合约地址:</strong> {testResult.data.contractAddress}</p>
                                {testResult.data.implementationAddress && (
                                  <p><strong>实现合约地址:</strong> {testResult.data.implementationAddress}</p>
                                )}
                                <p><strong>方法名称:</strong> {testResult.data.method}</p>
                                <p><strong>参数:</strong> {testResult.data.params?.join(', ') || '无'}</p>
                                <p><strong>返回值:</strong> {testResult.data.result}</p>
                              </div>
                            </SuccessContainer>
                          </div>
                        )}
                        
                        {/* 代理成功信息 */}
                        {testResult.success && testResult.data.proxyUrl && (
                          <div style={{ marginBottom: '15px' }}>
                            <SuccessContainer>
                              <h5>请求成功通过代理转发</h5>
                              <p>请求已通过本地代理服务器成功转发，避免了浏览器的跨域限制。</p>
                              <div>
                                <p><strong>原始URL:</strong> {testResult.data.originalUrl}</p>
                                <p><strong>代理URL:</strong> {testResult.data.proxyUrl}</p>
                              </div>
                            </SuccessContainer>
                          </div>
                        )}
                        
                        {/* 自定义字段结果 */}
                        {testResult.data.customFields && (
                          <div style={{ marginBottom: '15px' }}>
                            <h5>自定义字段提取结果</h5>
                            <CustomFieldsContainer>
                              {Object.entries(testResult.data.customFields).map(([key, field]: [string, any]) => (
                                <CustomFieldItem key={key}>
                                  <CustomFieldName>{field.displayName} ({key})</CustomFieldName>
                                  <CustomFieldValue success={field.value !== '未找到' && field.value !== '解析错误'}>
                                    {Array.isArray(field.value) 
                                      ? (
                                        <ArrayValueContainer>
                                          <ArrayValueHeader>
                                            获取到 {field.value.length} 个值
                                            {field.value.length > 3 && (
                                              <ArrayToggle 
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  const container = e.currentTarget.parentElement?.nextElementSibling;
                                                  if (container) {
                                                    container.classList.toggle('expanded');
                                                    e.currentTarget.textContent = 
                                                      container.classList.contains('expanded') ? '收起' : '展开全部';
                                                  }
                                                }}
                                              >
                                                展开全部
                                              </ArrayToggle>
                                            )}
                                          </ArrayValueHeader>
                                          <ArrayValueList className={field.value.length <= 3 ? 'expanded' : ''}>
                                            {field.value.map((item: any, idx: number) => (
                                              <ArrayValueItem key={idx}>
                                                <ArrayValueIndex>{idx}:</ArrayValueIndex>
                                                <ArrayValueContent>
                                                  {typeof item === 'object' 
                                                    ? JSON.stringify(item) 
                                                    : String(item)
                                                  }
                                                </ArrayValueContent>
                                              </ArrayValueItem>
                                            ))}
                                          </ArrayValueList>
                                        </ArrayValueContainer>
                                      )
                                      : (typeof field.value === 'object' 
                                        ? JSON.stringify(field.value) 
                                        : String(field.value)
                                      )
                                    }
                                  </CustomFieldValue>
                                  {field.suggestions && field.suggestions.length > 0 && (
                                    <SuggestionContainer>
                                      <SuggestionTitle>建议的JSON路径:</SuggestionTitle>
                                      <SuggestionList>
                                        {field.suggestions.map((suggestion: string, index: number) => (
                                          <SuggestionItem key={index} onClick={() => {
                                            // 找到对应的字段映射并更新
                                            if (editedApi && editedApi.fieldMappings) {
                                              const mappingIndex = editedApi.fieldMappings.findIndex(m => m.customName === key);
                                              if (mappingIndex >= 0) {
                                                handleFieldMappingChange(mappingIndex, 'jsonPath', suggestion);
                                                // 重新测试
                                                setTimeout(handleTestApi, 100);
                                              }
                                            }
                                          }}>
                                            {suggestion}
                                          </SuggestionItem>
                                        ))}
                                      </SuggestionList>
                                    </SuggestionContainer>
                                  )}
                                </CustomFieldItem>
                              ))}
                            </CustomFieldsContainer>
                          </div>
                        )}
                        
                        {/* 完整响应结果 */}
                        <ResultContainer success={testResult.success}>
                          <pre>{JSON.stringify(testResult.data, null, 2)}</pre>
                        </ResultContainer>
                      </div>
                    )}
                  </div>
                </FormSection>
                
                <ButtonGroup>
                  <Button variant="primary" onClick={handleSaveApi}>保存</Button>
                  <Button variant="secondary" onClick={handleCancelEdit}>取消</Button>
                </ButtonGroup>
              </>
            )}
          </ConfigPanel>
        </ContentLayout>
      )}
    </PageContainer>
  );
};

export default ApiConfig; 
