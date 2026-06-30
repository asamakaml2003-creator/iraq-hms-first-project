import React, { useEffect, useState } from 'react';
import { Row, Col, Card, Tag, Typography, Button, Badge, Select, message } from 'antd';
import { hospitalApi } from '../api/client';

const { Title } = Typography;
const { Option } = Select;

interface Bed {
  id: string;
  number: string;
  status: string;
  department: { name: string };
  admissions: { patient: { firstName: string; lastName: string } }[];
}

const bedColor: Record<string, string> = {
  AVAILABLE: '#27ae60', OCCUPIED: '#c0392b', MAINTENANCE: '#f39c12',
};

export default function Beds() {
  const [beds, setBeds] = useState<Bed[]>([]);
  const [loading, setLoading] = useState(false);
  const [depts, setDepts] = useState<Record<string, unknown>[]>([]);
  const [deptFilter, setDeptFilter] = useState<string | undefined>();

  useEffect(() => {
    hospitalApi.departments().then(r => setDepts(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    hospitalApi.beds(deptFilter ? { departmentId: deptFilter } : undefined)
      .then(r => setBeds(r.data))
      .catch(() => message.error('Failed to load beds'))
      .finally(() => setLoading(false));
  }, [deptFilter]);

  const available = beds.filter(b => b.status === 'AVAILABLE').length;
  const occupied = beds.filter(b => b.status === 'OCCUPIED').length;
  const maintenance = beds.filter(b => b.status === 'MAINTENANCE').length;

  return (
    <div>
      <div className="page-header">
        <Title level={4} style={{ margin: 0 }}>Beds & Wards</Title>
        <Row gutter={8} align="middle">
          <Col><Badge color="#27ae60" text={`${available} Available`} /></Col>
          <Col><Badge color="#c0392b" text={`${occupied} Occupied`} /></Col>
          <Col><Badge color="#f39c12" text={`${maintenance} Maintenance`} /></Col>
        </Row>
      </div>

      <Select
        placeholder="Filter by department"
        style={{ marginBottom: 16, width: 280 }}
        allowClear
        onChange={v => setDeptFilter(v)}
      >
        {depts.map(d => (
          <Option key={String(d.id)} value={String(d.id)}>{String(d.name)}</Option>
        ))}
      </Select>

      <Row gutter={[12, 12]}>
        {beds.map(bed => (
          <Col key={bed.id} xs={12} sm={8} md={6} lg={4}>
            <Card
              size="small"
              style={{
                borderTop: `4px solid ${bedColor[bed.status]}`,
                textAlign: 'center',
              }}
              bodyStyle={{ padding: 12 }}
            >
              <div style={{ fontSize: 20, fontWeight: 700, color: '#1a2744' }}>
                #{bed.number}
              </div>
              <Tag
                color={bed.status === 'AVAILABLE' ? 'green' : bed.status === 'OCCUPIED' ? 'red' : 'orange'}
                style={{ marginTop: 4 }}
              >
                {bed.status}
              </Tag>
              {bed.status === 'OCCUPIED' && bed.admissions?.[0] && (
                <div style={{ marginTop: 8, fontSize: 11, color: '#555' }}>
                  {bed.admissions[0].patient.firstName} {bed.admissions[0].patient.lastName}
                </div>
              )}
            </Card>
          </Col>
        ))}
      </Row>

      {beds.length === 0 && !loading && (
        <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>
          No beds registered. Add beds through the department settings.
        </div>
      )}
    </div>
  );
}
