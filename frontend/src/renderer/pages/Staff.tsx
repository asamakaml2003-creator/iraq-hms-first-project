import React, { useEffect, useState, useCallback } from 'react';
import {
  Table, Button, Input, Tag, Typography, Modal, Form,
  Select, Row, Col, message, Avatar, Space,
} from 'antd';
import { PlusOutlined, SearchOutlined, UserOutlined } from '@ant-design/icons';
import { staffApi, hospitalApi } from '../api/client';
import { getUser } from '../store/auth';
import type { ColumnsType } from 'antd/es/table';

const { Title } = Typography;
const { Option } = Select;

interface StaffMember {
  id: string;
  firstName: string;
  lastName: string;
  nameAr?: string;
  gender: string;
  specialty?: string;
  licenseNo?: string;
  phone: string;
  department?: { name: string; code: string };
}

const SPECIALTIES = [
  'General Medicine','Surgery','Anesthesiology','Cardiology','Neurology',
  'Pediatrics','Obstetrics & Gynecology','Orthopedics','Radiology',
  'Dermatology','Ophthalmology','ENT','Psychiatry','Dentistry',
  'Emergency Medicine','Nursing','Physiotherapy','Laboratory','Pharmacy',
];

interface Hospital { id: string; name: string; }

export default function Staff() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [form] = Form.useForm();
  const currentUser = getUser();
  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await staffApi.list({ search: search || undefined });
      setStaff(r.data);
    } catch { message.error('Failed to load staff'); }
    finally { setLoading(false); }
  }, [search]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (isSuperAdmin) {
      hospitalApi.list().then(r => setHospitals(r.data)).catch(() => {});
    }
  }, [isSuperAdmin]);

  async function handleCreate(values: Record<string, unknown>) {
    setSaving(true);
    try {
      await staffApi.create(values);
      message.success('Staff member added');
      setModalOpen(false);
      form.resetFields();
      load();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      message.error(err.response?.data?.error ?? 'Failed to add staff');
    } finally { setSaving(false); }
  }

  const roleColorMap: Record<string, string> = {
    DOCTOR: 'green', NURSE: 'blue', PHARMACIST: 'orange',
    LAB_TECHNICIAN: 'gold', RADIOLOGIST: 'red',
  };

  const columns: ColumnsType<StaffMember> = [
    {
      title: 'Staff Member', key: 'name',
      render: (_, r) => (
        <Space>
          <Avatar style={{ background: '#1a5276' }}>
            {r.firstName[0]}{r.lastName[0]}
          </Avatar>
          <div>
            <div style={{ fontWeight: 600 }}>{r.firstName} {r.lastName}</div>
            {r.nameAr && <div style={{ fontSize: 11, color: '#888', direction: 'rtl' }}>{r.nameAr}</div>}
          </div>
        </Space>
      ),
    },
    {
      title: 'Specialty', dataIndex: 'specialty', key: 'specialty',
      render: v => v ? <Tag color="geekblue">{v}</Tag> : '—',
    },
    {
      title: 'Department', key: 'department',
      render: (_, r) => r.department ? (
        <Tag>{r.department.name}</Tag>
      ) : '—',
    },
    {
      title: 'Gender', dataIndex: 'gender', key: 'gender',
      render: v => <Tag color={v === 'MALE' ? 'blue' : 'pink'}>{v}</Tag>,
    },
    { title: 'Phone', dataIndex: 'phone', key: 'phone' },
    { title: 'License No.', dataIndex: 'licenseNo', key: 'licenseNo', render: v => v ?? '—' },
  ];

  return (
    <div>
      <div className="page-header">
        <Title level={4} style={{ margin: 0 }}>Staff Directory</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
          Add Staff Member
        </Button>
      </div>

      <Input
        prefix={<SearchOutlined />}
        placeholder="Search by name or specialty..."
        style={{ marginBottom: 16, maxWidth: 400 }}
        allowClear
        onChange={e => setSearch(e.target.value)}
      />

      <Table
        columns={columns}
        dataSource={staff}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 25, showTotal: t => `${t} staff members` }}
      />

      <Modal
        title="Add Staff Member"
        open={modalOpen}
        onCancel={() => { setModalOpen(false); form.resetFields(); }}
        onOk={() => form.submit()}
        okText="Add"
        confirmLoading={saving}
        width={640}
      >
        <Form form={form} layout="vertical" onFinish={handleCreate} style={{ marginTop: 8 }}>
          <Row gutter={16}>
            {isSuperAdmin && (
              <Col span={24}>
                <Form.Item name="hospitalId" label="Hospital" rules={[{ required: true, message: 'Please select a hospital' }]}>
                  <Select placeholder="Select hospital" showSearch optionFilterProp="children">
                    {hospitals.map(h => <Option key={h.id} value={h.id}>{h.name}</Option>)}
                  </Select>
                </Form.Item>
              </Col>
            )}
            <Col span={12}>
              <Form.Item name="firstName" label="First Name" rules={[{ required: true }]}>
                <Input placeholder="Ali" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="lastName" label="Last Name" rules={[{ required: true }]}>
                <Input placeholder="Hassan" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="nameAr" label="Name (Arabic)">
                <Input placeholder="علي حسن" dir="rtl" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="gender" label="Gender" rules={[{ required: true }]}>
                <Select>
                  <Option value="MALE">Male</Option>
                  <Option value="FEMALE">Female</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="specialty" label="Specialty / Role">
                <Select showSearch placeholder="Select specialty...">
                  {SPECIALTIES.map(s => <Option key={s} value={s}>{s}</Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="licenseNo" label="Medical License No.">
                <Input placeholder="IQ-2024-XXXXX" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="phone" label="Phone" rules={[{ required: true }]}>
                <Input placeholder="07X-XXX-XXXX" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="email" label="Email">
                <Input placeholder="staff@hospital.iq" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
}
