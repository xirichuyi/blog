/**
 * 认证状态管理 Hook
 */

import { useState, useEffect, useCallback, useContext, createContext } from 'react';
import type { ReactNode } from 'react';
import { adminApi } from '@/services/api';
import { storage } from '@/utils/common';
import { STORAGE_KEYS } from '@/constants';

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  token: string | null;
  user: any | null;
}

interface AuthContextType extends AuthState {
  login: (token: string) => Promise<boolean>;
  logout: () => void;
  checkAuth: () => Promise<boolean>;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: true,
    token: null,
    user: null,
  });

  // 检查认证状态
  const checkAuth = useCallback(async (): Promise<boolean> => {
    const token = storage.get<string>(STORAGE_KEYS.AUTH_TOKEN);

    if (!token) {
      setAuthState(prev => ({ ...prev, isAuthenticated: false, isLoading: false }));
      return false;
    }

    try {
      // 验证token有效性 - 使用同步方法
      const isValid = adminApi.isAuthenticated();

      setAuthState(prev => ({
        ...prev,
        isAuthenticated: isValid,
        token: isValid ? token : null,
        isLoading: false,
      }));

      if (!isValid) {
        storage.remove(STORAGE_KEYS.AUTH_TOKEN);
      }

      return isValid;
    } catch (error) {
      console.error('Auth check failed:', error);
      setAuthState(prev => ({
        ...prev,
        isAuthenticated: false,
        token: null,
        isLoading: false
      }));
      storage.remove(STORAGE_KEYS.AUTH_TOKEN);
      return false;
    }
  }, []);

  // 登录
  const login = useCallback(async (token: string): Promise<boolean> => {
    setAuthState(prev => ({ ...prev, isLoading: true }));

    try {
      // 使用 adminApi.login 方法验证 token
      const success = await adminApi.login(token);

      if (success) {
        // token 已经在 adminApi.login 中存储了
        setAuthState(prev => ({
          ...prev,
          isAuthenticated: true,
          token,
          isLoading: false,
        }));
      } else {
        storage.remove(STORAGE_KEYS.AUTH_TOKEN);
        setAuthState(prev => ({
          ...prev,
          isAuthenticated: false,
          token: null,
          isLoading: false
        }));
      }

      return success;
    } catch (error) {
      console.error('Login failed:', error);
      storage.remove(STORAGE_KEYS.AUTH_TOKEN);
      setAuthState(prev => ({
        ...prev,
        isAuthenticated: false,
        token: null,
        isLoading: false
      }));
      return false;
    }
  }, []);

  // 登出
  const logout = useCallback(() => {
    adminApi.logout();
    storage.remove(STORAGE_KEYS.AUTH_TOKEN);
    setAuthState({
      isAuthenticated: false,
      isLoading: false,
      token: null,
      user: null,
    });
  }, []);

  // 刷新认证状态
  const refreshAuth = useCallback(async () => {
    await checkAuth();
  }, [checkAuth]);

  // 初始化认证状态
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // 监听storage变化（多标签页同步）
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEYS.AUTH_TOKEN) {
        if (e.newValue === null) {
          // Token被删除，登出
          setAuthState({
            isAuthenticated: false,
            isLoading: false,
            token: null,
            user: null,
          });
        } else if (e.newValue !== authState.token) {
          // Token发生变化，重新检查
          checkAuth();
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [authState.token, checkAuth]);

  const contextValue: AuthContextType = {
    ...authState,
    login,
    logout,
    checkAuth,
    refreshAuth,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

/**
 * 认证守卫 Hook
 */
export function useAuthGuard() {
  const { isAuthenticated, isLoading } = useAuth();

  return {
    isAuthenticated,
    isLoading,
    canAccess: isAuthenticated && !isLoading,
  };
}

/**
 * 管理员路由保护 Hook
 */
export function useAdminGuard() {
  const { isAuthenticated, isLoading, checkAuth } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      // 如果未认证，尝试重新检查一次
      checkAuth();
    }
  }, [isAuthenticated, isLoading, checkAuth]);

  return {
    isAuthenticated,
    isLoading,
    shouldRedirect: !isLoading && !isAuthenticated,
  };
}
