import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Switch,
  message,
  Alert,
} from 'antd';
import { ArrowLeftOutlined, ThunderboltOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { rfqsApi, settingsApi } from '../api/client';
import type { Setting } from '../types';

const { Title, Text } = Typography;
const { TextArea } = Input;

export default function CreateRFQPage() {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [demoMode, setDemoMode] = useState(false);

  useEffect(() => {
    // Load default settings from backend
    settingsApi.list().then((res) => {
      const settings = res.data;
      const getVal = (key: string, fallback: any) => {
        const found = settings.find((s: Setting) => s.key === key);
        return found ? found.value : fallback;
      };

      const defaultX = parseInt(getVal('default_trigger_window', '10'), 10);
      const defaultY = parseInt(getVal('default_extension_duration', '5'), 10);
      const defaultTrigger = getVal('default_trigger_type', 'BID_RECEIVED');

      form.setFieldsValue({
        auction_config: {
          trigger_window_mins: defaultX,
          extension_mins: defaultY,
          trigger_type: defaultTrigger,
        },
        pickup_date: dayjs().add(5, 'day'),
        bid_start_time: dayjs(),
        bid_close_time: dayjs().add(24, 'hour'),
        forced_bid_close_time: dayjs().add(28, 'hour'),
      });
    });
  }, [form]);

  const handleDemoToggle = (checked: boolean) => {
    setDemoMode(checked);
    if (checked) {
      const now = dayjs();
      form.setFieldsValue({
        name: 'Rapid British Auction Simulation',
        description: 'Test auction with 10-minute close time, 3-minute extension, and 25-minute forced close.',
        bid_start_time: now,
        bid_close_time: now.add(10, 'minute'),
        forced_bid_close_time: now.add(25, 'minute'),
        pickup_date: now.add(2, 'day'),
        auction_config: {
          trigger_window_mins: 5,
          extension_mins: 2,
          trigger_type: 'BID_RECEIVED',
        },
      });
      message.info('Demo timings applied: Closes in 10 minutes, 5 min trigger window, 2 min extension.');
    }
  };

  const onFinish = async (values: any) => {
    const closeTime = values.bid_close_time;
    const forcedCloseTime = values.forced_bid_close_time;

    if (forcedCloseTime.isBefore(closeTime) || forcedCloseTime.isSame(closeTime)) {
      message.error('Validation Rule: Forced Bid Close Time must be strictly later than Bid Close Time');
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

      const res = await rfqsApi.create(payload);
      message.success('RFQ created successfully in Draft status');
      navigate(`/rfqs/${res.data.id}`);
    } catch (err: any) {
      message.error(err.response?.data?.detail || 'Failed to create RFQ');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/rfqs')} style={{ marginRight: 16 }}>
          Back to RFQs
        </Button>
        <div>
          <span className="page-kicker">Freight procurement · new tender</span>
          <Title level={4} style={{ margin: 0, color: '#0F172A', fontWeight: 700 }}>
            Create an RFQ
          </Title>
          <Text type="secondary" style={{ fontSize: 13 }}>
            Configure shipment specifications, bidding schedule, and British Auction auto-extension parameters
          </Text>
        </div>
      </div>

      <Card bordered={false} style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 24,
            padding: '12px 16px',
            background: '#F1F5F9',
            borderRadius: 6,
          }}
        >
          <div>
            <Text strong style={{ color: '#0F172A' }}>
              Quick Demo / Simulation Mode
            </Text>
            <div style={{ fontSize: 12, color: '#64748B' }}>
              Pre-populates auction with 10-minute close time for rapid evaluation of British Auction mechanics
            </div>
          </div>
          <Switch checked={demoMode} onChange={handleDemoToggle} />
        </div>

        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Title level={5} style={{ color: '#0F172A', marginBottom: 16 }}>
            1. Shipment Information
          </Title>
          <Row gutter={16}>
            <Col xs={24} md={16}>
              <Form.Item
                label="RFQ Title / Cargo Description"
                name="name"
                rules={[{ required: true, message: 'Please enter the RFQ title' }]}
              >
                <Input placeholder="e.g. Full Container Load - Mumbai Nhava Sheva to Delhi ICD" />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item
                label="Pickup Date"
                name="pickup_date"
                rules={[{ required: true, message: 'Please select pickup date' }]}
              >
                <DatePicker style={{ width: '100%' }} format="DD MMM YYYY" />
              </Form.Item>
            </Col>
            <Col xs={24}>
              <Form.Item label="Cargo Notes & Special Instructions" name="description">
                <TextArea rows={2} placeholder="Optional shipment details, volume, commodity specifications, temperature requirements..." />
              </Form.Item>
            </Col>
          </Row>

          <Divider />

          <Title level={5} style={{ color: '#0F172A', marginBottom: 16 }}>
            2. Auction Timings (12-Hour IST)
          </Title>
          <Row gutter={16}>
            <Col xs={24} md={8}>
              <Form.Item
                label="Bid Start Time"
                name="bid_start_time"
                rules={[{ required: true, message: 'Select bid start time' }]}
              >
                <DatePicker
                  showTime={{ use12Hours: true, format: 'hh:mm A' }}
                  style={{ width: '100%' }}
                  format="DD MMM YYYY, hh:mm A"
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item
                label="Bid Close Time"
                name="bid_close_time"
                rules={[{ required: true, message: 'Select bid close time' }]}
              >
                <DatePicker
                  showTime={{ use12Hours: true, format: 'hh:mm A' }}
                  style={{ width: '100%' }}
                  format="DD MMM YYYY, hh:mm A"
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item
                label="Forced Bid Close Time"
                name="forced_bid_close_time"
                extra="Strict hard ceiling. No extension can ever exceed this time."
                rules={[{ required: true, message: 'Select forced bid close time' }]}
              >
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
          <Alert
            message="British Auction Mechanism"
            description="If competitive carrier bidding activity occurs within the Trigger Window (X minutes before close), the auction is automatically extended by Extension Duration (Y minutes). The extension will never exceed the Forced Close Time."
            type="info"
            showIcon
            style={{ marginBottom: 20 }}
          />

          <Row gutter={16}>
            <Col xs={24} md={8}>
              <Form.Item
                label="Trigger Window (X Minutes)"
                name={['auction_config', 'trigger_window_mins']}
                extra="Monitors activity within last X minutes before close"
                rules={[{ required: true, message: 'Enter trigger window' }]}
              >
                <InputNumber min={1} max={120} style={{ width: '100%' }} addonAfter="mins" />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item
                label="Extension Duration (Y Minutes)"
                name={['auction_config', 'extension_mins']}
                extra="Time added to close time when condition met"
                rules={[{ required: true, message: 'Enter extension duration' }]}
              >
                <InputNumber min={1} max={60} style={{ width: '100%' }} addonAfter="mins" />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item
                label="Extension Trigger Condition"
                name={['auction_config', 'trigger_type']}
                extra="Defines what event triggers the extension"
                rules={[{ required: true, message: 'Select trigger condition' }]}
              >
                <Select
                  options={[
                    {
                      label: 'Bid Received in Last X Minutes',
                      value: 'BID_RECEIVED',
                    },
                    {
                      label: 'Any Supplier Rank Change in Last X Minutes',
                      value: 'ANY_RANK_CHANGE',
                    },
                    {
                      label: 'Lowest Bidder (L1) Rank Change in Last X Minutes',
                      value: 'L1_RANK_CHANGE',
                    },
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>

          <div style={{ marginTop: 24, textAlign: 'right' }}>
            <Button onClick={() => navigate('/rfqs')} style={{ marginRight: 12 }}>
              Cancel
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={submitting}
              style={{ background: '#2563EB', fontWeight: 600 }}
            >
              Create RFQ & Configure Auction
            </Button>
          </div>
        </Form>
      </Card>
    </div>
  );
}
