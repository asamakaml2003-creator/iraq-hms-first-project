import React, { useEffect, useState } from 'react';
import {
  Card, Descriptions, Tag, Table, Button, Spin, Typography,
  Space, Tabs, Alert, message,
} from 'antd';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeftOutlined, WarningOutlined } from '@ant-design/icons';
import { visitApi } from '../api/client';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

export default function VisitDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [visit, setVisit] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    visitApi.get(id)
      .then(r => setVisit(r.data))
      .catch(() => message.error('Visit not found'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <Spin size="large" style={{ marginTop: 80, display: 'block', textAlign: 'center' }} />;
  if (!visit) return <div>Visit not found.</div>;

  const patient = visit.patient as Record<string, unknown>;
  const doctor = visit.doctor as Record<string, unknown>;
  const dept = visit.department as Record<string, unknown>;
  const prescriptions = visit.prescriptions as Record<string, unknown>[];
  const labOrders = visit.labOrders as Record<string, unknown>[];
  const radiologyOrders = visit.radiologyOrders as Record<string, unknown>[];

  const allergies = patient?.allergies as string[] ?? [];

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/visits')}>
          Back to Visits
        </Button>
        <Button onClick={() => navigate(`/patients/${patient?.id}`)}>
          View Patient Record
        </Button>
      </Space>

      {allergies.length > 0 && (
        <Alert
          type="error"
          showIcon
          icon={<WarningOutlined />}
          message={`Patient Allergies: ${allergies.join(', ')}`}
          style={{ marginBottom: 16 }}
        />
      )}

      <Card
        title={
          <Space>
            <Title level={4} style={{ margin: 0 }}>
              Visit — {String(patient?.firstName)} {String(patient?.lastName)}
            </Title>
          </Space>
        }
        style={{ marginBottom: 16 }}
      >
        <Descriptions column={3} size="small">
          <Descriptions.Item label="Doctor">Dr. {String(doctor?.firstName)} {String(doctor?.lastName)} · {String(doctor?.specialty ?? '—')}</Descriptions.Item>
          <Descriptions.Item label="Department">{String(dept?.name ?? '—')}</Descriptions.Item>
          <Descriptions.Item label="Visit Date">{dayjs(String(visit.visitDate)).format('DD MMM YYYY HH:mm')}</Descriptions.Item>
          <Descriptions.Item label="Chief Complaint" span={3}><Text>{String(visit.chiefComplaint)}</Text></Descriptions.Item>
          {visit.clinicalNotes && (
            <Descriptions.Item label="Clinical Notes" span={3}><Text>{String(visit.clinicalNotes)}</Text></Descriptions.Item>
          )}
          {(visit.diagnoses as string[]).length > 0 && (
            <Descriptions.Item label="Diagnoses" span={3}>
              {(visit.diagnoses as string[]).map(d => <Tag key={d} color="geekblue">{d}</Tag>)}
            </Descriptions.Item>
          )}
          {(visit.icd10Codes as string[]).length > 0 && (
            <Descriptions.Item label="ICD-10" span={3}>
              {(visit.icd10Codes as string[]).map(d => <Tag key={d}>{d}</Tag>)}
            </Descriptions.Item>
          )}
          {visit.treatmentPlan && (
            <Descriptions.Item label="Treatment Plan" span={3}><Text>{String(visit.treatmentPlan)}</Text></Descriptions.Item>
          )}
          {visit.followUpDate && (
            <Descriptions.Item label="Follow-up">
              {dayjs(String(visit.followUpDate)).format('DD MMM YYYY')}
            </Descriptions.Item>
          )}
        </Descriptions>
      </Card>

      <Tabs
        defaultActiveKey="rx"
        items={[
          {
            key: 'rx',
            label: `Prescriptions (${prescriptions.length})`,
            children: prescriptions.length === 0 ? (
              <Text type="secondary">No prescriptions for this visit.</Text>
            ) : prescriptions.map((rx, i) => (
              <Card key={String(rx.id)} size="small" style={{ marginBottom: 8 }}
                title={`Prescription ${i + 1} — Dr. ${String((rx.doctor as Record<string, unknown>)?.firstName ?? '')} ${String((rx.doctor as Record<string, unknown>)?.lastName ?? '')}`}>
                <Table
                  size="small"
                  dataSource={rx.items as Record<string, unknown>[]}
                  rowKey="id"
                  pagination={false}
                  columns={[
                    { title: 'Drug', key: 'drug', render: (_: unknown, row: Record<string, unknown>) => <b>{String((row.drug as Record<string, unknown>)?.genericName ?? '')}</b> },
                    { title: 'Dose', dataIndex: 'dose' },
                    { title: 'Frequency', dataIndex: 'frequency' },
                    { title: 'Duration', dataIndex: 'duration' },
                    { title: 'Instructions', dataIndex: 'instructions', render: (v: unknown) => v ? String(v) : '—' },
                  ]}
                />
              </Card>
            )),
          },
          {
            key: 'lab',
            label: `Lab Orders (${labOrders.length})`,
            children: (
              <Table
                size="small"
                dataSource={labOrders}
                rowKey="id"
                pagination={false}
                columns={[
                  { title: 'Status', dataIndex: 'status', render: (v: unknown) => <Tag>{String(v)}</Tag> },
                  { title: 'Priority', dataIndex: 'priority' },
                  { title: 'Tests', key: 'tests', render: (_: unknown, r: Record<string, unknown>) =>
                    (r.tests as Record<string, unknown>[]).map(t =>
                      <Tag key={String(t.id)} color={t.result ? 'green' : 'default'}>{String(t.testName)}</Tag>
                    ),
                  },
                  { title: 'Ordered', dataIndex: 'orderedAt', render: (v: unknown) => dayjs(String(v)).format('DD/MM/YY HH:mm') },
                ]}
              />
            ),
          },
          {
            key: 'radio',
            label: `Radiology (${radiologyOrders.length})`,
            children: (
              <Table
                size="small"
                dataSource={radiologyOrders}
                rowKey="id"
                pagination={false}
                columns={[
                  { title: 'Status', dataIndex: 'status', render: (v: unknown) => <Tag>{String(v)}</Tag> },
                  { title: 'Modality', dataIndex: 'modality' },
                  { title: 'Body Part', dataIndex: 'bodyPart' },
                  { title: 'Report', dataIndex: 'reportText', render: (v: unknown) => v ? String(v).slice(0, 100) + '…' : <Tag>Pending</Tag> },
                ]}
              />
            ),
          },
        ]}
      />
    </div>
  );
}
