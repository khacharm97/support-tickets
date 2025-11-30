import { Router, Request, Response } from 'express';
import {
  emitJobProgress,
  emitJobItem,
  emitJobCompleted,
  emitJobFailed,
} from '../socket/socketHandler';
import { JobModel } from '../models/job';
import { logger } from '../config/logger';

const router = Router();

// Internal routes for worker to emit socket events
router.post('/jobs/progress', async (req: Request, res: Response) => {
  try {
    const { jobId, progress, processedItems } = req.body;
    const job = await JobModel.findById(jobId);
    
    if (!job || !job.user_id) {
      return res.status(404).json({ error: 'Job not found or has no user' });
    }
    
    emitJobProgress(jobId, progress, processedItems, job.user_id);
    res.json({ success: true });
  } catch (error) {
    logger.error('Error emitting job progress:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/jobs/item', async (req: Request, res: Response) => {
  try {
    const { jobId, itemId, status, error } = req.body;
    const job = await JobModel.findById(jobId);
    
    if (!job || !job.user_id) {
      return res.status(404).json({ error: 'Job not found or has no user' });
    }
    
    emitJobItem(jobId, itemId, status, job.user_id, error);
    res.json({ success: true });
  } catch (error) {
    logger.error('Error emitting job item:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/jobs/completed', async (req: Request, res: Response) => {
  try {
    const { jobId, job } = req.body;
    const jobRecord = await JobModel.findById(jobId);
    
    if (!jobRecord || !jobRecord.user_id) {
      return res.status(404).json({ error: 'Job not found or has no user' });
    }
    
    emitJobCompleted(jobId, job || jobRecord, jobRecord.user_id);
    res.json({ success: true });
  } catch (error) {
    logger.error('Error emitting job completed:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/jobs/failed', async (req: Request, res: Response) => {
  try {
    const { jobId, error } = req.body;
    const job = await JobModel.findById(jobId);
    
    if (!job || !job.user_id) {
      return res.status(404).json({ error: 'Job not found or has no user' });
    }
    
    emitJobFailed(jobId, error, job.user_id);
    res.json({ success: true });
  } catch (error) {
    logger.error('Error emitting job failed:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

