import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Row, Col, Statistic, Table, Tag, Typography, Button, Spin, Space, Tabs } from 'antd';
import {
  ThunderboltOutlined,
  RadarChartOutlined,
  CheckCircleOutlined,
  DollarOutlined,
  ContainerOutlined,
  ArrowRightOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import { rfqsApi, settingsApi } from '../api/client';
import { useAuth } from '../hooks/useAuth';
import CountdownTimer from '../components/CountdownTimer';
import { formatCurrency, formatDateTimeShort, isAuctionLive } from '../utils/time';
import type { Rfq, Setting } from '../types';

const { Title, Text } = Typography;

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [rfqs, setRfqs] = useState<Rfq[]>([]);
  const [currency, setCurrency] = useState('INR');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [rRes, sRes] = await Promise.all([rfqsApi.list(), settingsApi.list()]);
        setRfqs(rRes.data);
        const cur = sRes.data.find((s: Setting) => s.key === 'currency_symbol');
        if (cur) setCurrency(cur.value);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const activeRfqs = rfqs.filter(isAuctionLive);
  const closedRfqs = rfqs.filter((r) => !isAuctionLive(r));

  const activeColumns = [
    {
      title: 'RFQ Reference',
      dataIndex: 'reference_id',
      key: 'reference_id',
      render: (text: string, record: Rfq) => (
        <a onClick={() => navigate(`/rfqs/${record.id}`)} style={{ fontWeight: 600 }}>
          {text}
        </a>
      ),
    },
    {
      title: 'Shipment Route / Title',
      dataIndex: 'name',
      key: 'name',
      render: (text: string) => <span style={{ fontWeight: 600, color: '#0F172A' }}>{text}</span>,
    },
    {
      title: 'Current Lowest Quote (L1)',
      dataIndex: 'lowest_bid',
      key: 'lowest_bid',
      render: (val: number | null) =>
        val !== null && val !== undefined ? (
          <span style={{ fontWeight: 700, color: '#059669' }}>{formatCurrency(val, currency)}</span>
        ) : (
          <Text type="secondary">No quotes submitted yet</Text>
        ),
    },
    {
      title: 'Bidding Closes (IST)',
      dataIndex: 'bid_close_time',
      key: 'bid_close_time',
      render: (time: string) => (
        <div>
          <div style={{ fontSize: 13, fontWeight: 500 }}>{formatDateTimeShort(time)}</div>
          <div style={{ marginTop: 2 }}>
            <CountdownTimer targetTime={time} size="small" />
          </div>
        </div>
      ),
    },
    {
      title: 'Action',
      key: 'action',
      render: (_: unknown, record: Rfq) => (
        <Button
          type="primary"
          size="middle"
          onClick={() => navigate(`/rfqs/${record.id}`)}
          style={{ background: '#2563EB', fontWeight: 600 }}
        >
          Participate & Bid
        </Button>
      ),
    },
  ];

  const pastColumns = [
    {
      title: 'RFQ Reference',
      dataIndex: 'reference_id',
      key: 'reference_id',
      render: (text: string, record: Rfq) => (
        <a onClick={() => navigate(`/rfqs/${record.id}`)} style={{ fontWeight: 600 }}>
          {text}
        </a>
      ),
    },
    {
      title: 'Shipment Route / Title',
      dataIndex: 'name',
      key: 'name',
      render: (text: string) => <span style={{ fontWeight: 500 }}>{text}</span>,
    },
    {
      title: 'Winning / Lowest Quote',
      dataIndex: 'lowest_bid',
      key: 'lowest_bid',
      render: (val: number | null) =>
        val !== null && val !== undefined ? (
          <span style={{ fontWeight: 600, color: '#0F172A' }}>{formatCurrency(val, currency)}</span>
        ) : (
          <Text type="secondary">Closed with no bids</Text>
        ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (st: string) =>
        st === 'FORCE_CLOSED' ? (
          <Tag color="error" style={{ fontWeight: 600 }}>
            Force Closed
          </Tag>
        ) : (
          <Tag color="default" style={{ fontWeight: 600 }}>
            Closed
          </Tag>
        ),
    },
    {
      title: 'Closed At (IST)',
      dataIndex: 'bid_close_time',
      key: 'bid_close_time',
      render: (time: string) => formatDateTimeShort(time),
    },
    {
      title: 'Action',
      key: 'action',
      render: (_: unknown, record: Rfq) => (
        <Button
          type="default"
          size="middle"
          icon={<EyeOutlined />}
          onClick={() => navigate(`/rfqs/${record.id}`)}
        >
          View Results
        </Button>
      ),
    },
  ];

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 0' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div>
      <div
        style={{
          marginBottom: 24,
          padding: '20px 24px',
          background: '#FFFFFF',
          borderRadius: 8,
          border: '1px solid #E2E8F0',
          boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 16,
        }}
      >
        <div>
          <Title level={4} style={{ margin: 0, color: '#0F172A', fontWeight: 700 }}>
            Welcome back, {user?.name}
          </Title>
          <Text type="secondary" style={{ fontSize: 13 }}>
            {user?.company || 'Authorized Carrier'} | Carrier Bidding & British Auction Console
          </Text>
        </div>
        <Button
          type="primary"
          icon={<DollarOutlined />}
          onClick={() => navigate('/my-bids')}
          style={{ background: '#2563EB', fontWeight: 600 }}
        >
          My Past Quotes & Rankings
        </Button>
      </div>


      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={8}>
          <Card bordered={false} className="stat-card" style={{ '--orb': '#e7efff' } as React.CSSProperties}>
            <Statistic
              title={<span style={{ color: '#64748B' }}>Live Auctions Open</span>}
              value={activeRfqs.length}
              valueStyle={{ color: '#2563EB', fontWeight: 700 }}
              prefix={<RadarChartOutlined style={{ marginRight: 8 }} />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8}>
          <Card bordered={false} className="stat-card" style={{ '--orb': '#e3f8f1' } as React.CSSProperties}>
            <Statistic
              title={<span style={{ color: '#64748B' }}>Completed Auctions</span>}
              value={closedRfqs.length}
              prefix={<CheckCircleOutlined style={{ color: '#64748B', marginRight: 8 }} />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8}>
          <Card bordered={false} className="stat-card" style={{ '--orb': '#fff1da' } as React.CSSProperties}>
            <Statistic
              title={<span style={{ color: '#64748B' }}>Total Platform Shipments</span>}
              value={rfqs.length}
              prefix={<ContainerOutlined style={{ color: '#D97706', marginRight: 8 }} />}
            />
          </Card>
        </Col>
      </Row>

      {/* Section 1: Live Auctions Ready for Bidding */}
      <Card
        title={
          <Space>
            <span>Live British Auctions Ready For Bidding</span>
            <Tag color="processing" style={{ fontWeight: 600 }}>
              {activeRfqs.length} Open Now
            </Tag>
          </Space>
        }
        bordered={false}
        extra={
          <Button type="link" onClick={() => navigate('/rfqs')}>
            View All Auctions <ArrowRightOutlined />
          </Button>
        }
        style={{ marginBottom: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
      >
        <Table
          dataSource={activeRfqs}
          columns={activeColumns}
          rowKey="id"
          pagination={{ pageSize: 5 }}
          scroll={{ x: 'max-content' }}
          locale={{ emptyText: 'No live auctions open for bidding right now. Check back soon.' }}
        />
      </Card>

      {/* Section 2: Past / Completed Auctions */}
      <Card
        title={
          <Space>
            <span>Past & Completed Auctions</span>
            <Tag style={{ fontWeight: 600 }}>{closedRfqs.length} Completed</Tag>
          </Space>
        }
        bordered={false}
        style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
      >
        <Table
          dataSource={closedRfqs}
          columns={pastColumns}
          rowKey="id"
          pagination={{ pageSize: 5 }}
          scroll={{ x: 'max-content' }}
          locale={{ emptyText: 'No completed auctions yet.' }}
        />
      </Card>
    </div>
  );
}
