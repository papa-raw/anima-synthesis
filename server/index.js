import express from 'express';
import cors from 'cors';
import { initDb } from './db/init.js';
import agentsRouter from './routes/agents.js';
import captureRouter from './routes/capture.js';
import heartbeatsRouter from './routes/heartbeats.js';
import chatRouter from './routes/chat.js';
import { startAgentLoops } from './services/agentLoop.js';

const app = express();
app.use(cors());
app.use(express.json());

// Initialize database
const db = initDb();

// Routes
app.use('/api/agents', agentsRouter);
app.use('/api/capture', captureRouter);
app.use('/api/heartbeats', heartbeatsRouter);
app.use('/api/chat', chatRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', agents: db.prepare('SELECT COUNT(*) as count FROM agents').get().count });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Anima server running on :${PORT}`);
  // Start agent autonomy loops after server is ready
  startAgentLoops(db);
});
