import { Router } from 'express';
import { getServices } from '../controllers/servicesController.js';

export const servicesRoutes = Router();

servicesRoutes.get('/', getServices);
