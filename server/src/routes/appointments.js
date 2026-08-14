import { Router } from 'express';
import {
  getAppointments,
  createAppointment,
  updateAppointmentStatus,
} from '../controllers/appointmentsController.js';

export const appointmentsRoutes = Router();

appointmentsRoutes.get('/',     getAppointments);
appointmentsRoutes.post('/',    createAppointment);
appointmentsRoutes.patch('/:id', updateAppointmentStatus);
