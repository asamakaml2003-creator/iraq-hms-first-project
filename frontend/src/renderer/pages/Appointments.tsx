import React, { useEffect, useState, useCallback } from 'react';
import {
  Table, Button, Tag, Typography, Modal, Form, Select,
  DatePicker, Row, Col, message, Space,
} from 'antd';
import { PlusOutlined, CalendarOutlined } from '@ant-design/icons';
import { appointmentApi, patientApi, staffApi, hospitalApi } from '../api/client';
import { getUser } from '../store/auth';
import dayjs from 'dayjs';

const { Title } = Typography;
const { Option } = Select;

interface Hospital { id: string; name: string; }

export default function Appointments() {
  const [appointments, setAppointments] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState(false);
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [patients, setPatients] = useState<Record<string, unknown>[]>([]);
  const [doctors, setDoctors] = useState<Record<string, unknown>[]>([]);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [filterDate, setFilterDate] = useState(dayjs().format('YYYY-MM-DD'));
  const currentUser = getUser();
  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await appointmentApi.list({ date: filterDate });
      setAppointments(r.data);
    } catch { message.error('Failed to load appointments'); }
    finally { setLoading(false); }
  }, [filterDate]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    patientApi.list({ limit: 200 }).then(r => setPatients(r.data.patients)).catch(() => {});
    staffApi.list().then(r => setDoctors(r.data)).catch(() => {});
    if (isSuperAdmin) {
      hospitalApi.list().then(r => setHospitals(r.data)).catch(() => {});
    }
  }, [isSuperAdmin]);

  async function handleCreate(values: Record<string, unknown>) {
    setSaving(true);
    try {
      await appointmentApi.create({
        ...values,
        scheduledAt: dayjs(values.scheduledAt as string).toISOString(),
        duration: 30,
        departmentId: values.departmentId ?? undefined,
      });
      message.success('Appointment booked');
      setModal(false);
      form.resetFields();
      load();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      message.error(err.response?.data?.error ?? 'Failed to book appointment');
    } finally { setSaving(false); }
  }

  async function updateStatus(id: string, status: string) {
    try {
      await appointmentApi.update(id, { status });
      load();
    } catch { message.error('Failed to update status'); }
  }

  const statusColor: Record<string, string> = {
    PENDING: 'default', CONFIRMED: 'blue', IN_PROGRESS: 'processing',
    COMPLETED: 'success', CANCELLED: 'error',
  };

  const columns = [
    {
      title: 'Patient', key: 'patient',
      render: (_: unknown, r: Record<string, unknown>) => {
        const p = r.patient as Record<string, unknown>;
        return `${p?.firstName} ${p?.lastName}`;
      },
    },
    {
      title: 'Doctor', key: 'doctor',
      render: (_: unknown, r: Record<string, unknown>) => {
        const d = r.doctor as Record<string, unknown>;
        return `Dr. ${d?.firstName} ${d?.lastName}`;
      },
    },
    {
      title: 'Department', key: 'dept',
      render: (_: unknown, r: Record<string, unknown>) => String((r.department as Record<string, unknown>)?.name ?? '—'),
    },
    {
      title: 'Time', dataIndex: 'scheduledAt', key: 'time',
      render: (v: unknown) => dayjs(String(v)).format('DD/MM/YY HH:mm'),
    },
    {
      title: 'Status', dataIndex: 'status', key: 'status',
      render: (v: unknown) => <Tag color={statusColor[String(v)]}>{String(v)}</Tag>,
    },
    {
      title: 'Actions', key: 'actions',
      render: (_: unknown, r: Record<string, unknown>) => r.status !== 'COMPLETED' && r.status !== 'CANCELLED' && (
        <Space>
          {r.status === 'PENDING' && (
            <Button size="small" type="primary" onClick={() => updateStatus(String(r.id), 'CONFIRMED')}>
              Confirm
            </Button>
          )}
          {r.status === 'CONFIRMED' && (
            <Button size="small" onClick={() => updateStatus(String(r.id), 'COMPLETED')}>
              Complete
            </Button>
          )}
          <Button size="small" danger onClick={() => updateStatus(String(r.id), 'CANCELLED')}>
            Cancel
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div className="page-header">
        <Title level={4} style={{ margin: 0 }}>Appointments</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setModal(true)}>
          Book Appointment
        </Button>
      </div>

      <Space style={{ marginBottom: 16 }}>
        <CalendarOutlined />
        <DatePicker
          value={dayjs(filterDate)}
          onChange={d => d && setFilterDate(d.format('YYYY-MM-DD'))}
          format="DD MMM YYYY"
        />
        <Tag>{appointments.length} appointments</Tag>
      </Space>

      <Table
        columns={columns}
        dataSource={appointments}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 20 }}
      />

      <Modal
        title="Book Appointment"
        open={modal}
        onCancel={() => { setModal(false); form.resetFields(); }}
        onOk={() => form.submit()}
        confirmLoading={saving}
      >
        <Form form={form} layout="vertical" onFinish={handleCreate} style={{ marginTop: 8 }}>
          {isSuperAdmin && (
            <Form.Item name="hospitalId" label="Hospital" rules={[{ required: true, message: 'Please select a hospital' }]}>
              <Select placeholder="Select hospital" showSearch optionFilterProp="children">
                {hospitals.map(h => <Option key={h.id} value={h.id}>{h.name}</Option>)}
              </Select>
            </Form.Item>
          )}
          <Form.Item name="patientId" label="Patient" rules={[{ required: true }]}>
            <Select showSearch placeholder="Search patient..." filterOption={(i, o) =>
              String(o?.children ?? '').toLowerCase().includes(i.toLowerCase())
            }>
              {patients.map(p => (
                <Option key={String(p.id)} value={String(p.id)}>
                  {String(p.firstName)} {String(p.lastName)}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="doctorId" label="Doctor" rules={[{ required: true }]}>
            <Select showSearch placeholder="Select doctor..." filterOption={(i, o) =>
              String(o?.children ?? '').toLowerCase().includes(i.toLowerCase())
            }>
              {doctors.map(d => (
                <Option key={String(d.id)} value={String(d.id)}>
                  Dr. {String(d.firstName)} {String(d.lastName)} — {String(d.specialty ?? '')}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="scheduledAt" label="Date & Time" rules={[{ required: true }]}>
                <DatePicker showTime format="YYYY-MM-DD HH:mm" style={{ width: '100%' }} minuteStep={15} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="notes" label="Notes">
                <Form.Item noStyle name="notes">
                  <input style={{ width: '100%', border: '1px solid #d9d9d9', borderRadius: 6, padding: '4px 8px' }} placeholder="Optional notes" />
                </Form.Item>
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
}
