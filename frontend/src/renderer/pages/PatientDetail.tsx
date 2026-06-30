import React, { useEffect, useState } from 'react';
import {
  Card, Tabs, Descriptions, Tag, Table, Button, Spin, Typography,
  Space, Timeline, Modal, Form, Input, InputNumber, Row, Col, message,
} from 'antd';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeftOutlined, PlusOutlined, HeartOutlined } from '@ant-design/icons';
import { patientApi } from '../api/client';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

const BLOOD_LABELS: Record<string, string> = {
  A_POS:'A+', A_NEG:'A-', B_POS:'B+', B_NEG:'B-',
  AB_POS:'AB+', AB_NEG:'AB-', O_POS:'O+', O_NEG:'O-', UNKNOWN:'?'
};

export default function PatientDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [patient, setPatient] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [vitalModal, setVitalModal] = useState(false);
  const [vitalForm] = Form.useForm();

  useEffect(() => {
    if (!id) return;
    patientApi.get(id)
      .then(r => setPatient(r.data))
      .catch(() => message.error('Patient not found'))
      .finally(() => setLoading(false));
  }, [id]);

  async function saveVitals(values: Record<string, unknown>) {
    try {
      await patientApi.addVitals(id!, values);
      message.success('Vital signs recorded');
      setVitalModal(false);
      vitalForm.resetFields();
      const r = await patientApi.get(id!);
      setPatient(r.data);
    } catch { message.error('Failed to save vitals'); }
  }

  if (loading) return <Spin size="large" style={{ marginTop: 80, display: 'block', textAlign: 'center' }} />;
  if (!patient) return <div>Patient not found.</div>;

  const visits = patient.visits as Record<string, unknown>[];
  const vitals = patient.vitalSigns as Record<string, unknown>[];
  const admissions = patient.admissions as Record<string, unknown>[];

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/patients')}>
          Back to Patients
        </Button>
      </Space>

      <Card
        title={
          <Space>
            <HeartOutlined style={{ color: '#c0392b' }} />
            <Title level={4} style={{ margin: 0 }}>
              {String(patient.firstName)} {String(patient.lastName)}
              {patient.nameAr && <Text type="secondary" style={{ fontSize: 14, marginLeft: 8 }}>{String(patient.nameAr)}</Text>}
            </Title>
            <Tag color="red">{BLOOD_LABELS[String(patient.bloodType)]}</Tag>
            <Tag color={patient.gender === 'MALE' ? 'blue' : 'pink'}>{String(patient.gender)}</Tag>
          </Space>
        }
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setVitalModal(true)}>
            Record Vitals
          </Button>
        }
        style={{ marginBottom: 16 }}
      >
        <Descriptions column={3} size="small">
          <Descriptions.Item label="National ID">{String(patient.nationalId ?? '—')}</Descriptions.Item>
          <Descriptions.Item label="Date of Birth">
            {dayjs(String(patient.dateOfBirth)).format('DD MMM YYYY')}
            {' '}({dayjs().diff(dayjs(String(patient.dateOfBirth)), 'year')} yrs)
          </Descriptions.Item>
          <Descriptions.Item label="Phone">{String(patient.phone ?? '—')}</Descriptions.Item>
          <Descriptions.Item label="Address">{String(patient.address ?? '—')}</Descriptions.Item>
          <Descriptions.Item label="Emergency Contact">{String(patient.emergencyContact ?? '—')}</Descriptions.Item>
          <Descriptions.Item label="Emergency Phone">{String(patient.emergencyPhone ?? '—')}</Descriptions.Item>
        </Descriptions>
      </Card>

      <Tabs
        defaultActiveKey="medical"
        items={[
          {
            key: 'medical',
            label: 'Medical Background',
            children: (
              <Row gutter={16}>
                <Col span={8}>
                  <Card size="small" title="Chronic Diseases">
                    {(patient.chronicDiseases as string[]).length > 0
                      ? (patient.chronicDiseases as string[]).map(d => <Tag key={d} color="orange" style={{ marginBottom: 4 }}>{d}</Tag>)
                      : <Text type="secondary">None recorded</Text>}
                  </Card>
                </Col>
                <Col span={8}>
                  <Card size="small" title="Allergies" extra={<Tag color="red">ALERT</Tag>}>
                    {(patient.allergies as string[]).length > 0
                      ? (patient.allergies as string[]).map(a => <Tag key={a} color="red" style={{ marginBottom: 4 }}>{a}</Tag>)
                      : <Text type="secondary">No known allergies</Text>}
                  </Card>
                </Col>
                <Col span={8}>
                  <Card size="small" title="Past Surgeries">
                    {(patient.pastSurgeries as string[]).length > 0
                      ? (patient.pastSurgeries as string[]).map(s => <Tag key={s} color="purple" style={{ marginBottom: 4 }}>{s}</Tag>)
                      : <Text type="secondary">None</Text>}
                  </Card>
                </Col>
                {patient.familyHistory && (
                  <Col span={24} style={{ marginTop: 12 }}>
                    <Card size="small" title="Family History">
                      <Text>{String(patient.familyHistory)}</Text>
                    </Card>
                  </Col>
                )}
              </Row>
            ),
          },
          {
            key: 'vitals',
            label: `Vital Signs (${vitals.length})`,
            children: (
              <Table
                size="small"
                dataSource={vitals}
                rowKey="id"
                pagination={{ pageSize: 10 }}
                columns={[
                  { title: 'Date', dataIndex: 'recordedAt', render: v => dayjs(String(v)).format('DD/MM/YY HH:mm') },
                  { title: 'BP', dataIndex: 'bloodPressure', render: v => v ?? '—' },
                  { title: 'Heart Rate', dataIndex: 'heartRate', render: v => v ? `${v} bpm` : '—' },
                  { title: 'Temp (°C)', dataIndex: 'temperature', render: v => v ?? '—' },
                  { title: 'O₂ Sat', dataIndex: 'oxygenSaturation', render: v => v ? `${v}%` : '—' },
                  { title: 'Weight (kg)', dataIndex: 'weight', render: v => v ?? '—' },
                  { title: 'Height (cm)', dataIndex: 'height', render: v => v ?? '—' },
                ]}
              />
            ),
          },
          {
            key: 'visits',
            label: `Visit History (${visits.length})`,
            children: (
              <Timeline
                items={visits.map(v => ({
                  color: '#1a5276',
                  children: (
                    <Card size="small" style={{ marginBottom: 4 }}>
                      <Space style={{ justifyContent: 'space-between', width: '100%' }} align="start">
                        <div>
                          <Text strong>{String((v.doctor as Record<string, unknown>)?.firstName)} {String((v.doctor as Record<string, unknown>)?.lastName)}</Text>
                          <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>
                            {String((v.department as Record<string, unknown>)?.name)}
                          </Text>
                          <div style={{ marginTop: 4 }}>
                            <Text>{String(v.chiefComplaint)}</Text>
                          </div>
                          {(v.diagnoses as string[]).length > 0 && (
                            <div style={{ marginTop: 4 }}>
                              {(v.diagnoses as string[]).map(d => <Tag key={d}>{d}</Tag>)}
                            </div>
                          )}
                        </div>
                        <Text type="secondary" style={{ fontSize: 11, whiteSpace: 'nowrap' }}>
                          {dayjs(String(v.visitDate)).format('DD MMM YYYY')}
                        </Text>
                      </Space>
                    </Card>
                  ),
                }))}
              />
            ),
          },
          {
            key: 'admissions',
            label: `Admissions (${admissions.length})`,
            children: (
              <Table
                size="small"
                dataSource={admissions}
                rowKey="id"
                columns={[
                  { title: 'Status', dataIndex: 'status', render: v => <Tag color={v === 'ADMITTED' ? 'green' : 'default'}>{String(v)}</Tag> },
                  { title: 'Ward / Bed', key: 'bed', render: (_, r: Record<string, unknown>) => {
                    const bed = r.bed as Record<string, unknown>;
                    const dept = bed?.department as Record<string, unknown>;
                    return `${String(dept?.name ?? '—')} · Bed ${String(bed?.number ?? '—')}`;
                  }},
                  { title: 'Admitted', dataIndex: 'admittedAt', render: v => dayjs(String(v)).format('DD/MM/YY') },
                  { title: 'Discharged', dataIndex: 'dischargedAt', render: v => v ? dayjs(String(v)).format('DD/MM/YY') : 'Still Admitted' },
                ]}
              />
            ),
          },
        ]}
      />

      <Modal
        title="Record Vital Signs"
        open={vitalModal}
        onCancel={() => setVitalModal(false)}
        onOk={() => vitalForm.submit()}
        okText="Save"
      >
        <Form form={vitalForm} layout="vertical" onFinish={saveVitals} style={{ marginTop: 8 }}>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="bloodPressure" label="Blood Pressure (e.g. 120/80)">
                <Input placeholder="120/80 mmHg" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="heartRate" label="Heart Rate (bpm)">
                <InputNumber style={{ width: '100%' }} min={20} max={300} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="temperature" label="Temperature (°C)">
                <InputNumber style={{ width: '100%' }} min={30} max={45} step={0.1} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="oxygenSaturation" label="O₂ Saturation (%)">
                <InputNumber style={{ width: '100%' }} min={50} max={100} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="weight" label="Weight (kg)">
                <InputNumber style={{ width: '100%' }} min={0} step={0.1} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="height" label="Height (cm)">
                <InputNumber style={{ width: '100%' }} min={0} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
}
