import { JobService } from '../services/jobService';
import { JobModel } from '../models/job';
import { enqueueBulkDelete } from '../queue/jobQueue';

jest.mock('../models/job');
jest.mock('../queue/jobQueue');

describe('JobService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createBulkDeleteJob', () => {
    it('should create a new job when idempotency key does not exist', async () => {
      const userId = 1;
      const ticketIds = [1, 2, 3];
      const idempotencyKey = 'test-key-123';

      (JobModel.findByIdempotencyKey as jest.Mock).mockResolvedValue(null);
      (JobModel.create as jest.Mock).mockResolvedValue({
        id: 1,
        type: 'bulk_delete',
        status: 'queued',
        progress: 0,
        total_items: 3,
        processed_items: 0,
        idempotency_key: idempotencyKey,
        metadata: { ticketIds, totalItems: 3 },
      });

      const job = await JobService.createBulkDeleteJob(userId, ticketIds, idempotencyKey);

      expect(JobModel.findByIdempotencyKey).toHaveBeenCalledWith(userId, idempotencyKey);
      expect(JobModel.create).toHaveBeenCalledWith({
        type: 'bulk_delete',
        userId,
        idempotencyKey,
        metadata: { ticketIds, totalItems: ticketIds.length },
      });
      expect(enqueueBulkDelete).toHaveBeenCalledWith(1, ticketIds);
      expect(job.id).toBe(1);
    });

    it('should return existing job when idempotency key exists', async () => {
      const userId = 1;
      const ticketIds = [1, 2, 3];
      const idempotencyKey = 'test-key-123';
      const existingJob = {
        id: 1,
        type: 'bulk_delete',
        status: 'queued',
        progress: 0,
      };

      (JobModel.findByIdempotencyKey as jest.Mock).mockResolvedValue(existingJob);

      const job = await JobService.createBulkDeleteJob(userId, ticketIds, idempotencyKey);

      expect(JobModel.findByIdempotencyKey).toHaveBeenCalledWith(userId, idempotencyKey);
      expect(JobModel.create).not.toHaveBeenCalled();
      expect(enqueueBulkDelete).not.toHaveBeenCalled();
      expect(job).toEqual(existingJob);
    });
  });
});

