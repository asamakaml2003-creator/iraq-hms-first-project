import React, { useEffect, useState, useCallback } from 'react';
import {
  Table, Button, Tag, Typography, Modal, Form, Input,
  Select, Row, Col, message, Statistic, Card, InputNumber, Space,
} from 'antd';
import { PlusOutlined, DollarOutlined } from '@ant-design/icons';
import { billingApi } from '../api/client';
import dayjs from 'dayjs';

const { Title } = Typography;
const { Option } = Select;

export default function Billing() {
  const [invoices, setInvoices] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(false);
  const [payModal, setPayModal] = useState<Record<string, unknown> | null>(null);
  const [payForm] = Form.useForm();
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await billingApi.invoices();
      setInvoices(r.data.invoices);
    } catch { message.error('Failed to load invoices'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const totalRevenue = invoices.reduce((s, i) => s + Number(i.paidAmount), 0);
  const unpaidTotal = invoices.filter(i => i.paymentStatus !== 'PAID').reduce((s, i) => s + (Number(i.totalAmount) - Number(i.paidAmount)), 0);

  async function handlePay(values: Record<string, unknown>) {
    setSaving(true);
    try {
      await billingApi.pay({ invoiceId: String((payModal as Record<string, unknown>).id), ...values });
      message.success('Payment recorded');
      setPayModal(null);
      payForm.resetFields();
      load();
    } catch { message.error('Failed to record payment'); }
    finally { setSaving(false); }
  }

  const statusColor: Record<string, string> = {
    PAID: 'green', UNPAID: 'red', PARTIAL: 'orange', INSURANCE: 'blue',
  };

  const columns = [
    { title: 'Invoice No.', dataIndex: 'invoiceNo', key: 'invoiceNo', render: (v: unknown) => <b>{String(v)}</b> },
    {
      title: 'Patient', key: 'patient',
      render: (_: unknown, r: Record<string, unknown>) => {
        const p = r.patient as Record<string, unknown>;
        return `${p?.firstName} ${p?.lastName}`;
      },
    },
    {
      title: 'Total (IQD)', dataIndex: 'totalAmount', key: 'total',
      render: (v: unknown) => Number(v).toLocaleString(),
    },
    {
      title: 'Paid (IQD)', dataIndex: 'paidAmount', key: 'paid',
      render: (v: unknown) => <span style={{ color: '#27ae60' }}>{Number(v).toLocaleString()}</span>,
    },
    {
      title: 'Status', dataIndex: 'paymentStatus', key: 'status',
      render: (v: unknown) => <Tag color={statusColor[String(v)]}>{String(v)}</Tag>,
    },
    {
      title: 'Date', dataIndex: 'issuedAt', key: 'date',
      render: (v: unknown) => dayjs(String(v)).format('DD/MM/YY'),
    },
    {
      title: 'Actions', key: 'actions',
      render: (_: unknown, r: Record<string, unknown>) => r.paymentStatus !== 'PAID' && (
        <Button
          size="small"
          type="primary"
          icon={<DollarOutlined />}
          onClick={() => setPayModal(r)}
        >
          Record Payment
        </Button>
      ),
    },
  ];

  return (
    <div>
      <div className="page-header">
        <Title level={4} style={{ margin: 0 }}>Billing & Finance</Title>
      </div>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card className="stat-card">
            <Statistic title="Total Revenue (IQD)" value={totalRevenue} precision={0}
              prefix={<DollarOutlined />} valueStyle={{ color: '#27ae60' }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="stat-card">
            <Statistic title="Outstanding (IQD)" value={unpaidTotal} precision={0}
              prefix={<DollarOutlined />} valueStyle={{ color: '#c0392b' }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="stat-card">
            <Statistic title="Paid Invoices" value={invoices.filter(i => i.paymentStatus === 'PAID').length} />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="stat-card">
            <Statistic title="Unpaid Invoices" value={invoices.filter(i => i.paymentStatus === 'UNPAID').length}
              valueStyle={{ color: '#c0392b' }} />
          </Card>
        </Col>
      </Row>

      <Table
        columns={columns}
        dataSource={invoices}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 20, showTotal: t => `${t} invoices` }}
        expandable={{
          expandedRowRender: (r: Record<string, unknown>) => {
            const items = r.items as Record<string, unknown>[];
            return (
              <Table
                size="small"
                dataSource={items}
                rowKey="id"
                pagination={false}
                columns={[
                  { title: 'Description', dataIndex: 'description' },
                  { title: 'Category', dataIndex: 'category' },
                  { title: 'Qty', dataIndex: 'quantity' },
                  { title: 'Unit Price', dataIndex: 'unitPrice', render: (v: unknown) => Number(v).toLocaleString() },
                  { title: 'Total', dataIndex: 'totalPrice', render: (v: unknown) => <b>{Number(v).toLocaleString()}</b> },
                ]}
              />
            );
          },
        }}
      />

      <Modal
        title={`Record Payment — ${String((payModal as Record<string, unknown>)?.invoiceNo ?? '')}`}
        open={!!payModal}
        onCancel={() => { setPayModal(null); payForm.resetFields(); }}
        onOk={() => payForm.submit()}
        okText="Record Payment"
        confirmLoading={saving}
      >
        {payModal && (
          <div style={{ marginBottom: 16 }}>
            <Space>
              <span>Total: <b>{Number(payModal.totalAmount).toLocaleString()} IQD</b></span>
              <span>· Paid: <b style={{ color: '#27ae60' }}>{Number(payModal.paidAmount).toLocaleString()} IQD</b></span>
              <span>· Remaining: <b style={{ color: '#c0392b' }}>
                {(Number(payModal.totalAmount) - Number(payModal.paidAmount)).toLocaleString()} IQD
              </b></span>
            </Space>
          </div>
        )}
        <Form form={payForm} layout="vertical" onFinish={handlePay} style={{ marginTop: 8 }}>
          <Form.Item name="amount" label="Payment Amount (IQD)" rules={[{ required: true }]}>
            <InputNumber style={{ width: '100%' }} min={0} formatter={v => String(v).replace(/\B(?=(\d{3})+(?!\d))/g, ',')} />
          </Form.Item>
          <Form.Item name="method" label="Payment Method" rules={[{ required: true }]}>
            <Select>
              <Option value="CASH">Cash (نقدي)</Option>
              <Option value="CARD">Credit/Debit Card</Option>
              <Option value="INSURANCE">Insurance</Option>
              <Option value="TRANSFER">Bank Transfer</Option>
            </Select>
          </Form.Item>
          <Form.Item name="reference" label="Reference / Receipt No.">
            <Input placeholder="Optional" />
          </Form.Item>
          <Form.Item name="notes" label="Notes">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
