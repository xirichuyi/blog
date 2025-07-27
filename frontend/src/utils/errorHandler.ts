import { AxiosError } from 'axios';

// 错误代码映射
export const ERROR_CODES = {
  // 数据库错误
  DATABASE_ERROR: '数据库操作失败，请稍后重试',
  
  // 验证错误
  VALIDATION_ERROR: '输入数据验证失败',
  
  // 认证错误
  AUTHENTICATION_ERROR: '身份验证失败，请重新登录',
  
  // 授权错误
  AUTHORIZATION_ERROR: '权限不足，无法执行此操作',
  
  // 资源未找到
  NOT_FOUND: '请求的资源不存在',
  
  // 配置错误
  CONFIGURATION_ERROR: '服务器配置错误',
  
  // JWT错误
  JWT_ERROR: '登录凭证无效，请重新登录',
  
  // HTTP客户端错误
  HTTP_CLIENT_ERROR: '外部服务连接失败',
  
  // JSON格式错误
  JSON_ERROR: '数据格式错误',
  
  // IO错误
  IO_ERROR: '文件系统操作失败',
  
  // 内部错误
  INTERNAL_ERROR: '服务器内部错误',
  
  // 网络错误
  NETWORK_ERROR: '网络连接失败，请检查网络连接',
  
  // 超时错误
  TIMEOUT_ERROR: '请求超时，请稍后重试',
  
  // 未知错误
  UNKNOWN_ERROR: '未知错误，请联系管理员'
} as const;

// 错误响应接口
export interface ApiErrorResponse {
  error: string;
  status: number;
  code?: string;
}

// 解析API错误
export function parseApiError(error: unknown): string {
  // 如果是AxiosError
  if (error instanceof Error && 'isAxiosError' in error) {
    const axiosError = error as AxiosError<ApiErrorResponse>;
    
    // 网络错误
    if (!axiosError.response) {
      if (axiosError.code === 'ECONNABORTED') {
        return ERROR_CODES.TIMEOUT_ERROR;
      }
      return ERROR_CODES.NETWORK_ERROR;
    }
    
    // 服务器返回的错误
    const response = axiosError.response;
    const data = response.data;
    
    // 如果有具体的错误信息
    if (data?.error) {
      // 如果有错误代码，尝试映射
      if (data.code && data.code in ERROR_CODES) {
        return ERROR_CODES[data.code as keyof typeof ERROR_CODES];
      }
      
      // 返回服务器提供的错误信息
      return data.error;
    }
    
    // 根据HTTP状态码返回通用错误信息
    switch (response.status) {
      case 400:
        return '请求参数错误';
      case 401:
        return ERROR_CODES.AUTHENTICATION_ERROR;
      case 403:
        return ERROR_CODES.AUTHORIZATION_ERROR;
      case 404:
        return ERROR_CODES.NOT_FOUND;
      case 422:
        return ERROR_CODES.VALIDATION_ERROR;
      case 500:
        return ERROR_CODES.INTERNAL_ERROR;
      case 502:
        return '网关错误，服务暂时不可用';
      case 503:
        return '服务暂时不可用，请稍后重试';
      case 504:
        return ERROR_CODES.TIMEOUT_ERROR;
      default:
        return `服务器错误 (${response.status})`;
    }
  }
  
  // 如果是普通Error对象
  if (error instanceof Error) {
    return error.message;
  }
  
  // 如果是字符串
  if (typeof error === 'string') {
    return error;
  }
  
  // 未知错误
  return ERROR_CODES.UNKNOWN_ERROR;
}

// 显示错误的工具函数
export function getErrorMessage(error: unknown, fallbackMessage?: string): string {
  const parsedError = parseApiError(error);
  return parsedError || fallbackMessage || ERROR_CODES.UNKNOWN_ERROR;
}

// 检查是否是认证错误
export function isAuthError(error: unknown): boolean {
  if (error instanceof Error && 'isAxiosError' in error) {
    const axiosError = error as AxiosError;
    return axiosError.response?.status === 401;
  }
  return false;
}

// 检查是否是网络错误
export function isNetworkError(error: unknown): boolean {
  if (error instanceof Error && 'isAxiosError' in error) {
    const axiosError = error as AxiosError;
    return !axiosError.response;
  }
  return false;
}
