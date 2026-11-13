import React, { Suspense, useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Layout, Menu, Typography, Dropdown, Space, Avatar, Spin, Button } from 'antd';
import {
  DashboardOutlined,
  FileTextOutlined,
  TeamOutlined,
  SettingOutlined,
  UserOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from '@ant-design/icons';
import { useAuth } from '../hooks/useAuth';
import { settingsApi } from '../api/client';
import type { Setting } from '../types';
import BrandLogo from '../components/BrandLogo';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

export default function ProtectedLayout() {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [platformName, setPlatformName] = useState('RFQ Auction Platform');
  const [collapsed, setCollapsed] = useState(false);

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

  if (!user || user.role !== 'ADMIN') {
    return <Navigate to="/login" replace />;
  }

  const selectedKey = location.pathname.startsWith('/rfqs')
    ? '/rfqs'
    : location.pathname.startsWith('/suppliers')
    ? '/suppliers'
    : location.pathname.startsWith('/settings')
    ? '/settings'
    : '/dashboard';

  const menuItems = [
    { key: '/dashboard', icon: <DashboardOutlined />, label: 'Dashboard' },
    { key: '/rfqs', icon: <FileTextOutlined />, label: 'RFQs & Auctions' },
    { key: '/suppliers', icon: <TeamOutlined />, label: 'Carrier Network' },
    { key: '/settings', icon: <SettingOutlined />, label: 'System Settings' },
  ];

  const userMenuItems = {
    items: [
      {
        key: 'logout',
        icon: <LogoutOutlined />,
        label: 'Sign Out',
        onClick: logout,
      },
    ],
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        breakpoint="lg"
        collapsedWidth={64}
        width={240}
        trigger={null}
        style={{
          background: '#101b2e',
          borderRight: '1px solid #1E293B',
          position: 'sticky',
          top: 0,
          height: '100vh',
          zIndex: 100,
        }}
      >
        <div
          style={{
            padding: collapsed ? '18px 12px' : '20px 20px',
            borderBottom: '1px solid #1E293B',
            textAlign: collapsed ? 'center' : 'left',
            overflow: 'hidden',
            whiteSpace: 'nowrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 11, color: '#FFFFFF', fontSize: 15, fontWeight: 700, letterSpacing: '-.02em' }}>
            <BrandLogo compact light />
            {!collapsed && <span>{platformName}</span>}
          </div>
          {!collapsed && (
            <div style={{ color: '#94A3B8', fontSize: 11, marginTop: 2, letterSpacing: '0.5px' }}>
              PROCUREMENT CONTROL PLANE
            </div>
          )}
        </div>

        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          style={{ background: '#101b2e', marginTop: 12, borderRight: 0 }}
        />

        {!collapsed && (
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              width: '100%',
              padding: '16px 20px',
              borderTop: '1px solid #1E293B',
              background: '#101b2e',
            }}
          >
            <Space>
              <Avatar size="small" icon={<UserOutlined />} style={{ background: '#2563EB' }} />
              <div style={{ lineHeight: 1.2, overflow: 'hidden' }}>
                <Text style={{ color: '#F1F5F9', fontSize: 13, display: 'block', fontWeight: 500 }}>
                  {user.name}
                </Text>
                <Text style={{ color: '#64748B', fontSize: 11 }}>Operations Admin</Text>
              </div>
            </Space>
          </div>
        )}
      </Sider>

      <Layout>
        <Header
          style={{
            background: '#FFFFFF',
            padding: '0 24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid #E2E8F0',
            height: 60,
            position: 'sticky',
            top: 0,
            zIndex: 99,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            style={{ fontSize: 16, width: 40, height: 40 }}
          />
          <div style={{ lineHeight: 1.15 }}>
            <Text style={{ display: 'block', fontWeight: 700, color: '#17263d', fontSize: 13 }}>{selectedKey === '/rfqs' ? 'RFQ workspace' : selectedKey === '/suppliers' ? 'Carrier network' : selectedKey === '/settings' ? 'Platform settings' : 'Operations overview'}</Text>
            <Text style={{ color: '#91a0b4', fontSize: 11 }}><span className="online-dot" />Live operations</Text>
          </div>
          </div>

          <Dropdown menu={userMenuItems} placement="bottomRight">
            <Space style={{ cursor: 'pointer' }}>
              <Avatar size="small" icon={<UserOutlined />} style={{ background: '#2563EB' }} />
              <Text style={{ fontSize: 13, fontWeight: 500, color: '#1E293B' }}>{user.name}</Text>
            </Space>
          </Dropdown>
        </Header>

        <Content className="app-content" style={{ background: '#F4F7FB', minHeight: 'calc(100vh - 60px)' }}>
          <Suspense fallback={<div className="page-loading"><Spin size="small" /><span>Loading page…</span></div>}>
            <Outlet />
          </Suspense>
        </Content>
      </Layout>
    </Layout>
  );
}
