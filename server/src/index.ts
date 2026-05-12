import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
} from '@lcars-vtt/shared';
import { GameStateManager } from './gameState';
import { registerHandlers } from './socketHandlers';
import authRouter from './routes/auth';
import roomsRouter from './routes/rooms';

const PORT = parseInt(process.env.PORT ?? '3001', 10);
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN ?? 'http://localhost:5173';

const app = express();
const httpServer = createServer(app);

const io = new Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(httpServer, {
  cors: {
    origin: [CLIENT_ORIGIN, 'http://localhost:5173'],
    methods: ['GET', 'POST'],
  },
});

app.use(express.json());
app.use('/api/auth', authRouter);
app.use('/api/rooms', roomsRouter);

const CLIENT_DIST = path.join(__dirname, '..', '..', 'client', 'dist');
app.use(express.static(CLIENT_DIST));
app.get('*', (_req, res) => {
  res.sendFile(path.join(CLIENT_DIST, 'index.html'));
});

const gameState = new GameStateManager();

io.on('connection', (socket) => {
  registerHandlers(io, socket, gameState);
});

httpServer.listen(PORT, () => {
  console.log(`LCARS VTT server running on port ${PORT}`);
});
