import React, { useEffect, useState, useCallback } from 'react';
import {
  Table, Button, Input, Space, Tag, Typography, Modal, Form,
  Select, DatePicker, Row, Col, Tooltip, message
} from 'antd';
import {
  PlusOutlined, SearchOutlined, EyeOutlined,
  UserOutlined, QrcodeOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { patientApi, hospitalApi } from '../api/client';
import { getUser } from '../store/auth';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';

const { Title } = Typography;
const { Option } = Select;

interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  nameAr?: string;
  nationalId?: string;
  gender: string;
  dateOfBirth: string;
  bloodType: string;
  phone?: string;
  qrCode?: string;
  _count?: { visits: number };
}

const BLOOD_TYPES = ['A_POS','A_NEG','B_POS','B_NEG','AB_POS','AB_NEG','O_POS','O_NEG','UNKNOWN'];
const BLOOD_LABELS: Record<string, string> = {
  A_POS:'A+', A_NEG:'A-', B_POS:'B+', B_NEG:'B-',
  AB_POS:'AB+', AB_NEG:'AB-', O_POS:'O+', O_NEG:'O-', UNKNOWN:'?'
};

interface Hospital { id: string; name: string; }

export default function Patients() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const currentUser = getUser();
  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await patientApi.list({ search, page, limit: 20 });
      setPatients(r.data.patients);
      setTotal(r.data.total);
    } catch {
      message.error('Failed to load patients');
    } finally { setLoading(false); }
  }, [search, page]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (isSuperAdmin) {
      hospitalApi.list().then(r => setHospitals(r.data)).catch(() => {});
    }
  }, [isSuperAdmin]);

  async function handleCreate(values: Record<string, unknown>) {
    setSaving(true);
    try {
      await patientApi.create({
        ...values,
        dateOfBirth: dayjs(values.dateOfBirth as string).format('YYYY-MM-DD'),
        chronicDiseases: [], allergies: [], pastSurgeries: [], currentMedications: [],
      });
      message.success('Patient registered successfully');
      setModalOpen(false);
      form.resetFields();
      load();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      message.error(err.response?.data?.error ?? 'Failed to register patient');
    } finally { setSaving(false); }
  }

  const columns: ColumnsType<Patient> = [
    {
      title: 'Name',
      key: 'name',
      render: (_, r) => (
        <Space>
          <UserOutlined style={{ color: '#1a5276' }} />
          <div>
            <div style={{ fontWeight: 600 }}>{r.firstName} {r.lastName}</div>
            {r.nameAr && <div style={{ fontSize: 11, color: '#888' }}>{r.nameAr}</div>}
          </div>
        </Space>
      ),
    },
    { title: 'National ID', dataIndex: 'nationalId', key: 'nationalId', render: v => v ?? '—' },
    {
      title: 'Gender', dataIndex: 'gender', key: 'gender',
      render: v => <Tag color={v === 'MALE' ? 'blue' : 'pink'}>{v}</Tag>,
    },
    {
      title: 'Age', dataIndex: 'dateOfBirth', key: 'age',
      render: dob => {
        const age = dayjs().diff(dayjs(dob), 'year');
        return `${age} yrs`;
      },
    },
    {
      title: 'Blood Type', dataIndex: 'bloodType', key: 'bloodType',
      render: v => <Tag color="red">{BLOOD_LABELS[v] ?? v}</Tag>,
    },
    { title: 'Phone', dataIndex: 'phone', key: 'phone', render: v => v ?? '—' },
    {
      title: 'Visits', key: 'visits',
      render: (_, r) => <Tag>{r._count?.visits ?? 0} visits</Tag>,
    },
    {
      title: 'Actions', key: 'actions',
      render: (_, r) => (
        <Space>
          <Tooltip title="View Full Record">
            <Button
              type="primary" size="small" icon={<EyeOutlined />}
              onClick={() => navigate(`/patients/${r.id}`)}
            >
              View
            </Button>
          </Tooltip>
          {r.qrCode && (
            <Tooltip title={`QR: ${r.qrCode}`}>
              <Button size="small" icon={<QrcodeOutlined />} />
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div className="page-header">
        <Title level={4} style={{ margin: 0 }}>Patients</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
          Register Patient
        </Button>
      </div>

      <Input
        prefix={<SearchOutlined />}
        placeholder="Search by name, national ID, or phone..."
        style={{ marginBottom: 16, maxWidth: 400 }}
        allowClear
        onChange={e => { setSearch(e.target.value); setPage(1); }}
      />

      <Table
        columns={columns}
        dataSource={patients}
        rowKey="id"
        loading={loading}
        pagination={{
          total, pageSize: 20, current: page,
          onChange: p => setPage(p),
          showTotal: (t) => `${t} patients`,
        }}
        onRow={r => ({ onDoubleClick: () => navigate(`/patients/${r.id}`) })}
      />

      <Modal
        title="Register New Patient"
        open={modalOpen}
        onCancel={() => { setModalOpen(false); form.resetFields(); }}
        onOk={() => form.submit()}
        okText="Register"
        confirmLoading={saving}
        width={700}
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
              <Form.Item name="firstName" label="First Name (EN)" rules={[{ required: true }]}>
                <Input placeholder="Ahmed" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="lastName" label="Last Name (EN)" rules={[{ required: true }]}>
                <Input placeholder="Al-Rashidi" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="nameAr" label="Full Name (Arabic)">
                <Input placeholder="أحمد الراشدي" dir="rtl" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="nationalId" label="National ID">
                <Input placeholder="3000123456789" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="gender" label="Gender" rules={[{ required: true }]}>
                <Select>
                  <Option value="MALE">Male</Option>
                  <Option value="FEMALE">Female</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="dateOfBirth" label="Date of Birth" rules={[{ required: true }]}>
                <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="bloodType" label="Blood Type" initialValue="UNKNOWN">
                <Select>
                  {BLOOD_TYPES.map(bt => (
                    <Option key={bt} value={bt}>{BLOOD_LABELS[bt]}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="phone" label="Phone">
                <Input placeholder="07X-XXX-XXXX" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="email" label="Email">
                <Input placeholder="patient@email.com" />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item name="address" label="Address">
                <Input placeholder="Baghdad, Al-Karrada..." />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="emergencyContact" label="Emergency Contact Name">
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="emergencyPhone" label="Emergency Contact Phone">
                <Input />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
}
