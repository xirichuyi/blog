// Admin Login Page Component with Ant Design

import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import {
  Form,
  Input,
  Button,
  Card,
  Typography,
  Space,
  Alert,
  Spin,
} from 'antd';
import {
  KeyOutlined,
  LoginOutlined,
  ArrowLeftOutlined,
} from '@ant-design/icons';
import './style.css';

const { Title, Text } = Typography;

interface LoginFormValues {
  token: string;
}

const Login: React.FC = () => {
  const [form] = Form.useForm();
  const { login, isAuthenticated, error, isLoading, clearError } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      const state = location.state as { from?: { pathname?: string } } | null;
      const from = state?.from?.pathname || '/admin/dashboard';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate, location]);

  // Clear error when component unmounts
  useEffect(() => {
    return () => clearError();
  }, [clearError]);

  const handleSubmit = async (values: LoginFormValues) => {
    try {
      const success = await login({
        token: values.token.trim(),
      });

      if (success) {
        const state = location.state as { from?: { pathname?: string } } | null;
        const from = state?.from?.pathname || '/admin/dashboard';
        navigate(from, { replace: true });
      }
    } catch {
      // Login error is handled by AuthContext
    }
  };

  const handleValuesChange = () => {
    if (error) clearError();
  };

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="login-page">
        <div className="login-container">
          <Card className="login-card">
            <div className="login-loading">
              <Spin size="large" />
              <Text type="secondary" style={{ marginTop: 16 }}>
                Checking authentication...
              </Text>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="login-page">
      <div className="login-container">
        <Card className="login-card" bordered={false}>
          <div className="login-header">
            <div className="login-icon">
              <KeyOutlined style={{ fontSize: 48, color: '#1890ff' }} />
            </div>
            <Title level={2} style={{ marginBottom: 8 }}>Admin Login</Title>
            <Text type="secondary">请输入管理Token登录</Text>
          </div>

          <Form
            form={form}
            name="login"
            onFinish={handleSubmit}
            onValuesChange={handleValuesChange}
            layout="vertical"
            size="large"
            className="login-form"
          >
            <Form.Item
              name="token"
              rules={[
                { required: true, message: '请输入Token' },
                { whitespace: true, message: 'Token不能为空' },
              ]}
            >
              <Input.Password
                prefix={<KeyOutlined />}
                placeholder="请输入管理Token"
                autoComplete="off"
              />
            </Form.Item>

            {error && (
              <Form.Item>
                <Alert
                  message={error}
                  type="error"
                  showIcon
                />
              </Form.Item>
            )}

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                loading={isLoading}
                icon={<LoginOutlined />}
                block
              >
                Sign In
              </Button>
            </Form.Item>
          </Form>

          <div className="login-footer">
            <Button
              type="link"
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate('/')}
            >
              Back to Blog
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Login;
