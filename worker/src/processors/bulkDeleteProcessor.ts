import { Job } from 'bullmq';
import { JobModel } from '../models/job';
import { JobItemModel } from '../models/jobItem';
import { TicketModel } from '../models/ticket';
import { apiClient } from '../config/api';
import { logger } from '../config/logger';
import { pool } from '../config/database';

const CHUNK_SIZE = 5;

export interface BulkDeleteJobData {
  jobId: number;
  ticketIds: number[];
}

export async function processBulkDelete(job: Job<BulkDeleteJobData>) {
  const { jobId, ticketIds } = job.data;
  
  logger.info(`Processing bulk delete job ${jobId} with ${ticketIds.length} tickets`);

  try {
    const jobRecord = await JobModel.findById(jobId);
    if (!jobRecord) {
      throw new Error(`Job ${jobId} not found`);
    }
    
    if (jobRecord.status === 'canceled') {
      logger.info(`Job ${jobId} was canceled before processing`);
      return;
    }

    await JobModel.updateStatus(jobId, 'running');
    
    await emitProgress(jobId, 0, 0);

    const total = ticketIds.length;
    let processed = 0;
    const failed: Array<{ id: number; error: string }> = [];

    for (let i = 0; i < ticketIds.length; i += CHUNK_SIZE) {
      const currentJob = await JobModel.findById(jobId);
      if (currentJob?.status === 'canceled') {
        logger.info(`Job ${jobId} was canceled during processing`);
        await JobModel.updateStatus(jobId, 'canceled');
        await emitProgress(jobId, Math.round((processed / total) * 100), processed);
        return;
      }

      const chunk = ticketIds.slice(i, i + CHUNK_SIZE);
      
      try {
        const deletedIds = await TicketModel.bulkSoftDelete(chunk);
        
        for (const id of deletedIds) {
          await JobItemModel.create(jobId, id, 'succeeded');
          await emitJobItem(jobId, id, 'succeeded');
          processed++;
        }

        for (const id of chunk) {
          if (!deletedIds.includes(id)) {
            // Check if ticket exists but is already deleted
            const ticketCheck = await pool.query(
              'SELECT id, deleted_at FROM tickets WHERE id = $1',
              [id]
            );
            
            let error = 'Ticket not found';
            if (ticketCheck.rows.length > 0 && ticketCheck.rows[0].deleted_at) {
              error = 'Ticket already deleted';
            }
            
            await JobItemModel.create(jobId, id, 'failed', error);
            await emitJobItem(jobId, id, 'failed', error);
            failed.push({ id, error });
            processed++;
          }
        }

        const progress = Math.round((processed / total) * 100);
        await JobModel.updateProgress(jobId, progress, processed);
        await emitProgress(jobId, progress, processed);

        logger.debug(`Job ${jobId}: Processed ${processed}/${total} tickets (${progress}%)`);
      } catch (chunkError: any) {
        logger.error(`Error processing chunk for job ${jobId}:`, chunkError);
        
        for (const id of chunk) {
          const error = chunkError.message || 'Unknown error';
          await JobItemModel.create(jobId, id, 'failed', error);
          await emitJobItem(jobId, id, 'failed', error);
          failed.push({ id, error });
          processed++;
        }

        const progress = Math.round((processed / total) * 100);
        await JobModel.updateProgress(jobId, progress, processed);
        await emitProgress(jobId, progress, processed);
      }
    }

    if (failed.length === 0) {
      await JobModel.updateStatus(jobId, 'succeeded');
      await emitCompleted(jobId);
      logger.info(`Job ${jobId} completed successfully`);
    } else {
      await JobModel.updateStatus(jobId, 'succeeded');
      await emitCompleted(jobId);
      logger.info(`Job ${jobId} completed with ${failed.length} failures`);
    }
  } catch (error: any) {
    logger.error(`Job ${jobId} failed:`, error);
    await JobModel.updateStatus(jobId, 'failed', error.message);
    await emitFailed(jobId, error.message);
    throw error;
  }
}

async function emitProgress(jobId: number, progress: number, processedItems: number) {
  try {
    await apiClient.post('/internal/jobs/progress', {
      jobId,
      progress,
      processedItems,
    });
  } catch (error) {
    logger.error(`Failed to emit progress for job ${jobId}:`, error);
  }
}

async function emitJobItem(jobId: number, itemId: number, status: string, error?: string) {
  try {
    await apiClient.post('/internal/jobs/item', {
      jobId,
      itemId,
      status,
      error,
    });
  } catch (error) {
    logger.error(`Failed to emit job item for job ${jobId}:`, error);
  }
}

async function emitCompleted(jobId: number) {
  try {
    const job = await JobModel.findById(jobId);
    await apiClient.post('/internal/jobs/completed', {
      jobId,
      job,
    });
  } catch (error) {
    logger.error(`Failed to emit completed for job ${jobId}:`, error);
  }
}

async function emitFailed(jobId: number, error: string) {
  try {
    await apiClient.post('/internal/jobs/failed', {
      jobId,
      error,
    });
  } catch (error) {
    logger.error(`Failed to emit failed for job ${jobId}:`, error);
  }
}

