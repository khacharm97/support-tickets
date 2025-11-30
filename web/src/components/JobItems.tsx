import { useState, useEffect } from 'react';
import { Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useSocket } from '../hooks/useSocket';
import { jobApi, JobItem } from '../services/api';

interface JobItemsProps {
  jobId: number;
  initialItems: JobItem[];
}

export function JobItems({ jobId, initialItems }: JobItemsProps) {
  const [items, setItems] = useState<JobItem[]>(initialItems);
  const [loading, setLoading] = useState(false);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const data = await jobApi.get(jobId);
      if (data.items) {
        setItems(data.items);
      }
    } catch (error) {
      console.error('Failed to load job items:', error);
    } finally {
      setLoading(false);
    }
  };

  useSocket(
    undefined,
    undefined,
    (data) => {
      if (data.jobId === jobId) {
        fetchItems();
      }
    },
    (data) => {
      if (data.jobId === jobId) {
        fetchItems();
      }
    },
    undefined
  );

  useEffect(() => {
    if (items.length === 0) {
      fetchItems();
    }
  }, []);

  const columns: ColumnsType<JobItem> = [
    {
      title: 'Item ID',
      dataIndex: 'item_id',
      key: 'item_id',
      width: 100,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: string) => (
        <Tag color={status === 'succeeded' ? 'green' : 'red'}>
          {status.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: 'Error',
      dataIndex: 'error',
      key: 'error',
      ellipsis: true,
    },
    {
      title: 'Processed At',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
      render: (date: string) => new Date(date).toLocaleString(),
    },
  ];

  return (
    <Table
      columns={columns}
      dataSource={items}
      rowKey="id"
      loading={loading}
      pagination={{ pageSize: 20 }}
    />
  );
}

