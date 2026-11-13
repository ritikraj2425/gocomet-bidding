import React from 'react';
import { Card, Descriptions, Typography, Tag, Avatar } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import { useAuth } from '../hooks/useAuth';
import { formatDate } from '../utils/time';

const { Title, Text } = Typography;

export default function ProfilePage() {
  const { user } = useAuth();

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <div style={{ marginBottom: 20 }}>
        <Title level={4} style={{ margin: 0, color: '#0F172A', fontWeight: 700 }}>
          Carrier Profile & Credentials
        </Title>
        <Text type="secondary" style={{ fontSize: 13 }}>
          Verified carrier identity and participation authorization
        </Text>
      </div>

      <Card bordered={false} style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
          <Avatar size={64} icon={<UserOutlined />} style={{ background: '#2563EB' }} />
          <div>
            <Title level={5} style={{ margin: 0, color: '#0F172A' }}>
              {user?.name}
            </Title>
            <Text type="secondary" style={{ fontSize: 13 }}>{user?.company || 'Authorized Carrier'}</Text>
            <div style={{ marginTop: 6 }}>
              {user?.is_active ? (
                <Tag color="success" style={{ fontWeight: 600 }}>Active Verified Carrier</Tag>
              ) : (
                <Tag color="error" style={{ fontWeight: 600 }}>Account Deactivated</Tag>
              )}
            </div>
          </div>
        </div>

        <Descriptions bordered column={1} size="middle">
          <Descriptions.Item label="Contact Person">{user?.name}</Descriptions.Item>
          <Descriptions.Item label="Company / Fleet Name">{user?.company || 'N/A'}</Descriptions.Item>
          <Descriptions.Item label="Registered Email">{user?.email}</Descriptions.Item>
          <Descriptions.Item label="Contact Phone">{user?.phone || 'N/A'}</Descriptions.Item>
          <Descriptions.Item label="Platform Role">Carrier / Bidding Supplier</Descriptions.Item>
          <Descriptions.Item label="Authorized Since">
            {formatDate(user?.created_at)}
          </Descriptions.Item>
        </Descriptions>
      </Card>
    </div>
  );
}
