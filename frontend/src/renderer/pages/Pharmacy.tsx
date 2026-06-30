import React, { useEffect, useState, useCallback } from 'react';
import {
  Table, Button, Input, Tag, Typography, Modal, Form,
  Select, Row, Col, message, Tabs, InputNumber, DatePicker, Alert,
} from 'antd';
import { PlusOutlined, SearchOutlined, WarningOutlined } from '@ant-design/icons';
import { pharmacyApi, hospitalApi } from '../api/client';
import { getUser } from '../store/auth';
import dayjs from 'dayjs';

const { Title } = Typography;
const { Option } = Select;

const DRUG_CATEGORIES = [
  'Antibiotics','Analgesics','Antihypertensives','Antidiabetics',
  'Cardiovascular','Respiratory','Neurological','Gastrointestinal',
  'Anticoagulants','IV Fluids','Vaccines','Anesthetics','Other',
];

interface Hospital { id: string; name: string; }

export default function Pharmacy() {
  const [drugs, setDrugs] = useState<Record<string, unknown>[]>([]);
  const [inventory, setInventory] = useState<Record<string, unknown>[]>([]);
  const [lowStock, setLowStock] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [drugModal, setDrugModal] = useState(false);
  const [stockModal, setStockModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [drugForm] = Form.useForm();
  const [stockForm] = Form.useForm();
  const currentUser = getUser();
  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';

  const loadDrugs = useCallback(async () => {
    setLoading(true);
    try {
      const r = await pharmacyApi.drugs({ search: search || undefined });
      setDrugs(r.data);
    } catch { message.error('Failed to load drugs'); }
    finally { setLoading(false); }
  }, [search]);

  const loadInventory = useCallback(async () => {
    try {
      const r = await pharmacyApi.inventory();
      setInventory(r.data.inventory);
      setLowStock(r.data.lowStock);
    } catch {}
  }, []);

  useEffect(() => { loadDrugs(); loadInventory(); }, [loadDrugs, loadInventory]);

  useEffect(() => {
    if (isSuperAdmin) {
      hospitalApi.list().then(r => setHospitals(r.data)).catch(() => {});
    }
  }, [isSuperAdmin]);

  async function handleAddDrug(values: Record<string, unknown>) {
    setSaving(true);
    try {
      await pharmacyApi.createDrug(values);
      message.success('Drug added to database');
      setDrugModal(false);
      drugForm.resetFields();
      loadDrugs();
    } catch { message.error('Failed to add drug'); }
    finally { setSaving(false); }
  }

  async function handleRestock(values: Record<string, unknown>) {
    setSaving(true);
    try {
      await pharmacyApi.restock({
        ...values,
        expiryDate: dayjs(values.expiryDate as string).format('YYYY-MM-DD'),
      });
      message.success('Inventory updated');
      setStockModal(false);
      stockForm.resetFields();
      loadInventory();
    } catch { message.error('Failed to update stock'); }
    finally { setSaving(false); }
  }

  const drugColumns = [
    { title: 'Generic Name', dataIndex: 'genericName', key: 'genericName', render: (v: unknown) => <b>{String(v)}</b> },
    { title: 'Brand Name', dataIndex: 'brandName', key: 'brandName', render: (v: unknown) => v ? String(v) : '—' },
    { title: 'Category', dataIndex: 'category', key: 'category', render: (v: unknown) => <Tag color="geekblue">{String(v)}</Tag> },
    { title: 'Unit', dataIndex: 'unit', key: 'unit' },
    { title: 'Storage', dataIndex: 'storageRequirements', key: 'storage', render: (v: unknown) => v ? String(v) : '—' },
  ];

  const inventoryColumns = [
    { title: 'Drug', key: 'drug', render: (_: unknown, r: Record<string, unknown>) => (r.drug as Record<string, unknown>)?.genericName as string },
    {
      title: 'Quantity', dataIndex: 'quantity', key: 'quantity',
      render: (v: unknown, r: Record<string, unknown>) => {
        const isLow = Number(v) <= Number(r.minimumStock);
        return <Tag color={isLow ? 'red' : 'green'}>{String(v)} {String((r.drug as Record<string, unknown>)?.unit ?? '')}</Tag>;
      },
    },
    { title: 'Min Stock', dataIndex: 'minimumStock', key: 'minimumStock' },
    {
      title: 'Expiry Date', dataIndex: 'expiryDate', key: 'expiry',
      render: (v: unknown) => {
        const days = dayjs(String(v)).diff(dayjs(), 'day');
        return <Tag color={days < 30 ? 'red' : days < 90 ? 'orange' : 'green'}>{dayjs(String(v)).format('DD/MM/YYYY')}</Tag>;
      },
    },
    { title: 'Batch No.', dataIndex: 'batchNo', key: 'batchNo', render: (v: unknown) => v ? String(v) : '—' },
    { title: 'Supplier', dataIndex: 'supplier', key: 'supplier', render: (v: unknown) => v ? String(v) : '—' },
  ];

  return (
    <div>
      <div className="page-header">
        <Title level={4} style={{ margin: 0 }}>Pharmacy Management</Title>
        <Row gutter={8}>
          <Col><Button icon={<PlusOutlined />} onClick={() => setStockModal(true)}>Restock Inventory</Button></Col>
          <Col><Button type="primary" icon={<PlusOutlined />} onClick={() => setDrugModal(true)}>Add New Drug</Button></Col>
        </Row>
      </div>

      {lowStock.length > 0 && (
        <Alert
          type="warning"
          showIcon
          icon={<WarningOutlined />}
          message={`${lowStock.length} drug(s) are at or below minimum stock level`}
          description={lowStock.map(i => String((i.drug as Record<string, unknown>)?.genericName ?? '')).join(', ')}
          style={{ marginBottom: 16 }}
        />
      )}

      <Tabs
        defaultActiveKey="inventory"
        items={[
          {
            key: 'inventory',
            label: `Inventory (${inventory.length})`,
            children: (
              <Table
                columns={inventoryColumns}
                dataSource={inventory}
                rowKey="id"
                pagination={{ pageSize: 20 }}
              />
            ),
          },
          {
            key: 'drugs',
            label: `Drug Database (${drugs.length})`,
            children: (
              <>
                <Input
                  prefix={<SearchOutlined />}
                  placeholder="Search drugs..."
                  style={{ marginBottom: 16, maxWidth: 360 }}
                  allowClear
                  onChange={e => setSearch(e.target.value)}
                />
                <Table
                  columns={drugColumns}
                  dataSource={drugs}
                  rowKey="id"
                  loading={loading}
                  pagination={{ pageSize: 20 }}
                />
              </>
            ),
          },
        ]}
      />

      <Modal
        title="Add New Drug to Database"
        open={drugModal}
        onCancel={() => { setDrugModal(false); drugForm.resetFields(); }}
        onOk={() => drugForm.submit()}
        confirmLoading={saving}
      >
        <Form form={drugForm} layout="vertical" onFinish={handleAddDrug} style={{ marginTop: 8 }}>
          <Form.Item name="genericName" label="Generic Name" rules={[{ required: true }]}>
            <Input placeholder="Amoxicillin" />
          </Form.Item>
          <Form.Item name="brandName" label="Brand Name">
            <Input placeholder="Amoxil" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="category" label="Category" rules={[{ required: true }]}>
                <Select>
                  {DRUG_CATEGORIES.map(c => <Option key={c} value={c}>{c}</Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="unit" label="Unit" rules={[{ required: true }]}>
                <Select>
                  {['mg','g','ml','IU','Tablet','Capsule','Vial','Ampule','Sachet','Patch'].map(u =>
                    <Option key={u} value={u}>{u}</Option>
                  )}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="storageRequirements" label="Storage Requirements">
            <Input placeholder="Store at 2–8°C, Keep away from light" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Restock Inventory"
        open={stockModal}
        onCancel={() => { setStockModal(false); stockForm.resetFields(); }}
        onOk={() => stockForm.submit()}
        confirmLoading={saving}
      >
        <Form form={stockForm} layout="vertical" onFinish={handleRestock} style={{ marginTop: 8 }}>
          {isSuperAdmin && (
            <Form.Item name="hospitalId" label="Hospital" rules={[{ required: true, message: 'Please select a hospital' }]}>
              <Select placeholder="Select hospital" showSearch optionFilterProp="children">
                {hospitals.map(h => <Option key={h.id} value={h.id}>{h.name}</Option>)}
              </Select>
            </Form.Item>
          )}
          <Form.Item name="drugId" label="Drug" rules={[{ required: true }]}>
            <Select showSearch placeholder="Select drug..." filterOption={(i, o) =>
              String(o?.children ?? '').toLowerCase().includes(i.toLowerCase())
            }>
              {drugs.map(d => <Option key={String(d.id)} value={String(d.id)}>{String(d.genericName)} ({String(d.brandName ?? '')})</Option>)}
            </Select>
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="quantity" label="Quantity to Add" rules={[{ required: true }]}>
                <InputNumber style={{ width: '100%' }} min={1} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="minimumStock" label="Min Stock Alert" initialValue={10}>
                <InputNumber style={{ width: '100%' }} min={0} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="expiryDate" label="Expiry Date" rules={[{ required: true }]}>
                <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="batchNo" label="Batch Number">
                <Input placeholder="BATCH-001" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="supplier" label="Supplier">
                <Input placeholder="Pharmacy supplier name" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="unitCost" label="Unit Cost (IQD)">
                <InputNumber style={{ width: '100%' }} min={0} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
}
