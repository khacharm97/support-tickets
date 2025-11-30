import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config/auth';
import { logger } from '../config/logger';

let io: SocketIOServer | null = null;

export function initializeSocket(server: HTTPServer): SocketIOServer {
  io = new SocketIOServer(server, {
    cors: {
      origin: process.env.CORS_ORIGIN || '*',
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    try {
      // Get token from handshake auth or query
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;
      
      if (!token || typeof token !== 'string') {
        logger.warn(`Socket connection rejected: no token (${socket.id})`);
        socket.disconnect();
        return;
      }

      // Verify JWT
      const decoded = jwt.verify(token, JWT_SECRET) as { id: number; email: string; role: string };
      const userId = decoded.id;

      // Join user-specific room
      socket.join(`user:${userId}`);
      
      // Admins also join admin room
      if (decoded.role === 'admin') {
        socket.join('admin');
      }

      logger.info(`Socket connected: ${socket.id} (user: ${userId}, role: ${decoded.role})`);

      socket.on('disconnect', () => {
        logger.info(`Socket disconnected: ${socket.id}`);
      });
    } catch (error) {
      logger.error(`Socket authentication failed: ${socket.id}`, error);
      socket.disconnect();
    }
  });

  return io;
}

export function getSocketIO(): SocketIOServer {
  if (!io) {
    throw new Error('Socket.IO not initialized');
  }
  return io;
}

export function emitJobCreated(jobId: number, job: any, userId: number) {
  if (io) {
    io.to(`user:${userId}`).emit('jobs:created', { jobId, job });
    // Also emit to admin room
    io.to('admin').emit('jobs:created', { jobId, job });
    logger.debug(`Emitted jobs:created for job ${jobId} to user ${userId}`);
  }
}

export function emitJobProgress(jobId: number, progress: number, processedItems: number, userId: number) {
  if (io) {
    io.to(`user:${userId}`).emit('jobs:progress', { jobId, progress, processedItems });
    // Also emit to admin room
    io.to('admin').emit('jobs:progress', { jobId, progress, processedItems });
    logger.debug(`Emitted jobs:progress for job ${jobId}: ${progress}% to user ${userId}`);
  }
}

export function emitJobItem(jobId: number, itemId: number, status: string, userId: number, error?: string) {
  if (io) {
    io.to(`user:${userId}`).emit('jobs:item', { jobId, itemId, status, error });
    // Also emit to admin room
    io.to('admin').emit('jobs:item', { jobId, itemId, status, error });
    logger.debug(`Emitted jobs:item for job ${jobId}, item ${itemId} to user ${userId}`);
  }
}

export function emitJobCompleted(jobId: number, job: any, userId: number) {
  if (io) {
    io.to(`user:${userId}`).emit('jobs:completed', { jobId, job });
    // Also emit to admin room
    io.to('admin').emit('jobs:completed', { jobId, job });
    logger.debug(`Emitted jobs:completed for job ${jobId} to user ${userId}`);
  }
}

export function emitJobFailed(jobId: number, error: string, userId: number) {
  if (io) {
    io.to(`user:${userId}`).emit('jobs:failed', { jobId, error });
    // Also emit to admin room
    io.to('admin').emit('jobs:failed', { jobId, error });
    logger.debug(`Emitted jobs:failed for job ${jobId} to user ${userId}`);
  }
}

