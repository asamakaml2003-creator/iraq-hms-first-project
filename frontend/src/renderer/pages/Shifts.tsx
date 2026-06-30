import React, { useEffect, useState, useCallback } from 'react';
import {
  Table, Button, Typography, Tag, Space, Modal, Form,
  Select, DatePicker, TimePicker, message, Card, Row, Col,
} from 'antd';
import { PlusOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { shiftApi, staffApi } from '../api/client';
import dayjs from 'dayjs';

const { Title } = Typography;
const { Option } = Select;

interface Shift {
  id: string;
  shiftType: string;
  date: string;
  startTime: string;
  endTime: string;
  staff: { id: string; firstName: string; lastName: string; specialty?: string };
  attendances: { id: string; clockIn?: string; clockOut?: string }[];
}

export default function Shifts() {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();
  const [staffList, setStaffList] = useState<{ id: string; firstName: string; lastName: string }[]>([]);
  const [filterDate, setFilterDate] = useState(dayjs().format('YYYY-MM-DD'));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await shiftApi.list({ date: filterDate });
      setShifts(r.data);
    } catch { message.error('Failed to load shifts'); }
    finally { setLoading(false); }
  }, [filterDate]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    staffApi.list().then(r => setStaffList(r.data)).catch(() => {});
  }, []);

  async function handleCreate(values: Record<string, unknown>) {
    setSaving(true);
    try {
      await shiftApi.create({
        ...values,
        date: dayjs(values.date as string).format('YYYY-MM-DD'),
        startTime: dayjs(values.startTime as string).format('HH:mm'),
        endTime: dayjs(values.endTime as string).format('HH:mm'),
      });
      message.success('Shift assigned');
      setModalOpen(false);
      form.resetFields();
      load();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      message.error(err.response?.data?.error ?? 'Failed to assign shift');
    } finally { setSaving(false); }
  }

  const shiftColor: Record<string, string> = {
    MORNING: 'gold', EVENING: 'orange', NIGHT: 'purple',
  };

  const columns = [
    {
      title: 'Staff Member', key: 'staff',
      render: (_: unknown, r: Shift) => (
        <div>
          <div style={{ fontWeight: 600 }}>{r.staff.firstName} {r.staff.lastName}</div>
          {r.staff.specialty && <div style={{ fontSize: 11, color: '#888' }}>{r.staff.specialty}</div>}
        </div>
      ),
    },
    {
      title: 'Shift', dataIndex: 'shiftType', key: 'shiftType',
      render: (v: string) => <Tag color={shiftColor[v]}>{v}</Tag>,
    },
    {
      title: 'Date', dataIndex: 'date', key: 'date',
      render: (v: string) => dayjs(v).format('DD MMM YYYY'),
    },
    {
      title: 'Hours', key: 'hours',
      render: (_: unknown, r: Shift) => `${r.startTime} – ${r.endTime}`,
    },
    {
      title: 'Clock In', key: 'clockIn',
      render: (_: unknown, r: Shift) => {
        const att = r.attendances?.[0];
        return att?.clockIn ? (
          <Tag color="green">{dayjs(att.clockIn).format('HH:mm')}</Tag>
        ) : <Tag color="default">Not yet</Tag>;
      },
    },
    {
      title: 'Clock Out', key: 'clockOut',
      render: (_: unknown, r: Shift) => {
        const att = r.attendances?.[0];
        return att?.clockOut ? (
          <Tag color="blue">{dayjs(att.clockOut).format('HH:mm')}</Tag>
        ) : <Tag color="default">—</Tag>;
      },
    },
    {
      title: 'Status', key: 'status',
      render: (_: unknown, r: Shift) => {
        const att = r.attendances?.[0];
        if (!att?.clockIn) return <Tag>Scheduled</Tag>;
        if (att.clockIn && !att.clockOut) return <Tag color="green">On Duty</Tag>;
        return <Tag color="blue">Completed</Tag>;
      },
    },
  ];

  return (
    <div>
      <div className="page-header">
        <Title level={4} style={{ margin: 0 }}>Shift Scheduling & Attendance</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
          Assign Shift
        </Button>
      </div>

      <Card style={{ marginBottom: 16 }}>
        <Row align="middle" gutter={16}>
          <Col>
            <ClockCircleOutlined style={{ fontSize: 16, color: '#1a5276' }} />
            <span style={{ marginLeft: 8, fontWeight: 600 }}>View Roster For:</span>
          </Col>
          <Col>
            <DatePicker
              value={dayjs(filterDate)}
              onChange={d => d && setFilterDate(d.format('YYYY-MM-DD'))}
              format="DD MMM YYYY"
            />
          </Col>
          <Col>
            <Tag color="green">{shifts.filter(s => s.attendances?.[0]?.clockIn && !s.attendances?.[0]?.clockOut).length} On Duty</Tag>
            <Tag color="gold">{shifts.filter(s => !s.attendances?.[0]?.clockIn).length} Scheduled</Tag>
            <Tag color="blue">{shifts.filter(s => s.attendances?.[0]?.clockOut).length} Completed</Tag>
          </Col>
        </Row>
      </Card>

      <Table
        columns={columns}
        dataSource={shifts}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 25 }}
      />

      <Modal
        title="Assign Shift"
        open={modalOpen}
        onCancel={() => { setModalOpen(false); form.resetFields(); }}
        onOk={() => form.submit()}
        okText="Assign"
        confirmLoading={saving}
      >
        <Form form={form} layout="vertical" onFinish={handleCreate} style={{ marginTop: 8 }}>
          <Form.Item name="staffId" label="Staff Member" rules={[{ required: true }]}>
            <Select
              showSearch
              placeholder="Search staff..."
              filterOption={(input, option) =>
                String(option?.children ?? '').toLowerCase().includes(input.toLowerCase())
              }
            >
              {staffList.map(s => (
                <Option key={s.id} value={s.id}>{s.firstName} {s.lastName}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="shiftType" label="Shift Type" rules={[{ required: true }]}>
            <Select>
              <Option value="MORNING">Morning (صباحية)</Option>
              <Option value="EVENING">Evening (مسائية)</Option>
              <Option value="NIGHT">Night (ليلية)</Option>
            </Select>
          </Form.Item>
          <Form.Item name="date" label="Date" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="startTime" label="Start Time" rules={[{ required: true }]}>
                <TimePicker format="HH:mm" style={{ width: '100%' }} minuteStep={15} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="endTime" label="End Time" rules={[{ required: true }]}>
                <TimePicker format="HH:mm" style={{ width: '100%' }} minuteStep={15} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
}
