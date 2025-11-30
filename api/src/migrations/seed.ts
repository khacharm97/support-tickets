import { pool } from '../config/database';
import { logger } from '../config/logger';
import bcrypt from 'bcrypt';

const generateTickets = (count: number) => {
  const titles = [
    'Login issue', 'Password reset', 'Feature request', 'Bug report', 'Account locked',
    'Payment issue', 'Email not received', 'Profile update', 'API error', 'Slow performance',
    'Data export', 'Subscription issue', 'Notification bug', 'UI glitch', 'Search not working',
    'File upload error', 'Session timeout', 'Mobile app crash', 'Integration issue', 'Report generation',
    'Dashboard loading', 'Settings not saving', 'Export failed', 'Import error', 'Sync problem',
    'Calendar not updating', 'Contact missing', 'Message not sent', 'Attachment too large', 'Permission denied',
    'Access denied', 'Page not found', 'Server error', 'Timeout error', 'Connection lost',
    'Data corrupted', 'Backup failed', 'Restore incomplete', 'Migration stuck', 'Update required'
  ];
  
  const descriptions = [
    'Cannot log in to the system', 'Need to reset my password', 'Add dark mode support',
    'Button not working on mobile', 'My account is locked', 'Payment not processing',
    'Did not receive confirmation email', 'Cannot update profile picture', 'Getting 500 error from API',
    'Application is very slow', 'Need to export my data', 'Subscription not renewing',
    'Not receiving notifications', 'Text overlapping on dashboard', 'Search functionality broken',
    'Cannot upload files', 'Getting logged out frequently', 'App crashes on iOS',
    'Third-party integration not working', 'Cannot generate reports', 'Page takes too long to load',
    'Changes are not being saved', 'Export process fails', 'Import shows errors',
    'Data synchronization issue', 'Calendar events missing', 'Contact information lost',
    'Messages not being delivered', 'File size exceeds limit', 'Insufficient permissions',
    'Unable to access resource', '404 error on page', 'Internal server error',
    'Request times out', 'Network connection lost', 'Data integrity compromised',
    'Backup process failed', 'Restore incomplete', 'Migration process stuck', 'System update needed'
  ];
  
  const statuses = ['open', 'in_progress', 'resolved', 'closed'];
  
  const tickets = [];
  for (let i = 1; i <= count; i++) {
    const titleIndex = (i - 1) % titles.length;
    const descIndex = (i - 1) % descriptions.length;
    const statusIndex = Math.floor(Math.random() * statuses.length);
    
    tickets.push({
      title: `${titles[titleIndex]} #${i}`,
      description: `${descriptions[descIndex]} (Ticket ${i})`,
      status: statuses[statusIndex]
    });
  }
  
  return tickets;
};

const sampleTickets = generateTickets(1000);

async function seed() {
  try {
    const userCheck = await pool.query('SELECT COUNT(*) FROM users');
    const userCount = parseInt(userCheck.rows[0].count);

    if (userCount === 0) {
      const adminHash = await bcrypt.hash('admin123', 10);
      const userHash = await bcrypt.hash('user123', 10);

      await pool.query(
        'INSERT INTO users (email, password_hash, role, created_at, updated_at) VALUES ($1, $2, $3, NOW(), NOW())',
        ['admin1@example.com', adminHash, 'admin']
      );

      await pool.query(
        'INSERT INTO users (email, password_hash, role, created_at, updated_at) VALUES ($1, $2, $3, NOW(), NOW())',
        ['user@example.com', userHash, 'user']
      );

      await pool.query(
        'INSERT INTO users (email, password_hash, role, created_at, updated_at) VALUES ($1, $2, $3, NOW(), NOW())',
        ['admin2@example.com', adminHash, 'admin']
      );

      logger.info('Seeded 3 users (admin1@example.com/admin123, user@example.com/user123 and admin2@example.com/admin123)');
    } else {
      logger.info(`Users already exist (${userCount} users)`);
    }

    const checkResult = await pool.query('SELECT COUNT(*) FROM tickets');
    const count = parseInt(checkResult.rows[0].count);

    if (count > 0) {
      logger.info(`Database already seeded with ${count} tickets`);
      process.exit(0);
    }

    const BATCH_SIZE = 100;
    let inserted = 0;
    
    for (let i = 0; i < sampleTickets.length; i += BATCH_SIZE) {
      const batch = sampleTickets.slice(i, i + BATCH_SIZE);
      const values: string[] = [];
      const params: any[] = [];
      
      batch.forEach((ticket, idx) => {
        const paramStart = idx * 3 + 1;
        values.push(`($${paramStart}, $${paramStart + 1}, $${paramStart + 2}, NOW(), NOW())`);
        params.push(ticket.title, ticket.description, ticket.status);
      });
      
      await pool.query(
        `INSERT INTO tickets (title, description, status, created_at, updated_at) VALUES ${values.join(', ')}`,
        params
      );
      
      inserted += batch.length;
      logger.info(`Inserted ${inserted}/${sampleTickets.length} tickets...`);
    }

    logger.info(`Successfully seeded ${sampleTickets.length} tickets`);
    process.exit(0);
  } catch (error) {
    logger.error('Seeding failed:', error);
    process.exit(1);
  }
}

seed();

