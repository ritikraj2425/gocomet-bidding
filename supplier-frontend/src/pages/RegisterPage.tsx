import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Card, Form, Input, Button, Typography, Alert, message } from 'antd';
import { MailOutlined, LockOutlined, UserOutlined, ShopOutlined, PhoneOutlined } from '@ant-design/icons';
import { useAuth } from '../hooks/useAuth';
import BrandLogo from '../components/BrandLogo';

const { Title, Text } = Typography;

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (values: any) => {
    setLoading(true);
    setError(null);
    try {
      await register({
        email: values.email,
        password: values.password,
        name: values.name,
        company: values.company,
        phone: values.phone,
      });
      message.success('Registration successful. Welcome to the RFQ Bidding Platform.');
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Registration failed');
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
        <Title>Bring your fleet<br /><span style={{ color: '#8eafff' }}>to the table.</span></Title>
        <Text style={{ color: '#b7c4d8', fontSize: 15, lineHeight: 1.7 }}>Join a growing carrier network and get a clearer way to find, quote, and win freight.</Text>
        <div className="auth-points"><span>✓ A single place for available freight</span><span>✓ Transparent quote tracking</span><span>✓ Fast, simple account setup</span></div>
      </aside>
      <Card className="auth-card"
        style={{
          width: '100%',
          maxWidth: 480,
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
          border: '1px solid #1E293B',
          borderRadius: 8,
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <BrandLogo compact />
          <Title level={3} style={{ marginBottom: 4, color: '#0F172A', fontWeight: 700 }}>
            Create your carrier account
          </Title>
          <Text type="secondary" style={{ fontSize: 13 }}>
            Join our carrier network and participate in British Auctions
          </Text>
        </div>

        {error && (
          <Alert message={error} type="error" showIcon style={{ marginBottom: 20 }} />
        )}

        <Form layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            label="Full Name"
            name="name"
            rules={[{ required: true, message: 'Please enter your full name' }]}
          >
            <Input prefix={<UserOutlined style={{ color: '#94A3B8' }} />} placeholder="e.g. Rahul Sharma" size="large" />
          </Form.Item>

          <Form.Item
            label="Company / Fleet Name"
            name="company"
            rules={[{ required: true, message: 'Please enter your company or carrier name' }]}
          >
            <Input prefix={<ShopOutlined style={{ color: '#94A3B8' }} />} placeholder="e.g. Apex Freight Solutions" size="large" />
          </Form.Item>

          <Form.Item
            label="Business Email"
            name="email"
            rules={[
              { required: true, message: 'Please enter your email' },
              { type: 'email', message: 'Enter a valid email address' },
            ]}
          >
            <Input prefix={<MailOutlined style={{ color: '#94A3B8' }} />} placeholder="carrier@company.com" size="large" />
          </Form.Item>

          <Form.Item
            label="Phone Number"
            name="phone"
            rules={[{ required: true, message: 'Please enter contact number' }]}
          >
            <Input prefix={<PhoneOutlined style={{ color: '#94A3B8' }} />} placeholder="+91 98765 43210" size="large" />
          </Form.Item>

          <Form.Item
            label="Password"
            name="password"
            rules={[{ required: true, min: 6, message: 'Password must be at least 6 characters' }]}
          >
            <Input.Password prefix={<LockOutlined style={{ color: '#94A3B8' }} />} placeholder="Choose a password" size="large" />
          </Form.Item>

          <Form.Item style={{ marginTop: 24 }}>
            <Button type="primary" htmlType="submit" size="large" block loading={loading} style={{ background: '#2563EB', fontWeight: 600 }}>
              Create Supplier Account
            </Button>
          </Form.Item>
        </Form>

        <div style={{ textAlign: 'center', marginTop: 12 }}>
          <Text type="secondary" style={{ fontSize: 13 }}>
            Already registered? <Link to="/login" style={{ color: '#2563EB', fontWeight: 600 }}>Sign in</Link>
          </Text>
        </div>
      </Card>
      </div>
    </div>
  );
}

