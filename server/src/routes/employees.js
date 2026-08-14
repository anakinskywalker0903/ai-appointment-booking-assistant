import { Router } from 'express';
import { getEmployees } from '../controllers/employeesController.js';

export const employeesRoutes = Router();

employeesRoutes.get('/', getEmployees);
