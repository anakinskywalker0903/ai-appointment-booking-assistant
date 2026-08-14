import { Router } from 'express';
import { handleChat } from '../controllers/chatController.js';

export const chatRoutes = Router();

chatRoutes.post('/', handleChat);
