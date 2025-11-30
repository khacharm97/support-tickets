import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';

const WS_URL = import.meta.env.REACT_APP_WS_URL || 'ws://localhost:3001';

export interface JobEvent {
  jobId: number;
  [key: string]: any;
}

export function useSocket(
  onJobCreated?: (data: JobEvent) => void,
  onJobProgress?: (data: JobEvent & { progress: number; processedItems: number }) => void,
  onJobItem?: (data: JobEvent & { itemId: number; status: string; error?: string }) => void,
  onJobCompleted?: (data: JobEvent & { job: any }) => void,
  onJobFailed?: (data: JobEvent & { error: string }) => void
) {
  const { token } = useAuth();
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!token) {
      return;
    }

    const socket = io(WS_URL, {
      transports: ['websocket', 'polling'],
      auth: {
        token,
      },
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Socket connected');
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected');
    });

    if (onJobCreated) {
      socket.on('jobs:created', onJobCreated);
    }
    if (onJobProgress) {
      socket.on('jobs:progress', onJobProgress);
    }
    if (onJobItem) {
      socket.on('jobs:item', onJobItem);
    }
    if (onJobCompleted) {
      socket.on('jobs:completed', onJobCompleted);
    }
    if (onJobFailed) {
      socket.on('jobs:failed', onJobFailed);
    }

    return () => {
      socket.off('jobs:created');
      socket.off('jobs:progress');
      socket.off('jobs:item');
      socket.off('jobs:completed');
      socket.off('jobs:failed');
      socket.disconnect();
    };
  }, [token, onJobCreated, onJobProgress, onJobItem, onJobCompleted, onJobFailed]);

  return socketRef.current;
}

