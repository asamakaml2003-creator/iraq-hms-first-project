import React, { useState } from 'react';
import { Card, Form, Input, Button, Alert, Typography } from 'antd';
import { UserOutlined, LockOutlined, HeartOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../api/client';
import { setToken, setUser } from '../store/auth';

const { Title, Text } = Typography;

export default function Login() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  async function onFinish({ email, password }: { email: string; password: string }) {
    setLoading(true);
    setError('');
    try {
      const res = await authApi.login(email, password);
      setToken(res.data.token);
      const me = await authApi.me();
      setUser(me.data);
      navigate('/dashboard', { replace: true });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } }).response?.data?.error;
      setError(msg ?? 'Login failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <Card className="login-card" bordered={false}>
        <div className="logo-area">
          <HeartOutlined style={{ fontSize: 40, color: '#1a5276' }} />
          <Title level={4} style={{ margin: '12px 0 4px', color: '#1a2744' }}>
            Iraq Hospital Management
          </Title>
          <Text type="secondary">نظام إدارة المستشفيات العراقية</Text>
        </div>

        <Form
          name="login"
          onFinish={onFinish}
          layout="vertical"
          style={{ marginTop: 24 }}
        >
          {error && (
            <Alert message={error} type="error" showIcon style={{ marginBottom: 16 }} />
          )}

          <Form.Item
            name="email"
            label="Email"
            rules={[{ required: true, type: 'email', message: 'Enter a valid email' }]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="doctor@hospital.iq"
              size="large"
              autoComplete="username"
            />
          </Form.Item>

          <Form.Item
            name="password"
            label="Password"
            rules={[{ required: true, message: 'Password is required' }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Password"
              size="large"
              autoComplete="current-password"
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 8 }}>
            <Button
              type="primary"
              htmlType="submit"
              size="large"
              block
              loading={loading}
              style={{ background: '#1a5276', height: 44 }}
            >
              Sign In
            </Button>
          </Form.Item>

          <Text type="secondary" style={{ fontSize: 12, textAlign: 'center', display: 'block' }}>
            Iraq HMS v1.0 · Secure Hospital Administration
          </Text>
        </Form>
      </Card>
    </div>
  );
}
