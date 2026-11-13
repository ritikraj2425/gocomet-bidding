import React, { useEffect, useState } from 'react';
import {
  Table,
  Button,
  Card,
  Typography,
  Tag,
  Space,
  Modal,
  Form,
  Input,
  message,
  Popconfirm,
  Badge,
  Input as AntInput,
  Row,
  Col,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  StopOutlined,
  CheckCircleOutlined,
  SearchOutlined,
  ReloadOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { usersApi } from '../api/client';
import { formatDate } from '../utils/time';
import type { User } from '../types';

const { Title, Text } = Typography;

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<User[]>([]);
  const [filteredSuppliers, setFilteredSuppliers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [form] = Form.useForm();

  const loadSuppliers = async () => {
    setLoading(true);
    try {
      const res = await usersApi.list({ role: 'SUPPLIER' });
      setSuppliers(res.data);
      applyFilter(res.data, searchQuery);
    } catch {
      message.error('Failed to load registered suppliers');
    } finally {
      setLoading(false);
    }
  };

  const applyFilter = (data: User[], q: string) => {
    if (!q.trim()) {
      setFilteredSuppliers(data);
      return;
    }
    const lower = q.toLowerCase();
    const filtered = data.filter(
      (s) =>
        s.name.toLowerCase().includes(lower) ||
        (s.company && s.company.toLowerCase().includes(lower)) ||
        s.email.toLowerCase().includes(lower)
    );
    setFilteredSuppliers(filtered);
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    applyFilter(suppliers, val);
  };

  useEffect(() => {
    loadSuppliers();
  }, []);

  const handleOpenAdd = () => {
    setEditingUser(null);
    form.resetFields();
    setIsModalOpen(true);
  };

  const handleOpenEdit = (user: User) => {
    setEditingUser(user);
    form.setFieldsValue({
      name: user.name,
      company: user.company,
      phone: user.phone,
    });
    setIsModalOpen(true);
  };

  const handleSave = async (values: any) => {
    try {
      if (editingUser) {
        await usersApi.update(editingUser.id, values);
        message.success(`Supplier '${editingUser.name}' updated successfully`);
      } else {
        await usersApi.create({
          ...values,
          role: 'SUPPLIER',
        });
        message.success('New supplier registered successfully');
      }
      setIsModalOpen(false);
      loadSuppliers();
    } catch (err: any) {
      message.error(err.response?.data?.detail || 'Operation failed');
    }
  };

  const handleToggleStatus = async (user: User) => {
    try {
      const action = user.is_active ? 'deactivated' : 'reactivated';
      await usersApi.toggleStatus(user.id);
      message.success(`Supplier '${user.name}' has been ${action}`);
      loadSuppliers();
    } catch {
      message.error('Failed to change supplier status');
    }
  };

  const activeCount = suppliers.filter((s) => s.is_active).length;
  const deactivatedCount = suppliers.filter((s) => !s.is_active).length;

  const columns = [
    {
      title: 'Carrier / Supplier',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: User) => (
        <div>
          <div style={{ fontWeight: 600, color: '#0F172A' }}>{name}</div>
          <div style={{ fontSize: 12, color: '#64748B' }}>{record.email}</div>
        </div>
      ),
    },
    {
      title: 'Company Fleet',
      dataIndex: 'company',
      key: 'company',
      render: (c: string) => (
        <span style={{ fontWeight: 500, color: '#1E293B' }}>{c || 'Independent Carrier'}</span>
      ),
    },
    {
      title: 'Phone Contact',
      dataIndex: 'phone',
      key: 'phone',
      render: (p: string) => <span style={{ color: '#475569' }}>{p || 'Not provided'}</span>,
    },
    {
      title: 'Status',
      dataIndex: 'is_active',
      key: 'is_active',
      render: (active: boolean) =>
        active ? (
          <Tag color="success" style={{ fontWeight: 600 }}>
            Active
          </Tag>
        ) : (
          <Tag color="error" style={{ fontWeight: 600 }}>
            Deactivated
          </Tag>
        ),
    },
    {
      title: 'Joined Date',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (d: string) => formatDate(d),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: unknown, record: User) => (
        <Space size="small">
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleOpenEdit(record)}
          >
            Edit
          </Button>
          {record.is_active ? (
            <Popconfirm
              title="Deactivate Supplier Account?"
              description="This carrier will immediately lose access to participate in auctions."
              onConfirm={() => handleToggleStatus(record)}
              okText="Deactivate"
              cancelText="Cancel"
              okButtonProps={{ danger: true }}
            >
              <Button size="small" danger icon={<StopOutlined />}>
                Deactivate
              </Button>
            </Popconfirm>
          ) : (
            <Popconfirm
              title="Reactivate Supplier Account?"
              description="This carrier will regain access to participate and submit competitive quotes."
              onConfirm={() => handleToggleStatus(record)}
              okText="Reactivate"
              cancelText="Cancel"
            >
              <Button
                size="small"
                type="primary"
                style={{ background: '#059669', borderColor: '#059669' }}
                icon={<CheckCircleOutlined />}
              >
                Reactivate
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
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
        <div>
          <span className="page-kicker">Network · access and participation</span>
          <Title level={4} style={{ margin: 0, color: '#0F172A', fontWeight: 700 }}>
            Carrier network
          </Title>
          <Text type="secondary" style={{ fontSize: 13 }}>
            Manage authorized carriers, review access status, and control auction participation
          </Text>
        </div>
        <Space wrap>
          <Button icon={<ReloadOutlined />} onClick={loadSuppliers}>
            Refresh
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleOpenAdd}
            style={{ background: '#2563EB' }}
          >
            Add Carrier
          </Button>
        </Space>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={24} sm={8}>
          <Card bordered={false} style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div style={{ color: '#64748B', fontSize: 13 }}>Total Suppliers</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#0F172A', marginTop: 4 }}>
              {suppliers.length}
            </div>
          </Card>
        </Col>
        <Col xs={12} sm={8}>
          <Card bordered={false} style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div style={{ color: '#64748B', fontSize: 13 }}>Active Accounts</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#059669', marginTop: 4 }}>
              {activeCount}
            </div>
          </Card>
        </Col>
        <Col xs={12} sm={8}>
          <Card bordered={false} style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div style={{ color: '#64748B', fontSize: 13 }}>Deactivated Accounts</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#DC2626', marginTop: 4 }}>
              {deactivatedCount}
            </div>
          </Card>
        </Col>
      </Row>

      <Card bordered={false} style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div style={{ marginBottom: 16, maxWidth: 360 }}>
          <AntInput
            prefix={<SearchOutlined style={{ color: '#94A3B8' }} />}
            placeholder="Search by carrier name, company or email..."
            value={searchQuery}
            onChange={handleSearch}
            allowClear
          />
        </div>

        <Table
          dataSource={filteredSuppliers}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
          scroll={{ x: 'max-content' }}
          locale={{ emptyText: 'No suppliers found' }}
        />
      </Card>

      <Modal
        title={editingUser ? `Edit Carrier: ${editingUser.name}` : 'Register New Carrier Partner'}
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleSave}>
          <Form.Item
            label="Contact Person Name"
            name="name"
            rules={[{ required: true, message: 'Please enter contact person name' }]}
          >
            <Input placeholder="e.g. Ramesh Kumar" />
          </Form.Item>

          {!editingUser && (
            <>
              <Form.Item
                label="Business Email"
                name="email"
                rules={[
                  { required: true, message: 'Please enter business email' },
                  { type: 'email', message: 'Enter a valid email address' },
                ]}
              >
                <Input placeholder="carrier@logistics.com" />
              </Form.Item>
              <Form.Item
                label="Temporary Password"
                name="password"
                rules={[{ required: true, min: 6, message: 'Password must be at least 6 characters' }]}
              >
                <Input.Password placeholder="Enter initial password" />
              </Form.Item>
            </>
          )}

          <Form.Item
            label="Company / Fleet Name"
            name="company"
            rules={[{ required: true, message: 'Please enter company or fleet name' }]}
          >
            <Input placeholder="e.g. TransIndia Logistics Corp" />
          </Form.Item>

          <Form.Item label="Phone Contact" name="phone">
            <Input placeholder="+91 98765 43210" />
          </Form.Item>

          <div style={{ textAlign: 'right', marginTop: 24 }}>
            <Button onClick={() => setIsModalOpen(false)} style={{ marginRight: 8 }}>
              Cancel
            </Button>
            <Button type="primary" htmlType="submit" style={{ background: '#2563EB' }}>
              {editingUser ? 'Update Supplier' : 'Register Carrier'}
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
