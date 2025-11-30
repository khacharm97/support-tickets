import { Router, Response } from 'express';
import { JobService } from '../services/jobService';
import { JobModel } from '../models/job';
import { JobItemModel } from '../models/jobItem';
import { emitJobCreated } from '../socket/socketHandler';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth';
import { logger } from '../config/logger';

const router = Router();

router.post('/', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { ticketIds, idempotencyKey } = req.body;
    
    if (!Array.isArray(ticketIds) || ticketIds.length === 0) {
      return res.status(400).json({ error: 'ticketIds must be a non-empty array' });
    }
    
    const userId = req.user!.id;
    
    // Check if job already exists (idempotency check) before creating
    let isExistingJob = false;
    if (idempotencyKey) {
      const existing = await JobModel.findByIdempotencyKey(userId, idempotencyKey);
      isExistingJob = existing !== null;
    }
    
    const job = await JobService.createBulkDeleteJob(userId, ticketIds, idempotencyKey);
    
    // Only emit socket event for new jobs, not when returning existing ones
    if (!isExistingJob) {
      emitJobCreated(job.id, job, userId);
    }
    
    // Return 200 for existing jobs, 201 for new jobs
    const statusCode = isExistingJob ? 200 : 201;
    res.status(statusCode).json({
      id: job.id,
      status: job.status,
      progress: job.progress,
      total_items: job.total_items,
      processed_items: job.processed_items,
      created_at: job.created_at,
      updated_at: job.updated_at,
      completed_at: job.completed_at,
    });
  } catch (error) {
    logger.error('Error creating job:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const type = req.query.type as string;
    const status = req.query.status as string;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    
    const userId = req.user!.id;
    const role = req.user!.role;
    
    const filter: any = { type, status, page, limit };
    if (role !== 'admin') {
      filter.userId = userId;
    }
    
    const result = await JobService.listJobs(filter);
    
    res.json({
      jobs: result.jobs,
      pagination: {
        page,
        limit,
        total: result.total,
        totalPages: Math.ceil(result.total / limit),
      },
    });
  } catch (error) {
    logger.error('Error listing jobs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const job = await JobService.getJob(id);
    
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    
    const userId = req.user!.id;
    const role = req.user!.role;
    
    if (role !== 'admin' && job.user_id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const jobItems = await JobItemModel.findByJobId(id);
    
    res.json({
      ...job,
      items: jobItems,
    });
  } catch (error) {
    logger.error('Error getting job:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/:id/cancel', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const job = await JobService.getJob(id);
    
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    
    const userId = req.user!.id;
    const role = req.user!.role;
    
    if (role !== 'admin' && job.user_id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const canceledJob = await JobService.cancelJob(id);
    
    if (!canceledJob) {
      return res.status(400).json({ error: 'Job cannot be canceled' });
    }
    
    res.json(canceledJob);
  } catch (error) {
    logger.error('Error canceling job:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
