# Support Ticket Manager

A full-stack application for managing support tickets with bulk operations, background job processing, and real-time updates.

## Architecture

- **Backend API**: Express.js with PostgreSQL
- **Worker**: Separate Node.js process for processing background jobs using BullMQ
- **Frontend**: React with Ant Design
- **Real-time**: Socket.io for live job progress updates
- **Queue**: Redis + BullMQ for job management

## Prerequisites

- Docker and Docker Compose
- Node.js 20+ (for local development)

## Quick Start

1. **Set up environment variables:**
   ```bash
   cp api/.env.sample api/.env
   cp worker/.env.sample worker/.env
   cp web/.env.sample web/.env
   ```

2. **Start all services:**
   ```bash
   docker compose up --build
   ```

3. **Seed the database (creates users and sample tickets):**
   ```bash
   docker compose exec api npm run seed
   ```
   
   This creates:
   - Admin user: `admin1@example.com` / `admin123`
   - Admin user: `admin2@example.com` / `admin123`
   - Regular user: `user@example.com` / `user123`
   - 1000 sample tickets

4. **Access the application:**
   - Frontend: http://localhost:3000
   - API: http://localhost:3001
   - API Health: http://localhost:3001/health

## Project Structure

```
.
├── api/                 # Express backend
│   ├── src/
│   │   ├── models/     # Database models
│   │   ├── migrations/ # Database migrations
│   │   ├── routes/     # API routes
│   │   ├── services/   # Business logic
│   │   ├── queue/      # BullMQ setup
│   │   └── socket/     # Socket.io setup
│   └── Dockerfile
├── worker/             # Background job worker
│   ├── src/
│   │   └── processors/ # Job processors
│   └── Dockerfile
├── web/                # React frontend
│   ├── src/
│   │   ├── pages/      # Page components
│   │   ├── components/ # Reusable components
│   │   ├── services/   # API client
│   │   └── hooks/      # Custom hooks
│   └── Dockerfile
└── docker-compose.yml
```

## Development

### Running Locally (without Docker)

1. **Start PostgreSQL and Redis:**
   ```bash
   docker compose up postgres redis
   ```

2. **Install dependencies:**
   ```bash
   cd api && npm install
   cd ../worker && npm install
   cd ../web && npm install
   ```

3. **Run migrations:**
   ```bash
   cd api && npm run migrate
   ```

4. **Seed database:**
   ```bash
   cd api && npm run seed
   ```

5. **Start services:**
   ```bash
   # Terminal 1: API
   cd api && npm run dev
   
   # Terminal 2: Worker
   cd worker && npm run dev
   
   # Terminal 3: Frontend
   cd web && npm start
   ```

## Testing

Run tests:
```bash
cd api && npm test
cd worker && npm test
```