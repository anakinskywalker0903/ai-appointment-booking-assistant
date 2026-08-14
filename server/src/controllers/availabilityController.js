import dayjs from 'dayjs';
import {
  generateSlots,
  getAvailableSlotsForEmployee,
  findBestAvailable,
} from '../services/availabilityService.js';

/**
 * GET /api/availability?date=YYYY-MM-DD[&employeeId=...][&serviceId=...]
 * Returns available time slots for a given date, optionally scoped to employee or service.
 */
export async function getAvailability(req, res, next) {
  try {
    const { date, employeeId, serviceId } = req.query;

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

    if (employeeId) {
      const available = await getAvailableSlotsForEmployee(employeeId, date);
      return res.json({ date, employeeId, available });
    }

    if (serviceId) {
      const bestOptions = await findBestAvailable(serviceId, date, null);
      return res.json({ date, serviceId, options: bestOptions });
    }

    // General availability (union of all standard slots)
    const allSlots = generateSlots();
    const now = dayjs();
    const isToday = requestedDate.isSame(now, 'day');
    const available = allSlots.filter(slot => {
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
