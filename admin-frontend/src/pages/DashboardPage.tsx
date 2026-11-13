import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Row, Col, Statistic, Table, Tag, Typography, Button, Space, message, Spin } from 'antd';
import {
  ContainerOutlined,
  ThunderboltOutlined,
  RadarChartOutlined,
  TeamOutlined,
  MessageOutlined,
  ArrowRightOutlined,
  PlusOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import { rfqsApi, usersApi, settingsApi } from '../api/client';
import CountdownTimer from '../components/CountdownTimer';
import { formatCurrency, formatDateTimeShort, isAuctionLive } from '../utils/time';
import type { Rfq, Setting } from '../types';

const { Title, Text } = Typography;

export default function DashboardPage() {
  const navigate = useNavigate();
  const [rfqs, setRfqs] = useState<Rfq[]>([]);
  const [supplierCount, setSupplierCount] = useState(0);
  const [currency, setCurrency] = useState('INR');
  const [loading, setLoading] = useState(true);
  const [resettingDemo, setResettingDemo] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [rRes, uRes, sRes] = await Promise.all([
        rfqsApi.list(),
        usersApi.list({ role: 'SUPPLIER' }),
        settingsApi.list(),
      ]);
      setRfqs(rRes.data);
      setSupplierCount(uRes.data.length);
      const cur = sRes.data.find((s: Setting) => s.key === 'currency_symbol');
      if (cur) setCurrency(cur.value);
    } catch {
      message.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleResetDemo = async () => {
    setResettingDemo(true);
    try {
      await rfqsApi.resetDemo();
      message.success('Demo auction reset! Live countdown set to 10 minutes with competitor quotes.');
      await loadData();
    } catch {
      message.error('Failed to reset demo auction');
    } finally {
      setResettingDemo(false);
    }
  };

  const totalRfqs = rfqs.length;
  const liveAuctions = rfqs.filter(isAuctionLive);
  const totalBids = rfqs.reduce((acc, curr) => acc + (curr.bid_count || 0), 0);

  const activeColumns = [
    {
      title: 'Reference ID',
      dataIndex: 'reference_id',
      key: 'reference_id',
      render: (text: string, record: Rfq) => (
        <a onClick={() => navigate(`/rfqs/${record.id}`)} style={{ fontWeight: 600 }}>
          {text}
        </a>
      ),
    },
    {
      title: 'Shipment Title',
      dataIndex: 'name',
      key: 'name',
      render: (text: string) => <span style={{ fontWeight: 500, color: '#0F172A' }}>{text}</span>,
    },
    {
      title: 'Current Lowest Bid (L1)',
      dataIndex: 'lowest_bid',
      key: 'lowest_bid',
      render: (val: number | null) =>
        val !== null && val !== undefined ? (
          <span style={{ fontWeight: 700, color: '#059669' }}>{formatCurrency(val, currency)}</span>
        ) : (
          <Text type="secondary">No bids submitted</Text>
        ),
    },
    {
      title: 'Total Bids',
      dataIndex: 'bid_count',
      key: 'bid_count',
      align: 'center' as const,
      render: (count: number) => (
        <Tag color={count > 0 ? 'blue' : 'default'} style={{ fontWeight: 600 }}>
          {count} quotes
        </Tag>
      ),
    },
    {
      title: 'Bidding Close Time (IST)',
      dataIndex: 'bid_close_time',
      key: 'bid_close_time',
      render: (time: string, record: Rfq) => (
        <div>
          <div style={{ fontSize: 13, fontWeight: 500 }}>{formatDateTimeShort(time)}</div>
          {isAuctionLive(record) && (
            <div style={{ marginTop: 2 }}>
              <CountdownTimer targetTime={time} size="small" />
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Action',
      key: 'action',
      render: (_: unknown, record: Rfq) => (
        <Button
          size="small"
          type="primary"
          onClick={() => navigate(`/rfqs/${record.id}`)}
          style={{ background: '#2563EB', fontWeight: 500 }}
        >
          Monitor Live
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
      <div className="page-heading"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 16,
          marginBottom: 24,
        }}
      >
        <div>
          <span className="page-kicker">Freight procurement · control room</span>
          <Title level={4} style={{ margin: 0, color: '#0F172A', fontWeight: 700 }}>
            Operations overview
          </Title>
          <Text type="secondary" style={{ fontSize: 13 }}>
            Real-time monitoring of freight RFQ tenders, trigger extensions, and carrier ranking
          </Text>
        </div>
        <Space wrap>
          <Button icon={<ReloadOutlined />} onClick={loadData}>
            Refresh
          </Button>
          <Button
            onClick={handleResetDemo}
            loading={resettingDemo}
            style={{ borderColor: '#D97706', color: '#D97706', fontWeight: 500 }}
          >
            Reset Demo Auction (10m)
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate('/rfqs/create')}
            style={{ background: '#2563EB' }}
          >
            Create RFQ
          </Button>
        </Space>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={12} lg={6}>
          <Card bordered={false} className="stat-card" style={{ boxShadow: '0 6px 20px rgba(24,44,80,.045)', '--orb': '#e7efff' } as React.CSSProperties}>
            <Statistic
              title={<span style={{ color: '#64748B' }}>Total Platform RFQs</span>}
              value={totalRfqs}
              prefix={<ContainerOutlined style={{ color: '#2563EB', marginRight: 8 }} />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={12} lg={6}>
          <Card bordered={false} className="stat-card" style={{ boxShadow: '0 6px 20px rgba(24,44,80,.045)', '--orb': '#e3f8f1' } as React.CSSProperties}>
            <Statistic
              title={<span style={{ color: '#64748B' }}>Live Auctions</span>}
              value={liveAuctions.length}
              valueStyle={{ color: '#059669', fontWeight: 700 }}
              prefix={<RadarChartOutlined style={{ color: '#059669', marginRight: 8 }} />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={12} lg={6}>
          <Card bordered={false} className="stat-card" style={{ boxShadow: '0 6px 20px rgba(24,44,80,.045)', '--orb': '#eaf0f7' } as React.CSSProperties}>
            <Statistic
              title={<span style={{ color: '#64748B' }}>Registered Carriers</span>}
              value={supplierCount}
              prefix={<TeamOutlined style={{ color: '#475569', marginRight: 8 }} />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={12} lg={6}>
          <Card bordered={false} className="stat-card" style={{ boxShadow: '0 6px 20px rgba(24,44,80,.045)', '--orb': '#fff1da' } as React.CSSProperties}>
            <Statistic
              title={<span style={{ color: '#64748B' }}>Total Quotes Received</span>}
              value={totalBids}
              prefix={<MessageOutlined style={{ color: '#D97706', marginRight: 8 }} />}
            />
          </Card>
        </Col>
      </Row>

      <Card
        className="live-card"
        title={
          <Space>
            <span>Live British Auctions Currently Accepting Bids</span>
            <Tag color="processing" style={{ fontWeight: 600 }}>
              {liveAuctions.length} Active
            </Tag>
          </Space>
        }
        bordered={false}
        extra={
          <Button type="link" onClick={() => navigate('/rfqs')}>
            View All Auctions <ArrowRightOutlined />
          </Button>
        }
        style={{ boxShadow: '0 8px 28px rgba(24,44,80,.055)' }}
      >
        <Table
          dataSource={liveAuctions}
          columns={activeColumns}
          rowKey="id"
          pagination={{ pageSize: 5 }}
          scroll={{ x: 'max-content' }}
          locale={{
            emptyText: (
              <div style={{ padding: '24px 0' }}>
                <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
                  No live auctions active right now.
                </Text>
                <Button type="primary" onClick={handleResetDemo}>
                  Launch 10-Minute Demo Auction
                </Button>
              </div>
            ),
          }}
        />
      </Card>
    </div>
  );
}
