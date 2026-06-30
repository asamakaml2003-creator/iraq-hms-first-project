import React, { useEffect, useState, useCallback } from 'react';
import {
  Table, Button, Tag, Typography, Modal, Form, Input,
  Select, Row, Col, message, Badge, Space, Checkbox,
} from 'antd';
import { PlusOutlined, ExperimentOutlined, WarningOutlined } from '@ant-design/icons';
import { labApi } from '../api/client';
import dayjs from 'dayjs';

const { Title } = Typography;
const { Option } = Select;

const COMMON_TESTS = [
  'CBC (Complete Blood Count)', 'CMP (Comprehensive Metabolic Panel)',
  'Urine Analysis', 'HbA1c', 'Lipid Panel', 'Thyroid Function (TSH)',
  'Liver Function Tests', 'Kidney Function (Creatinine, BUN)',
  'Blood Culture', 'Urine Culture', 'COVID-19 PCR',
  'Hepatitis B Surface Antigen', 'PT/INR', 'Troponin I',
];

export default function Laboratory() {
  const [orders, setOrders] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(false);
  const [resultModal, setResultModal] = useState<Record<string, unknown> | null>(null);
  const [resultForm] = Form.useForm();
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await labApi.orders();
      setOrders(r.data);
    } catch { message.error('Failed to load lab orders'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleSubmitResult(values: Record<string, unknown>) {
    setSaving(true);
    try {
      await labApi.submitResult({ testId: (resultModal as Record<string, unknown>).id, ...values });
      message.success('Result recorded');
      setResultModal(null);
      resultForm.resetFields();
      load();
    } catch { message.error('Failed to save result'); }
    finally { setSaving(false); }
  }

  const statusColor: Record<string, string> = {
    ORDERED: 'default', IN_PROGRESS: 'processing', COMPLETED: 'success', CRITICAL: 'error',
  };

  const columns = [
    {
      title: 'Order Status', dataIndex: 'status', key: 'status',
      render: (v: unknown) => (
        <Badge
          status={statusColor[String(v)] as 'default' | 'processing' | 'success' | 'error'}
          text={<Tag color={String(v) === 'CRITICAL' ? 'red' : undefined}>{String(v)}</Tag>}
        />
      ),
    },
    {
      title: 'Ordered By', key: 'doctor',
      render: (_: unknown, r: Record<string, unknown>) => {
        const doc = r.doctor as Record<string, unknown>;
        return `Dr. ${doc?.firstName} ${doc?.lastName}`;
      },
    },
    {
      title: 'Tests', key: 'tests',
      render: (_: unknown, r: Record<string, unknown>) => {
        const tests = r.tests as Record<string, unknown>[];
        return (
          <Space wrap>
            {tests.map(t => (
              <Tag
                key={String(t.id)}
                color={t.isCritical ? 'red' : t.result ? 'green' : 'default'}
                icon={t.isCritical ? <WarningOutlined /> : undefined}
                style={{ cursor: !t.result ? 'pointer' : 'default' }}
                onClick={() => !t.result && setResultModal(t)}
              >
                {String(t.testName)}
                {t.result && <span style={{ marginLeft: 4 }}>✓</span>}
              </Tag>
            ))}
          </Space>
        );
      },
    },
    { title: 'Priority', dataIndex: 'priority', key: 'priority', render: (v: unknown) => <Tag color={v === 'URGENT' ? 'red' : 'default'}>{String(v)}</Tag> },
    {
      title: 'Ordered At', dataIndex: 'orderedAt', key: 'orderedAt',
      render: (v: unknown) => dayjs(String(v)).format('DD/MM/YY HH:mm'),
    },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <Title level={4} style={{ margin: 0 }}>Laboratory</Title>
          <Space style={{ marginTop: 4 }}>
            <Tag>{orders.filter(o => o.status === 'ORDERED').length} Pending</Tag>
            <Tag color="green">{orders.filter(o => o.status === 'COMPLETED').length} Completed</Tag>
            <Tag color="red">{orders.filter(o => o.status === 'CRITICAL').length} Critical</Tag>
          </Space>
        </div>
      </div>

      <Table
        columns={columns}
        dataSource={orders}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 20 }}
        expandable={{
          expandedRowRender: (r: Record<string, unknown>) => {
            const tests = r.tests as Record<string, unknown>[];
            return (
              <Table
                size="small"
                dataSource={tests}
                rowKey="id"
                pagination={false}
                columns={[
                  { title: 'Test', dataIndex: 'testName' },
                  { title: 'Code', dataIndex: 'testCode', render: v => v ?? '—' },
                  { title: 'Result', dataIndex: 'result', render: v => v ? <b>{String(v)}</b> : <Tag>Pending</Tag> },
                  { title: 'Unit', dataIndex: 'unit', render: v => v ?? '—' },
                  { title: 'Reference Range', dataIndex: 'referenceRange', render: v => v ?? '—' },
                  {
                    title: 'Critical?', dataIndex: 'isCritical',
                    render: v => v ? <Tag color="red">CRITICAL</Tag> : <Tag color="green">Normal</Tag>,
                  },
                  {
                    title: '', key: 'action',
                    render: (_, row: Record<string, unknown>) => !row.result && (
                      <Button size="small" type="primary" onClick={() => setResultModal(row)}>
                        Enter Result
                      </Button>
                    ),
                  },
                ]}
              />
            );
          },
        }}
      />

      <Modal
        title={`Enter Result: ${resultModal?.testName ?? ''}`}
        open={!!resultModal}
        onCancel={() => { setResultModal(null); resultForm.resetFields(); }}
        onOk={() => resultForm.submit()}
        okText="Save Result"
        confirmLoading={saving}
      >
        <Form form={resultForm} layout="vertical" onFinish={handleSubmitResult} style={{ marginTop: 8 }}>
          <Form.Item name="result" label="Result Value" rules={[{ required: true }]}>
            <Input placeholder="e.g. 12.5" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="unit" label="Unit">
                <Input placeholder="g/dL" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="referenceRange" label="Reference Range">
                <Input placeholder="11.5 - 16.5" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="isCritical" valuePropName="checked">
            <Checkbox>
              <span style={{ color: '#c0392b', fontWeight: 600 }}>
                <WarningOutlined /> Mark as Critical Value (requires urgent physician notification)
              </span>
            </Checkbox>
          </Form.Item>
          <Form.Item name="performedBy" label="Performed By">
            <Input placeholder="Lab technician name" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
