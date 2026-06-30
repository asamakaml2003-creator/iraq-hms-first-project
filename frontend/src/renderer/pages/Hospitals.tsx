import React, { useEffect, useState } from 'react';
import { Table, Button, Card, Tag, Typography, Modal, Form, Input, message, Statistic, Row, Col } from 'antd';
import { PlusOutlined, BankOutlined } from '@ant-design/icons';
import { hospitalApi } from '../api/client';

const { Title } = Typography;

export default function Hospitals() {
  const [hospitals, setHospitals] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState(false);
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try { const r = await hospitalApi.list(); setHospitals(r.data); }
    catch { message.error('Failed to load hospitals'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  async function handleCreate(values: Record<string, unknown>) {
    setSaving(true);
    try {
      await hospitalApi.create(values);
      message.success('Hospital added to network');
      setModal(false);
      form.resetFields();
      load();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      message.error(err.response?.data?.error ?? 'Failed to create hospital');
    } finally { setSaving(false); }
  }

  return (
    <div>
      <div className="page-header">
        <Title level={4} style={{ margin: 0 }}>Hospital Network</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setModal(true)}>
          Add Hospital
        </Button>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        {hospitals.map(h => (
          <Col key={String(h.id)} xs={24} md={12} lg={8}>
            <Card
              title={<><BankOutlined style={{ color: '#1a5276', marginRight: 8 }} />{String(h.name)}</>}
              extra={<Tag color="green">Active</Tag>}
            >
              <div style={{ color: '#666', fontSize: 13, marginBottom: 12 }}>{String(h.city)}, Iraq</div>
              <Row gutter={8}>
                <Col span={8}><Statistic title="Departments" value={Number((h._count as Record<string, unknown>)?.departments ?? 0)} valueStyle={{ fontSize: 20 }} /></Col>
                <Col span={8}><Statistic title="Staff" value={Number((h._count as Record<string, unknown>)?.staff ?? 0)} valueStyle={{ fontSize: 20 }} /></Col>
                <Col span={8}><Statistic title="Patients" value={Number((h._count as Record<string, unknown>)?.patients ?? 0)} valueStyle={{ fontSize: 20 }} /></Col>
              </Row>
              <div style={{ marginTop: 10, fontSize: 12, color: '#888' }}>
                {String(h.phone)} · {String(h.address)}
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      {hospitals.length === 0 && !loading && (
        <Card style={{ textAlign: 'center', padding: 40 }}>
          <BankOutlined style={{ fontSize: 48, color: '#ccc' }} />
          <div style={{ marginTop: 16, color: '#888' }}>No hospitals registered yet. Add the first one.</div>
        </Card>
      )}

      <Modal
        title="Add Hospital to Network"
        open={modal}
        onCancel={() => { setModal(false); form.resetFields(); }}
        onOk={() => form.submit()}
        confirmLoading={saving}
      >
        <Form form={form} layout="vertical" onFinish={handleCreate} style={{ marginTop: 8 }}>
          <Form.Item name="name" label="Hospital Name (English)" rules={[{ required: true }]}>
            <Input placeholder="Baghdad Teaching Hospital" />
          </Form.Item>
          <Form.Item name="nameAr" label="Hospital Name (Arabic)">
            <Input placeholder="مستشفى بغداد التعليمي" dir="rtl" />
          </Form.Item>
          <Form.Item name="city" label="City" rules={[{ required: true }]}>
            <Input placeholder="Baghdad" />
          </Form.Item>
          <Form.Item name="address" label="Full Address" rules={[{ required: true }]}>
            <Input placeholder="Al-Bab Al-Muadham, Baghdad" />
          </Form.Item>
          <Form.Item name="phone" label="Phone" rules={[{ required: true }]}>
            <Input placeholder="+964 1 XXX XXXX" />
          </Form.Item>
          <Form.Item name="email" label="Email">
            <Input placeholder="info@hospital.iq" />
          </Form.Item>
          <Form.Item name="licenseNo" label="Ministry of Health License No.">
            <Input placeholder="MOH-IQ-XXXXX" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
