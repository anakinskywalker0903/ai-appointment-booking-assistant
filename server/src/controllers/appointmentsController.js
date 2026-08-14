import { z } from 'zod';
import dayjs from 'dayjs';
import { supabase } from '../db/supabase.js';

// ── Validation schemas ──────────────────────────────────────────────────────

const createAppointmentSchema = z.object({
  customerName:    z.string().min(1, 'Customer name is required').max(100),
  customerEmail:   z.string().email('Invalid email address'),
  serviceId:       z.string().uuid('Invalid service ID'),
  appointmentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  appointmentTime: z.string().regex(/^\d{2}:\d{2}$/, 'Time must be HH:MM'),
  notes:           z.string().max(500).optional(),
});

const updateStatusSchema = z.object({
  status: z.enum(['pending', 'confirmed', 'cancelled']),
});

// ── Helpers ─────────────────────────────────────────────────────────────────

function isDateInPast(date, time) {
  const appointmentDt = dayjs(`${date}T${time}`);
  return appointmentDt.isBefore(dayjs());
}

// ── Controllers ─────────────────────────────────────────────────────────────

/**
 * GET /api/appointments
 * Returns all appointments (for admin dashboard).
 * Optional ?status=pending|confirmed|cancelled filter.
 */
export async function getAppointments(req, res, next) {
  try {
    const { status } = req.query;

    let query = supabase
      .from('appointments')
      .select(`
        id,
        customer_name,
        customer_email,
        appointment_date,
        appointment_time,
        status,
        notes,
        created_at,
        services ( id, name, duration_minutes )
      `)
      .order('appointment_date', { ascending: true })
      .order('appointment_time', { ascending: true });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (error) throw error;

    res.json({ appointments: data });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/appointments
 * Creates a new appointment after full backend validation.
 */
export async function createAppointment(req, res, next) {
  try {
    // 1. Validate request body shape
    const parsed = createAppointmentSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: parsed.error.flatten().fieldErrors,
      });
    }

    const { customerName, customerEmail, serviceId, appointmentDate, appointmentTime, notes } = parsed.data;

    // 2. Reject past dates/times
    if (isDateInPast(appointmentDate, appointmentTime)) {
      return res.status(400).json({ error: 'Cannot book an appointment in the past.' });
    }

    // 3. Verify service exists and is active
    const { data: service, error: serviceError } = await supabase
      .from('services')
      .select('id, name')
      .eq('id', serviceId)
      .eq('is_active', true)
      .single();

    if (serviceError || !service) {
      return res.status(400).json({ error: 'The requested service does not exist or is unavailable.' });
    }

    // 4. Check slot availability (unique constraint would also catch this, but give a friendly error first)
    const { data: existing } = await supabase
      .from('appointments')
      .select('id')
      .eq('appointment_date', appointmentDate)
      .eq('appointment_time', appointmentTime)
      .neq('status', 'cancelled') // cancelled slots are free again
      .maybeSingle();

    if (existing) {
      return res.status(409).json({ error: 'That time slot is already booked. Please choose a different time.' });
    }

    // 5. Create the appointment
    const { data: appointment, error: insertError } = await supabase
      .from('appointments')
      .insert({
        customer_name:    customerName,
        customer_email:   customerEmail,
        service_id:       serviceId,
        appointment_date: appointmentDate,
        appointment_time: appointmentTime,
        notes:            notes || null,
        status:           'pending',
      })
      .select(`
        id,
        customer_name,
        customer_email,
        appointment_date,
        appointment_time,
        status,
        notes,
        created_at,
        services ( id, name, duration_minutes )
      `)
      .single();

    if (insertError) {
      // Handle unique constraint violation as a fallback
      if (insertError.code === '23505') {
        return res.status(409).json({ error: 'That time slot was just booked. Please choose a different time.' });
      }
      throw insertError;
    }

    res.status(201).json({ appointment });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/appointments/:id
 * Updates appointment status (admin: confirm or cancel).
 */
export async function updateAppointmentStatus(req, res, next) {
  try {
    const { id } = req.params;

    const parsed = updateStatusSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Invalid status. Must be pending, confirmed, or cancelled.',
      });
    }

    const { data: appointment, error } = await supabase
      .from('appointments')
      .update({ status: parsed.data.status })
      .eq('id', id)
      .select('id, status, customer_name, appointment_date, appointment_time')
      .single();

    if (error || !appointment) {
      return res.status(404).json({ error: 'Appointment not found.' });
    }

    res.json({ appointment });
  } catch (err) {
    next(err);
  }
}
