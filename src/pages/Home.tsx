import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { chainConfigAccess, tokenConfigAccess, tradingPairConfigAccess } from '../services/database';
import { Link } from 'react-router-dom';

// 添加顶部横幅样式
const BannerContainer = styled.div`
  background-color: #F0B90B;
  padding: 12px 20px;
  margin-bottom: 20px;
  border-radius: 5px;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const BannerText = styled.div`
  color: #000000;
  font-weight: bold;
`;

const MigrateButton = styled(Link)`
  background-color: #000000;
  color: #F0B90B;
  padding: 8px 16px;
  border-radius: 4px;
  font-weight: bold;
  text-decoration: none;
  display: inline-block;
  
  &:hover {
    background-color: #333333;
  }
`;

const MonitorGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  grid-template-rows: auto auto;
  gap: 20px;
  width: 100%;
`;

const MonitorCard = styled.div`
  background-color: #2A2A2A;
  border-radius: 5px;
  border: 1px solid #444444;
  overflow: hidden;
`;

const CardHeader = styled.div`
  background-color: #333333;
  padding: 8px 15px;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const CardTitle = styled.h3`
  margin: 0;
  color: #FFFFFF;
  font-size: 14px;
  font-weight: bold;
`;

const CardSubtitle = styled.span`
  color: #AAAAAA;
  font-size: 12px;
`;

interface TableProps {
  columns?: string;
  children: React.ReactNode;
}

const TableHeader = styled.div<TableProps>`
  display: grid;
  grid-template-columns: ${props => props.columns || 'repeat(5, 1fr)'};
  padding: 8px;
  background-color: #333333;
  color: #FFFFFF;
  font-weight: bold;
  font-size: 12px;
`;

const TableRow = styled.div<TableProps>`
  display: grid;
  grid-template-columns: ${props => props.columns || 'repeat(5, 1fr)'};
  padding: 8px;
  border-bottom: 1px solid #2A2A2A;
  background-color: #2A2A2A;
  font-size: 12px;
  align-items: center;
`;

const ChartArea = styled.div`
  background-color: #333333;
  height: 160px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #AAAAAA;
  font-size: 14px;
  margin: 8px;
  border-radius: 3px;
`;

const StatusTag = styled.div<{ status: 'alert' | 'normal' }>`
  background-color: ${props => props.status === 'alert' ? '#FF6600' : '#333333'};
  color: ${props => props.status === 'alert' ? '#FFFFFF' : '#AAAAAA'};
  border-radius: 10px;
  padding: 2px 8px;
  display: inline-block;
  font-size: 11px;
  text-align: center;
`;

const PriceText = styled.span<{ direction: 'up' | 'down' | 'neutral' }>`
  color: ${props => {
    switch(props.direction) {
      case 'up': return '#00FF00';
      case 'down': return '#FF0000';
      default: return '#FFFFFF';
    }
  }};
  font-size: 12px;
`;

const DetailButton = styled.button`
  background-color: #F0B90B;
  color: #000000;
  border: none;
  border-radius: 3px;
  padding: 2px 8px;
  font-size: 11px;
  cursor: pointer;
  
  &:hover {
    background-color: #d6a50a;
  }
`;

const SummaryCard = styled(MonitorCard)`
  grid-column: 1 / 4;
  margin-top: 10px;
  padding: 15px;
`;

const SummaryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 15px;
  margin-bottom: 20px;
`;

const StatCard = styled.div`
  background-color: #333333;
  border-radius: 5px;
  padding: 15px;
  text-align: center;
`;

const StatValue = styled.div`
  color: #F0B90B;
  font-size: 24px;
  font-weight: bold;
  margin-bottom: 5px;
`;

const StatLabel = styled.div`
  color: #AAAAAA;
  font-size: 14px;
`;

const SummaryTitle = styled.h2`
  color: #FFFFFF;
  font-size: 18px;
  margin-top: 0;
  margin-bottom: 15px;
`;

const ActionButton = styled.button`
  background-color: #F0B90B;
  color: #000000;
  border: none;
  border-radius: 4px;
  padding: 8px 16px;
  font-weight: bold;
  cursor: pointer;
  margin-top: 10px;
  
  &:hover {
    background-color: #d6a50a;
  }
`;

const Home: React.FC = () => {
  const [chainCount, setChainCount] = useState(0);
  const [tokenCount, setTokenCount] = useState(0);
  const [pairCount, setPairCount] = useState(0);
  
  const navigate = useNavigate();

  useEffect(() => {
    loadStats();
  }, []);
  
  const loadStats = async () => {
    try {
      const chains = await chainConfigAccess.getAll();
      const tokens = await tokenConfigAccess.getAll();
      const pairs = await tradingPairConfigAccess.getAll();
      
      setChainCount(chains.length);
      setTokenCount(tokens.length);
      setPairCount(pairs.length);
    } catch (error) {
      console.error('加载统计数据失败:', error);
    }
  };
  
  return (
    <div style={{padding: '20px'}}>
      {/* 数据迁移横幅 */}
      <BannerContainer>
        <BannerText>
          数据迁移到云端：将本地IndexedDB数据迁移到Supabase云数据库，提高数据安全性和可访问性。
        </BannerText>
        <MigrateButton to="/settings">立即迁移</MigrateButton>
      </BannerContainer>
      
      <SummaryCard>
        <SummaryTitle>系统概览</SummaryTitle>
        <SummaryGrid>
          <StatCard>
            <StatValue>{chainCount}</StatValue>
            <StatLabel>已配置链</StatLabel>
            <ActionButton onClick={() => navigate('/config/chains')}>管理</ActionButton>
          </StatCard>
          <StatCard>
            <StatValue>{tokenCount}</StatValue>
            <StatLabel>已配置Token</StatLabel>
            <ActionButton onClick={() => navigate('/config/tokens')}>管理</ActionButton>
          </StatCard>
          <StatCard>
            <StatValue>{pairCount}</StatValue>
            <StatLabel>已配置交易对</StatLabel>
            <ActionButton onClick={() => navigate('/config/pairs')}>管理</ActionButton>
          </StatCard>
          <StatCard>
            <StatValue>{Math.floor(Math.random() * 10) + 5}</StatValue>
            <StatLabel>当前套利机会</StatLabel>
            <ActionButton onClick={() => navigate('/monitor/arbitrage')}>查看</ActionButton>
          </StatCard>
        </SummaryGrid>
      </SummaryCard>
      
      <MonitorGrid>
        {/* 价格监控卡片 */}
        <MonitorCard>
          <CardHeader>
            <CardTitle>价格监控</CardTitle>
            <CardSubtitle>单链价格告警</CardSubtitle>
          </CardHeader>
          
          <TableHeader columns="1fr 1fr 1.5fr 1.5fr 1fr">
            <div>币种</div>
            <div>链</div>
            <div>当前价格</div>
            <div>目标价格</div>
            <div>状态</div>
          </TableHeader>
          
          <TableRow columns="1fr 1fr 1.5fr 1.5fr 1fr">
            <div>ETH</div>
            <div>以太坊</div>
            <PriceText direction="up">$3,521.45</PriceText>
            <div>$3,600.00</div>
            <StatusTag status="normal">监控中</StatusTag>
          </TableRow>
          
          <TableRow columns="1fr 1fr 1.5fr 1.5fr 1fr">
            <div>BTC</div>
            <div>比特币</div>
            <PriceText direction="down">$62,341.20</PriceText>
            <div>$60,000.00</div>
            <StatusTag status="alert">已触发</StatusTag>
          </TableRow>
          
          <TableRow columns="1fr 1fr 1.5fr 1.5fr 1fr">
            <div>SOL</div>
            <div>Solana</div>
            <PriceText direction="up">$142.85</PriceText>
            <div>$150.00</div>
            <StatusTag status="normal">监控中</StatusTag>
          </TableRow>
          
          <ChartArea>价格趋势图</ChartArea>
        </MonitorCard>
        
        {/* 多链监控卡片 */}
        <MonitorCard>
          <CardHeader>
            <CardTitle>多链价格监控</CardTitle>
            <CardSubtitle>跨链套利机会</CardSubtitle>
          </CardHeader>
          
          <TableHeader columns="0.7fr repeat(4, 1fr) 0.7fr">
            <div>币种</div>
            <div>ETH链</div>
            <div>BSC链</div>
            <div>Arbitrum</div>
            <div>Base</div>
            <div>差异(%)</div>
          </TableHeader>
          
          <TableRow columns="0.7fr repeat(4, 1fr) 0.7fr">
            <div>USDT</div>
            <div>$1.001</div>
            <div>$0.998</div>
            <div>$1.002</div>
            <div>$0.997</div>
            <PriceText direction="up">0.5%</PriceText>
          </TableRow>
          
          <TableRow columns="0.7fr repeat(4, 1fr) 0.7fr">
            <div>ETH</div>
            <div>$3,521.45</div>
            <div>$3,529.80</div>
            <div>$3,520.12</div>
            <div>$3,518.33</div>
            <PriceText direction="up">0.32%</PriceText>
          </TableRow>
          
          <TableRow columns="0.7fr repeat(4, 1fr) 0.7fr">
            <div>LINK</div>
            <div>$18.42</div>
            <div>$18.55</div>
            <div>$18.38</div>
            <div>$18.61</div>
            <PriceText direction="down">1.25%</PriceText>
          </TableRow>
          
          <ChartArea>多链价差热图</ChartArea>
        </MonitorCard>
        
        {/* 多环节套利监控卡片 */}
        <MonitorCard>
          <CardHeader>
            <CardTitle>多环节套利监控</CardTitle>
            <CardSubtitle>复杂套利流程</CardSubtitle>
          </CardHeader>
          
          <TableHeader columns="1.2fr 1.3fr 0.6fr 0.9fr 0.6fr">
            <div>时间（北京）</div>
            <div>规则名称</div>
            <div>APY</div>
            <div>状态</div>
            <div>操作</div>
          </TableHeader>
          
          <TableRow columns="1.2fr 1.3fr 0.6fr 0.9fr 0.6fr">
            <div>2023-07-15 14:28</div>
            <div>sUSDe套利</div>
            <PriceText direction="up">30%</PriceText>
            <StatusTag status="alert">已触发</StatusTag>
            <DetailButton>详情</DetailButton>
          </TableRow>
          
          <TableRow columns="1.2fr 1.3fr 0.6fr 0.9fr 0.6fr">
            <div>2023-07-15 14:15</div>
            <div>USDe-USDC套利</div>
            <PriceText direction="up">15.2%</PriceText>
            <StatusTag status="normal">监控中</StatusTag>
            <DetailButton>详情</DetailButton>
          </TableRow>
          
          <TableRow columns="1.2fr 1.3fr 0.6fr 0.9fr 0.6fr">
            <div>2023-07-15 14:05</div>
            <div>wstETH-ETH套利</div>
            <PriceText direction="up">8.5%</PriceText>
            <StatusTag status="normal">监控中</StatusTag>
            <DetailButton>详情</DetailButton>
          </TableRow>
          
          <TableRow columns="1.2fr 1.3fr 0.6fr 0.9fr 0.6fr">
            <div>2023-07-15 13:58</div>
            <div>rETH-ETH套利</div>
            <PriceText direction="up">6.3%</PriceText>
            <StatusTag status="normal">监控中</StatusTag>
            <DetailButton>详情</DetailButton>
          </TableRow>
          
          <TableRow columns="1.2fr 1.3fr 0.6fr 0.9fr 0.6fr">
            <div>2023-07-15 13:45</div>
            <div>FRAX-USDC套利</div>
            <PriceText direction="up">12.7%</PriceText>
            <StatusTag status="normal">监控中</StatusTag>
            <DetailButton>详情</DetailButton>
          </TableRow>
        </MonitorCard>
      </MonitorGrid>
      
      {/* 套利机会汇总表格 */}
      <SummaryCard>
        <CardHeader>
          <CardTitle>套利机会汇总</CardTitle>
          <CardSubtitle>所有类型套利机会</CardSubtitle>
        </CardHeader>
        
        <TableHeader columns="0.8fr 1fr 1fr 0.8fr 0.8fr 0.8fr 0.6fr">
          <div>套利类型</div>
          <div>资产</div>
          <div>套利路径</div>
          <div>预期收益率</div>
          <div>所需资金</div>
          <div>风险评级</div>
          <div>状态</div>
        </TableHeader>
        
        <TableRow columns="0.8fr 1fr 1fr 0.8fr 0.8fr 0.8fr 0.6fr">
          <div>多环节套利</div>
          <div>sUSDe</div>
          <div>USDC→sUSDe→USDe→USDC</div>
          <PriceText direction="up">+3.32%</PriceText>
          <div>≥ 1000 USDC</div>
          <div style={{color: '#FF9900'}}>中</div>
          <StatusTag status="alert">已触发</StatusTag>
        </TableRow>
        
        <TableRow columns="0.8fr 1fr 1fr 0.8fr 0.8fr 0.8fr 0.6fr">
          <div>多链套利</div>
          <div>LINK</div>
          <div>Base → Arbitrum</div>
          <PriceText direction="up">+1.25%</PriceText>
          <div>≥ 500 LINK</div>
          <div style={{color: '#00FF00'}}>低</div>
          <StatusTag status="alert">已触发</StatusTag>
        </TableRow>
        
        <TableRow columns="0.8fr 1fr 1fr 0.8fr 0.8fr 0.8fr 0.6fr">
          <div>价格触发</div>
          <div>BTC</div>
          <div>BTC价格 {'>'} $60,000</div>
          <div>N/A</div>
          <div>N/A</div>
          <div>N/A</div>
          <StatusTag status="normal">已确认</StatusTag>
        </TableRow>
      </SummaryCard>
    </div>
  );
};

export default Home; 