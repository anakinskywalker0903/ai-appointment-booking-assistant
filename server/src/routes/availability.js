import { Router } from 'express';
import { getAvailability } from '../controllers/availabilityController.js';

export const availabilityRoutes = Router();

availabilityRoutes.get('/', getAvailability);
