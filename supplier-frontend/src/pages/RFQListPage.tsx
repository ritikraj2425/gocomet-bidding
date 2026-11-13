import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, Tag, Button, Space, Card, Typography, Tabs, message } from 'antd';
import { ThunderboltOutlined, EyeOutlined } from '@ant-design/icons';
import { rfqsApi, settingsApi } from '../api/client';
import CountdownTimer from '../components/CountdownTimer';
import { formatDate, formatDateTime, formatCurrency, isAuctionLive } from '../utils/time';
import type { Rfq, Setting } from '../types';

const { Title, Text } = Typography;

export default function RFQListPage() {
  const navigate = useNavigate();
  const [rfqs, setRfqs] = useState<Rfq[]>([]);
  const [currency, setCurrency] = useState('INR');
  const [activeTab, setActiveTab] = useState('ACTIVE');
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [rRes, sRes] = await Promise.all([rfqsApi.list(), settingsApi.list()]);
      setRfqs(rRes.data);
      const cur = sRes.data.find((s: Setting) => s.key === 'currency_symbol');
      if (cur) setCurrency(cur.value);
    } catch {
      message.error('Failed to load auctions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const liveRfqs = rfqs.filter(isAuctionLive);
  const pastRfqs = rfqs.filter((r) => !isAuctionLive(r));

  const filteredRfqs = rfqs.filter((r) => {
    if (activeTab === 'ALL') return true;
    if (activeTab === 'ACTIVE') return isAuctionLive(r);
    if (activeTab === 'CLOSED') return !isAuctionLive(r);
    return true;
  });

  const getStatusTag = (record: Rfq) => {
    if (record.status === 'FORCE_CLOSED') {
      return <Tag color="error" style={{ fontWeight: 600 }}>Force Closed</Tag>;
    }
    if (isAuctionLive(record)) {
      return <Tag color="processing" style={{ fontWeight: 600 }}>Active Bidding</Tag>;
    }
    return <Tag color="default" style={{ fontWeight: 600 }}>Closed</Tag>;
  };

  const columns = [
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
      title: 'Shipment Route / Cargo',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: Rfq) => (
        <div>
          <div style={{ fontWeight: 600, color: '#0F172A' }}>{text}</div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Pickup: {formatDate(record.pickup_date)}
          </Text>
        </div>
      ),
    },
    {
      title: 'Auction Status',
      dataIndex: 'status',
      key: 'status',
      render: (_: string, record: Rfq) => getStatusTag(record),
    },
    {
      title: 'Current Lowest Quote (L1)',
      dataIndex: 'lowest_bid',
      key: 'lowest_bid',
      render: (val: number | null) =>
        val !== null && val !== undefined ? (
          <span style={{ fontWeight: 700, color: '#059669' }}>{formatCurrency(val, currency)}</span>
        ) : (
          <Text type="secondary">No quotes yet</Text>
        ),
    },
    {
      title: 'Total Quotes',
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
      title: 'Close Time (IST)',
      dataIndex: 'bid_close_time',
      key: 'bid_close_time',
      render: (time: string, record: Rfq) => {
        const live = isAuctionLive(record);
        return (
          <div>
            <div style={{ fontSize: 13, fontWeight: 500 }}>{formatDateTime(time)}</div>
            {live ? (
              <div style={{ marginTop: 2 }}>
                <CountdownTimer targetTime={time} size="small" />
              </div>
            ) : (
              <Text type="secondary" style={{ fontSize: 11 }}>
                Bidding Ended
              </Text>
            )}
          </div>
        );
      },
    },
    {
      title: 'Action',
      key: 'action',
      render: (_: unknown, record: Rfq) => {
        const live = isAuctionLive(record);
        return (
          <Button
            type={live ? 'primary' : 'default'}
            size="middle"
            icon={!live ? <EyeOutlined /> : undefined}
            onClick={() => navigate(`/rfqs/${record.id}`)}
            style={live ? { background: '#2563EB', fontWeight: 600 } : { fontWeight: 500 }}
          >
            {live ? 'Participate & Bid' : 'View Results'}
          </Button>
        );
      },
    },
  ];

  const tabItems = [
    { key: 'ACTIVE', label: `Live Auctions (${liveRfqs.length})` },
    { key: 'CLOSED', label: `Past Auctions (${pastRfqs.length})` },
    { key: 'ALL', label: `All Shipments (${rfqs.length})` },
  ];

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <Title level={4} style={{ margin: 0, color: '#0F172A', fontWeight: 700 }}>
          Freight Auctions
        </Title>
        <Text type="secondary" style={{ fontSize: 13 }}>
          Browse available shipments, submit initial quotes, and compete in live British Auctions
        </Text>
      </div>

      <Card bordered={false} style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <Tabs activeKey={activeTab} items={tabItems} onChange={setActiveTab} style={{ marginBottom: 16 }} />
        <Table
          dataSource={filteredRfqs}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
          scroll={{ x: 'max-content' }}
          locale={{ emptyText: 'No auctions found in this category.' }}
        />
      </Card>
    </div>
  );
}
