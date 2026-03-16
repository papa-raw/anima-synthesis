import express from 'express';
import cors from 'cors';
import { initDb } from './db/init.js';
import agentsRouter from './routes/agents.js';
import captureRouter from './routes/capture.js';

const app = express();
app.use(cors());
app.use(express.json());

// Initialize database
const db = initDb();

// Routes
app.use('/api/agents', agentsRouter);
app.use('/api/capture', captureRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', agents: db.prepare('SELECT COUNT(*) as count FROM agents').get().count });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Anima server running on :${PORT}`);
});
