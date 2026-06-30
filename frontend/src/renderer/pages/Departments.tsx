import React, { useEffect, useState } from 'react';
import { Table, Button, Tag, Typography, Modal, Form, Input, Select, message, Row, Col, Card, Statistic } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { hospitalApi } from '../api/client';
import { getUser } from '../store/auth';

const { Title } = Typography;
const { Option } = Select;

const DEPT_CODES = [
  ['ER','Emergency'], ['GEN','General Medicine'], ['SURG','Surgery'],
  ['OBG','Obstetrics & Gynecology'], ['PED','Pediatrics'], ['ICU','Intensive Care'],
  ['ANES','Anesthesiology'], ['DENT','Dentistry'], ['NEUR','Neurology'],
  ['PSYCH','Psychiatry'], ['DERM','Dermatology'], ['OPTH','Ophthalmology'],
  ['ENT','ENT'], ['RADIO','Radiology'], ['LAB','Laboratory'],
  ['PHARM','Pharmacy'], ['NURS','Nursing'], ['PHYSIO','Physiotherapy'], ['ADMIN','Administrative'],
];

interface Hospital { id: string; name: string; }

export default function Departments() {
  const [depts, setDepts] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState(false);
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const currentUser = getUser();
  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';

  const load = async () => {
    setLoading(true);
    try { const r = await hospitalApi.departments(); setDepts(r.data); }
    catch { message.error('Failed to load departments'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (isSuperAdmin) {
      hospitalApi.list().then(r => setHospitals(r.data)).catch(() => {});
    }
  }, [isSuperAdmin]);

  async function handleCreate(values: Record<string, unknown>) {
    setSaving(true);
    try {
      // The name Select's value is "CODE||Name" — extract just the name part
      const nameRaw = String(values.name ?? '');
      const name = nameRaw.includes('||') ? nameRaw.split('||')[1] : nameRaw;
      await hospitalApi.createDepartment({ ...values, name });
      message.success('Department created');
      setModal(false);
      form.resetFields();
      load();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      message.error(err.response?.data?.error ?? 'Failed to create department');
    } finally { setSaving(false); }
  }

  return (
    <div>
      <div className="page-header">
        <Title level={4} style={{ margin: 0 }}>Departments</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setModal(true)}>
          Add Department
        </Button>
      </div>

      <Row gutter={[16, 16]}>
        {depts.map(d => (
          <Col key={String(d.id)} xs={24} sm={12} md={8} lg={6}>
            <Card size="small" style={{ borderTop: '3px solid #1a5276' }}>
              <div style={{ fontWeight: 700, color: '#1a5276', marginBottom: 4 }}>{String(d.name)}</div>
              <Tag style={{ marginBottom: 8 }}>{String(d.code)}</Tag>
              <Row gutter={8}>
                <Col span={8}><Statistic title="Beds" value={Number((d._count as Record<string, unknown>)?.beds ?? 0)} valueStyle={{ fontSize: 16 }} /></Col>
                <Col span={8}><Statistic title="Staff" value={Number((d._count as Record<string, unknown>)?.staff ?? 0)} valueStyle={{ fontSize: 16 }} /></Col>
                <Col span={8}><Statistic title="Visits" value={Number((d._count as Record<string, unknown>)?.visits ?? 0)} valueStyle={{ fontSize: 16 }} /></Col>
              </Row>
            </Card>
          </Col>
        ))}
      </Row>

      {depts.length === 0 && !loading && (
        <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>
          No departments yet. Add the first department.
        </div>
      )}

      <Modal
        title="Add Department"
        open={modal}
        onCancel={() => { setModal(false); form.resetFields(); }}
        onOk={() => form.submit()}
        confirmLoading={saving}
      >
        <Form form={form} layout="vertical" onFinish={handleCreate} style={{ marginTop: 8 }}>
          <Form.Item name="name" label="Department Name" rules={[{ required: true }]}>
            <Select showSearch placeholder="Select department type..." onChange={(_, opt: unknown) => {
              const [code] = String((opt as { value: string }).value ?? '').split('||');
              form.setFieldValue('code', code);
            }}>
              {DEPT_CODES.map(([code, name]) => (
                <Option key={code} value={`${code}||${name}`}>{name}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="code" label="Department Code" rules={[{ required: true }]}>
            <Input placeholder="e.g. ER" style={{ textTransform: 'uppercase' }} />
          </Form.Item>
          {isSuperAdmin && (
            <Form.Item name="hospitalId" label="Hospital" rules={[{ required: true, message: 'Please select a hospital' }]}>
              <Select placeholder="Select hospital" showSearch optionFilterProp="children">
                {hospitals.map(h => <Option key={h.id} value={h.id}>{h.name}</Option>)}
              </Select>
            </Form.Item>
          )}
        </Form>
      </Modal>
    </div>
  );
}
