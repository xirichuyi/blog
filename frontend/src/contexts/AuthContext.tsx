// Authentication Context for managing auth state

import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import type { AuthState, AuthContextType, LoginCredentials, AdminUser } from '../types';
import { apiService } from '../services/api';

// Initial state
const initialState: AuthState = {
  isAuthenticated: false,
  user: null,
  token: null,
  isLoading: true,
  error: null,
};

// Action types
type AuthAction =
  | { type: 'LOGIN_START' }
  | { type: 'LOGIN_SUCCESS'; payload: { user: AdminUser; token: string } }
  | { type: 'LOGIN_FAILURE'; payload: string }
  | { type: 'LOGOUT' }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'CLEAR_ERROR' }
  | { type: 'CHECK_AUTH_SUCCESS'; payload: { user: AdminUser; token: string } }
  | { type: 'CHECK_AUTH_FAILURE' };

// Reducer
function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'LOGIN_START':
      return {
        ...state,
        isLoading: true,
        error: null,
      };
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        isAuthenticated: true,
        user: action.payload.user,
        token: action.payload.token,
        isLoading: false,
        error: null,
      };
    case 'LOGIN_FAILURE':
      return {
        ...state,
        isAuthenticated: false,
        user: null,
        token: null,
        isLoading: false,
        error: action.payload,
      };
    case 'LOGOUT':
      return {
        ...state,
        isAuthenticated: false,
        user: null,
        token: null,
        error: null,
      };
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload,
      };
    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null,
      };
    case 'CHECK_AUTH_SUCCESS':
      return {
        ...state,
        isAuthenticated: true,
        user: action.payload.user,
        token: action.payload.token,
        isLoading: false,
        error: null,
      };
    case 'CHECK_AUTH_FAILURE':
      return {
        ...state,
        isAuthenticated: false,
        user: null,
        token: null,
        isLoading: false,
        error: null,
      };
    default:
      return state;
  }
}

// Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider component
interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Check authentication on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const login = async (credentials: LoginCredentials): Promise<boolean> => {
    dispatch({ type: 'LOGIN_START' });

    try {
      const response = await apiService.login(credentials);

      if (response.success && response.data?.success && response.data.token && response.data.user) {
        const { token, user } = response.data;
        
        // Store token in localStorage
        localStorage.setItem('admin_token', token);
        
        dispatch({
          type: 'LOGIN_SUCCESS',
          payload: { user, token },
        });
        
        return true;
      } else {
        const errorMessage = response.data?.message || response.error || 'Login failed';
        dispatch({ type: 'LOGIN_FAILURE', payload: errorMessage });
        return false;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      dispatch({ type: 'LOGIN_FAILURE', payload: errorMessage });
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem('admin_token');
    dispatch({ type: 'LOGOUT' });
  };

  const checkAuth = async (): Promise<boolean> => {
    const token = localStorage.getItem('admin_token');
    
    if (!token) {
      dispatch({ type: 'CHECK_AUTH_FAILURE' });
      return false;
    }

    try {
      // For now, if token exists, consider user authenticated
      // In real implementation, verify token with backend
      const user: AdminUser = {
        id: '1',
        username: 'admin',
        email: 'admin@cyrusblog.com',
        role: 'admin',
      };

      dispatch({
        type: 'CHECK_AUTH_SUCCESS',
        payload: { user, token },
      });
      
      return true;
    } catch (error) {
      localStorage.removeItem('admin_token');
      dispatch({ type: 'CHECK_AUTH_FAILURE' });
      return false;
    }
  };

  const clearError = () => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  const value: AuthContextType = {
    ...state,
    login,
    logout,
    checkAuth,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Hook to use auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
