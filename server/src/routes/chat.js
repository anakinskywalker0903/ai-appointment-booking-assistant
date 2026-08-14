import { Router } from 'express';

export const chatRoutes = Router();

// POST /api/chat — main chat endpoint (wired up in Milestone 5)
chatRoutes.post('/', (req, res) => {
  res.json({ message: 'Chat endpoint coming in Milestone 5' });
});
