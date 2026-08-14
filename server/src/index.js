import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { chatRoutes } from './routes/chat.js';
import { servicesRoutes } from './routes/services.js';
import { appointmentsRoutes } from './routes/appointments.js';
import { availabilityRoutes } from './routes/availability.js';
import { errorHandler } from './middleware/errorHandler.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  credentials: true,
}));
app.use(express.json({ limit: '10kb' })); // prevent huge payloads

// Routes
app.use('/api/chat', chatRoutes);
app.use('/api/services', servicesRoutes);
app.use('/api/appointments', appointmentsRoutes);
app.use('/api/availability', availabilityRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handler (must be last)
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
