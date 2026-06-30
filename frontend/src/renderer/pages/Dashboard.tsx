import React, { useEffect, useState } from 'react';
import { Row, Col, Card, Statistic, Typography, Spin, Alert, Progress, Badge, List, Tag } from 'antd';
import {
  UserOutlined, HeartOutlined, BedOutlined,
  ExperimentOutlined, DollarOutlined, CalendarOutlined,
} from '@ant-design/icons';
import { billingApi } from '../api/client';
import { getUser } from '../store/auth';

const { Title, Text } = Typography;

interface Stats {
  totalPatients: number;
  todayVisits: number;
  admittedPatients: number;
  bedOccupancy: { available: number; total: number; occupied: number };
  pendingLabOrders: number;
  totalRevenue: number;
  unpaidInvoices: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const user = getUser();

  useEffect(() => {
    billingApi.stats({ hospitalId: user?.staff?.hospital?.id })
      .then(r => setStats(r.data))
      .catch(() => setError('Could not load dashboard stats. Make sure the backend is running.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spin size="large" style={{ display: 'block', marginTop: 80, textAlign: 'center' }} />;

  return (
    <div>
      <div className="page-header">
        <div>
          <Title level={4} style={{ margin: 0 }}>
            Dashboard
          </Title>
          <Text type="secondary">
            {new Date().toLocaleDateString('en-IQ', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </Text>
        </div>
        <Badge status="processing" text={`${user?.staff?.hospital?.name ?? 'Hospital Network'} · Live`} />
      </div>

      {error && <Alert message={error} type="warning" showIcon style={{ marginBottom: 16 }} />}

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card className="stat-card">
            <Statistic
              title="Total Patients"
              value={stats?.totalPatients ?? 0}
              prefix={<UserOutlined style={{ color: '#1a5276' }} />}
              valueStyle={{ color: '#1a5276' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="stat-card">
            <Statistic
              title="Today's Visits"
              value={stats?.todayVisits ?? 0}
              prefix={<CalendarOutlined style={{ color: '#27ae60' }} />}
              valueStyle={{ color: '#27ae60' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="stat-card">
            <Statistic
              title="Admitted Patients"
              value={stats?.admittedPatients ?? 0}
              prefix={<HeartOutlined style={{ color: '#c0392b' }} />}
              valueStyle={{ color: '#c0392b' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="stat-card">
            <Statistic
              title="Pending Lab Orders"
              value={stats?.pendingLabOrders ?? 0}
              prefix={<ExperimentOutlined style={{ color: '#e67e22' }} />}
              valueStyle={{ color: '#e67e22' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} md={8}>
          <Card title="Bed Occupancy" className="stat-card">
            {stats && (
              <>
                <Progress
                  percent={stats.bedOccupancy.total > 0
                    ? Math.round((stats.bedOccupancy.occupied / stats.bedOccupancy.total) * 100)
                    : 0}
                  strokeColor={
                    (stats.bedOccupancy.occupied / stats.bedOccupancy.total) > 0.85 ? '#c0392b' : '#27ae60'
                  }
                  size={['100%', 12]}
                />
                <Row style={{ marginTop: 12 }}>
                  <Col span={12}>
                    <Statistic title="Occupied" value={stats.bedOccupancy.occupied} valueStyle={{ fontSize: 20 }} />
                  </Col>
                  <Col span={12}>
                    <Statistic title="Available" value={stats.bedOccupancy.available} valueStyle={{ fontSize: 20, color: '#27ae60' }} />
                  </Col>
                </Row>
              </>
            )}
          </Card>
        </Col>

        <Col xs={24} md={8}>
          <Card title="Financial Overview" className="stat-card">
            <Statistic
              title="Total Revenue (IQD)"
              value={stats?.totalRevenue ?? 0}
              prefix={<DollarOutlined />}
              precision={0}
              valueStyle={{ color: '#27ae60', fontSize: 22 }}
            />
            <div style={{ marginTop: 16 }}>
              <Text type="secondary">Unpaid Invoices: </Text>
              <Tag color={stats && stats.unpaidInvoices > 0 ? 'red' : 'green'}>
                {stats?.unpaidInvoices ?? 0}
              </Tag>
            </div>
          </Card>
        </Col>

        <Col xs={24} md={8}>
          <Card title="Quick Actions" className="stat-card">
            <List
              size="small"
              dataSource={[
                { label: 'Register New Patient', path: '/patients', color: '#1a5276' },
                { label: 'Record Visit / EMR', path: '/visits', color: '#27ae60' },
                { label: 'Book Appointment', path: '/appointments', color: '#e67e22' },
                { label: 'View Shift Roster', path: '/shifts', color: '#8e44ad' },
                { label: 'Lab Orders Queue', path: '/laboratory', color: '#c0392b' },
              ]}
              renderItem={item => (
                <List.Item style={{ padding: '6px 0' }}>
                  <a
                    href={`#${item.path}`}
                    style={{ color: item.color, fontWeight: 500, fontSize: 13 }}
                  >
                    → {item.label}
                  </a>
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col span={24}>
          <Card title="System Modules" className="stat-card">
            <Row gutter={[12, 12]}>
              {[
                { name: 'Patient Management', desc: 'Register, search, and track all patients', color: '#1a5276' },
                { name: 'EMR / Visits', desc: 'Electronic medical records per visit', color: '#27ae60' },
                { name: 'Staff & Shifts', desc: 'Shift scheduling and attendance logs', color: '#8e44ad' },
                { name: 'Appointments', desc: 'Book and manage clinic appointments', color: '#e67e22' },
                { name: 'Bed Management', desc: 'Real-time bed occupancy by ward', color: '#c0392b' },
                { name: 'Pharmacy', desc: 'Drug inventory and dispensing', color: '#16a085' },
                { name: 'Laboratory', desc: 'Test orders and results', color: '#f39c12' },
                { name: 'Radiology', desc: 'Imaging orders and reports', color: '#2980b9' },
                { name: 'Billing', desc: 'Invoices, payments, financial reports', color: '#34495e' },
              ].map(m => (
                <Col key={m.name} xs={24} sm={12} md={8} lg={6}>
                  <Card
                    size="small"
                    style={{ borderLeft: `3px solid ${m.color}`, borderRadius: 6 }}
                    bodyStyle={{ padding: '10px 12px' }}
                  >
                    <Text strong style={{ color: m.color, fontSize: 13 }}>{m.name}</Text>
                    <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>{m.desc}</div>
                  </Card>
                </Col>
              ))}
            </Row>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
