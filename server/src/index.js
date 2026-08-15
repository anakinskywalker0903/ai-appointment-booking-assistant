import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { chatRoutes } from './routes/chat.js';
import { servicesRoutes } from './routes/services.js';
import { employeesRoutes } from './routes/employees.js';
import { appointmentsRoutes } from './routes/appointments.js';
import { availabilityRoutes } from './routes/availability.js';
import { calendarRoutes } from './routes/calendar.js';
import { errorHandler } from './middleware/errorHandler.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// CORS Configuration (Supports local dev, production URL, and *.vercel.app domains)
const allowedOrigins = [
  process.env.CLIENT_URL,
  'http://localhost:5173',
  'http://localhost:3000',
  /\.vercel\.app$/,
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    const isAllowed = allowedOrigins.some(allowed =>
      typeof allowed === 'string' ? allowed === origin : allowed.test(origin)
    );
    if (isAllowed) {
      callback(null, true);
    } else {
      callback(null, true); // Permissive fallback in production
    }
  },
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  credentials: true,
}));
app.use(express.json({ limit: '10kb' })); // prevent payload flood attacks

// Routes
app.use('/api/chat', chatRoutes);
app.use('/api/services', servicesRoutes);
app.use('/api/employees', employeesRoutes);
app.use('/api/appointments', appointmentsRoutes);
app.use('/api/availability', availabilityRoutes);
app.use('/api/calendar', calendarRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handler (must be last)
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
