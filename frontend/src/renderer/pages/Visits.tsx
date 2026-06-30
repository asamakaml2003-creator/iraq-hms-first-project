import React, { useEffect, useState, useCallback } from 'react';
import { Table, Button, Tag, Typography, Input, Space, message } from 'antd';
import { PlusOutlined, SearchOutlined, EyeOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { visitApi } from '../api/client';
import dayjs from 'dayjs';

const { Title } = Typography;

export default function Visits() {
  const [visits, setVisits] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const navigate = useNavigate();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await visitApi.list({ page, limit: 20 });
      setVisits(r.data.visits);
      setTotal(r.data.total);
    } catch { message.error('Failed to load visits'); }
    finally { setLoading(false); }
  }, [page]);

  useEffect(() => { load(); }, [load]);

  const columns = [
    {
      title: 'Patient', key: 'patient',
      render: (_: unknown, r: Record<string, unknown>) => {
        const p = r.patient as Record<string, unknown>;
        return `${p?.firstName} ${p?.lastName}`;
      },
    },
    {
      title: 'Doctor', key: 'doctor',
      render: (_: unknown, r: Record<string, unknown>) => {
        const d = r.doctor as Record<string, unknown>;
        return `Dr. ${d?.firstName} ${d?.lastName}`;
      },
    },
    {
      title: 'Department', key: 'dept',
      render: (_: unknown, r: Record<string, unknown>) => String((r.department as Record<string, unknown>)?.name ?? '—'),
    },
    { title: 'Chief Complaint', dataIndex: 'chiefComplaint', key: 'complaint' },
    {
      title: 'Diagnoses', dataIndex: 'diagnoses', key: 'diagnoses',
      render: (v: unknown) => (v as string[]).slice(0, 2).map(d => <Tag key={d}>{d}</Tag>),
    },
    {
      title: 'Visit Date', dataIndex: 'visitDate', key: 'date',
      render: (v: unknown) => dayjs(String(v)).format('DD/MM/YY HH:mm'),
    },
    {
      title: '', key: 'actions',
      render: (_: unknown, r: Record<string, unknown>) => (
        <Button size="small" icon={<EyeOutlined />} onClick={() => navigate(`/visits/${r.id}`)}>
          Open
        </Button>
      ),
    },
  ];

  return (
    <div>
      <div className="page-header">
        <Title level={4} style={{ margin: 0 }}>EMR — Visit Records</Title>
        <Space>
          <Tag>{total} total visits</Tag>
        </Space>
      </div>
      <Table
        columns={columns}
        dataSource={visits}
        rowKey="id"
        loading={loading}
        pagination={{ total, pageSize: 20, current: page, onChange: setPage }}
        onRow={r => ({ onDoubleClick: () => navigate(`/visits/${r.id}`) })}
      />
    </div>
  );
}
