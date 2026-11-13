import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  Row,
  Col,
  Statistic,
  Table,
  Tag,
  Typography,
  Button,
  Tabs,
  Space,
  Spin,
  message,
  Tooltip,
} from 'antd';
import {
  DollarOutlined,
  CheckCircleOutlined,
  ThunderboltOutlined,
  ArrowRightOutlined,
  ReloadOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import { bidsApi, settingsApi } from '../api/client';
import RankBadge from '../components/RankBadge';
import CountdownTimer from '../components/CountdownTimer';
import { formatDate, formatDateTime, formatCurrency } from '../utils/time';
import type { MyBid, Setting } from '../types';

const { Title, Text } = Typography;

export default function MyBidsPage() {
  const navigate = useNavigate();
  const [bids, setBids] = useState<MyBid[]>([]);
  const [currency, setCurrency] = useState('INR');
  const [activeTab, setActiveTab] = useState('ALL');
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [bRes, sRes] = await Promise.all([bidsApi.getMyBids(), settingsApi.list()]);
      setBids(bRes.data);
      const cur = sRes.data.find((s: Setting) => s.key === 'currency_symbol');
      if (cur) setCurrency(cur.value);
    } catch {
      message.error('Failed to load your quotes history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const activeBids = bids.filter((b) => b.is_auction_live);
  const leadingBids = bids.filter((b) => b.is_winning);
  const underbidBids = bids.filter((b) => b.is_auction_live && !b.is_winning);
  const pastBids = bids.filter((b) => !b.is_auction_live);
  const wonPastBids = pastBids.filter((b) => b.is_winning);

  const filteredBids = bids.filter((b) => {
    if (activeTab === 'ALL') return true;
    if (activeTab === 'ACTIVE') return b.is_auction_live;
    if (activeTab === 'LEADING') return b.is_winning;
    if (activeTab === 'UNDERBID') return b.is_auction_live && !b.is_winning;
    if (activeTab === 'PAST') return !b.is_auction_live;
    return true;
  });

  const columns = [
    {
      title: 'RFQ Reference',
      dataIndex: 'rfq_reference_id',
      key: 'rfq_reference_id',
      render: (ref: string, record: MyBid) => (
        <a onClick={() => navigate(`/rfqs/${record.rfq_id}`)} style={{ fontWeight: 600 }}>
          {ref}
        </a>
      ),
    },
    {
      title: 'Shipment Route / Cargo',
      dataIndex: 'rfq_name',
      key: 'rfq_name',
      render: (name: string, record: MyBid) => (
        <div>
          <div style={{ fontWeight: 600, color: '#0F172A' }}>{name}</div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Pickup: {formatDate(record.pickup_date)}
          </Text>
        </div>
      ),
    },
    {
      title: 'My Submitted Quote',
      dataIndex: 'total_amount',
      key: 'total_amount',
      render: (amount: number, record: MyBid) => (
        <div>
          <div style={{ fontWeight: 700, fontSize: 14, color: record.is_winning ? '#059669' : '#2563EB' }}>
            {formatCurrency(amount, currency)}
          </div>
          <Tooltip
            title={`Freight: ${formatCurrency(record.freight_charges, currency)} | Origin: ${formatCurrency(record.origin_charges, currency)} | Destination: ${formatCurrency(record.destination_charges, currency)}`}
          >
            <span style={{ fontSize: 11, color: '#64748B', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              Breakdown <InfoCircleOutlined style={{ fontSize: 10 }} />
            </span>
          </Tooltip>
        </div>
      ),
    },
    {
      title: 'Current Rank',
      dataIndex: 'rank',
      key: 'rank',
      render: (rank: number) => <RankBadge rank={rank} />,
    },
    {
      title: 'Lowest Tender Quote',
      dataIndex: 'lowest_rfq_quote',
      key: 'lowest_rfq_quote',
      render: (val: number | null, record: MyBid) => {
        if (!val) return <Text type="secondary">N/A</Text>;
        if (record.is_winning) {
          return (
            <Tag color="success" style={{ fontWeight: 600 }}>
              You hold lowest (L1)
            </Tag>
          );
        }
        return (
          <span style={{ color: '#059669', fontWeight: 600 }}>
            {formatCurrency(val, currency)}
          </span>
        );
      },
    },
    {
      title: 'Auction Status',
      dataIndex: 'is_auction_live',
      key: 'is_auction_live',
      render: (live: boolean, record: MyBid) => {
        if (live) {
          return (
            <div>
              <Tag color="processing" style={{ fontWeight: 600 }}>
                Live Bidding
              </Tag>
              <div style={{ marginTop: 2 }}>
                <CountdownTimer targetTime={record.bid_close_time} size="small" />
              </div>
            </div>
          );
        }
        return (
          <div>
            <Tag color={record.is_winning ? 'success' : 'default'} style={{ fontWeight: 600 }}>
              {record.is_winning ? 'Won (L1)' : 'Auction Ended'}
            </Tag>
            <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>
              Closed
            </div>
          </div>
        );
      },
    },
    {
      title: 'Submitted (IST)',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (d: string) => (
        <span style={{ fontSize: 12, color: '#475569' }}>{formatDateTime(d)}</span>
      ),
    },
    {
      title: 'Action',
      key: 'action',
      render: (_: unknown, record: MyBid) => (
        <Button
          type={record.is_auction_live ? 'primary' : 'default'}
          size="middle"
          onClick={() => navigate(`/rfqs/${record.rfq_id}`)}
          style={record.is_auction_live ? { background: '#2563EB', fontWeight: 600 } : { fontWeight: 500 }}
        >
          {record.is_auction_live ? 'Improve Quote' : 'View Results'}
        </Button>
      ),
    },
  ];

  const tabItems = [
    { key: 'ALL', label: `All My Quotes (${bids.length})` },
    { key: 'ACTIVE', label: `Active Bidding (${activeBids.length})` },
    { key: 'LEADING', label: `Leading L1 (${leadingBids.length})` },
    { key: 'UNDERBID', label: `Underbid (${underbidBids.length})` },
    { key: 'PAST', label: `Past Auctions (${pastBids.length})` },
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
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 16,
          marginBottom: 20,
        }}
      >
        <div>
          <Title level={4} style={{ margin: 0, color: '#0F172A', fontWeight: 700 }}>
            My Quotations & Bidding History
          </Title>
          <Text type="secondary" style={{ fontSize: 13 }}>
            Track all submitted quotes, real-time rank positions, and completed auction outcomes
          </Text>
        </div>
        <Button icon={<ReloadOutlined />} onClick={loadData}>
          Refresh
        </Button>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={12} lg={6}>
          <Card bordered={false} className="stat-card" style={{ '--orb': '#e7efff' } as React.CSSProperties}>
            <Statistic
              title={<span style={{ color: '#64748B' }}>Total Quotes Submitted</span>}
              value={bids.length}
              prefix={<DollarOutlined style={{ color: '#2563EB', marginRight: 8 }} />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={12} lg={6}>
          <Card bordered={false} className="stat-card" style={{ '--orb': '#e3f8f1' } as React.CSSProperties}>
            <Statistic
              title={<span style={{ color: '#64748B' }}>Currently Holding L1</span>}
              value={leadingBids.length}
              valueStyle={{ color: '#059669', fontWeight: 700 }}
              prefix={<CheckCircleOutlined style={{ color: '#059669', marginRight: 8 }} />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={12} lg={6}>
          <Card bordered={false} className="stat-card" style={{ '--orb': '#fff1da' } as React.CSSProperties}>
            <Statistic
              title={<span style={{ color: '#64748B' }}>Underbid In Live Tenders</span>}
              value={underbidBids.length}
              valueStyle={{ color: '#D97706', fontWeight: 700 }}
              prefix={<ThunderboltOutlined style={{ color: '#D97706', marginRight: 8 }} />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={12} lg={6}>
          <Card bordered={false} className="stat-card" style={{ '--orb': '#eaf0f7' } as React.CSSProperties}>
            <Statistic
              title={<span style={{ color: '#64748B' }}>Completed Auctions Won</span>}
              value={wonPastBids.length}
              prefix={<CheckCircleOutlined style={{ color: '#475569', marginRight: 8 }} />}
            />
          </Card>
        </Col>
      </Row>

      <Card bordered={false} style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <Tabs activeKey={activeTab} items={tabItems} onChange={setActiveTab} style={{ marginBottom: 16 }} />
        <Table
          dataSource={filteredBids}
          columns={columns}
          rowKey="id"
          pagination={{ pageSize: 10 }}
          scroll={{ x: 'max-content' }}
          locale={{
            emptyText: (
              <div style={{ padding: '24px 0' }}>
                <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
                  You have not submitted any quotes in this category.
                </Text>
                <Button type="primary" onClick={() => navigate('/rfqs')}>
                  Browse Available Auctions
                </Button>
              </div>
            ),
          }}
        />
      </Card>
    </div>
  );
}

