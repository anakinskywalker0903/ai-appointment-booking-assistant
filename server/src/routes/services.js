import { Router } from 'express';

export const servicesRoutes = Router();

// GET /api/services — implemented in Milestone 3
servicesRoutes.get('/', (req, res) => {
  res.json({ message: 'Services endpoint coming in Milestone 3' });
});
