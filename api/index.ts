import express from 'express';
import cors from 'cors';
import { apiRouter } from '../server/routes';

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Support both /api/... and direct /... routing when deployed on Vercel
app.use('/api', apiRouter);
app.use(apiRouter);

export default app;
