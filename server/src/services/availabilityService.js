import dayjs from 'dayjs';
import { supabase } from '../db/supabase.js';
import { getCalendarClient, isConnected as isCalendarConnected } from './calendarService.js';

const BUSINESS_START = 9;   // 9:00 AM
const BUSINESS_END   = 18;  // 6:00 PM
const SLOT_MINUTES   = 30;

/**
 * Generate all possible 30-min slots for a business day.
 */
export function generateSlots() {
  const slots = [];
  let current = BUSINESS_START * 60;
  while (current < BUSINESS_END * 60) {
    const hh = String(Math.floor(current / 60)).padStart(2, '0');
    const mm = String(current % 60).padStart(2, '0');
    slots.push(`${hh}:${mm}`);
    current += SLOT_MINUTES;
  }
  return slots;
}

/**
 * Get employees who can perform a given service.
 * @param {string} serviceId
 * @returns {Array} employees
 */
export async function getEmployeesForService(serviceId) {
  const { data, error } = await supabase
    .from('employee_services')
    .select('employees ( id, name, role, is_active )')
    .eq('service_id', serviceId);

  if (error) throw error;

  return data
    .map(row => row.employees)
    .filter(e => e.is_active);
}

/**
 * Get booked time slots for a specific employee on a date from Supabase.
 * @param {string} employeeId
 * @param {string} date - YYYY-MM-DD
 * @returns {Set<string>} booked HH:MM times
 */
export async function getSupabaseBookedSlots(employeeId, date) {
  const { data, error } = await supabase
    .from('appointments')
    .select('appointment_time')
    .eq('employee_id', employeeId)
    .eq('appointment_date', date)
    .neq('status', 'cancelled');

  if (error) throw error;

  return new Set((data || []).map(b => b.appointment_time.slice(0, 5)));
}

/**
 * Get busy intervals from Google Calendar for a given date in IST.
 * Returns array of { startMinutes, endMinutes }.
 */
export async function getGoogleCalendarBusyIntervals(dateStr) {
  if (!isCalendarConnected()) return [];

  const calendar = getCalendarClient();
  if (!calendar) return [];

  try {
    const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';
    const timeMin = new Date(`${dateStr}T00:00:00+05:30`).toISOString();
    const timeMax = new Date(`${dateStr}T23:59:59+05:30`).toISOString();

    const res = await calendar.events.list({
      calendarId,
      timeMin,
      timeMax,
      singleEvents: true,
      orderBy: 'startTime',
    });

    const intervals = [];
    for (const item of res.data.items || []) {
      const startStr = item.start?.dateTime;
      const endStr = item.end?.dateTime;
      if (startStr && endStr) {
        const startDt = dayjs(startStr);
        const endDt = dayjs(endStr);
        const startMinutes = startDt.hour() * 60 + startDt.minute();
        const endMinutes = endDt.hour() * 60 + endDt.minute();
        intervals.push({ startMinutes, endMinutes });
      }
    }
    return intervals;
  } catch (err) {
    console.warn('[CalendarService] Could not fetch calendar events for availability:', err.message);
    return [];
  }
}

/**
 * Check if a time slot has a conflict in Google Calendar.
 */
function hasCalendarConflict(slotHHMM, durationMinutes, busyIntervals) {
  const [hh, mm] = slotHHMM.split(':').map(Number);
  const slotStart = hh * 60 + mm;
  const slotEnd = slotStart + (durationMinutes || 30);

  for (const interval of busyIntervals) {
    // Conflict exists if slot overlaps interval:
    // slotStart < interval.end && slotEnd > interval.start
    if (slotStart < interval.endMinutes && slotEnd > interval.startMinutes) {
      return true;
    }
  }
  return false;
}

/**
 * Get available slots for a specific employee on a date.
 * Combines Supabase appointments AND Google Calendar events.
 */
export async function getAvailableSlotsForEmployee(employeeId, date, durationMinutes = 45) {
  const [supabaseBooked, gcalBusy] = await Promise.all([
    getSupabaseBookedSlots(employeeId, date),
    getGoogleCalendarBusyIntervals(date),
  ]);

  const allSlots = generateSlots();
  const now = dayjs();
  const isToday = dayjs(date).isSame(now, 'day');

  return allSlots.filter(slot => {
    // 1. Check Supabase conflict
    if (supabaseBooked.has(slot)) return false;

    // 2. Check Google Calendar conflict
    if (hasCalendarConflict(slot, durationMinutes, gcalBusy)) return false;

    // 3. Filter past slots if today
    if (isToday) {
      const [hh, mm] = slot.split(':').map(Number);
      const slotDt = now.startOf('day').add(hh * 60 + mm, 'minute');
      if (slotDt.isBefore(now)) return false;
    }

    return true;
  });
}

/**
 * Check if a specific slot is available for an employee on a date.
 * Validates against BOTH Supabase and Google Calendar.
 */
export async function isSlotAvailable(employeeId, date, time, durationMinutes = 45) {
  const [supabaseBooked, gcalBusy] = await Promise.all([
    getSupabaseBookedSlots(employeeId, date),
    getGoogleCalendarBusyIntervals(date),
  ]);

  if (supabaseBooked.has(time)) {
    return false;
  }

  if (hasCalendarConflict(time, durationMinutes, gcalBusy)) {
    return false;
  }

  return true;
}

/**
 * Find the best available employee+slot near the requested time.
 * Used when customer has no preference ("anyone is fine").
 */
export async function findBestAvailable(serviceId, date, preferredTime, durationMinutes = 45) {
  const employees = await getEmployeesForService(serviceId);
  if (employees.length === 0) return [];

  const results = [];

  for (const employee of employees) {
    const slots = await getAvailableSlotsForEmployee(employee.id, date, durationMinutes);
    if (slots.length === 0) continue;

    let bestSlot = slots[0];
    if (preferredTime) {
      const [reqHH, reqMM] = preferredTime.split(':').map(Number);
      const reqMin = reqHH * 60 + reqMM;
      bestSlot = slots.reduce((best, slot) => {
        const [sh, sm] = slot.split(':').map(Number);
        const [bh, bm] = best.split(':').map(Number);
        return Math.abs(sh * 60 + sm - reqMin) < Math.abs(bh * 60 + bm - reqMin)
          ? slot : best;
      });
    }

    results.push({ employee, availableSlots: slots, bestSlot });
  }

  // Sort by how close bestSlot is to preferredTime
  if (preferredTime) {
    const [reqHH, reqMM] = preferredTime.split(':').map(Number);
    const reqMin = reqHH * 60 + reqMM;
    results.sort((a, b) => {
      const [ah, am] = a.bestSlot.split(':').map(Number);
      const [bh, bm] = b.bestSlot.split(':').map(Number);
      return Math.abs(ah * 60 + am - reqMin) - Math.abs(bh * 60 + bm - reqMin);
    });
  }

  return results;
}

/**
 * Get alternatives near a requested time for a specific employee.
 */
export async function getAlternativesForEmployee(employeeId, date, requestedTime, count = 3, durationMinutes = 45) {
  const available = await getAvailableSlotsForEmployee(employeeId, date, durationMinutes);
  if (available.length === 0) return [];

  const [reqHH, reqMM] = requestedTime.split(':').map(Number);
  const reqMin = reqHH * 60 + reqMM;

  return available
    .sort((a, b) => {
      const [ah, am] = a.split(':').map(Number);
      const [bh, bm] = b.split(':').map(Number);
      return Math.abs(ah * 60 + am - reqMin) - Math.abs(bh * 60 + bm - reqMin);
    })
    .slice(0, count);
}
