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
  Form,
  InputNumber,
  DatePicker,
  Space,
  Alert,
  Spin,
  message,
  Timeline,
} from 'antd';
import {
  ArrowLeftOutlined,
  ThunderboltOutlined,
  ClockCircleOutlined,
  ReloadOutlined,
  TrophyOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { rfqsApi, bidsApi, settingsApi } from '../api/client';
import { useAuth } from '../hooks/useAuth';
import CountdownTimer from '../components/CountdownTimer';
import RankBadge from '../components/RankBadge';
import { useWebSocket } from '../hooks/useWebSocket';
import {
  formatDate,
  formatDateTime,
  formatTime,
  formatCurrency,
  isAuctionLive,
} from '../utils/time';
import type { Rfq, Bid, Setting } from '../types';

const { Title, Text } = Typography;

export default function RFQDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [rfq, setRfq] = useState<Rfq | null>(null);
  const [currency, setCurrency] = useState('INR');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

  // Watch charges for dynamic total calculation
  const freight = Form.useWatch('freight_charges', form) || 0;
  const origin = Form.useWatch('origin_charges', form) || 0;
  const destination = Form.useWatch('destination_charges', form) || 0;
  const calculatedTotal = Number(freight) + Number(origin) + Number(destination);

  const loadData = useCallback(async () => {
    if (!id) return;
    try {
      const [rRes, sRes] = await Promise.all([rfqsApi.getById(id), settingsApi.list()]);
      setRfq(rRes.data);
      const cur = sRes.data.find((s: Setting) => s.key === 'currency_symbol');
      if (cur) setCurrency(cur.value);
    } catch {
      message.error('Failed to load auction details');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Real-time WebSocket handlers
  useWebSocket(id, {
    'bid:new': (data: any) => {
      message.info(`New quote placed: ${formatCurrency(data.bid?.total_amount, currency)}`);
      loadData();
    },
    'auction:extended': (data: any) => {
      message.warning(`British Auction extended! Reason: ${data.reason}`);
      loadData();
    },
    'auction:closed': () => {
      message.info('The auction has ended');
      loadData();
    },
  });

  const handleBidSubmit = async (values: any) => {
    if (!id) return;
    setSubmitting(true);
    try {
      const payload = {
        freight_charges: Number(values.freight_charges),
        origin_charges: Number(values.origin_charges),
        destination_charges: Number(values.destination_charges),
        transit_time: Number(values.transit_time),
        validity_date: values.validity_date.toISOString(),
      };

      const res = await bidsApi.submitBid(id, payload);
      message.success('Quote submitted successfully!');

      if (res.data?.extension?.extended) {
        message.warning(`British Auction auto-extended by +${rfq?.auction_config?.extension_mins} minutes!`);
      }

      form.resetFields();
      form.setFieldsValue({
        freight_charges: 0,
        origin_charges: 0,
        destination_charges: 0,
        transit_time: 3,
        validity_date: dayjs().add(14, 'day'),
      });
      loadData();
    } catch (err: any) {
      message.error(err.response?.data?.detail || 'Failed to submit quote');
    } finally {
      setSubmitting(false);
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

  // Find user's best bid
  const myBids = (rfq.bids || []).filter((b) => b.supplier_id === user?.id);
  const myBestBid = myBids.length > 0 ? myBids[0] : null;

  // Winning bid if closed
  const winningBid = (rfq.bids && rfq.bids.length > 0) ? rfq.bids[0] : null;

  const bidColumns = [
    {
      title: 'Rank',
      dataIndex: 'rank',
      key: 'rank',
      width: 90,
      render: (rank: number) => <RankBadge rank={rank} />,
    },
    {
      title: 'Carrier Partner',
      dataIndex: 'supplier_id',
      key: 'supplier_id',
      render: (supplierId: string, record: Bid) => {
        const isMe = supplierId === user?.id;
        if (isMe) {
          return (
            <div>
              <span style={{ fontWeight: 700, color: '#2563EB' }}>
                You ({user?.company || 'Your Bid'})
              </span>
              <Tag color="blue" style={{ marginLeft: 6, fontSize: 10 }}>
                My Quote
              </Tag>
            </div>
          );
        }
        return (
          <div>
            <span style={{ color: '#64748B' }}>
              Competitor carrier
            </span>
          </div>
        );
      },
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
            color: record.rank === 1 ? '#059669' : record.supplier_id === user?.id ? '#2563EB' : '#1E293B',
          }}
        >
          {formatCurrency(val, currency)}
        </span>
      ),
    },
    {
      title: 'Transit',
      dataIndex: 'transit_time',
      key: 'transit_time',
      render: (val: number) => `${val} days`,
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
        <Space wrap>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/rfqs')}>
            All Auctions
          </Button>
          <div>
            <Space align="center" wrap>
              <Title level={4} style={{ margin: 0, color: '#0F172A', fontWeight: 700 }}>
                {rfq.name}
              </Title>
              <Tag style={{ fontSize: 13, fontWeight: 600 }}>{rfq.reference_id}</Tag>
              {isLive ? (
                <Tag color="processing" style={{ fontWeight: 600 }}>Active British Auction</Tag>
              ) : (
                <Tag color="default" style={{ fontWeight: 600 }}>Auction Concluded</Tag>
              )}
            </Space>
          </div>
        </Space>
        <Button icon={<ReloadOutlined />} onClick={loadData}>
          Refresh
        </Button>
      </div>

      {/* Closed Auction Outcome Banner */}
      {!isLive && (
        <Alert
          message={
            winningBid?.supplier_id === user?.id ? (
              <span style={{ fontWeight: 600 }}>
                Congratulations! Your quote of {formatCurrency(winningBid?.total_amount, currency)} won this British Auction as the Lowest Bidder (L1).
              </span>
            ) : winningBid ? (
              <span>
                Auction Concluded. Winning quote: <strong>{formatCurrency(winningBid.total_amount, currency)}</strong> by Lowest Bidder (L1).
              </span>
            ) : (
              <span>Auction Concluded with no quotes submitted.</span>
            )
          }
          type={winningBid?.supplier_id === user?.id ? 'success' : 'info'}
          showIcon
          style={{ marginBottom: 20 }}
        />
      )}

      {/* Live Auction Timer & Extension Alert */}
      {isLive && (
        <Card
          bordered={false}
          style={{
            marginBottom: 20,
            background: '#FFFFFF',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            borderLeft: '4px solid #2563EB',
          }}
        >
          <Row align="middle" justify="space-between" gutter={[16, 16]}>
            <Col xs={24} md={14}>
              <div style={{ fontSize: 13, color: '#64748B', fontWeight: 500 }}>Live British Auction Rule</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', marginTop: 4 }}>
                Trigger Window: Last {rfq.auction_config?.trigger_window_mins} minutes before close
              </div>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Bidding activity within the last {rfq.auction_config?.trigger_window_mins} minutes extends the deadline by +{rfq.auction_config?.extension_mins} minutes (up to forced close).
              </Text>
              {isExtended && (
                <div style={{ marginTop: 8 }}>
                  <Tag color="warning" style={{ fontWeight: 600, padding: '3px 8px' }}>
                    Auction Time Extended (Original Close: {formatTime(rfq.original_bid_close_time)})
                  </Tag>
                </div>
              )}
            </Col>
            <Col xs={24} md={10} style={{ textAlign: 'right' }}>
              <CountdownTimer
                targetTime={rfq.bid_close_time}
                label="Time Left To Submit / Improve Quote"
                size="large"
              />
            </Col>
          </Row>
        </Card>
      )}

      {/* Current Standing Banner for logged-in supplier */}
      {myBestBid && (
        <Alert
          message={
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
              <span>
                Your Current Position: <strong>Rank L{myBestBid.rank}</strong> with total quote of <strong>{formatCurrency(myBestBid.total_amount, currency)}</strong>
              </span>
              {myBestBid.rank === 1 ? (
                <Tag color="success" style={{ fontWeight: 600 }}>You currently hold the lowest bid (L1)</Tag>
              ) : isLive ? (
                <Tag color="orange" style={{ fontWeight: 600 }}>You are underbid. Submit a lower quote to take L1!</Tag>
              ) : null}
            </div>
          }
          type={myBestBid.rank === 1 ? 'success' : 'warning'}
          showIcon
          style={{ marginBottom: 20 }}
        />
      )}

      <Row gutter={[20, 20]}>
        {/* Left Column: Shipment Specs and Leaderboard */}
        <Col xs={24} lg={15}>
          <Card
            title="Shipment & Auction Specifications"
            bordered={false}
            style={{ marginBottom: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
          >
            <Descriptions bordered size="small" column={{ xs: 1, sm: 2 }}>
              <Descriptions.Item label="Reference ID">{rfq.reference_id}</Descriptions.Item>
              <Descriptions.Item label="Pickup Date">{formatDate(rfq.pickup_date)}</Descriptions.Item>
              <Descriptions.Item label="Bid Close Time (IST)">
                <span style={{ fontWeight: 600, color: '#0F172A' }}>
                  {formatDateTime(rfq.bid_close_time)}
                </span>
              </Descriptions.Item>
              <Descriptions.Item label="Forced Close Ceiling (IST)">
                <span style={{ color: '#DC2626', fontWeight: 600 }}>
                  {formatDateTime(rfq.forced_bid_close_time)}
                </span>
              </Descriptions.Item>
              <Descriptions.Item label="Trigger Window (X)">
                {rfq.auction_config?.trigger_window_mins} minutes
              </Descriptions.Item>
              <Descriptions.Item label="Extension Duration (Y)">
                +{rfq.auction_config?.extension_mins} minutes
              </Descriptions.Item>
            </Descriptions>
            {rfq.description && (
              <div style={{ marginTop: 12, padding: '10px 12px', background: '#F8FAFC', borderRadius: 6 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>Cargo Notes: </Text>
                <Text style={{ fontSize: 13 }}>{rfq.description}</Text>
              </div>
            )}
          </Card>

          <Card
            title="Competitive Bidding Leaderboard (Sorted by Total Quote)"
            bordered={false}
            style={{ marginBottom: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
          >
            <Table
              dataSource={rfq.bids || []}
              columns={bidColumns}
              rowKey="id"
              pagination={false}
              scroll={{ x: 'max-content' }}
              rowClassName={(record) => (record.supplier_id === user?.id ? 'my-bid-row' : '')}
              locale={{ emptyText: 'No quotes received yet. Be the first to place a quote!' }}
            />
          </Card>

          <Card
            title="Auction Event Audit Trail"
            bordered={false}
            style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
          >
            {(!rfq.activity_logs || rfq.activity_logs.length === 0) ? (
              <Text type="secondary">No logs yet.</Text>
            ) : (
              <Timeline
                items={rfq.activity_logs.map((log) => ({
                  color: log.event_type === 'TIME_EXTENDED' ? 'orange' : 'blue',
                  children: (
                    <div style={{ marginBottom: 10 }}>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{log.event_type.replace(/_/g, ' ')}</div>
                      <div style={{ fontSize: 12, color: '#475569' }}>{log.description}</div>
                      <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>
                        {formatDateTime(log.created_at)}
                      </div>
                    </div>
                  ),
                }))}
              />
            )}
          </Card>
        </Col>

        {/* Right Column: Quote Submission Console */}
        <Col xs={24} lg={9}>
          <Card
            title="Submit / Lower Your Quote"
            bordered={false}
            style={{
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              position: 'sticky',
              top: 84,
            }}
          >
            {!isLive ? (
              <Alert
                message="Bidding Closed"
                description="This auction has concluded and is no longer accepting competitive quotes."
                type="info"
                showIcon
              />
            ) : (
              <Form
                form={form}
                layout="vertical"
                onFinish={handleBidSubmit}
                initialValues={{
                  freight_charges: 0,
                  origin_charges: 0,
                  destination_charges: 0,
                  transit_time: 3,
                  validity_date: dayjs().add(14, 'day'),
                }}
              >
                <div style={{ marginBottom: 16 }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>Bidding Carrier:</Text>
                  <div style={{ fontWeight: 600, fontSize: 14, color: '#0F172A' }}>
                    {user?.company || user?.name}
                  </div>
                </div>

                <Form.Item
                  label="Freight Charges"
                  name="freight_charges"
                  rules={[{ required: true, message: 'Enter freight charges' }]}
                >
                  <InputNumber
                    min={0}
                    style={{ width: '100%' }}
                    prefix={currency === 'INR' ? '₹' : currency}
                    placeholder="0"
                  />
                </Form.Item>

                <Form.Item
                  label="Origin Charges"
                  name="origin_charges"
                  rules={[{ required: true, message: 'Enter origin charges' }]}
                >
                  <InputNumber
                    min={0}
                    style={{ width: '100%' }}
                    prefix={currency === 'INR' ? '₹' : currency}
                    placeholder="0"
                  />
                </Form.Item>

                <Form.Item
                  label="Destination Charges"
                  name="destination_charges"
                  rules={[{ required: true, message: 'Enter destination charges' }]}
                >
                  <InputNumber
                    min={0}
                    style={{ width: '100%' }}
                    prefix={currency === 'INR' ? '₹' : currency}
                    placeholder="0"
                  />
                </Form.Item>

                {/* Auto Calculated Total Quote */}
                <div
                  style={{
                    background: '#F1F5F9',
                    padding: '14px 16px',
                    borderRadius: 6,
                    marginBottom: 16,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    border: '1px solid #E2E8F0',
                  }}
                >
                  <Text strong style={{ color: '#0F172A' }}>Total Bid Amount:</Text>
                  <span style={{ fontSize: 20, fontWeight: 700, color: '#2563EB' }}>
                    {formatCurrency(calculatedTotal, currency)}
                  </span>
                </div>

                <Form.Item
                  label="Transit Time (Days)"
                  name="transit_time"
                  rules={[{ required: true, message: 'Enter transit days' }]}
                >
                  <InputNumber min={1} max={90} style={{ width: '100%' }} addonAfter="days" />
                </Form.Item>

                <Form.Item
                  label="Validity of Quote"
                  name="validity_date"
                  rules={[{ required: true, message: 'Select quote validity date' }]}
                >
                  <DatePicker style={{ width: '100%' }} format="DD MMM YYYY" />
                </Form.Item>

                <Button
                  type="primary"
                  htmlType="submit"
                  size="large"
                  block
                  loading={submitting}
                  style={{ background: '#2563EB', fontWeight: 600, height: 44, marginTop: 8 }}
                >
                  Submit Competitive Quote
                </Button>
              </Form>
            )}
          </Card>
        </Col>
      </Row>

      <style>{`
        .my-bid-row {
          background-color: #EFF6FF !important;
        }
      `}</style>
    </div>
  );
}
