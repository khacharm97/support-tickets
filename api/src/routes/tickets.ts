import { Router, Response } from 'express';
import { TicketService } from '../services/ticketService';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth';
import { logger } from '../config/logger';

const router = Router();

router.use(authenticate);

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    
    const result = await TicketService.listTickets(page, limit);
    
    res.json({
      tickets: result.tickets,
      pagination: {
        page,
        limit,
        total: result.total,
        totalPages: Math.ceil(result.total / limit),
      },
    });
  } catch (error) {
    logger.error('Error listing tickets:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const ticket = await TicketService.getTicket(id);
    
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    
    res.json(ticket);
  } catch (error) {
    logger.error('Error getting ticket:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST, PUT, DELETE routes - admin only
router.post('/', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { title, description, status } = req.body;
    
    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }
    
    const ticket = await TicketService.createTicket({
      title,
      description,
      status,
    });
    
    res.status(201).json(ticket);
  } catch (error) {
    logger.error('Error creating ticket:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { title, description, status } = req.body;
    
    const ticket = await TicketService.updateTicket(id, {
      title,
      description,
      status,
    });
    
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    
    res.json(ticket);
  } catch (error) {
    logger.error('Error updating ticket:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const deleted = await TicketService.deleteTicket(id);
    
    if (!deleted) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    
    res.json({ message: 'Ticket deleted successfully' });
  } catch (error) {
    logger.error('Error deleting ticket:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
