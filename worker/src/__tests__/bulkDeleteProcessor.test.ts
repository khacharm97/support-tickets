import { Job } from 'bullmq';
import { processBulkDelete, BulkDeleteJobData } from '../processors/bulkDeleteProcessor';
import { JobModel } from '../models/job';
import { TicketModel } from '../models/ticket';
import { JobItemModel } from '../models/jobItem';

jest.mock('../models/job');
jest.mock('../models/ticket');
jest.mock('../models/jobItem');
jest.mock('../config/api');
jest.mock('../config/database', () => ({
  pool: {
    query: jest.fn(),
  },
}));

describe('processBulkDelete', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should process bulk delete job successfully', async () => {
    const jobData: BulkDeleteJobData = {
      jobId: 1,
      ticketIds: [1, 2, 3],
    };

    const mockJob = {
      data: jobData,
      id: 'job-1',
    } as unknown as Job<BulkDeleteJobData>;

    (JobModel.findById as jest.Mock).mockResolvedValue({
      id: 1,
      status: 'queued',
      progress: 0,
      total_items: 3,
      processed_items: 0,
    });

    (TicketModel.bulkSoftDelete as jest.Mock).mockResolvedValue([1, 2, 3]);
    
    (JobItemModel.create as jest.Mock).mockResolvedValue(undefined);
    (JobModel.updateProgress as jest.Mock).mockResolvedValue(undefined);

    await processBulkDelete(mockJob);

    expect(JobModel.updateStatus).toHaveBeenCalledWith(1, 'running');
    expect(TicketModel.bulkSoftDelete).toHaveBeenCalledWith([1, 2, 3]);
    expect(JobModel.updateStatus).toHaveBeenCalledWith(1, 'succeeded');
  });

  it('should handle cancellation during processing', async () => {
    const jobData: BulkDeleteJobData = {
      jobId: 1,
      ticketIds: [1, 2, 3],
    };

    const mockJob = {
      data: jobData,
      id: 'job-1',
    } as unknown as Job<BulkDeleteJobData>;

    (JobModel.findById as jest.Mock)
      .mockResolvedValueOnce({
        id: 1,
        status: 'queued',
        progress: 0,
        total_items: 3,
        processed_items: 0,
      })
      .mockResolvedValueOnce({
        id: 1,
        status: 'canceled',
        progress: 0,
        total_items: 3,
        processed_items: 0,
      });

    (TicketModel.bulkSoftDelete as jest.Mock).mockResolvedValue([1]);

    await processBulkDelete(mockJob);

    expect(JobModel.updateStatus).toHaveBeenCalledWith(1, 'canceled');
  });
});

