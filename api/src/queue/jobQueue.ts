import { Queue } from 'bullmq';
import { redis } from '../config/redis';
import { logger } from '../config/logger';

export const jobQueue = new Queue('bulk-delete-jobs', {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  },
});

export interface BulkDeleteJobData {
  jobId: number;
  ticketIds: number[];
}

export async function enqueueBulkDelete(jobId: number, ticketIds: number[]): Promise<void> {
  await jobQueue.add('bulk-delete', {
    jobId,
    ticketIds,
  } as BulkDeleteJobData);
  
  logger.info(`Enqueued bulk delete job ${jobId} with ${ticketIds.length} tickets`);
}

