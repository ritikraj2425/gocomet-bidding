import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Row,
  Col,
  Typography,
  Tag,
  Button,
  Descriptions,
  Table,
  Timeline,
  Space,
  Alert,
  Spin,
  message,
  Popconfirm,
  Badge,
} from 'antd';
import {
  ArrowLeftOutlined,
  PlayCircleOutlined,
  StopOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  ThunderboltOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { rfqsApi, settingsApi } from '../api/client';
import CountdownTimer from '../components/CountdownTimer';
import { useWebSocket } from '../hooks/useWebSocket';
import {
  formatDate,
  formatDateTime,
  formatTime,
  formatCurrency,
  isAuctionLive,
} from '../utils/time';
import type { Rfq, Bid, ActivityLog, Setting } from '../types';

const { Title, Text } = Typography;

export default function RFQDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [rfq, setRfq] = useState<Rfq | null>(null);
  const [currency, setCurrency] = useState('INR');
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!id) return;
    try {
      const [rRes, sRes] = await Promise.all([rfqsApi.getById(id), settingsApi.list()]);
      setRfq(rRes.data);
      const cur = sRes.data.find((s: Setting) => s.key === 'currency_symbol');
      if (cur) setCurrency(cur.value);
    } catch {
      message.error('Failed to load RFQ details');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Real-time WebSocket event handlers
  useWebSocket(id, {
    'bid:new': (data: any) => {
      message.info(`New bid received: ${formatCurrency(data.bid?.total_amount, currency)}`);
      loadData();
    },
    'auction:extended': (data: any) => {
      message.warning(`Auction extended! Reason: ${data.reason}`);
      loadData();
    },
    'auction:closed': () => {
      message.info('Auction has closed');
      loadData();
    },
  });

  const handleStatusChange = async (status: string) => {
    if (!id) return;
    try {
      await rfqsApi.updateStatus(id, status);
      message.success(`Status updated to ${status}`);
      loadData();
    } catch (err: any) {
      message.error(err.response?.data?.detail || 'Failed to update status');
    }
  };

  if (loading || !rfq) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 0' }}>
        <Spin size="large" />
      </div>
    );
  }

  const isLive = isAuctionLive(rfq);
  const isExtended = rfq.bid_close_time !== rfq.original_bid_close_time;
  const bidCount = rfq.bids?.length || 0;
  const lowestQuote = bidCount ? Math.min(...(rfq.bids || []).map((bid) => bid.total_amount)) : null;

  const getTriggerLabel = (type?: string) => {
    switch (type) {
      case 'BID_RECEIVED':
        return 'Bid Received in Last X Minutes';
      case 'ANY_RANK_CHANGE':
        return 'Any Supplier Rank Change in Last X Minutes';
      case 'L1_RANK_CHANGE':
        return 'Lowest Bidder (L1) Rank Change in Last X Minutes';
      default:
        return type || 'N/A';
    }
  };

  const getStatusTag = () => {
    if (rfq.status === 'DRAFT') return <Tag color="default">Draft</Tag>;
    if (rfq.status === 'FORCE_CLOSED') return <Tag color="error">Force Closed</Tag>;
    if (isLive) return <Tag color="processing">Active British Auction</Tag>;
    return <Tag color="success">Auction Closed</Tag>;
  };

  const bidColumns = [
    {
      title: 'Rank',
      dataIndex: 'rank',
      key: 'rank',
      width: 80,
      render: (rank: number) => (
        <span
          style={{
            display: 'inline-block',
            padding: '2px 8px',
            borderRadius: 4,
            fontWeight: 700,
            fontSize: 12,
            background: rank === 1 ? '#DCFCE7' : '#F1F5F9',
            color: rank === 1 ? '#15803D' : '#475569',
            border: rank === 1 ? '1px solid #86EFAC' : '1px solid #CBD5E1',
          }}
        >
          L{rank}
        </span>
      ),
    },
    {
      title: 'Carrier Partner',
      dataIndex: 'supplier_name',
      key: 'supplier_name',
      render: (name: string, record: Bid) => (
        <div>
          <div style={{ fontWeight: 600, color: '#0F172A' }}>{name || 'Carrier'}</div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.supplier_company || 'Independent Fleet'}
          </Text>
        </div>
      ),
    },
    {
      title: 'Freight Charges',
      dataIndex: 'freight_charges',
      key: 'freight_charges',
      render: (val: number) => formatCurrency(val, currency),
    },
    {
      title: 'Origin',
      dataIndex: 'origin_charges',
      key: 'origin_charges',
      render: (val: number) => formatCurrency(val, currency),
    },
    {
      title: 'Destination',
      dataIndex: 'destination_charges',
      key: 'destination_charges',
      render: (val: number) => formatCurrency(val, currency),
    },
    {
      title: 'Total Quote',
      dataIndex: 'total_amount',
      key: 'total_amount',
      render: (val: number, record: Bid) => (
        <span
          style={{
            fontWeight: 700,
            fontSize: 14,
            color: record.rank === 1 ? '#059669' : '#1E293B',
          }}
        >
          {formatCurrency(val, currency)}
        </span>
      ),
    },
    {
      title: 'Transit Days',
      dataIndex: 'transit_time',
      key: 'transit_time',
      render: (val: number) => `${val} days`,
    },
    {
      title: 'Quote Validity',
      dataIndex: 'validity_date',
      key: 'validity_date',
      render: (d: string) => formatDate(d),
    },
    {
      title: 'Submitted (IST)',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (d: string) => formatTime(d),
    },
  ];

  return (
    <div>
      <div className="monitor-heading"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 16,
          marginBottom: 20,
        }}
      >
        <Space wrap align="start">
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/rfqs')}>
            All RFQs
          </Button>
          <div>
            <span className="page-kicker">Auction monitor · {rfq.reference_id}</span>
            <Space align="center" wrap size={[8, 4]}>
              <Title level={4} style={{ margin: 0, color: '#0F172A', fontWeight: 700 }}>{rfq.name}</Title>
              {getStatusTag()}
            </Space>
          </div>
        </Space>
        <Space wrap>
          <Button icon={<ReloadOutlined />} onClick={loadData}>
            Refresh
          </Button>
          {rfq.status === 'DRAFT' && (
            <Button
              type="primary"
              icon={<PlayCircleOutlined />}
              onClick={() => handleStatusChange('ACTIVE')}
              style={{ background: '#059669' }}
            >
              Start Auction
            </Button>
          )}
          {rfq.status === 'ACTIVE' && (
            <Popconfirm
              title="Force Close Auction?"
              description="This will immediately terminate the auction. No more quotes will be accepted."
              onConfirm={() => handleStatusChange('FORCE_CLOSED')}
              okText="Force Close"
              cancelText="Cancel"
              okButtonProps={{ danger: true }}
            >
              <Button danger icon={<StopOutlined />}>
                Force Close Auction
              </Button>
            </Popconfirm>
          )}
        </Space>
      </div>

      <Row gutter={[14, 14]} className="monitor-summary">
        <Col xs={24} sm={8}><Card bordered={false} className="monitor-metric"><Text>Quotes received</Text><strong>{bidCount}</strong><small>Carrier submissions for this tender</small></Card></Col>
        <Col xs={24} sm={8}><Card bordered={false} className="monitor-metric monitor-metric-leading"><Text>Current lowest quote</Text><strong>{lowestQuote === null ? '—' : formatCurrency(lowestQuote, currency)}</strong><small>{lowestQuote === null ? 'Waiting for the first quote' : 'Leading carrier offer'}</small></Card></Col>
        <Col xs={24} sm={8}><Card bordered={false} className="monitor-metric monitor-metric-rule"><Text>Auto-extension rule</Text><strong>{rfq.auction_config?.trigger_window_mins || '—'}<i> min</i></strong><small>Extends by {rfq.auction_config?.extension_mins || '—'} min when triggered</small></Card></Col>
      </Row>

      <Row gutter={[16, 16]}>
        {/* Left Column: Details & Bids */}
        <Col xs={24} lg={16}>
          {isLive && (
            <Card
              className="monitor-live-card"
              bordered={false}
              style={{
                marginBottom: 16,
                background: '#FFFFFF',
                boxShadow: '0 8px 28px rgba(24,44,80,.055)',
                borderLeft: '4px solid #2563EB',
              }}
            >
              <Row align="middle" justify="space-between" gutter={[16, 16]}>
                <Col xs={24} sm={14}>
                  <Text type="secondary" style={{ fontSize: 13, display: 'block' }}>
                    LIVE AUCTION STATUS
                  </Text>
                  <Text strong style={{ fontSize: 15, color: '#0F172A' }}>
                    Trigger Window: Last {rfq.auction_config?.trigger_window_mins} minutes before close
                  </Text>
                  {isExtended && (
                    <div style={{ marginTop: 6 }}>
                      <Tag color="orange" style={{ fontWeight: 600 }}>
                        Auction Extended (+{rfq.auction_config?.extension_mins}m per trigger)
                      </Tag>
                    </div>
                  )}
                </Col>
                <Col xs={24} sm={10}>
                  <CountdownTimer
                    targetTime={rfq.bid_close_time}
                    label="Time Remaining to Bid Close"
                    size="large"
                  />
                </Col>
              </Row>
            </Card>
          )}

          <Card
            title="RFQ & British Auction Specifications"
            bordered={false}
            style={{ marginBottom: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
          >
            <Descriptions bordered size="small" column={{ xs: 1, sm: 2, md: 3 }}>
              <Descriptions.Item label="Reference ID">{rfq.reference_id}</Descriptions.Item>
              <Descriptions.Item label="Pickup Date">{formatDate(rfq.pickup_date)}</Descriptions.Item>
              <Descriptions.Item label="Created By">{rfq.created_by_name || 'Administrator'}</Descriptions.Item>

              <Descriptions.Item label="Bid Start Time (IST)">
                {formatDateTime(rfq.bid_start_time)}
              </Descriptions.Item>
              <Descriptions.Item label="Current Close Time (IST)">
                <span style={{ fontWeight: 600, color: isExtended ? '#D97706' : '#1E293B' }}>
                  {formatDateTime(rfq.bid_close_time)}
                </span>
              </Descriptions.Item>
              <Descriptions.Item label="Original Close Time (IST)">
                {formatDateTime(rfq.original_bid_close_time)}
              </Descriptions.Item>

              <Descriptions.Item label="Forced Close Time (IST)" span={3}>
                <span style={{ fontWeight: 700, color: '#DC2626' }}>
                  {formatDateTime(rfq.forced_bid_close_time)}
                </span>
                <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>
                  (Hard ceiling: No extension will ever surpass this point)
                </Text>
              </Descriptions.Item>

              <Descriptions.Item label="Trigger Window (X)">
                {rfq.auction_config?.trigger_window_mins} minutes
              </Descriptions.Item>
              <Descriptions.Item label="Extension Duration (Y)">
                +{rfq.auction_config?.extension_mins} minutes
              </Descriptions.Item>
              <Descriptions.Item label="Extension Trigger Rule">
                {getTriggerLabel(rfq.auction_config?.trigger_type)}
              </Descriptions.Item>
            </Descriptions>

            {rfq.description && (
              <div style={{ marginTop: 12, padding: '10px 12px', background: '#F8FAFC', borderRadius: 6 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>Shipment Notes: </Text>
                <Text style={{ fontSize: 13 }}>{rfq.description}</Text>
              </div>
            )}
          </Card>

          <Card
            title={
              <Space>
                <span>Submitted Quotes & Competitive Leaderboard</span>
                <Badge count={rfq.bids?.length || 0} style={{ backgroundColor: '#2563EB' }} />
              </Space>
            }
            bordered={false}
            style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
          >
            <Table
              dataSource={rfq.bids || []}
              columns={bidColumns}
              rowKey="id"
              pagination={false}
              scroll={{ x: 'max-content' }}
              locale={{ emptyText: 'No quotes submitted yet for this RFQ.' }}
            />
          </Card>
        </Col>

        {/* Right Column: Activity Log */}
        <Col xs={24} lg={8}>
          <Card
            title="Auction Audit Trail"
            bordered={false}
            style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)', maxHeight: 780, overflowY: 'auto' }}
          >
            {(!rfq.activity_logs || rfq.activity_logs.length === 0) ? (
              <Text type="secondary">No activity recorded yet.</Text>
            ) : (
              <Timeline
                items={rfq.activity_logs.map((log) => {
                  let color = 'blue';
                  let icon = <ClockCircleOutlined />;
                  if (log.event_type === 'TIME_EXTENDED') {
                    color = 'orange';
                    icon = <ThunderboltOutlined />;
                  } else if (log.event_type === 'BID_SUBMITTED') {
                    color = 'blue';
                  } else if (log.event_type.includes('STARTED') || log.event_type.includes('RESET')) {
                    color = 'green';
                    icon = <CheckCircleOutlined />;
                  } else if (log.event_type.includes('CLOSED')) {
                    color = 'red';
                  }

                  let metaObj: any = null;
                  try {
                    const raw = log.metadata_json || log.metadata;
                    if (raw) metaObj = JSON.parse(raw);
                  } catch {}

                  return {
                    color,
                    dot: icon,
                    children: (
                      <div style={{ marginBottom: 12 }}>
                        <div style={{ fontWeight: 600, fontSize: 13, color: '#1E293B' }}>
                          {log.event_type.replace(/_/g, ' ')}
                        </div>
                        <div style={{ fontSize: 12, color: '#475569', marginTop: 2 }}>
                          {log.description}
                        </div>
                        {metaObj && metaObj.new_close_time && (
                          <div
                            style={{
                              fontSize: 11,
                              color: '#D97706',
                              marginTop: 4,
                              background: '#FEF3C7',
                              padding: '2px 6px',
                              borderRadius: 4,
                              display: 'inline-block',
                            }}
                          >
                            New Close: {formatTime(metaObj.new_close_time)}
                          </div>
                        )}
                        <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 4 }}>
                          {formatDateTime(log.created_at)}
                        </div>
                      </div>
                    ),
                  };
                })}
              />
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
}
