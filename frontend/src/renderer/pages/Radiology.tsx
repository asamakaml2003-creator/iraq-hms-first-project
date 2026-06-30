import React, { useEffect, useState, useCallback } from 'react';
import { Table, Button, Tag, Typography, Modal, Form, Input, message, Space } from 'antd';
import { labApi } from '../api/client';
import dayjs from 'dayjs';

const { Title } = Typography;

export default function Radiology() {
  const [orders, setOrders] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(false);
  const [reportModal, setReportModal] = useState<string | null>(null);
  const [reportForm] = Form.useForm();
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await labApi.radiologyOrders(); setOrders(r.data); }
    catch { message.error('Failed to load radiology orders'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleReport(values: Record<string, unknown>) {
    setSaving(true);
    try {
      await labApi.submitReport(reportModal!, values);
      message.success('Report submitted');
      setReportModal(null);
      reportForm.resetFields();
      load();
    } catch { message.error('Failed to submit report'); }
    finally { setSaving(false); }
  }

  const columns = [
    {
      title: 'Status', dataIndex: 'status', key: 'status',
      render: (v: unknown) => <Tag color={v === 'REPORTED' ? 'green' : v === 'IN_PROGRESS' ? 'blue' : 'default'}>{String(v)}</Tag>,
    },
    { title: 'Modality', dataIndex: 'modality', key: 'modality', render: (v: unknown) => <Tag color="purple">{String(v)}</Tag> },
    { title: 'Body Part', dataIndex: 'bodyPart', key: 'bodyPart' },
    {
      title: 'Ordered By', key: 'doctor',
      render: (_: unknown, r: Record<string, unknown>) => {
        const d = r.doctor as Record<string, unknown>;
        return `Dr. ${d?.firstName} ${d?.lastName}`;
      },
    },
    {
      title: 'Ordered', dataIndex: 'orderedAt', key: 'orderedAt',
      render: (v: unknown) => dayjs(String(v)).format('DD/MM/YY HH:mm'),
    },
    { title: 'Clinical Info', dataIndex: 'clinicalInfo', key: 'info', render: (v: unknown) => v ? String(v).slice(0, 60) : '—' },
    {
      title: 'Actions', key: 'actions',
      render: (_: unknown, r: Record<string, unknown>) => r.status !== 'REPORTED' && (
        <Button size="small" type="primary" onClick={() => setReportModal(String(r.id))}>
          Submit Report
        </Button>
      ),
    },
  ];

  return (
    <div>
      <div className="page-header">
        <Title level={4} style={{ margin: 0 }}>Radiology & Imaging</Title>
        <Space>
          <Tag>{orders.filter(o => o.status === 'ORDERED').length} Pending</Tag>
          <Tag color="green">{orders.filter(o => o.status === 'REPORTED').length} Reported</Tag>
        </Space>
      </div>

      <Table
        columns={columns}
        dataSource={orders}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 20 }}
      />

      <Modal
        title="Submit Radiology Report"
        open={!!reportModal}
        onCancel={() => { setReportModal(null); reportForm.resetFields(); }}
        onOk={() => reportForm.submit()}
        okText="Submit Report"
        confirmLoading={saving}
        width={600}
      >
        <Form form={reportForm} layout="vertical" onFinish={handleReport} style={{ marginTop: 8 }}>
          <Form.Item name="reportText" label="Radiological Report" rules={[{ required: true }]}>
            <Input.TextArea
              rows={6}
              placeholder="Describe the findings, impression, and recommendations..."
            />
          </Form.Item>
          <Form.Item name="imageUrls" label="Image URLs (one per line)">
            <Input.TextArea
              rows={3}
              placeholder="https://pacs.hospital.iq/study/..."
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
