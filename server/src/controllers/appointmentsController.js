import { z } from 'zod';
import dayjs from 'dayjs';
import { supabase } from '../db/supabase.js';
import { isSlotAvailable } from '../services/availabilityService.js';
import { deleteCalendarEvent } from '../services/calendarService.js';

// ── Validation schemas ──────────────────────────────────────────────────────

const createAppointmentSchema = z.object({
  customerName:    z.string().min(1, 'Customer name is required').max(100),
  customerEmail:   z.string().email('Invalid email address'),
  serviceId:       z.string().uuid('Invalid service ID'),
  employeeId:      z.string().uuid('Invalid employee ID').optional(),
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
        calendar_event_id,
        created_at,
        services ( id, name, duration_minutes ),
        employees ( id, name, role )
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

    const { customerName, customerEmail, serviceId, employeeId, appointmentDate, appointmentTime, notes } = parsed.data;

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

    // 4. Verify employee if provided
    let assignedEmployeeId = employeeId;
    if (assignedEmployeeId) {
      const { data: emp, error: empErr } = await supabase
        .from('employees')
        .select('id, name, is_active')
        .eq('id', assignedEmployeeId)
        .eq('is_active', true)
        .single();

      if (empErr || !emp) {
        return res.status(400).json({ error: 'The requested employee is invalid or inactive.' });
      }

      // Check slot availability for this employee
      const slotFree = await isSlotAvailable(assignedEmployeeId, appointmentDate, appointmentTime);
      if (!slotFree) {
        return res.status(409).json({ error: 'That time slot is already booked for this stylist. Please choose a different time.' });
      }
    }

    // 5. Create the appointment
    const { data: appointment, error: insertError } = await supabase
      .from('appointments')
      .insert({
        customer_name:    customerName,
        customer_email:   customerEmail,
        service_id:       serviceId,
        employee_id:      assignedEmployeeId || null,
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
        services ( id, name, duration_minutes ),
        employees ( id, name, role )
      `)
      .single();

    if (insertError) {
      if (insertError.code === '23505') {
        return res.status(409).json({ error: 'That time slot was just booked for this stylist. Please choose a different time.' });
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
      .select('id, status, customer_name, appointment_date, appointment_time, calendar_event_id')
      .single();

    if (error || !appointment) {
      return res.status(404).json({ error: 'Appointment not found.' });
    }

    // If cancelled and calendar event exists, delete event from calendar
    if (parsed.data.status === 'cancelled' && appointment.calendar_event_id) {
      deleteCalendarEvent(appointment.calendar_event_id).catch(err =>
        console.error('[Calendar Cancel Error]', err.message)
      );
    }

    res.json({ appointment });
  } catch (err) {
    next(err);
  }
}
