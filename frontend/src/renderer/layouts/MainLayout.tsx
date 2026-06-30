import React, { useState } from 'react';
import { Layout, Menu, Avatar, Dropdown, Badge, Typography, Space } from 'antd';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  DashboardOutlined, TeamOutlined, CalendarOutlined,
  MedicineBoxOutlined, ExperimentOutlined, FileTextOutlined,
  BankOutlined, ScheduleOutlined, UserOutlined,
  LogoutOutlined, SettingOutlined, BellOutlined,
  RadarChartOutlined, DollarOutlined, HomeOutlined,
  HeartOutlined,
} from '@ant-design/icons';
import { getUser, logout } from '../store/auth';

const { Sider, Header, Content } = Layout;
const { Text } = Typography;

const menuItems = [
  { key: '/dashboard', icon: <DashboardOutlined />, label: 'Dashboard' },
  {
    key: 'network', icon: <BankOutlined />, label: 'Network',
    children: [
      { key: '/hospitals', label: 'Hospitals' },
      { key: '/departments', label: 'Departments' },
    ],
  },
  {
    key: 'clinical', icon: <HeartOutlined />, label: 'Clinical',
    children: [
      { key: '/patients', icon: <UserOutlined />, label: 'Patients' },
      { key: '/visits', icon: <FileTextOutlined />, label: 'EMR / Visits' },
      { key: '/appointments', icon: <CalendarOutlined />, label: 'Appointments' },
      { key: '/beds', icon: <HomeOutlined />, label: 'Beds & Wards' },
    ],
  },
  {
    key: 'staff-group', icon: <TeamOutlined />, label: 'Staff',
    children: [
      { key: '/staff', label: 'Staff Directory' },
      { key: '/shifts', icon: <ScheduleOutlined />, label: 'Shifts & Attendance' },
    ],
  },
  {
    key: 'ancillary', icon: <ExperimentOutlined />, label: 'Ancillary',
    children: [
      { key: '/pharmacy', icon: <MedicineBoxOutlined />, label: 'Pharmacy' },
      { key: '/laboratory', icon: <ExperimentOutlined />, label: 'Laboratory' },
      { key: '/radiology', icon: <RadarChartOutlined />, label: 'Radiology' },
    ],
  },
  { key: '/billing', icon: <DollarOutlined />, label: 'Billing & Finance' },
];

export default function MainLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const user = getUser();

  const roleBadgeColor: Record<string, string> = {
    SUPER_ADMIN: '#8e44ad', HOSPITAL_ADMIN: '#2980b9',
    DOCTOR: '#27ae60', NURSE: '#2980b9',
    PHARMACIST: '#e67e22', LAB_TECHNICIAN: '#f39c12',
    RECEPTIONIST: '#16a085', ACCOUNTANT: '#8e44ad',
    RADIOLOGIST: '#c0392b',
  };

  const userMenu = {
    items: [
      { key: 'profile', icon: <UserOutlined />, label: `${user?.staff?.firstName ?? user?.email}` },
      { type: 'divider' as const },
      { key: 'settings', icon: <SettingOutlined />, label: 'Settings' },
      { key: 'logout', icon: <LogoutOutlined />, label: 'Logout', danger: true },
    ],
    onClick: ({ key }: { key: string }) => {
      if (key === 'logout') { logout(); navigate('/login'); }
    },
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        className="hms-sidebar"
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        width={240}
      >
        <div style={{
          padding: collapsed ? '16px 8px' : '16px 20px',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          marginBottom: 8,
        }}>
          {collapsed ? (
            <HeartOutlined style={{ fontSize: 24, color: '#5dade2' }} />
          ) : (
            <>
              <div style={{ color: '#5dade2', fontSize: 18, fontWeight: 700 }}>Iraq HMS</div>
              <div style={{ color: '#85929e', fontSize: 11, marginTop: 2 }}>Hospital Management</div>
            </>
          )}
        </div>
        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          defaultOpenKeys={['clinical', 'staff-group', 'ancillary', 'network']}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          style={{ border: 'none', paddingBottom: 16 }}
        />
      </Sider>

      <Layout>
        <Header className="hms-header" style={{ height: 56, lineHeight: '56px' }}>
          <Space>
            <Text strong style={{ fontSize: 16, color: '#1a2744' }}>
              {user?.staff?.hospital?.name ?? 'Iraq Hospital Network'}
            </Text>
            {user?.staff?.department && (
              <Text type="secondary" style={{ fontSize: 13 }}>
                — {user.staff.department.name}
              </Text>
            )}
          </Space>
          <Space size={16}>
            <Badge count={3} size="small">
              <BellOutlined style={{ fontSize: 18, cursor: 'pointer', color: '#555' }} />
            </Badge>
            <Dropdown menu={userMenu} placement="bottomRight">
              <Space style={{ cursor: 'pointer' }}>
                <Avatar
                  size={32}
                  style={{ background: roleBadgeColor[user?.role ?? 'DOCTOR'] ?? '#1a5276' }}
                >
                  {(user?.staff?.firstName?.[0] ?? user?.email?.[0] ?? 'U').toUpperCase()}
                </Avatar>
                <div style={{ lineHeight: 1.3 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#1a2744' }}>
                    {user?.staff ? `Dr. ${user.staff.firstName} ${user.staff.lastName}` : user?.email}
                  </div>
                  <div style={{ fontSize: 11, color: '#999' }}>
                    {user?.role?.replace('_', ' ')}
                  </div>
                </div>
              </Space>
            </Dropdown>
          </Space>
        </Header>

        <Content style={{ margin: '16px', overflow: 'auto' }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
