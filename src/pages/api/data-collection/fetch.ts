import { NextApiRequest, NextApiResponse } from 'next';
import { DataCollectionUtils } from '../../../services/adapters/dataCollectionUtils';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: '方法不允许' });
  }

  try {
    const { url, method, params, outputMapping } = req.body;

    // 验证必要参数
    if (!url || !method) {
      return res.status(400).json({
        success: false,
        error: '缺少必要参数',
        details: { url, method }
      });
    }

    // 使用数据采集工具类执行采集
    const result = await DataCollectionUtils.collect({
      url,
      method,
      params,
      outputMapping
    });

    if (result.success) {
      return res.status(200).json({
        success: true,
        data: result.data,
        mappedData: result.mappedData
      });
    } else {
      return res.status(400).json({
        success: false,
        error: result.error,
        details: {
          timestamp: result.timestamp,
          error: result.error
        }
      });
    }
  } catch (error) {
    console.error('数据采集异常:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '未知错误',
      details: { timestamp: Date.now() }
    });
  }
} 