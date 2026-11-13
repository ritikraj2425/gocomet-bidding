import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Card,
  Form,
  Input,
  Button,
  DatePicker,
  InputNumber,
  Select,
  Typography,
  Row,
  Col,
  Divider,
  message,
  Spin,
} from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { rfqsApi } from '../api/client';
import { toIST } from '../utils/time';
import type { Rfq } from '../types';

const { Title, Text } = Typography;
const { TextArea } = Input;

export default function EditRFQPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!id) return;
    rfqsApi
      .getById(id)
      .then((res) => {
        const rfq: Rfq = res.data;
        if (rfq.status !== 'DRAFT') {
          message.warning('Only Draft RFQs can be edited');
          navigate(`/rfqs/${id}`);
          return;
        }

        form.setFieldsValue({
          name: rfq.name,
          description: rfq.description,
          pickup_date: toIST(rfq.pickup_date),
          bid_start_time: toIST(rfq.bid_start_time),
          bid_close_time: toIST(rfq.bid_close_time),
          forced_bid_close_time: toIST(rfq.forced_bid_close_time),
          auction_config: {
            trigger_window_mins: rfq.auction_config?.trigger_window_mins || 10,
            extension_mins: rfq.auction_config?.extension_mins || 5,
            trigger_type: rfq.auction_config?.trigger_type || 'BID_RECEIVED',
          },
        });
      })
      .catch(() => {
        message.error('Failed to load RFQ');
        navigate('/rfqs');
      })
      .finally(() => setLoading(false));
  }, [id, form, navigate]);

  const onFinish = async (values: any) => {
    if (!id) return;
    const closeTime = values.bid_close_time;
    const forcedCloseTime = values.forced_bid_close_time;

    if (forcedCloseTime.isBefore(closeTime) || forcedCloseTime.isSame(closeTime)) {
      message.error('Forced Bid Close Time must be strictly later than Bid Close Time');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: values.name,
        description: values.description,
        bid_start_time: values.bid_start_time.toISOString(),
        bid_close_time: values.bid_close_time.toISOString(),
        forced_bid_close_time: values.forced_bid_close_time.toISOString(),
        pickup_date: values.pickup_date.toISOString(),
        auction_config: {
          trigger_window_mins: values.auction_config.trigger_window_mins,
          extension_mins: values.auction_config.extension_mins,
          trigger_type: values.auction_config.trigger_type,
        },
      };

      await rfqsApi.update(id, payload);
      message.success('RFQ updated successfully');
      navigate(`/rfqs/${id}`);
    } catch (err: any) {
      message.error(err.response?.data?.detail || 'Failed to update RFQ');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 0' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(`/rfqs/${id}`)} style={{ marginRight: 16 }}>
          Back to Details
        </Button>
        <div>
          <span className="page-kicker">Freight procurement · tender setup</span>
          <Title level={4} style={{ margin: 0, color: '#0F172A', fontWeight: 700 }}>
            Edit RFQ
          </Title>
          <Text type="secondary" style={{ fontSize: 13 }}>
            Modify schedule and British Auction configurations
          </Text>
        </div>
      </div>

      <Card bordered={false} style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Title level={5} style={{ color: '#0F172A', marginBottom: 16 }}>
            1. Shipment Information
          </Title>
          <Row gutter={16}>
            <Col xs={24} md={16}>
              <Form.Item label="RFQ Title / Cargo Description" name="name" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item label="Pickup Date" name="pickup_date" rules={[{ required: true }]}>
                <DatePicker style={{ width: '100%' }} format="DD MMM YYYY" />
              </Form.Item>
            </Col>
            <Col xs={24}>
              <Form.Item label="Description & Notes" name="description">
                <TextArea rows={2} />
              </Form.Item>
            </Col>
          </Row>

          <Divider />

          <Title level={5} style={{ color: '#0F172A', marginBottom: 16 }}>
            2. Auction Timings (12-Hour IST)
          </Title>
          <Row gutter={16}>
            <Col xs={24} md={8}>
              <Form.Item label="Bid Start Time" name="bid_start_time" rules={[{ required: true }]}>
                <DatePicker
                  showTime={{ use12Hours: true, format: 'hh:mm A' }}
                  style={{ width: '100%' }}
                  format="DD MMM YYYY, hh:mm A"
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item label="Bid Close Time" name="bid_close_time" rules={[{ required: true }]}>
                <DatePicker
                  showTime={{ use12Hours: true, format: 'hh:mm A' }}
                  style={{ width: '100%' }}
                  format="DD MMM YYYY, hh:mm A"
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item label="Forced Bid Close Time" name="forced_bid_close_time" rules={[{ required: true }]}>
                <DatePicker
                  showTime={{ use12Hours: true, format: 'hh:mm A' }}
                  style={{ width: '100%' }}
                  format="DD MMM YYYY, hh:mm A"
                />
              </Form.Item>
            </Col>
          </Row>

          <Divider />

          <Title level={5} style={{ color: '#0F172A', marginBottom: 16 }}>
            3. British Auction Auto-Extension Rules
          </Title>
          <Row gutter={16}>
            <Col xs={24} md={8}>
              <Form.Item
                label="Trigger Window (X Minutes)"
                name={['auction_config', 'trigger_window_mins']}
                rules={[{ required: true }]}
              >
                <InputNumber min={1} max={120} style={{ width: '100%' }} addonAfter="mins" />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item
                label="Extension Duration (Y Minutes)"
                name={['auction_config', 'extension_mins']}
                rules={[{ required: true }]}
              >
                <InputNumber min={1} max={60} style={{ width: '100%' }} addonAfter="mins" />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item
                label="Extension Trigger Condition"
                name={['auction_config', 'trigger_type']}
                rules={[{ required: true }]}
              >
                <Select
                  options={[
                    { label: 'Bid Received in Last X Minutes', value: 'BID_RECEIVED' },
                    { label: 'Any Supplier Rank Change in Last X Minutes', value: 'ANY_RANK_CHANGE' },
                    { label: 'Lowest Bidder (L1) Rank Change in Last X Minutes', value: 'L1_RANK_CHANGE' },
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>

          <div style={{ marginTop: 24, textAlign: 'right' }}>
            <Button onClick={() => navigate(`/rfqs/${id}`)} style={{ marginRight: 12 }}>
              Cancel
            </Button>
            <Button type="primary" htmlType="submit" loading={submitting} style={{ background: '#2563EB', fontWeight: 600 }}>
              Save Changes
            </Button>
          </div>
        </Form>
      </Card>
    </div>
  );
}
