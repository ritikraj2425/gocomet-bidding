import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Form, Input, Button, Typography, Alert, Space } from 'antd';
import { MailOutlined, LockOutlined } from '@ant-design/icons';
import { useAuth } from '../hooks/useAuth';
import BrandLogo from '../components/BrandLogo';
import { CheckCircleFilled } from '@ant-design/icons';

const { Title, Text } = Typography;

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (values: { email: string; password: string }) => {
    setLoading(true);
    setError(null);
    try {
      await login(values.email, values.password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-screen"
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        background: '#0F172A',
        padding: '24px',
      }}
    >
      <div className="auth-frame">
      <aside className="auth-promo">
        <BrandLogo light />
        <Title>Procurement<br /><span style={{ color: '#8eafff' }}>in motion.</span></Title>
        <Text style={{ color: '#b7c4d8', fontSize: 15, lineHeight: 1.7 }}>A focused command center for freight tenders, carrier partnerships, and live auction activity.</Text>
        <div className="auth-points"><span><CheckCircleFilled /> Live auction monitoring</span><span><CheckCircleFilled /> One carrier network</span><span><CheckCircleFilled /> Clear operational control</span></div>
      </aside>
      <Card className="auth-card"
        style={{
          width: '100%',
          maxWidth: 420,
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
          border: '1px solid #1E293B',
          borderRadius: 8,
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <BrandLogo compact />
          <Title level={3} style={{ marginBottom: 4, color: '#0F172A', fontWeight: 700 }}>
            Welcome back
          </Title>
          <Text type="secondary" style={{ fontSize: 13 }}>
            Sign in to your admin workspace
          </Text>
        </div>

        {error && (
          <Alert
            message={error}
            type="error"
            showIcon
            style={{ marginBottom: 20 }}
          />
        )}

        <Form layout="vertical" onFinish={handleSubmit} initialValues={{ email: 'admin@rfq.com', password: 'admin123' }}>
          <Form.Item
            label="Email Address"
            name="email"
            rules={[
              { required: true, message: 'Please enter your email' },
              { type: 'email', message: 'Enter a valid email address' },
            ]}
          >
            <Input prefix={<MailOutlined style={{ color: '#94A3B8' }} />} placeholder="admin@rfq.com" size="large" />
          </Form.Item>

          <Form.Item
            label="Password"
            name="password"
            rules={[{ required: true, message: 'Please enter your password' }]}
          >
            <Input.Password prefix={<LockOutlined style={{ color: '#94A3B8' }} />} placeholder="Password" size="large" />
          </Form.Item>

          <Form.Item style={{ marginTop: 28 }}>
            <Button type="primary" htmlType="submit" size="large" block loading={loading} style={{ background: '#2563EB', fontWeight: 600 }}>
              Sign in
            </Button>
          </Form.Item>
        </Form>

        <div style={{ textAlign: 'center', marginTop: 12, borderTop: '1px solid #F1F5F9', paddingTop: 16 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Demo access: admin@rfq.com · admin123
          </Text>
        </div>
      </Card>
      </div>
    </div>
  );
}

