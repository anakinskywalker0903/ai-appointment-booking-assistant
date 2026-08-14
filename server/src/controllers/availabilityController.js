import dayjs from 'dayjs';
import { supabase } from '../db/supabase.js';

// Business hours: 9 AM – 6 PM, Mon–Sat (slot every 30 min)
const BUSINESS_START = 9;   // 9:00
const BUSINESS_END   = 18;  // 18:00 (last slot starts at 17:30)
const SLOT_MINUTES   = 30;

/**
 * Generate all possible time slots for a business day.
 * Returns array of 'HH:MM' strings.
 */
function generateSlots() {
  const slots = [];
  let current = BUSINESS_START * 60; // minutes from midnight
  const end = BUSINESS_END * 60;

  while (current < end) {
    const hh = String(Math.floor(current / 60)).padStart(2, '0');
    const mm = String(current % 60).padStart(2, '0');
    slots.push(`${hh}:${mm}`);
    current += SLOT_MINUTES;
  }
  return slots;
}

/**
 * GET /api/availability?date=YYYY-MM-DD
 * Returns available time slots for a given date.
 */
export async function getAvailability(req, res, next) {
  try {
    const { date } = req.query;

    // Validate date param
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: 'date query param required in YYYY-MM-DD format.' });
    }

    const requestedDate = dayjs(date);

    // Reject past dates
    if (requestedDate.isBefore(dayjs().startOf('day'))) {
      return res.status(400).json({ error: 'Cannot check availability for past dates.' });
    }

    // Reject Sundays (day 0)
    if (requestedDate.day() === 0) {
      return res.json({ date, available: [], message: 'We are closed on Sundays.' });
    }

    // Fetch booked slots for this date (exclude cancelled)
    const { data: booked, error } = await supabase
      .from('appointments')
      .select('appointment_time')
      .eq('appointment_date', date)
      .neq('status', 'cancelled');

    if (error) throw error;

    const bookedTimes = new Set(booked.map(b => b.appointment_time.slice(0, 5))); // 'HH:MM'

    // If today, filter out past slots
    const now = dayjs();
    const isToday = requestedDate.isSame(now, 'day');

    const allSlots = generateSlots();
    const available = allSlots.filter(slot => {
      if (bookedTimes.has(slot)) return false;
      if (isToday) {
        const [hh, mm] = slot.split(':').map(Number);
        const slotTime = now.startOf('day').add(hh * 60 + mm, 'minute');
        if (slotTime.isBefore(now)) return false;
      }
      return true;
    });

    res.json({ date, available });
  } catch (err) {
    next(err);
  }
}
