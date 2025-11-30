import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Table,
  Card,
  Typography,
  Select,
  Space,
  Tag,
  Button,
} from 'antd';
import { EyeOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { jobApi, Job } from '../services/api';

const { Title } = Typography;
const { Option } = Select;

function JobCenterPage() {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<{ type?: string; status?: string }>({});
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0 });

  const fetchJobs = async (page: number = pagination.page, limit: number = pagination.limit) => {
    setLoading(true);
    try {
      const data = await jobApi.list({
        ...filters,
        page,
        limit,
      });
      setJobs(data.jobs);
      setPagination({
        page: data.pagination.page,
        limit: data.pagination.limit,
        total: data.pagination.total,
      });
    } catch (error) {
      console.error('Failed to load jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, [filters]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'succeeded':
        return 'green';
      case 'failed':
        return 'red';
      case 'running':
        return 'blue';
      case 'queued':
        return 'orange';
      case 'canceled':
        return 'default';
      default:
        return 'default';
    }
  };

  const columns: ColumnsType<Job> = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      width: 120,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: string) => (
        <Tag color={getStatusColor(status)}>{status.toUpperCase()}</Tag>
      ),
    },
    {
      title: 'Progress',
      dataIndex: 'progress',
      key: 'progress',
      width: 150,
      render: (progress: number) => `${progress}%`,
    },
    {
      title: 'Items',
      key: 'items',
      width: 120,
      render: (_: any, record: Job) => `${record.processed_items} / ${record.total_items}`,
    },
    {
      title: 'Created',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
      render: (date: string) => new Date(date).toLocaleString(),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      render: (_: any, record: Job) => (
        <Button
          icon={<EyeOutlined />}
          onClick={() => navigate(`/jobs/${record.id}`)}
        >
          View
        </Button>
      ),
    },
  ];

  return (
    <div>
      <Card>
        <Space style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }}>
          <Title level={2} style={{ margin: 0 }}>Job Center</Title>
          <Space>
            <Select
              placeholder="Filter by type"
              allowClear
              style={{ width: 150 }}
              onChange={(value) => setFilters({ ...filters, type: value || undefined })}
            >
              <Option value="bulk_delete">Bulk Delete</Option>
            </Select>
            <Select
              placeholder="Filter by status"
              allowClear
              style={{ width: 150 }}
              onChange={(value) => setFilters({ ...filters, status: value || undefined })}
            >
              <Option value="queued">Queued</Option>
              <Option value="running">Running</Option>
              <Option value="succeeded">Succeeded</Option>
              <Option value="failed">Failed</Option>
              <Option value="canceled">Canceled</Option>
            </Select>
          </Space>
        </Space>

        <Table
          columns={columns}
          dataSource={jobs}
          rowKey="id"
          loading={loading}
          pagination={{
            current: pagination.page,
            pageSize: pagination.limit,
            total: pagination.total,
            showSizeChanger: true,
            pageSizeOptions: [10, 50, 100, 500, 1000],
            onChange: (page, pageSize) => {
              fetchJobs(page, pageSize || pagination.limit);
            },
            onShowSizeChange: (_current, size) => {
              setPagination(prev => ({ ...prev, limit: size, page: 1 }));
              fetchJobs(1, size);
            },
          }}
        />
      </Card>
    </div>
  );
}

export default JobCenterPage;

