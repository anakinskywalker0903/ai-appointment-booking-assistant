import { z } from 'zod';
import dayjs from 'dayjs';
import { extractIntent } from '../ai/gemini.js';
import { supabase } from '../db/supabase.js';

// ── Request validation ───────────────────────────────────────────────────────

const chatRequestSchema = z.object({
  message: z.string().min(1, 'Message cannot be empty').max(2000, 'Message too long'),
  history: z.array(
    z.object({
      role: z.enum(['user', 'model']),
      parts: z.array(z.object({ text: z.string() })),
    })
  ).optional().default([]),
  // Pending booking context — passed back from frontend when awaiting confirmation
  pendingBooking: z.object({
    serviceId:       z.string().uuid(),
    serviceName:     z.string(),
    date:            z.string(),
    time:            z.string(),
    customerName:    z.string(),
    customerEmail:   z.string(),
  }).nullable().optional(),
});

// ── Helpers ──────────────────────────────────────────────────────────────────

function safeServiceMatch(aiServiceName, services) {
  if (!aiServiceName) return null;
  const lower = aiServiceName.toLowerCase().trim();
  return services.find(s => s.name.toLowerCase() === lower) || null;
}

function formatTime(time24) {
  if (!time24) return '';
  const [hh, mm] = time24.split(':').map(Number);
  const period = hh >= 12 ? 'PM' : 'AM';
  const h = hh % 12 || 12;
  return `${h}:${String(mm).padStart(2, '0')} ${period}`;
}

function formatDate(dateStr) {
  return dayjs(dateStr).format('dddd, MMMM D, YYYY');
}

// ── Main chat handler ────────────────────────────────────────────────────────

/**
 * POST /api/chat
 *
 * Flow:
 *  1. Validate request
 *  2. Load active services from DB
 *  3. Call Gemini → get structured intent
 *  4. Backend validates intent fields
 *  5. Route based on intent:
 *     - BOOK_APPOINTMENT → collect info → check availability → confirm → create
 *     - CHECK_AVAILABILITY → query availability → return slots
 *     - CANCEL_APPOINTMENT → update status
 *     - GENERAL → return AI message as-is
 *  6. Return response + updated state
 */
export async function handleChat(req, res, next) {
  try {
    // 1. Validate request
    const parsed = chatRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Invalid request',
        details: parsed.error.flatten().fieldErrors,
      });
    }

    const { message, history, pendingBooking } = parsed.data;

    // 2. Load services (needed for prompt + validation)
    const { data: services, error: servicesError } = await supabase
      .from('services')
      .select('id, name, duration_minutes, description')
      .eq('is_active', true)
      .order('name');

    if (servicesError) throw servicesError;

    // 3. Call Gemini
    let intentResult;
    try {
      intentResult = await extractIntent(message, history, services);
    } catch (aiError) {
      console.error('[Gemini Error]', aiError.message);
      return res.json({
        message: "I'm sorry, I'm having trouble understanding right now. Could you try rephrasing your request?",
        intent: null,
        pendingBooking: pendingBooking || null,
      });
    }

    const { intent, usage } = intentResult;

    // Log token usage for documentation purposes
    if (usage) {
      console.log(`[Gemini Usage] input: ${usage.promptTokenCount}, output: ${usage.candidatesTokenCount}, total: ${usage.totalTokenCount}`);
    }

    // 4. Route based on intent
    switch (intent.intent) {

      // ── BOOK APPOINTMENT ─────────────────────────────────────────────────
      case 'BOOK_APPOINTMENT': {

        // Handle confirmation of a pending booking
        if (pendingBooking && intent.confirmationResponse === 'YES') {
          return await confirmBooking(pendingBooking, res, next);
        }

        if (pendingBooking && intent.confirmationResponse === 'NO') {
          return res.json({
            message: "No problem! Your booking has been cancelled. Is there anything else I can help you with?",
            pendingBooking: null,
            intent,
          });
        }

        // Validate service (backend authoritative — LLM just suggests)
        const matchedService = safeServiceMatch(intent.service, services);
        if (intent.service && !matchedService) {
          return res.json({
            message: `I'm sorry, we don't offer "${intent.service}". Our available services are: ${services.map(s => s.name).join(', ')}. Which one would you like?`,
            pendingBooking: null,
            intent,
          });
        }

        // Validate date — must not be in the past
        if (intent.date) {
          const requestedDate = dayjs(intent.date);
          if (requestedDate.isBefore(dayjs().startOf('day'))) {
            return res.json({
              message: "That date has already passed. Could you provide a future date for your appointment?",
              pendingBooking: null,
              intent,
            });
          }
          // Reject Sundays
          if (requestedDate.day() === 0) {
            return res.json({
              message: "We're closed on Sundays. Could you choose a weekday or Saturday instead?",
              pendingBooking: null,
              intent,
            });
          }
        }

        // If missing fields — AI's message already asks for them
        if (intent.missingFields && intent.missingFields.length > 0) {
          return res.json({
            message: intent.message,
            pendingBooking: null,
            intent,
          });
        }

        // All fields present — check real availability
        const { data: bookedSlots } = await supabase
          .from('appointments')
          .select('appointment_time')
          .eq('appointment_date', intent.date)
          .neq('status', 'cancelled');

        const bookedTimes = new Set((bookedSlots || []).map(b => b.appointment_time.slice(0, 5)));
        const requestedTime = intent.time;

        if (bookedTimes.has(requestedTime)) {
          // Slot taken — find alternatives
          const alternatives = findAlternativeSlots(bookedTimes, intent.date, requestedTime);
          const altText = alternatives.length > 0
            ? ` Here are some available times on ${formatDate(intent.date)}: ${alternatives.map(formatTime).join(', ')}.`
            : ` Unfortunately, there are no more slots available on ${formatDate(intent.date)}.`;

          return res.json({
            message: `I'm sorry, ${formatTime(requestedTime)} on ${formatDate(intent.date)} is already booked.${altText} Would you like one of these, or a different date?`,
            pendingBooking: null,
            intent,
          });
        }

        // Slot is available — set pending booking and ask for confirmation
        const newPendingBooking = {
          serviceId:    matchedService.id,
          serviceName:  matchedService.name,
          date:         intent.date,
          time:         intent.time,
          customerName: intent.customerName,
          customerEmail: intent.customerEmail,
        };

        return res.json({
          message: `Great! Here's a summary of your booking:\n\n📅 **${matchedService.name}**\n🗓 ${formatDate(intent.date)}\n⏰ ${formatTime(intent.time)}\n👤 ${intent.customerName}\n📧 ${intent.customerEmail}\n\nShall I confirm this appointment?`,
          pendingBooking: newPendingBooking,
          intent,
        });
      }

      // ── CHECK AVAILABILITY ───────────────────────────────────────────────
      case 'CHECK_AVAILABILITY': {
        if (!intent.date) {
          return res.json({
            message: intent.message,
            pendingBooking: null,
            intent,
          });
        }

        const checkDate = dayjs(intent.date);
        if (checkDate.isBefore(dayjs().startOf('day'))) {
          return res.json({
            message: "That date is in the past. Please provide a future date to check availability.",
            pendingBooking: null,
            intent,
          });
        }

        if (checkDate.day() === 0) {
          return res.json({
            message: "We're closed on Sundays. Would you like to check availability for a different day?",
            pendingBooking: null,
            intent,
          });
        }

        const { data: booked } = await supabase
          .from('appointments')
          .select('appointment_time')
          .eq('appointment_date', intent.date)
          .neq('status', 'cancelled');

        const bookedSet = new Set((booked || []).map(b => b.appointment_time.slice(0, 5)));
        const allSlots = generateSlots();
        const now = dayjs();
        const isToday = checkDate.isSame(now, 'day');

        const available = allSlots.filter(slot => {
          if (bookedSet.has(slot)) return false;
          if (isToday) {
            const [hh, mm] = slot.split(':').map(Number);
            const slotDt = now.startOf('day').add(hh * 60 + mm, 'minute');
            if (slotDt.isBefore(now)) return false;
          }
          return true;
        });

        if (available.length === 0) {
          return res.json({
            message: `There are no available slots on ${formatDate(intent.date)}. Would you like to check another date?`,
            pendingBooking: null,
            intent,
          });
        }

        const slotList = available.map(formatTime).join(', ');
        return res.json({
          message: `Here are the available slots on ${formatDate(intent.date)}:\n\n${slotList}\n\nWould you like to book one of these?`,
          pendingBooking: null,
          intent,
        });
      }

      // ── GENERAL ──────────────────────────────────────────────────────────
      case 'GENERAL':
      default: {
        return res.json({
          message: intent.message,
          pendingBooking: pendingBooking || null,
          intent,
        });
      }
    }

  } catch (err) {
    next(err);
  }
}

// ── Booking confirmation ─────────────────────────────────────────────────────

async function confirmBooking(pendingBooking, res, next) {
  try {
    // Final duplicate check before writing
    const { data: existing } = await supabase
      .from('appointments')
      .select('id')
      .eq('appointment_date', pendingBooking.date)
      .eq('appointment_time', pendingBooking.time)
      .neq('status', 'cancelled')
      .maybeSingle();

    if (existing) {
      return res.json({
        message: `Oh no — that slot was just taken by someone else! Would you like to choose a different time?`,
        pendingBooking: null,
      });
    }

    const { data: appointment, error } = await supabase
      .from('appointments')
      .insert({
        customer_name:    pendingBooking.customerName,
        customer_email:   pendingBooking.customerEmail,
        service_id:       pendingBooking.serviceId,
        appointment_date: pendingBooking.date,
        appointment_time: pendingBooking.time,
        status:           'pending',
      })
      .select(`id, customer_name, appointment_date, appointment_time, status, services(name)`)
      .single();

    if (error) {
      if (error.code === '23505') {
        return res.json({
          message: "That slot was just taken. Please choose a different time.",
          pendingBooking: null,
        });
      }
      throw error;
    }

    return res.json({
      message: `✅ Your appointment is confirmed!\n\n**Booking ID:** ${appointment.id.slice(0, 8).toUpperCase()}\n📅 ${appointment.services.name}\n🗓 ${formatDate(appointment.appointment_date)}\n⏰ ${formatTime(appointment.appointment_time.slice(0, 5))}\n👤 ${appointment.customer_name}\n\nWe'll see you then! Is there anything else I can help you with?`,
      pendingBooking: null,
      appointment,
    });
  } catch (err) {
    next(err);
  }
}

// ── Slot generation (mirrors availability controller) ────────────────────────

function generateSlots() {
  const slots = [];
  let current = 9 * 60;
  while (current < 18 * 60) {
    const hh = String(Math.floor(current / 60)).padStart(2, '0');
    const mm = String(current % 60).padStart(2, '0');
    slots.push(`${hh}:${mm}`);
    current += 30;
  }
  return slots;
}

function findAlternativeSlots(bookedTimes, date, requestedTime) {
  const allSlots = generateSlots();
  const now = dayjs();
  const isToday = dayjs(date).isSame(now, 'day');
  const [reqHH, reqMM] = requestedTime.split(':').map(Number);
  const reqMinutes = reqHH * 60 + reqMM;

  return allSlots
    .filter(slot => {
      if (bookedTimes.has(slot)) return false;
      if (isToday) {
        const [hh, mm] = slot.split(':').map(Number);
        const slotDt = now.startOf('day').add(hh * 60 + mm, 'minute');
        if (slotDt.isBefore(now)) return false;
      }
      return true;
    })
    .sort((a, b) => {
      // Sort by proximity to requested time
      const [ah, am] = a.split(':').map(Number);
      const [bh, bm] = b.split(':').map(Number);
      return Math.abs(ah * 60 + am - reqMinutes) - Math.abs(bh * 60 + bm - reqMinutes);
    })
    .slice(0, 3); // top 3 closest alternatives
}
