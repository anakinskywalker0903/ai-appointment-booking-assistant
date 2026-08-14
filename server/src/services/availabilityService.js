import dayjs from 'dayjs';
import { supabase } from '../db/supabase.js';

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
 * Get booked time slots for a specific employee on a date.
 * @param {string} employeeId
 * @param {string} date - YYYY-MM-DD
 * @returns {Set<string>} booked HH:MM times
 */
export async function getBookedSlotsForEmployee(employeeId, date) {
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
 * Get available slots for a specific employee on a date.
 * Filters past slots if date is today.
 */
export async function getAvailableSlotsForEmployee(employeeId, date) {
  const bookedTimes = await getBookedSlotsForEmployee(employeeId, date);
  const allSlots = generateSlots();
  const now = dayjs();
  const isToday = dayjs(date).isSame(now, 'day');

  return allSlots.filter(slot => {
    if (bookedTimes.has(slot)) return false;
    if (isToday) {
      const [hh, mm] = slot.split(':').map(Number);
      const slotDt = now.startOf('day').add(hh * 60 + mm, 'minute');
      if (slotDt.isBefore(now)) return false;
    }
    return true;
  });
}

/**
 * Find the best available employee+slot near the requested time.
 * Used when customer has no preference ("anyone is fine").
 *
 * @param {string} serviceId
 * @param {string} date
 * @param {string|null} preferredTime - HH:MM or null
 * @returns {Array} [{employee, availableSlots, bestSlot}] sorted by proximity to preferredTime
 */
export async function findBestAvailable(serviceId, date, preferredTime) {
  const employees = await getEmployeesForService(serviceId);
  if (employees.length === 0) return [];

  const results = [];

  for (const employee of employees) {
    const slots = await getAvailableSlotsForEmployee(employee.id, date);
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
 * Check if a specific employee is available at a specific time on a date.
 */
export async function isSlotAvailable(employeeId, date, time) {
  const booked = await getBookedSlotsForEmployee(employeeId, date);
  return !booked.has(time);
}

/**
 * Get alternatives near a requested time for a specific employee.
 */
export async function getAlternativesForEmployee(employeeId, date, requestedTime, count = 3) {
  const available = await getAvailableSlotsForEmployee(employeeId, date);
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
