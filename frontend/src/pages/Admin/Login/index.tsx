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
  UserOutlined,
  LockOutlined,
  LoginOutlined,
  ArrowLeftOutlined,
} from '@ant-design/icons';
import './style.css';

const { Title, Text } = Typography;

interface LoginFormValues {
  username: string;
  password: string;
}

const Login: React.FC = () => {
  const [form] = Form.useForm();
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

  // Clear error when component unmounts
  useEffect(() => {
    return () => clearError();
  }, [clearError]);

  const handleSubmit = async (values: LoginFormValues) => {
    try {
      const success = await login({
        username: values.username.trim(),
        password: values.password,
      });

      if (success) {
        const from = (location.state as any)?.from?.pathname || '/admin/dashboard';
        navigate(from, { replace: true });
      }
    } catch (err) {
      console.error('Login failed:', err);
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
              <UserOutlined style={{ fontSize: 48, color: '#1890ff' }} />
            </div>
            <Title level={2} style={{ marginBottom: 8 }}>Admin Login</Title>
            <Text type="secondary">Sign in to access the admin panel</Text>
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
              name="username"
              rules={[
                { required: true, message: 'Please enter your username' },
                { whitespace: true, message: 'Username cannot be empty' },
              ]}
            >
              <Input
                prefix={<UserOutlined />}
                placeholder="Username"
                autoComplete="username"
              />
            </Form.Item>

            <Form.Item
              name="password"
              rules={[
                { required: true, message: 'Please enter your password' },
              ]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="Password"
                autoComplete="current-password"
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
