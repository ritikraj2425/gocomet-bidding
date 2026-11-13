import React, { useEffect, useState } from 'react';
import {
  Card,
  Typography,
  Tabs,
  Form,
  Input,
  InputNumber,
  Select,
  Button,
  message,
  Divider,
  Alert,
  Spin,
} from 'antd';
import { SaveOutlined, ReloadOutlined } from '@ant-design/icons';
import { settingsApi } from '../api/client';
import type { Setting } from '../types';

const { Title, Text } = Typography;

export default function SettingsPage() {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [form] = Form.useForm();

  const loadSettings = async () => {
    setLoading(true);
    try {
      const res = await settingsApi.list();
      setSettings(res.data);
      const values: Record<string, string> = {};
      res.data.forEach((s: Setting) => {
        values[s.key] = s.value;
      });
      form.setFieldsValue(values);
    } catch {
      message.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSaveSetting = async (key: string) => {
    const value = form.getFieldValue(key);
    setSavingKey(key);
    try {
      await settingsApi.update(key, String(value));
      message.success(`Setting '${key}' updated successfully`);
      loadSettings();
    } catch {
      message.error(`Failed to update ${key}`);
    } finally {
      setSavingKey(null);
    }
  };

  const renderInput = (setting: Setting) => {
    if (setting.input_type === 'number') {
      return <InputNumber style={{ width: '100%' }} />;
    }
    if (setting.input_type === 'color') {
      return (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Input style={{ width: 120 }} />
          <input
            type="color"
            value={form.getFieldValue(setting.key) || '#2563EB'}
            onChange={(e) => form.setFieldValue(setting.key, e.target.value)}
            style={{ width: 36, height: 32, padding: 0, border: 'none', cursor: 'pointer' }}
          />
        </div>
      );
    }
    if (setting.key === 'default_trigger_type') {
      return (
        <Select
          options={[
            { label: 'Bid Received in Last X Minutes', value: 'BID_RECEIVED' },
            { label: 'Any Supplier Rank Change in Last X Minutes', value: 'ANY_RANK_CHANGE' },
            { label: 'Lowest Bidder (L1) Rank Change in Last X Minutes', value: 'L1_RANK_CHANGE' },
          ]}
        />
      );
    }
    return <Input />;
  };

  const renderGroup = (category: string) => {
    const groupSettings = settings.filter((s) => s.category === category);
    return (
      <div>
        {groupSettings.map((setting) => (
          <div
            key={setting.key}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              padding: '16px 0',
              borderBottom: '1px solid #F1F5F9',
            }}
          >
            <div style={{ flex: 1, paddingRight: 24 }}>
              <Text strong style={{ display: 'block', fontSize: 14, color: '#0F172A' }}>
                {setting.label}
              </Text>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Key: <span style={{ fontFamily: 'monospace' }}>{setting.key}</span>
              </Text>
              <div style={{ marginTop: 8, maxWidth: 360 }}>
                <Form.Item name={setting.key} noStyle>
                  {renderInput(setting)}
                </Form.Item>
              </div>
            </div>
            <Button
              icon={<SaveOutlined />}
              onClick={() => handleSaveSetting(setting.key)}
              loading={savingKey === setting.key}
              style={{ marginTop: 28 }}
            >
              Save
            </Button>
          </div>
        ))}
      </div>
    );
  };

  const tabItems = [
    {
      key: 'general',
      label: 'General & Localization',
      children: renderGroup('general'),
    },
    {
      key: 'auction',
      label: 'Default Auction Settings',
      children: renderGroup('auction'),
    },
    {
      key: 'theme',
      label: 'Theme & Brand Colors',
      children: renderGroup('theme'),
    },
  ];

  if (loading && settings.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 860, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <span className="page-kicker">Workspace · preferences and rules</span>
          <Title level={4} style={{ margin: 0, color: '#0F172A' }}>
            Platform settings
          </Title>
          <Text type="secondary" style={{ fontSize: 13 }}>
            Full control over platform variables, British Auction triggers, and theme values (no hardcoding)
          </Text>
        </div>
        <Button icon={<ReloadOutlined />} onClick={loadSettings}>
          Reload
        </Button>
      </div>

      <Alert
        message="Dynamic Configuration Enabled"
        description="All system rules, default trigger windows (X), extension durations (Y), currencies, and platform titles can be modified here by administrators in real-time."
        type="info"
        showIcon
        style={{ marginBottom: 20 }}
      />

      <Card bordered={false} style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <Form form={form} layout="vertical">
          <Tabs items={tabItems} />
        </Form>
      </Card>
    </div>
  );
}

