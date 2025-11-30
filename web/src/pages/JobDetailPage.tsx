import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Typography,
  Descriptions,
  Tag,
  Button,
  Space,
  message,
  Alert,
} from 'antd';
import { ArrowLeftOutlined, StopOutlined } from '@ant-design/icons';
import { jobApi, Job } from '../services/api';
import { useSocket } from '../hooks/useSocket';
import { JobProgress } from '../components/JobProgress';
import { JobItems } from '../components/JobItems';

const { Title } = Typography;

function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchJob = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await jobApi.get(Number(id));
      setJob(data);
    } catch (error) {
      message.error('Failed to load job details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJob();
  }, [id]);

  useSocket(
    undefined,
    undefined,
    undefined, // Item updates handled in JobItems component
    (data) => {
      if (data.jobId === Number(id)) {
        message.success('Job completed');
        fetchJob();
      }
    },
    (data) => {
      if (data.jobId === Number(id)) {
        message.error(`Job failed: ${data.error}`);
        fetchJob();
      }
    }
  );

  const handleCancel = async () => {
    if (!id) return;
    try {
      await jobApi.cancel(Number(id));
      message.success('Job canceled');
      fetchJob();
    } catch (error: any) {
      message.error(error.response?.data?.error || 'Failed to cancel job');
    }
  };

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


  if (!job) {
    return <div>Loading...</div>;
  }

  const canCancel = job.status === 'queued' || job.status === 'running';

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/jobs')}>
          Back to Jobs
        </Button>
        {canCancel && (
          <Button
            danger
            icon={<StopOutlined />}
            onClick={handleCancel}
          >
            Cancel Job
          </Button>
        )}
      </Space>

      <Card loading={loading}>
        <Title level={2}>Job #{job.id}</Title>

        <Descriptions bordered column={2} style={{ marginBottom: 24 }}>
          <Descriptions.Item label="Type">{job.type}</Descriptions.Item>
          <Descriptions.Item label="Status">
            <Tag color={getStatusColor(job.status)}>{job.status.toUpperCase()}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Created">
            {new Date(job.created_at).toLocaleString()}
          </Descriptions.Item>
          {job.completed_at && (
            <Descriptions.Item label="Completed">
              {new Date(job.completed_at).toLocaleString()}
            </Descriptions.Item>
          )}
          {job.error && (
            <Descriptions.Item label="Error" span={2}>
              {job.error}
            </Descriptions.Item>
          )}
        </Descriptions>

        {job.status === 'failed' && job.error && (
          <Alert
            message="Job Failed"
            description={job.error}
            type="error"
            style={{ marginBottom: 24 }}
          />
        )}

        <JobProgress
          jobId={job.id}
          initialProgress={job.progress}
          initialProcessedItems={job.processed_items}
          initialTotalItems={job.total_items}
          initialStatus={job.status}
        />

        <Title level={4}>Job Items</Title>
        <JobItems jobId={job.id} initialItems={job.items || []} />
      </Card>
    </div>
  );
}

export default JobDetailPage;

