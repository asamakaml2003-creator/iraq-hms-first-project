import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import path from 'path';
import routes from './routes';
import { prisma } from './utils/db';

const app = express();
const httpServer = createServer(app);

const io = new SocketServer(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

app.use('/api', routes);

// Real-time: emit events to connected clients
io.on('connection', (socket) => {
  socket.on('join-hospital', (hospitalId: string) => {
    socket.join(`hospital:${hospitalId}`);
  });
  socket.on('disconnect', () => {});
});

// Attach io to app for use in controllers
app.set('io', io);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Global error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message ?? 'Internal server error' });
});

const PORT = Number(process.env.PORT ?? 3001);

async function start() {
  await prisma.$connect();
  httpServer.listen(PORT, () => {
    console.log(`Iraq HMS Backend running on http://localhost:${PORT}`);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
