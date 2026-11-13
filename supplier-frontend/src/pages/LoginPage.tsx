import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Card, Form, Input, Button, Typography, Alert, Space, Divider } from 'antd';
import { MailOutlined, LockOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { useAuth } from '../hooks/useAuth';
import BrandLogo from '../components/BrandLogo';

const { Title, Text } = Typography;

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form] = Form.useForm();

  const handleSubmit = async (values: { email: string; password: string }) => {
    setLoading(true);
    setError(null);
    try {
      await login(values.email, values.password);
      navigate('/dashboard');
    } catch (err: any) {
      if (err.response?.status === 403) {
        setError('Account Deactivated: Your carrier account is currently inactive. Please contact the platform administrator for reactivation.');
      } else {
        setError(err.response?.data?.detail || 'Invalid email or password');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (email: string) => {
    form.setFieldsValue({ email, password: 'supplier123' });
    handleSubmit({ email, password: 'supplier123' });
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
        <Title>Good loads.<br /><span style={{ color: '#8eafff' }}>Better business.</span></Title>
        <Text style={{ color: '#b7c4d8', fontSize: 15, lineHeight: 1.7 }}>Find freight that fits your fleet, compete transparently, and keep every quote within reach.</Text>
        <div className="auth-points"><span><ThunderboltOutlined /> Discover open freight opportunities</span><span><ThunderboltOutlined /> Track your live quote position</span><span><ThunderboltOutlined /> Get timely auction updates</span></div>
      </aside>
      <Card className="auth-card"
        style={{
          width: '100%',
          maxWidth: 440,
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.4)',
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
            Sign in to your carrier workspace
          </Text>
        </div>

        {error && (
          <Alert message={error} type="error" showIcon style={{ marginBottom: 20 }} />
        )}

        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Form.Item
            label="Carrier Email Address"
            name="email"
            rules={[
              { required: true, message: 'Please enter your email' },
              { type: 'email', message: 'Enter a valid email address' },
            ]}
          >
            <Input
              prefix={<MailOutlined style={{ color: '#94A3B8' }} />}
              placeholder="carrier@logistics.com"
              size="large"
            />
          </Form.Item>

          <Form.Item
            label="Account Password"
            name="password"
            rules={[{ required: true, message: 'Please enter your password' }]}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: '#94A3B8' }} />}
              placeholder="Password"
              size="large"
            />
          </Form.Item>

          <Form.Item style={{ marginTop: 24, marginBottom: 16 }}>
            <Button
              type="primary"
              htmlType="submit"
              size="large"
              block
              loading={loading}
              style={{ background: '#2563EB', fontWeight: 600, height: 44 }}
            >
              Sign In to Bidding Console
            </Button>
          </Form.Item>
        </Form>

        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <Text type="secondary" style={{ fontSize: 13 }}>
            New carrier partner? <Link to="/register" style={{ color: '#2563EB', fontWeight: 600 }}>Register Account</Link>
          </Text>
        </div>

        <Divider style={{ margin: '16px 0', fontSize: 12, color: '#94A3B8' }}>
          Quick Demo Carrier Logins
        </Divider>

        <Space direction="vertical" style={{ width: '100%' }} size="small">
          <Button
            block
            size="small"
            onClick={() => handleQuickLogin('supplier1@test.com')}
            style={{ fontSize: 12 }}
          >
            Login as Supplier 1 (Apex Logistics)
          </Button>
          <Button
            block
            size="small"
            onClick={() => handleQuickLogin('supplier2@test.com')}
            style={{ fontSize: 12 }}
          >
            Login as Supplier 2 (BlueDart Freight)
          </Button>
          <Button
            block
            size="small"
            onClick={() => handleQuickLogin('supplier3@test.com')}
            style={{ fontSize: 12 }}
          >
            Login as Supplier 3 (Coastline Express)
          </Button>
        </Space>
      </Card>
      </div>
    </div>
  );
}
