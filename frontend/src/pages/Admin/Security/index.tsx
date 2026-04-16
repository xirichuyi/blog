import React, { useState, useEffect, useCallback } from 'react';
import { apiService } from '../../../services/api';
import AdminLayout from '../../../components/adminLayout/AdminLayout';
import {
  Card,
  Button,
  Table,
  Space,
  Typography,
  message,
  Popconfirm,
  Input,
  Modal,
  Tag,
  Empty,
  Alert,
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  KeyOutlined,
  CheckCircleOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import { base64urlToBuffer, bufferToBase64url } from '../../../utils/webauthn';

const { Text, Paragraph } = Typography;

interface PasskeyCredential {
  id: string;
  name: string;
  created_at: string;
  last_used_at: string | null;
}

const SecurityManagement: React.FC = () => {
  const [credentials, setCredentials] = useState<PasskeyCredential[]>([]);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [nameModalOpen, setNameModalOpen] = useState(false);
  const [pendingCredentialData, setPendingCredentialData] = useState<any>(null);
  const [pendingChallengeId, setPendingChallengeId] = useState<string>('');
  const [credentialName, setCredentialName] = useState('');

  const loadCredentials = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiService.webauthnListCredentials();
      if (res.success && res.data?.data) {
        const data = res.data.data;
        setCredentials(Array.isArray(data) ? data : []);
      }
    } catch {
      message.error('Failed to load credentials');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCredentials();
  }, [loadCredentials]);

  const handleRegister = async () => {
    setRegistering(true);
    try {
      // 1. Get registration options from server
      const startRes = await apiService.webauthnRegisterStart();
      if (!startRes.success || !startRes.data?.data) {
        throw new Error(startRes.data?.message || 'Failed to start registration');
      }

      const options = startRes.data.data;
      const challengeId = options.challenge_id;

      // 2. Convert server options to PublicKeyCredentialCreationOptions
      const publicKeyOptions: PublicKeyCredentialCreationOptions = {
        challenge: base64urlToBuffer(options.publicKey.challenge),
        rp: options.publicKey.rp,
        user: {
          ...options.publicKey.user,
          id: base64urlToBuffer(options.publicKey.user.id),
        },
        pubKeyCredParams: options.publicKey.pubKeyCredParams,
        timeout: options.publicKey.timeout,
        attestation: options.publicKey.attestation || 'none',
        authenticatorSelection: options.publicKey.authenticatorSelection,
        excludeCredentials: (options.publicKey.excludeCredentials || []).map((c: any) => ({
          id: base64urlToBuffer(c.id),
          type: c.type,
          transports: c.transports,
        })),
      };

      // 3. Call browser WebAuthn API
      const credential = await navigator.credentials.create({
        publicKey: publicKeyOptions,
      });

      if (!credential) {
        throw new Error('Registration cancelled');
      }

      // 4. Serialize credential immediately (native objects lose properties in React state)
      const pkCred = credential as PublicKeyCredential;
      const attestResp = pkCred.response as AuthenticatorAttestationResponse;
      setPendingCredentialData({
        id: pkCred.id,
        rawId: bufferToBase64url(pkCred.rawId),
        type: pkCred.type,
        response: {
          attestationObject: bufferToBase64url(attestResp.attestationObject),
          clientDataJSON: bufferToBase64url(attestResp.clientDataJSON),
        },
      });
      setPendingChallengeId(challengeId);
      setCredentialName('');
      setNameModalOpen(true);
    } catch (err: any) {
      const msg = err?.name === 'NotAllowedError'
        ? '注册被取消或超时'
        : err?.message || '注册失败';
      message.error(msg);
      setRegistering(false);
    }
  };

  const handleFinishRegistration = async () => {
    if (!pendingCredentialData) return;

    try {
      const name = credentialName.trim() || 'My Passkey';
      const finishRes = await apiService.webauthnRegisterFinishRaw(pendingCredentialData, name, pendingChallengeId);
      if (!finishRes.success || !finishRes.data?.data?.registered) {
        throw new Error(finishRes.data?.message || 'Registration failed');
      }

      message.success(`Passkey "${name}" 注册成功！`);
      setNameModalOpen(false);
      setPendingCredentialData(null);
      loadCredentials();
    } catch (err: any) {
      message.error(err?.message || 'Registration failed');
    } finally {
      setRegistering(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await apiService.webauthnDeleteCredential(id);
      if (res.success) {
        message.success('Passkey 已删除');
        loadCredentials();
      } else {
        throw new Error('Failed to delete');
      }
    } catch {
      message.error('删除失败');
    }
  };

  const columns = [
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      render: (name: string) => (
        <Space>
          <KeyOutlined style={{ color: '#1890ff' }} />
          <Text strong>{name}</Text>
        </Space>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => new Date(date).toLocaleString('zh-CN'),
    },
    {
      title: '最后使用',
      dataIndex: 'last_used_at',
      key: 'last_used_at',
      render: (date: string | null) =>
        date ? (
          <Space>
            <CheckCircleOutlined style={{ color: '#52c41a' }} />
            {new Date(date).toLocaleString('zh-CN')}
          </Space>
        ) : (
          <Tag>从未使用</Tag>
        ),
    },
    {
      title: '操作',
      key: 'actions',
      render: (_: any, record: PasskeyCredential) => (
        <Popconfirm
          title="确定删除这个 Passkey？"
          description="删除后将无法使用此 Passkey 登录"
          onConfirm={() => handleDelete(record.id)}
          okText="删除"
          okType="danger"
          cancelText="取消"
        >
          <Button type="text" danger icon={<DeleteOutlined />}>
            删除
          </Button>
        </Popconfirm>
      ),
    },
  ];

  const supportsWebAuthn = !!window.PublicKeyCredential;

  return (
    <AdminLayout title="Security">
      <Space direction="vertical" size={24} style={{ width: '100%' }}>
        {/* Passkey Management */}
        <Card
          title={
            <Space>
              <KeyOutlined />
              <span>Passkey 管理</span>
            </Space>
          }
          extra={
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleRegister}
              loading={registering}
              disabled={!supportsWebAuthn}
            >
              注册新 Passkey
            </Button>
          }
        >
          {!supportsWebAuthn && (
            <Alert
              message="当前浏览器不支持 WebAuthn"
              description="请使用支持 WebAuthn 的现代浏览器（Chrome、Safari、Firefox、Edge）"
              type="warning"
              showIcon
              style={{ marginBottom: 16 }}
            />
          )}

          <Alert
            message="什么是 Passkey？"
            description="Passkey 是一种无密码登录方式，使用你的设备指纹识别、Face ID 或安全密钥来验证身份。注册后，你可以在登录页面直接使用 Passkey 登录，无需输入 Token。"
            type="info"
            showIcon
            icon={<InfoCircleOutlined />}
            style={{ marginBottom: 16 }}
          />

          {credentials.length === 0 && !loading ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="还没有注册任何 Passkey"
            >
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleRegister}
                loading={registering}
                disabled={!supportsWebAuthn}
              >
                注册第一个 Passkey
              </Button>
            </Empty>
          ) : (
            <Table
              columns={columns}
              dataSource={credentials}
              rowKey="id"
              loading={loading}
              pagination={false}
            />
          )}
        </Card>
      </Space>

      {/* Name Modal */}
      <Modal
        title="命名你的 Passkey"
        open={nameModalOpen}
        onOk={handleFinishRegistration}
        onCancel={() => {
          setNameModalOpen(false);
          setPendingCredentialData(null);
          setRegistering(false);
        }}
        okText="完成注册"
        cancelText="取消"
      >
        <Paragraph type="secondary" style={{ marginBottom: 16 }}>
          给你的 Passkey 起一个名字，方便以后识别（例如：MacBook Touch ID、iPhone Face ID）
        </Paragraph>
        <Input
          placeholder="例如：MacBook Touch ID"
          value={credentialName}
          onChange={(e) => setCredentialName(e.target.value)}
          onPressEnter={handleFinishRegistration}
          autoFocus
        />
      </Modal>
    </AdminLayout>
  );
};

export default SecurityManagement;
