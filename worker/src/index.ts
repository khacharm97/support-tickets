import { Worker } from 'bullmq';
import { redis } from './config/redis';
import { processBulkDelete } from './processors/bulkDeleteProcessor';
import { logger } from './config/logger';

const worker = new Worker(
  'bulk-delete-jobs',
  async (job) => {
    logger.info(`Processing job ${job.id} of type ${job.name}`);
    
    if (job.name === 'bulk-delete') {
      await processBulkDelete(job);
    } else {
      throw new Error(`Unknown job type: ${job.name}`);
    }
  },
  {
    connection: redis,
    concurrency: 5,
  }
);

worker.on('completed', (job) => {
  logger.info(`Job ${job.id} completed`);
});

worker.on('failed', (job, err) => {
  logger.error(`Job ${job?.id} failed:`, err);
});

worker.on('error', (err) => {
  logger.error('Worker error:', err);
});

logger.info('Worker started and listening for jobs');

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await worker.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  await worker.close();
  process.exit(0);
});

