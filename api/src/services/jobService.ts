import { JobModel, CreateJobInput } from '../models/job';
import { enqueueBulkDelete } from '../queue/jobQueue';
import { logger } from '../config/logger';

export class JobService {
  static async createBulkDeleteJob(userId: number, ticketIds: number[], idempotencyKey?: string) {
    // Check idempotency (user-scoped)
    if (idempotencyKey) {
      const existing = await JobModel.findByIdempotencyKey(userId, idempotencyKey);
      if (existing) {
        logger.info(`Returning existing job for user ${userId} with idempotency key: ${idempotencyKey}`);
        return existing;
      }
    }

    // Create job record with all ticket IDs
    // The processor will handle already-deleted tickets by marking them as failed
    const job = await JobModel.create({
      type: 'bulk_delete',
      userId,
      idempotencyKey: idempotencyKey,
      metadata: {
        ticketIds,
        totalItems: ticketIds.length,
      },
    });

    // Enqueue the job - processor will skip already-deleted tickets
    await enqueueBulkDelete(job.id, ticketIds);

    logger.info(`Created bulk delete job ${job.id} for user ${userId} with ${ticketIds.length} tickets`);

    return job;
  }

  static async getJob(id: number) {
    return JobModel.findById(id);
  }

  static async listJobs(filter: { type?: string; status?: string; userId?: number; page?: number; limit?: number }) {
    // Convert string types to proper types for JobFilter
    const jobFilter: any = {
      page: filter.page,
      limit: filter.limit,
      userId: filter.userId,
    };
    
    if (filter.type === 'bulk_delete') {
      jobFilter.type = filter.type;
    }
    
    if (filter.status && ['queued', 'running', 'succeeded', 'failed', 'canceled'].includes(filter.status)) {
      jobFilter.status = filter.status as any;
    }
    
    return JobModel.findAll(jobFilter);
  }

  static async cancelJob(id: number) {
    const job = await JobModel.cancel(id);
    if (job) {
      logger.info(`Canceled job ${id}`);
    }
    return job;
  }
}

