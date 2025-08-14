// Admin Login Page Component

import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import './LoginPage.css';

const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { login, isAuthenticated, error, isLoading, clearError } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      const from = (location.state as any)?.from?.pathname || '/admin/dashboard';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate, location]);

  // Clear error when component unmounts or inputs change
  useEffect(() => {
    return () => clearError();
  }, [clearError]);

  useEffect(() => {
    if (error) {
      clearError();
    }
  }, [username, password, clearError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username.trim() || !password.trim()) {
      return;
    }

    setIsSubmitting(true);
    
    try {
      const success = await login({ username: username.trim(), password });
      
      if (success) {
        const from = (location.state as any)?.from?.pathname || '/admin/dashboard';
        navigate(from, { replace: true });
      }
    } catch (error) {
      console.error('Login error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  if (isLoading) {
    return (
      <div className="login-loading">
        <md-circular-progress indeterminate></md-circular-progress>
        <p className="md-typescale-body-medium">Checking authentication...</p>
      </div>
    );
  }

  return (
    <div className="login-container">
      <div className="login-background">
        <div className="login-card">
          <div className="login-header">
            <md-icon class="login-icon">admin_panel_settings</md-icon>
            <h1 className="md-typescale-headline-medium">Admin Login</h1>
            <p className="md-typescale-body-medium">
              Sign in to access the admin dashboard
            </p>
          </div>

          <form className="login-form" onSubmit={handleSubmit}>
            {error && (
              <div className="login-error">
                <md-icon>error</md-icon>
                <span className="md-typescale-body-medium">{error}</span>
              </div>
            )}

            <div className="form-field">
              <md-outlined-text-field
                label="Username"
                value={username}
                onInput={(e: any) => setUsername(e.target.value)}
                required
                type="text"
                autocomplete="username"
                class="login-input"
              >
                <md-icon slot="leading-icon">person</md-icon>
              </md-outlined-text-field>
            </div>

            <div className="form-field">
              <md-outlined-text-field
                label="Password"
                value={password}
                onInput={(e: any) => setPassword(e.target.value)}
                required
                type={showPassword ? 'text' : 'password'}
                autocomplete="current-password"
                class="login-input"
              >
                <md-icon slot="leading-icon">lock</md-icon>
                <md-icon-button 
                  slot="trailing-icon"
                  onClick={togglePasswordVisibility}
                  type="button"
                >
                  <md-icon>{showPassword ? 'visibility_off' : 'visibility'}</md-icon>
                </md-icon-button>
              </md-outlined-text-field>
            </div>

            <div className="login-actions">
              <md-filled-button
                type="submit"
                disabled={isSubmitting || !username.trim() || !password.trim()}
                class="login-button"
              >
                {isSubmitting ? (
                  <>
                    <md-circular-progress 
                      indeterminate 
                      slot="icon"
                      style={{ width: '18px', height: '18px' }}
                    ></md-circular-progress>
                    Signing in...
                  </>
                ) : (
                  <>
                    <md-icon slot="icon">login</md-icon>
                    Sign In
                  </>
                )}
              </md-filled-button>
            </div>
          </form>

          <div className="login-footer">
            <p className="md-typescale-body-small">
              Default credentials: admin / admin123456
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
