import { useState } from 'react';
import { Card, Progress, Space, Typography } from 'antd';
import { useSocket } from '../hooks/useSocket';

const { Text } = Typography;

interface JobProgressProps {
  jobId: number;
  initialProgress: number;
  initialProcessedItems: number;
  initialTotalItems: number;
  initialStatus: string;
}

export function JobProgress({
  jobId,
  initialProgress,
  initialProcessedItems,
  initialTotalItems,
  initialStatus,
}: JobProgressProps) {
  const [progress, setProgress] = useState(initialProgress);
  const [processedItems, setProcessedItems] = useState(initialProcessedItems);
  const [status, setStatus] = useState(initialStatus);

  useSocket(
    undefined,
    (data) => {
      if (data.jobId === jobId) {
        setProgress(data.progress);
        setProcessedItems(data.processedItems);
      }
    },
    undefined,
    (data) => {
      if (data.jobId === jobId) {
        setStatus('succeeded');
      }
    },
    (data) => {
      if (data.jobId === jobId) {
        setStatus('failed');
      }
    }
  );

  return (
    <Card style={{ marginBottom: 24 }}>
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        <Space size="large">
          <div>
            <Text type="secondary">Progress</Text>
            <div style={{ fontSize: 24, fontWeight: 'bold' }}>{progress}%</div>
          </div>
          <div>
            <Text type="secondary">Items Processed</Text>
            <div style={{ fontSize: 24, fontWeight: 'bold' }}>
              {processedItems} / {initialTotalItems}
            </div>
          </div>
        </Space>
        {(status === 'running' || status === 'queued') && (
          <Progress
            percent={progress}
            status={status === 'running' ? 'active' : 'normal'}
          />
        )}
      </Space>
    </Card>
  );
}

