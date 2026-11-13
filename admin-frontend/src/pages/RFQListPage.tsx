import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, Tag, Button, Space, Card, Typography, Tabs, Popconfirm, message, Spin } from 'antd';
import { PlusOutlined, EyeOutlined, EditOutlined, DeleteOutlined, PlayCircleOutlined } from '@ant-design/icons';
import { rfqsApi, settingsApi } from '../api/client';
import { formatDate, formatDateTime, formatCurrency, isAuctionLive } from '../utils/time';
import CountdownTimer from '../components/CountdownTimer';
import type { Rfq, Setting } from '../types';

const { Title, Text } = Typography;

export default function RFQListPage() {
  const navigate = useNavigate();
  const [rfqs, setRfqs] = useState<Rfq[]>([]);
  const [currency, setCurrency] = useState('INR');
  const [activeTab, setActiveTab] = useState('ALL');
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [rRes, sRes] = await Promise.all([rfqsApi.list(), settingsApi.list()]);
      setRfqs(rRes.data);
      const cur = sRes.data.find((s: Setting) => s.key === 'currency_symbol');
      if (cur) setCurrency(cur.value);
    } catch {
      message.error('Failed to load RFQs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDelete = async (id: string) => {
    try {
      await rfqsApi.delete(id);
      message.success('RFQ deleted successfully');
      loadData();
    } catch {
      message.error('Failed to delete RFQ');
    }
  };

  const handleStartAuction = async (id: string) => {
    try {
      await rfqsApi.updateStatus(id, 'ACTIVE');
      message.success('Auction activated successfully');
      loadData();
    } catch (err: any) {
      message.error(err.response?.data?.detail || 'Failed to activate auction');
    }
  };

  const filteredRfqs = rfqs.filter((r) => {
    if (activeTab === 'ALL') return true;
    if (activeTab === 'ACTIVE') return isAuctionLive(r);
    if (activeTab === 'DRAFT') return r.status === 'DRAFT';
    if (activeTab === 'CLOSED') return !isAuctionLive(r) && r.status !== 'DRAFT';
    return true;
  });

  const getStatusTag = (record: Rfq) => {
    if (record.status === 'DRAFT') return <Tag color="default">Draft</Tag>;
    if (record.status === 'FORCE_CLOSED') return <Tag color="error">Force Closed</Tag>;
    if (isAuctionLive(record)) return <Tag color="processing">Active Bidding</Tag>;
    return <Tag color="success">Closed</Tag>;
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
      title: 'Lowest Bid (L1)',
      dataIndex: 'lowest_bid',
      key: 'lowest_bid',
      render: (val: number | null) =>
        val !== null && val !== undefined ? (
          <span style={{ fontWeight: 700, color: '#059669' }}>{formatCurrency(val, currency)}</span>
        ) : (
          <Text type="secondary">No bids</Text>
        ),
    },
    {
      title: 'Bid Close Time (IST)',
      dataIndex: 'bid_close_time',
      key: 'bid_close_time',
      render: (time: string, record: Rfq) => {
        const isLive = isAuctionLive(record);
        return (
          <div>
            <div style={{ fontSize: 12, fontWeight: 500 }}>{formatDateTime(time)}</div>
            {isLive ? (
              <div style={{ marginTop: 2 }}>
                <CountdownTimer targetTime={time} size="small" />
              </div>
            ) : (
              <Text type="secondary" style={{ fontSize: 11 }}>
                Concluded
              </Text>
            )}
            {record.bid_close_time !== record.original_bid_close_time && (
              <Tag color="warning" style={{ fontSize: 10, marginTop: 2, marginLeft: 2 }}>
                Extended
              </Tag>
            )}
          </div>
        );
      },
    },
    {
      title: 'Forced Close Ceiling (IST)',
      dataIndex: 'forced_bid_close_time',
      key: 'forced_bid_close_time',
      render: (time: string) => (
        <div style={{ fontSize: 12, color: '#DC2626', fontWeight: 500 }}>{formatDateTime(time)}</div>
      ),
    },
    {
      title: 'Quotes',
      dataIndex: 'bid_count',
      key: 'bid_count',
      align: 'center' as const,
      render: (cnt: number) => (
        <Tag color={cnt > 0 ? 'blue' : 'default'} style={{ fontWeight: 600 }}>
          {cnt}
        </Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: unknown, record: Rfq) => (
        <Space size="small">
          <Button
            size="small"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/rfqs/${record.id}`)}
          >
            View
          </Button>
          {record.status === 'DRAFT' && (
            <>
              <Button
                size="small"
                type="primary"
                icon={<PlayCircleOutlined />}
                onClick={() => handleStartAuction(record.id)}
                style={{ background: '#059669' }}
              >
                Start
              </Button>
              <Button
                size="small"
                icon={<EditOutlined />}
                onClick={() => navigate(`/rfqs/${record.id}/edit`)}
              >
                Edit
              </Button>
            </>
          )}
          <Popconfirm
            title="Delete this RFQ?"
            description="Are you sure you want to delete this RFQ? All bids and activity logs will be removed."
            onConfirm={() => handleDelete(record.id)}
            okText="Delete"
            cancelText="Cancel"
            okButtonProps={{ danger: true }}
          >
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const liveCount = rfqs.filter(isAuctionLive).length;
  const draftCount = rfqs.filter((r) => r.status === 'DRAFT').length;
  const closedCount = rfqs.filter((r) => !isAuctionLive(r) && r.status !== 'DRAFT').length;

  const tabItems = [
    { key: 'ALL', label: `All RFQs (${rfqs.length})` },
    { key: 'ACTIVE', label: `Live Auctions (${liveCount})` },
    { key: 'DRAFT', label: `Drafts (${draftCount})` },
    { key: 'CLOSED', label: `Past & Completed (${closedCount})` },
  ];

  return (
    <div>
      <div className="page-heading"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 16,
          marginBottom: 20,
        }}
      >
        <div>
          <span className="page-kicker">Freight procurement · tender portfolio</span>
          <Title level={4} style={{ margin: 0, color: '#0F172A', fontWeight: 700 }}>
            RFQ workspace
          </Title>
          <Text type="secondary" style={{ fontSize: 13 }}>
            Monitor and manage freight quotations, auto-extension parameters, and auction ceilings
          </Text>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => navigate('/rfqs/create')}
          style={{ background: '#2563EB' }}
        >
          Create New RFQ
        </Button>
      </div>

      <Card bordered={false} style={{ boxShadow: '0 8px 28px rgba(24,44,80,.055)' }}>
        <Tabs activeKey={activeTab} items={tabItems} onChange={setActiveTab} style={{ marginBottom: 16 }} />
        <Table
          dataSource={filteredRfqs}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
          scroll={{ x: 'max-content' }}
        />
      </Card>
    </div>
  );
}
