import { Router } from 'express';

export const availabilityRoutes = Router();

// GET /api/availability?date=YYYY-MM-DD — implemented in Milestone 4
availabilityRoutes.get('/', (req, res) => {
  res.json({ message: 'Availability endpoint coming in Milestone 4' });
});
