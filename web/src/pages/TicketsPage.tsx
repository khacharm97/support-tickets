import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Table,
  Button,
  Space,
  message,
  Card,
  Typography,
  Progress,
  Alert,
  Select,
} from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { ticketApi, jobApi, Ticket, Job } from '../services/api';
import { useSocket } from '../hooks/useSocket';
import { useAuth } from '../context/AuthContext';
const { Title } = Typography;
const { Option } = Select;

function TicketsPage() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0 });
  const [activeJob, setActiveJob] = useState<Job | null>(null);
  const [jobProgress, setJobProgress] = useState(0);

  const fetchTickets = async (page: number = pagination.page, limit: number = pagination.limit) => {
    setLoading(true);
    try {
      const data = await ticketApi.list(page, limit);
      setTickets(data.tickets);
      setPagination({
        page: data.pagination.page,
        limit: data.pagination.limit,
        total: data.pagination.total,
      });
    } catch (error) {
      message.error('Failed to load tickets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets(1, 10);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Check job status periodically if there's an active job
  useEffect(() => {
    if (!activeJob) return;

    const checkJobStatus = async () => {
      try {
        const jobDetails = await jobApi.get(activeJob.id);
        if (['succeeded', 'failed', 'canceled'].includes(jobDetails.status)) {
          if (jobDetails.status === 'succeeded') {
            message.success('Bulk delete completed');
          } else if (jobDetails.status === 'failed') {
            message.error(`Job failed: ${jobDetails.error || 'Unknown error'}`);
          }
          setActiveJob(null);
          setJobProgress(0);
          fetchTickets(pagination.page);
          setSelectedRowKeys([]);
        } else {
          // Update progress if job is still running
          setJobProgress(jobDetails.progress);
          setActiveJob((prev) => prev ? {
            ...prev,
            status: jobDetails.status,
            progress: jobDetails.progress,
            processed_items: jobDetails.processed_items,
          } : null);
        }
      } catch (error) {
        // Job might not exist anymore, clear it
        console.error('Error checking job status:', error);
        setActiveJob(null);
        setJobProgress(0);
      }
    };

    // Check immediately and then every 2 seconds if job is still active
    checkJobStatus();
    const interval = setInterval(checkJobStatus, 2000);

    return () => clearInterval(interval);
  }, [activeJob?.id, pagination.page]);

  useSocket(
    (data) => {
      if (data.jobId === activeJob?.id) {
        setActiveJob((prev) => prev ? { ...prev, status: 'queued' } : null);
      }
    },
    (data) => {
      if (data.jobId === activeJob?.id) {
        setJobProgress(data.progress);
        setActiveJob((prev) => prev ? { ...prev, progress: data.progress, processed_items: data.processedItems } : null);
      }
    },
    undefined,
    (data) => {
      if (data.jobId === activeJob?.id) {
        message.success('Bulk delete completed');
        setActiveJob(null);
        setJobProgress(0);
        fetchTickets(pagination.page);
        setSelectedRowKeys([]);
      }
    },
    (data) => {
      if (data.jobId === activeJob?.id) {
        message.error(`Job failed: ${data.error}`);
        setActiveJob(null);
        setJobProgress(0);
      }
    }
  );

  const handleBulkDelete = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('Please select tickets to delete');
      return;
    }

    try {
      const ticketIds = selectedRowKeys.map(key => Number(key)).sort((a, b) => a - b);
      const ticketIdsStr = ticketIds.join(',');
      const encoder = new TextEncoder();
      const data = encoder.encode(`bulk-delete-${ticketIdsStr}`);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      const idempotencyKey = `bulk-delete-${hashHex.substring(0, 32)}`;
      
      const job = await jobApi.create({
        ticketIds,
        idempotencyKey,
      });

      const isExistingJob = activeJob?.id === job.id || 
        (activeJob && activeJob.idempotency_key === idempotencyKey);

      if (['succeeded', 'failed', 'canceled'].includes(job.status)) {
        if (job.status === 'succeeded') {
          message.success('Bulk delete job already completed');
        } else if (job.status === 'failed') {
          message.warning('Bulk delete job previously failed');
        }
        fetchTickets(pagination.page);
        setSelectedRowKeys([]);
      } else {
        setActiveJob({
          id: job.id,
          type: 'bulk_delete',
          status: job.status,
          progress: job.progress,
          total_items: job.total_items || ticketIds.length,
          processed_items: job.processed_items || 0,
          idempotency_key: idempotencyKey,
          metadata: job.metadata || { ticketIds },
          error: null,
          created_at: job.created_at || new Date().toISOString(),
          updated_at: job.updated_at || new Date().toISOString(),
          completed_at: job.completed_at || null,
        });
        setJobProgress(job.progress || 0);
        
        if (isExistingJob || job.status !== 'queued') {
          message.info('Returned existing bulk delete job');
        } else {
          message.success('Bulk delete job created');
        }
      }
    } catch (error: any) {
      message.error(error.response?.data?.error || 'Failed to create bulk delete job');
    }
  };

  const columns: ColumnsType<Ticket> = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
    },
    {
      title: 'Title',
      dataIndex: 'title',
      key: 'title',
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 120,
    },
    {
      title: 'Created',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
      render: (date: string) => new Date(date).toLocaleString(),
    },
  ];

  const rowSelection = {
    selectedRowKeys,
    onChange: (keys: React.Key[]) => {
      setSelectedRowKeys(keys);
    },
  };

  return (
    <div>
      <Card>
        <Space style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }}>
          <Title level={2} style={{ margin: 0 }}>Support Tickets</Title>
          <Space>
            <span>Per page:</span>
            <Select
              value={pagination.limit}
              onChange={(value) => {
                const newLimit = Number(value);
                setPagination(prev => ({ ...prev, limit: newLimit, page: 1 }));
                fetchTickets(1, newLimit);
              }}
              style={{ width: 100 }}
            >
              <Option value={10}>10</Option>
              <Option value={50}>50</Option>
              <Option value={100}>100</Option>
              <Option value={500}>500</Option>
              <Option value={1000}>1000</Option>
              <Option value={5000}>5000</Option>
            </Select>
            {isAdmin && (
              <Button
                type="primary"
                danger
                icon={<DeleteOutlined />}
                onClick={handleBulkDelete}
                disabled={selectedRowKeys.length === 0 || activeJob !== null}
              >
                Delete Selected ({selectedRowKeys.length})
              </Button>
            )}
          </Space>
        </Space>

        {activeJob && (
          <Alert
            message={`Bulk delete in progress (Job #${activeJob.id})`}
            description={
              <div>
                <Progress percent={jobProgress} status="active" />
                <div style={{ marginTop: 8 }}>
                  Processing {activeJob.processed_items} of {activeJob.total_items} tickets
                </div>
              </div>
            }
            type="info"
            closable
            onClose={() => {
              setActiveJob(null);
              setJobProgress(0);
            }}
            style={{ marginBottom: 16 }}
            action={
              <Button size="small" onClick={() => navigate(`/jobs/${activeJob.id}`)}>
                View Details
              </Button>
            }
          />
        )}

        <Table
          rowSelection={isAdmin ? rowSelection : undefined}
          columns={columns}
          dataSource={tickets}
          rowKey="id"
          loading={loading}
          pagination={{
            current: pagination.page,
            pageSize: pagination.limit,
            total: pagination.total,
            showSizeChanger: false,
            showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} tickets`,
            onChange: (page, pageSize) => {
              fetchTickets(page, pageSize || pagination.limit);
            },
          }}
        />
      </Card>
    </div>
  );
}

export default TicketsPage;

