import React, { Suspense, useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Layout, Menu, Typography, Dropdown, Space, Avatar, Spin } from 'antd';
import {
  DashboardOutlined,
  ThunderboltOutlined,
  UserOutlined,
  LogoutOutlined,
  DollarOutlined,
  DownOutlined,
} from '@ant-design/icons';

import { useAuth } from '../hooks/useAuth';
import { settingsApi } from '../api/client';
import type { Setting } from '../types';
import BrandLogo from '../components/BrandLogo';

const { Header, Content } = Layout;
const { Text } = Typography;

export default function ProtectedLayout() {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [platformName, setPlatformName] = useState('RFQ Auction Platform');

  useEffect(() => {
    settingsApi
      .list()
      .then((res) => {
        const found = res.data.find((s: Setting) => s.key === 'platform_name');
        if (found) setPlatformName(found.value);
      })
      .catch(() => {});
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#F8FAFC' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!user || user.role !== 'SUPPLIER') {
    return <Navigate to="/login" replace />;
  }

  const selectedKey = location.pathname.startsWith('/rfqs')
    ? '/rfqs'
    : location.pathname.startsWith('/my-bids')
    ? '/my-bids'
    : location.pathname.startsWith('/profile')
    ? '/profile'
    : '/dashboard';

  const menuItems = [
    { key: '/dashboard', icon: <DashboardOutlined />, label: 'Dashboard' },
    { key: '/rfqs', icon: <ThunderboltOutlined />, label: 'Available Auctions' },
    { key: '/my-bids', icon: <DollarOutlined />, label: 'My Bids' },
  ];


  const userMenuItems = {
    items: [
      {
        key: 'profile',
        icon: <UserOutlined />,
        label: 'My Carrier Profile',
        onClick: () => navigate('/profile'),
      },
      {
        type: 'divider' as const,
      },
      {
        key: 'logout',
        icon: <LogoutOutlined />,
        label: 'Sign Out',
        onClick: logout,
      },
    ],
  };

  return (
    <Layout style={{ minHeight: '100vh', background: '#F8FAFC' }}>
      <Header
        className="supplier-header"
        style={{
          background: '#0F172A',
          padding: '0 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          height: 64,
          position: 'sticky',
          top: 0,
          zIndex: 1000,
          borderBottom: '1px solid #1E293B',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 24, overflow: 'hidden' }}>
          <div className="supplier-brand" onClick={() => navigate('/dashboard')}>
            <BrandLogo compact light />
            <span style={{ color: '#FFFFFF', fontSize: 15, fontWeight: 700, letterSpacing: '-.02em' }}>
              {platformName}
            </span>
            <span style={{ color: '#94A3B8', fontSize: 10, marginLeft: 3, display: 'inline-block', letterSpacing: '.1em' }}>CARRIER PORTAL</span>
          </div>
          <Menu
            theme="dark"
            mode="horizontal"
            selectedKeys={[selectedKey]}
            items={menuItems}
            onClick={({ key }) => navigate(key)}
            style={{ background: 'transparent', minWidth: 260, borderBottom: 0 }}
          />
        </div>

        <Dropdown menu={userMenuItems} placement="bottomRight">
          <Space style={{ cursor: 'pointer', flexShrink: 0 }}>
            <Avatar size="small" icon={<UserOutlined />} style={{ background: '#2563EB' }} />
            <div style={{ lineHeight: 1.2, display: 'none', minWidth: 60 }} className="carrier-user-info">
              <Text style={{ color: '#FFFFFF', fontSize: 13, display: 'block', fontWeight: 500 }}>
                {user.name}
              </Text>
              <Text style={{ color: '#94A3B8', fontSize: 11 }}>
                {user.company || 'Carrier Partner'}
              </Text>
            </div>
            <DownOutlined style={{ color: '#94A3B8', fontSize: 10 }} />
          </Space>
        </Dropdown>
      </Header>
      <Content className="supplier-content" style={{ maxWidth: 1280, margin: '0 auto', width: '100%' }}>
        <Suspense fallback={<div className="page-loading"><Spin size="small" /><span>Loading page…</span></div>}>
          <Outlet />
        </Suspense>
      </Content>
      <style>{`
        @media (min-width: 640px) {
          .carrier-user-info {
            display: block !important;
          }
        }
      `}</style>
    </Layout>
  );
}
