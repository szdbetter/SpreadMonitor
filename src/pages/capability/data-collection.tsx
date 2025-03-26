import { useState } from 'react';

interface LogEntry {
  timestamp: string;
  type: 'info' | 'error' | 'success';
  message: string;
  details?: any;
}

interface DataCollectionNode {
  url: string;
  method: string;
  params?: Record<string, string>;
  outputMapping?: Record<string, string>;
}

export default function DataCollection() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [selectedNode, setSelectedNode] = useState<DataCollectionNode | null>(null);
  
  const addLog = (type: 'info' | 'error' | 'success', message: string, details?: any) => {
    setLogs(prev => [...prev, {
      timestamp: new Date().toLocaleTimeString(),
      type,
      message,
      details
    }]);
  };

  const handleFetchApiData = async () => {
    try {
      addLog('info', '开始获取API数据...');
      
      // 验证节点是否选中
      if (!selectedNode) {
        addLog('error', '请先选择或配置数据节点');
        return;
      }

      // 验证JSON路径
      if (!selectedNode.outputMapping) {
        addLog('error', 'JSON路径未配置');
        return;
      }

      const response = await fetch('/api/data-collection/fetch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: selectedNode.url,
          method: selectedNode.method,
          params: selectedNode.params,
          outputMapping: selectedNode.outputMapping
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        addLog('success', 'API数据获取成功', data.data);
      } else {
        addLog('error', `API数据获取失败: ${data.error}`, data.details);
      }
    } catch (error) {
      addLog('error', `请求异常: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* 现有的UI组件 */}
      
      {/* 日志显示区域 */}
      <div className="mt-4 border rounded-lg p-4 bg-gray-900">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-semibold text-gray-200">操作日志</h3>
          <button
            onClick={() => setLogs([])}
            className="px-2 py-1 text-sm text-gray-400 hover:text-gray-200 transition-colors"
          >
            清除日志
          </button>
        </div>
        <div className="h-48 overflow-y-auto bg-gray-800 rounded p-2">
          {logs.map((log, index) => (
            <div
              key={index}
              className={`mb-1 p-2 rounded ${
                log.type === 'error' ? 'bg-red-900/50 text-red-200' :
                log.type === 'success' ? 'bg-green-900/50 text-green-200' :
                'bg-gray-700/50 text-gray-200'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-xs opacity-75">{log.timestamp}</span>
                <span className="text-sm">{log.message}</span>
              </div>
              {log.details && (
                <pre className="mt-1 text-xs overflow-x-auto">
                  {JSON.stringify(log.details, null, 2)}
                </pre>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 