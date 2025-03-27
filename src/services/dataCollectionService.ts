import { supabase } from '../utils/supabaseClient';
import { ApiConfigModel } from '../utils/database';

export const fetchApiData = async (config: ApiConfigModel) => {
  try {
    // 根据配置调用 API
    const response = await fetch(config.baseUrl, {
      method: config.method,
      headers: {
        'Content-Type': 'application/json',
        ...(config.apiKey && { 'API-Key': config.apiKey }),
      },
      body: config.method === 'POST' ? config.payload : undefined,
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching API data:', error);
    throw error;
  }
};

export const extractFieldValues = (data: any, jsonPath: string) => {
  try {
    const paths = jsonPath.split('.');
    let result = data;
    
    for (const path of paths) {
      if (result === null || result === undefined) {
        return undefined;
      }
      result = result[path];
    }
    
    return result;
  } catch (error) {
    console.error('Error extracting field values:', error);
    return undefined;
  }
}; 