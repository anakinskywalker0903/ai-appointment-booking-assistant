import { Router } from 'express';

export const appointmentsRoutes = Router();

// GET  /api/appointments    — list all (admin)
// POST /api/appointments    — create booking
// PATCH /api/appointments/:id — update status
appointmentsRoutes.get('/', (req, res) => {
  res.json({ message: 'Appointments endpoint coming in Milestone 3' });
});
