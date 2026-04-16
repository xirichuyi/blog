import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { apiService } from '../../../services/api';
import {
  Form,
  Input,
  Button,
  Card,
  Typography,
  Space,
  Alert,
  Spin,
  Divider,
} from 'antd';
import {
  KeyOutlined,
  LoginOutlined,
  ArrowLeftOutlined,
  ScanOutlined,
} from '@ant-design/icons';
import './style.css';

const { Title, Text } = Typography;

interface LoginFormValues {
  token: string;
}

/** Convert base64url string to ArrayBuffer */
function base64urlToBuffer(base64url: string): ArrayBuffer {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const pad = base64.length % 4 === 0 ? '' : '='.repeat(4 - (base64.length % 4));
  const binary = atob(base64 + pad);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

const Login: React.FC = () => {
  const [form] = Form.useForm();
  const { login, isAuthenticated, error, isLoading, clearError } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [hasPasskeys, setHasPasskeys] = useState(false);
  const [webauthnLoading, setWebauthnLoading] = useState(false);
  const [webauthnError, setWebauthnError] = useState<string | null>(null);
  const [checkingPasskeys, setCheckingPasskeys] = useState(true);

  // Check if passkeys are registered
  useEffect(() => {
    const checkPasskeys = async () => {
      try {
        const res = await apiService.webauthnHasCredentials();
        if (res.success && res.data?.data?.has_credentials) {
          setHasPasskeys(true);
        }
      } catch {
        // ignore
      } finally {
        setCheckingPasskeys(false);
      }
    };
    checkPasskeys();
  }, []);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      const state = location.state as { from?: { pathname?: string } } | null;
      const from = state?.from?.pathname || '/admin/dashboard';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate, location]);

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

  const handleWebAuthnLogin = useCallback(async () => {
    setWebauthnError(null);
    setWebauthnLoading(true);

    try {
      // 1. Get challenge from server
      const startRes = await apiService.webauthnAuthStart();
      if (!startRes.success || !startRes.data?.data) {
        throw new Error(startRes.data?.message || 'Failed to start authentication');
      }

      const options = startRes.data.data;

      // 2. Convert server options to PublicKeyCredentialRequestOptions
      const publicKeyOptions: PublicKeyCredentialRequestOptions = {
        challenge: base64urlToBuffer(options.publicKey.challenge),
        rpId: options.publicKey.rpId,
        timeout: options.publicKey.timeout,
        userVerification: options.publicKey.userVerification || 'preferred',
        allowCredentials: (options.publicKey.allowCredentials || []).map((c: any) => ({
          id: base64urlToBuffer(c.id),
          type: c.type,
          transports: c.transports,
        })),
      };

      // 3. Call browser WebAuthn API
      const credential = await navigator.credentials.get({
        publicKey: publicKeyOptions,
      });

      if (!credential) {
        throw new Error('Authentication cancelled');
      }

      // 4. Send credential to server
      const finishRes = await apiService.webauthnAuthFinish(credential as PublicKeyCredential);
      if (!finishRes.success || !finishRes.data?.data?.token) {
        throw new Error(finishRes.data?.message || 'Authentication failed');
      }

      // 5. Use the returned token to complete login
      const token = finishRes.data.data.token;
      const success = await login({ token });

      if (success) {
        const state = location.state as { from?: { pathname?: string } } | null;
        const from = state?.from?.pathname || '/admin/dashboard';
        navigate(from, { replace: true });
      }
    } catch (err: any) {
      const msg = err?.name === 'NotAllowedError'
        ? '认证被取消或超时'
        : err?.message || 'WebAuthn 认证失败';
      setWebauthnError(msg);
    } finally {
      setWebauthnLoading(false);
    }
  }, [login, navigate, location]);

  const handleValuesChange = () => {
    if (error) clearError();
    if (webauthnError) setWebauthnError(null);
  };

  if (isLoading || checkingPasskeys) {
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
            <Text type="secondary">请输入管理Token或使用Passkey登录</Text>
          </div>

          {/* WebAuthn Login Button */}
          {hasPasskeys && (
            <>
              <Button
                type="primary"
                size="large"
                icon={<ScanOutlined />}
                loading={webauthnLoading}
                onClick={handleWebAuthnLogin}
                block
                style={{ height: 48, fontSize: 16, borderRadius: 8 }}
              >
                使用 Passkey 登录
              </Button>

              {webauthnError && (
                <Alert
                  message={webauthnError}
                  type="error"
                  showIcon
                  style={{ marginTop: 12 }}
                />
              )}

              <Divider plain>
                <Text type="secondary">或使用 Token</Text>
              </Divider>
            </>
          )}

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
