import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import dotenv from 'dotenv';
import ticketRoutes from './routes/tickets';
import jobRoutes from './routes/jobs';
import authRoutes from './routes/auth';
import internalRoutes from './routes/internal';
import { initializeSocket } from './socket/socketHandler';
import { logger } from './config/logger';
import { pool } from './config/database';
import { runMigrationsOnStartup } from './startup';

dotenv.config();

const app = express();
const server = createServer(app);

// Initialize Socket.IO
initializeSocket(server);

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Routes
app.use('/auth', authRoutes);
app.use('/tickets', ticketRoutes);
app.use('/jobs', jobRoutes);
app.use('/internal', internalRoutes);

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = parseInt(process.env.PORT || '3001', 10);

// Test database connection and run migrations
pool.query('SELECT NOW()')
  .then(async () => {
    logger.info('Database connected');
    await runMigrationsOnStartup();
    server.listen(PORT, '0.0.0.0', () => {
      logger.info(`API server running on port ${PORT}`);
    });
  })
  .catch((error) => {
    logger.error('Database connection failed:', error);
    process.exit(1);
  });

