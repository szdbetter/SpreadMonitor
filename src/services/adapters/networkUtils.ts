/**
 * 网络工具类
 * 用于处理网络连接和DNS解析相关问题
 */

/**
 * 检查URL是否可以连接
 * @param url 要检查的URL
 * @param timeout 超时时间（毫秒）
 * @returns 连接测试结果对象
 */
export async function checkUrlConnectivity(url: string, timeout: number = 5000): Promise<{
  success: boolean;
  status?: number;
  statusText?: string;
  error?: string;
  duration: number;
}> {
  const startTime = Date.now();
  const result = {
    success: false,
    duration: 0,
    status: undefined as number | undefined,
    statusText: undefined as string | undefined,
    error: undefined as string | undefined
  };

  try {
    // 创建带超时的中止控制器
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      // 发送HEAD请求检查连接
      const response = await fetch(url, {
        method: 'HEAD',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        },
        signal: controller.signal,
        mode: 'cors',
        credentials: 'omit'
      });

      // 清除超时
      clearTimeout(timeoutId);
      
      // 计算持续时间
      result.duration = Date.now() - startTime;
      
      // 记录结果
      result.status = response.status;
      result.statusText = response.statusText;
      result.success = response.ok;
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (error) {
    // 计算持续时间
    result.duration = Date.now() - startTime;
    
    // 处理错误
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        result.error = `连接超时 (${timeout}ms)`;
      } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
        result.error = '网络请求失败，可能是跨域或代理问题';
      } else {
        result.error = error.message;
      }
    } else {
      result.error = String(error);
    }
  }

  return result;
}

/**
 * 检查多个URL，找到第一个可以连接的
 * @param urls 要检查的URL列表
 * @param timeout 每个URL的超时时间
 * @returns 所有URL的连接结果
 */
export async function checkMultipleUrls(urls: string[], timeout: number = 5000): Promise<{
  overallSuccess: boolean;
  results: Record<string, {
    success: boolean;
    status?: number;
    statusText?: string;
    error?: string;
    duration: number;
  }>;
  firstSuccessfulUrl?: string;
  logs: string[];
}> {
  const logs: string[] = [`开始测试${urls.length}个URL的连接情况 (${new Date().toLocaleString()})`];
  const results: Record<string, any> = {};
  let overallSuccess = false;
  let firstSuccessfulUrl: string | undefined = undefined;

  for (const url of urls) {
    logs.push(`正在测试: ${url}`);
    const result = await checkUrlConnectivity(url, timeout);
    
    results[url] = result;
    
    // 记录结果
    if (result.success) {
      logs.push(`✓ 成功连接到 ${url} (${result.duration}ms, 状态: ${result.status})`);
      overallSuccess = true;
      if (!firstSuccessfulUrl) {
        firstSuccessfulUrl = url;
      }
    } else {
      logs.push(`✗ 无法连接到 ${url} (${result.duration}ms): ${result.error || `状态码: ${result.status}`}`);
    }
  }

  // 汇总结果
  logs.push(`测试完成，${overallSuccess ? '至少有一个URL可以连接' : '所有URL均无法连接'}`);
  if (firstSuccessfulUrl) {
    logs.push(`首个可连接的URL: ${firstSuccessfulUrl}`);
  }

  return {
    overallSuccess,
    results,
    firstSuccessfulUrl,
    logs
  };
}

/**
 * 通过DNS查询检查主机名是否可解析
 * 使用第三方DNS API替代本地DNS解析
 * @param hostname 主机名
 * @returns 解析测试结果
 */
export async function checkDnsResolution(hostname: string): Promise<{
  success: boolean;
  ip?: string;
  error?: string;
  logs: string[];
}> {
  const logs: string[] = [`测试DNS解析: ${hostname} (${new Date().toLocaleString()})`];
  
  try {
    // 使用备选DNS解析方法
    const publicDnsApis = [
      `https://dns.google/resolve?name=${hostname}`,
      `https://cloudflare-dns.com/dns-query?name=${hostname}&type=A`
    ];
    
    logs.push(`尝试使用公共DNS API解析...`);
    
    // 尝试多个DNS API
    for (const dnsApi of publicDnsApis) {
      try {
        logs.push(`请求: ${dnsApi}`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(dnsApi, {
          headers: {
            'Accept': 'application/dns-json'
          },
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          const data = await response.json();
          
          if (data.Answer && data.Answer.length > 0) {
            const ip = data.Answer[0].data;
            logs.push(`✓ 解析成功: ${hostname} -> ${ip}`);
            return {
              success: true,
              ip,
              logs
            };
          } else {
            logs.push(`✗ DNS API返回成功但没有解析结果`);
          }
        } else {
          logs.push(`✗ DNS API请求失败: ${response.status} ${response.statusText}`);
        }
      } catch (error) {
        logs.push(`✗ DNS API请求出错: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    
    // 如果所有DNS API都失败，尝试间接检测
    logs.push(`尝试间接检测主机名可达性...`);
    
    try {
      // 尝试连接到主机名
      const url = `https://${hostname}/`;
      const result = await checkUrlConnectivity(url);
      
      if (result.success) {
        logs.push(`✓ 成功连接到主机名，表明DNS解析成功`);
        return {
          success: true,
          logs
        };
      } else {
        logs.push(`✗ 无法连接到主机名`);
      }
    } catch (error) {
      logs.push(`✗ 间接检测失败: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    // 所有方法都失败
    logs.push(`✗ 所有DNS解析方法均失败，主机名可能无法解析`);
    return {
      success: false,
      error: 'DNS解析失败',
      logs
    };
  } catch (error) {
    logs.push(`✗ DNS解析过程发生错误: ${error instanceof Error ? error.message : String(error)}`);
    return {
      success: false,
      error: `DNS解析错误: ${error instanceof Error ? error.message : String(error)}`,
      logs
    };
  }
}

/**
 * 尝试使用各种方法测试连接
 * @param host 主机名或完整URL
 * @returns 综合连接测试结果
 */
export async function testConnection(host: string): Promise<{
  success: boolean;
  message: string;
  details: {
    dnsResolution?: {
      success: boolean;
      ip?: string;
      error?: string;
    };
    connectivity?: {
      success: boolean;
      status?: number;
      error?: string;
    };
    proxy: {
      detected: boolean;
      type?: string;
    };
  };
  logs: string[];
}> {
  const logs: string[] = [`开始全面连接测试: ${host} (${new Date().toLocaleString()})`];
  const result = {
    success: false,
    message: '',
    details: {
      dnsResolution: undefined as {
        success: boolean;
        ip?: string;
        error?: string;
      } | undefined,
      connectivity: undefined as {
        success: boolean;
        status?: number;
        error?: string;
      } | undefined,
      proxy: {
        detected: false,
        type: undefined as string | undefined
      }
    },
    logs
  };
  
  // 提取主机名
  let hostname = host;
  try {
    // 如果是完整URL，提取主机名
    if (host.startsWith('http')) {
      const url = new URL(host);
      hostname = url.hostname;
      logs.push(`从URL提取主机名: ${hostname}`);
    }
  } catch (error) {
    logs.push(`提取主机名出错: ${error instanceof Error ? error.message : String(error)}`);
  }
  
  // 检测代理设置
  try {
    // 这只是一个简单检测，实际无法获取浏览器的所有代理设置
    if (window.navigator.userAgent.includes('proxy') || 
        document.location.href.includes('proxy')) {
      result.details.proxy = {
        detected: true,
        type: '可能启用了代理'
      };
      logs.push(`⚠️ 检测到可能使用了代理服务`);
    }
  } catch (error) {
    logs.push(`代理检测出错: ${error instanceof Error ? error.message : String(error)}`);
  }
  
  // 第1步: DNS解析测试
  logs.push(`步骤1: DNS解析测试 ${hostname}`);
  const dnsResult = await checkDnsResolution(hostname);
  result.details.dnsResolution = {
    success: dnsResult.success,
    ip: dnsResult.ip,
    error: dnsResult.error
  };
  logs.push(...dnsResult.logs);
  
  // 第2步: 连接测试
  logs.push(`步骤2: 连接可达性测试`);
  let connectivityTest;
  if (host.startsWith('http')) {
    connectivityTest = await checkUrlConnectivity(host);
  } else {
    // 添加协议前缀测试
    const httpUrl = `https://${host}`;
    logs.push(`未指定协议，默认使用HTTPS: ${httpUrl}`);
    connectivityTest = await checkUrlConnectivity(httpUrl);
  }
  
  result.details.connectivity = {
    success: connectivityTest.success,
    status: connectivityTest.status,
    error: connectivityTest.error
  };
  
  if (connectivityTest.success) {
    logs.push(`✓ 连接测试成功 (${connectivityTest.duration}ms)`);
  } else {
    logs.push(`✗ 连接测试失败: ${connectivityTest.error || `状态码: ${connectivityTest.status}`}`);
  }
  
  // 综合判断
  result.success = dnsResult.success || connectivityTest.success;
  
  if (result.success) {
    result.message = `连接测试通过${dnsResult.success ? ' (DNS解析成功)' : ''}${connectivityTest.success ? ' (HTTP连接成功)' : ''}`;
  } else {
    if (!dnsResult.success) {
      result.message = `DNS解析失败，无法找到主机 ${hostname}`;
      
      // 提供可能的解决方案
      logs.push(`可能的问题原因:`);
      logs.push(`1. DNS服务器配置问题`);
      logs.push(`2. 网络连接问题`);
      logs.push(`3. 代理或VPN配置问题`);
      logs.push(`4. 主机名可能不正确`);
      
      logs.push(`建议的解决方案:`);
      logs.push(`1. 检查网络连接是否正常`);
      logs.push(`2. 尝试使用不同的网络连接`);
      logs.push(`3. 检查代理或VPN设置`);
      logs.push(`4. 在设置页面验证Supabase配置`);
    } else if (!connectivityTest.success) {
      result.message = `DNS解析成功，但HTTP连接失败 (${connectivityTest.error || `状态码: ${connectivityTest.status}`})`;
    } else {
      result.message = `未知连接问题`;
    }
  }
  
  // 添加最终结论
  logs.push(`测试结论: ${result.message}`);
  
  return result;
}

/**
 * 检查用户的网络环境问题
 * @returns 网络环境诊断结果
 */
export async function diagnoseNetworkIssues(): Promise<{
  browserInfo: {
    userAgent: string;
    language: string;
    onLine: boolean;
    cookiesEnabled: boolean;
  };
  connectionInfo?: {
    type?: string;
    downlink?: number;
    rtt?: number;
    effectiveType?: string;
  };
  publicIpInfo?: any;
  issues: string[];
  recommendations: string[];
}> {
  const issues: string[] = [];
  const recommendations: string[] = [];
  
  // 浏览器信息
  const browserInfo = {
    userAgent: navigator.userAgent,
    language: navigator.language,
    onLine: navigator.onLine,
    cookiesEnabled: navigator.cookieEnabled
  };
  
  // 连接信息
  let connectionInfo;
  try {
    const connection = (navigator as any).connection;
    if (connection) {
      connectionInfo = {
        type: connection.type,
        downlink: connection.downlink,
        rtt: connection.rtt,
        effectiveType: connection.effectiveType
      };
    }
  } catch (error) {
    console.warn('获取连接信息失败:', error);
  }
  
  // 检查在线状态
  if (!navigator.onLine) {
    issues.push('浏览器报告网络处于离线状态');
    recommendations.push('检查您的网络连接，确保已连接到互联网');
  }
  
  // 创建结果对象
  const result = {
    browserInfo,
    connectionInfo,
    publicIpInfo: undefined,
    issues,
    recommendations
  };
  
  // 尝试获取公共IP信息
  try {
    const ipInfoResponse = await fetch('https://api.ipify.org?format=json', {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });
    
    if (ipInfoResponse.ok) {
      const ipInfo = await ipInfoResponse.json();
      result.publicIpInfo = ipInfo;
    } else {
      console.warn('获取公共IP信息失败:', ipInfoResponse.status, ipInfoResponse.statusText);
    }
  } catch (error) {
    console.warn('获取公共IP信息出错:', error);
  }
  
  // 添加通用建议
  if (issues.length === 0) {
    issues.push('未检测到明显的网络问题');
  }
  
  recommendations.push('如果仍然无法连接到Supabase，请检查Supabase服务状态或联系您的管理员');
  recommendations.push('临时解决方案：切换到本地存储模式，稍后再尝试连接云数据库');
  
  return result;
} 