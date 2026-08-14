import { z } from 'zod';
import dayjs from 'dayjs';
import { extractIntent } from '../ai/gemini.js';
import { supabase } from '../db/supabase.js';
import {
  getEmployeesForService,
  getAvailableSlotsForEmployee,
  findBestAvailable,
  isSlotAvailable,
  getAlternativesForEmployee,
} from '../services/availabilityService.js';
import { createCalendarEvent, isConnected as isCalendarConnected } from '../services/calendarService.js';

// ── Request validation ───────────────────────────────────────────────────────

const chatRequestSchema = z.object({
  message: z.string().min(1, 'Message cannot be empty').max(2000, 'Message too long'),
  history: z.array(
    z.object({
      role: z.enum(['user', 'model']),
      parts: z.array(z.object({ text: z.string() })),
    })
  ).optional().default([]),
  pendingBooking: z.object({
    serviceId:    z.string().uuid(),
    serviceName:  z.string(),
    employeeId:   z.string().uuid(),
    employeeName: z.string(),
    date:         z.string(),
    time:         z.string(),
    customerName: z.string(),
    customerEmail:z.string(),
    durationMin:  z.number(),
  }).nullable().optional(),
});

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(t) {
  if (!t) return '';
  const [hh, mm] = t.split(':').map(Number);
  const period = hh >= 12 ? 'PM' : 'AM';
  return `${hh % 12 || 12}:${String(mm).padStart(2, '0')} ${period}`;
}

function formatDate(d) {
  return dayjs(d).format('dddd, MMMM D, YYYY');
}

function isWeekend(date) { return dayjs(date).day() === 0; }
function isPast(date)    { return dayjs(date).isBefore(dayjs().startOf('day')); }

// ── Main chat handler ────────────────────────────────────────────────────────

export async function handleChat(req, res, next) {
  try {
    const parsed = chatRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid request', details: parsed.error.flatten().fieldErrors });
    }

    const { message, history, pendingBooking } = parsed.data;

    // Load services and employees for prompt injection + validation
    const [{ data: services, error: svcErr }, { data: empData, error: empErr }] = await Promise.all([
      supabase.from('services').select('id, name, duration_minutes, description').eq('is_active', true).order('name'),
      supabase.from('employees').select(`id, name, role, employee_services(services(id, name))`).eq('is_active', true).order('name'),
    ]);

    if (svcErr) throw svcErr;

    // Flatten employee data for prompt
    const employees = (empData || []).map(e => ({
      id: e.id, name: e.name, role: e.role,
      services: e.employee_services.map(es => es.services),
    }));

    // Call Gemini
    let intentResult;
    try {
      intentResult = await extractIntent(message, history, services, employees);
    } catch (aiError) {
      console.error('[Gemini Error]', aiError.message);
      return res.json({
        message: "I'm sorry, I'm having a little trouble right now. Could you try again?",
        pendingBooking: pendingBooking || null,
      });
    }

    const { intent, usage } = intentResult;
    if (usage) {
      console.log(`[Gemini] in:${usage.promptTokenCount} out:${usage.candidatesTokenCount} total:${usage.totalTokenCount}`);
    }

    // ── Route on intent ────────────────────────────────────────────────────
    switch (intent.intent) {

      case 'BOOK_APPOINTMENT': {
        // ── Confirmation of pending booking ──────────────────────────────
        if (pendingBooking && intent.confirmationResponse === 'YES') {
          return await confirmBooking(pendingBooking, res, next);
        }
        if (pendingBooking && intent.confirmationResponse === 'NO') {
          return res.json({
            message: "No problem at all! Your booking has been cancelled. Is there anything else I can help you with?",
            pendingBooking: null, intent,
          });
        }

        // ── Validate service ─────────────────────────────────────────────
        const matchedService = intent.service
          ? services.find(s => s.name.toLowerCase() === intent.service.toLowerCase())
          : null;

        if (intent.service && !matchedService) {
          return res.json({
            message: `I'm sorry, we don't offer "${intent.service}". Our services are: ${services.map(s => s.name).join(', ')}. Which would you like?`,
            pendingBooking: null, intent,
          });
        }

        // ── Validate date ────────────────────────────────────────────────
        if (intent.date) {
          if (isPast(intent.date)) {
            return res.json({ message: "That date has already passed. Could you give me a future date?", pendingBooking: null, intent });
          }
          if (isWeekend(intent.date)) {
            return res.json({ message: "We're closed on Sundays! Could you choose a weekday or Saturday?", pendingBooking: null, intent });
          }
        }

        // ── Missing fields — AI handles asking ───────────────────────────
        if (intent.missingFields?.length > 0) {
          return res.json({ message: intent.message, pendingBooking: null, intent });
        }

        // ── All fields present — now do employee-aware availability ──────

        // Step 1: Validate employee preference
        let preferredEmployee = null;
        if (intent.employeePreference) {
          preferredEmployee = employees.find(
            e => e.name.toLowerCase() === intent.employeePreference.toLowerCase()
          );
          if (!preferredEmployee) {
            return res.json({
              message: `I'm sorry, we don't have a stylist named "${intent.employeePreference}". Our team: ${employees.map(e => e.name).join(', ')}. Would you like one of them, or anyone who's available?`,
              pendingBooking: null, intent,
            });
          }
        }

        // Step 2: Validate employee can perform the service
        if (preferredEmployee) {
          const canPerform = preferredEmployee.services.some(
            s => s.id === matchedService.id
          );
          if (!canPerform) {
            // Find who CAN do it
            const capableEmployees = await getEmployeesForService(matchedService.id);
            return res.json({
              message: `${preferredEmployee.name} doesn't offer ${matchedService.name}. That service is provided by: ${capableEmployees.map(e => e.name).join(', ')}. Would you like to book with one of them?`,
              pendingBooking: null, intent,
            });
          }
        }

        // Step 3: Check availability
        if (preferredEmployee) {
          // Customer has a preference — check that specific employee
          const available = await isSlotAvailable(preferredEmployee.id, intent.date, intent.time);

          if (!available) {
            // Preferred employee is busy — find their alternatives
            const alts = await getAlternativesForEmployee(preferredEmployee.id, intent.date, intent.time);
            const altText = alts.length > 0
              ? `${preferredEmployee.name} is available at: ${alts.map(formatTime).join(', ')} on ${formatDate(intent.date)}.`
              : `${preferredEmployee.name} has no more slots on ${formatDate(intent.date)}.`;

            // Also check other employees at that time
            const othersAtTime = employees.filter(e => e.id !== preferredEmployee.id);
            const otherOptions = [];
            for (const emp of othersAtTime) {
              const canDo = emp.services.some(s => s.id === matchedService.id);
              if (!canDo) continue;
              const empAvail = await isSlotAvailable(emp.id, intent.date, intent.time);
              if (empAvail) otherOptions.push(emp.name);
            }

            const otherText = otherOptions.length > 0
              ? ` Or ${otherOptions.join(' or ')} ${otherOptions.length > 1 ? 'are' : 'is'} available at ${formatTime(intent.time)}.`
              : '';

            return res.json({
              message: `${preferredEmployee.name} isn't available at ${formatTime(intent.time)} on ${formatDate(intent.date)}. ${altText}${otherText} What works for you?`,
              pendingBooking: null, intent,
            });
          }

          // Preferred employee IS available — prepare confirmation
          return res.json({
            message: `Here's your booking summary:\n\n✂️ **${matchedService.name}** with **${preferredEmployee.name}**\n🗓 ${formatDate(intent.date)}\n⏰ ${formatTime(intent.time)}\n👤 ${intent.customerName}\n📧 ${intent.customerEmail}\n\nShall I confirm this appointment?`,
            pendingBooking: {
              serviceId: matchedService.id, serviceName: matchedService.name,
              employeeId: preferredEmployee.id, employeeName: preferredEmployee.name,
              date: intent.date, time: intent.time,
              customerName: intent.customerName, customerEmail: intent.customerEmail,
              durationMin: matchedService.duration_minutes,
            },
            intent,
          });

        } else {
          // No employee preference — find best available
          const options = await findBestAvailable(matchedService.id, intent.date, intent.time);

          if (options.length === 0) {
            return res.json({
              message: `I'm sorry, there are no available slots for ${matchedService.name} on ${formatDate(intent.date)}. Would you like to try a different date?`,
              pendingBooking: null, intent,
            });
          }

          const best = options[0];
          const altOptions = options.slice(1, 3)
            .map(o => `${o.employee.name} at ${formatTime(o.bestSlot)}`)
            .join(', or ');

          const altText = altOptions
            ? `\n\nAlternatively: ${altOptions}.`
            : '';

          return res.json({
            message: `Great news! I found the best available slot:\n\n✂️ **${matchedService.name}** with **${best.employee.name}**\n🗓 ${formatDate(intent.date)}\n⏰ ${formatTime(best.bestSlot)}\n👤 ${intent.customerName}\n📧 ${intent.customerEmail}${altText}\n\nShall I confirm this appointment?`,
            pendingBooking: {
              serviceId: matchedService.id, serviceName: matchedService.name,
              employeeId: best.employee.id, employeeName: best.employee.name,
              date: intent.date, time: best.bestSlot,
              customerName: intent.customerName, customerEmail: intent.customerEmail,
              durationMin: matchedService.duration_minutes,
            },
            intent,
          });
        }
      }

      // ── CHECK AVAILABILITY ─────────────────────────────────────────────
      case 'CHECK_AVAILABILITY': {
        if (!intent.date) return res.json({ message: intent.message, pendingBooking: null, intent });

        if (isPast(intent.date)) return res.json({ message: "That date is in the past. Could you give me a future date?", pendingBooking: null, intent });
        if (isWeekend(intent.date)) return res.json({ message: "We're closed on Sundays. Want to check another day?", pendingBooking: null, intent });

        // Check by employee if specified
        const targetEmployee = intent.employeePreference
          ? employees.find(e => e.name.toLowerCase() === intent.employeePreference?.toLowerCase())
          : null;

        if (targetEmployee) {
          const slots = await getAvailableSlotsForEmployee(targetEmployee.id, intent.date);
          if (slots.length === 0) {
            return res.json({ message: `${targetEmployee.name} has no available slots on ${formatDate(intent.date)}.`, pendingBooking: null, intent });
          }
          return res.json({
            message: `${targetEmployee.name} is available on ${formatDate(intent.date)} at:\n\n${slots.map(formatTime).join(' · ')}\n\nWould you like to book one of these?`,
            pendingBooking: null, intent,
          });
        }

        // General availability across all employees
        const results = await findBestAvailable(null, intent.date, null);
        if (results.length === 0) {
          return res.json({ message: `We have no available slots on ${formatDate(intent.date)}. Would you like to try another date?`, pendingBooking: null, intent });
        }

        const summary = results.map(r => `**${r.employee.name}**: ${r.availableSlots.slice(0, 4).map(formatTime).join(', ')}`).join('\n');
        return res.json({
          message: `Here's availability on ${formatDate(intent.date)}:\n\n${summary}\n\nWould you like to book a specific slot?`,
          pendingBooking: null, intent,
        });
      }

      // ── GENERAL ───────────────────────────────────────────────────────
      case 'GENERAL':
      default:
        return res.json({ message: intent.message, pendingBooking: pendingBooking || null, intent });
    }

  } catch (err) {
    next(err);
  }
}

// ── Booking confirmation ─────────────────────────────────────────────────────

async function confirmBooking(pendingBooking, res, next) {
  try {
    // Final race-condition check
    const slotFree = await isSlotAvailable(pendingBooking.employeeId, pendingBooking.date, pendingBooking.time);
    if (!slotFree) {
      return res.json({
        message: "Oh no — that slot was just taken! Would you like to choose a different time?",
        pendingBooking: null,
      });
    }

    // Create DB record
    const { data: appointment, error } = await supabase
      .from('appointments')
      .insert({
        customer_name:    pendingBooking.customerName,
        customer_email:   pendingBooking.customerEmail,
        service_id:       pendingBooking.serviceId,
        employee_id:      pendingBooking.employeeId,
        appointment_date: pendingBooking.date,
        appointment_time: pendingBooking.time,
        status:           'pending',
      })
      .select(`id, customer_name, appointment_date, appointment_time, status, services(name, duration_minutes), employees(name)`)
      .single();

    if (error) {
      if (error.code === '23505') {
        return res.json({ message: "That slot was just taken. Please choose a different time.", pendingBooking: null });
      }
      throw error;
    }

    // Create Google Calendar event (non-blocking)
    let calendarEventId = null;
    if (isCalendarConnected()) {
      calendarEventId = await createCalendarEvent({
        customerName:  pendingBooking.customerName,
        customerEmail: pendingBooking.customerEmail,
        serviceName:   pendingBooking.serviceName,
        employeeName:  pendingBooking.employeeName,
        date:          pendingBooking.date,
        time:          pendingBooking.time,
        durationMin:   pendingBooking.durationMin,
      });

      // Store calendar event ID if created
      if (calendarEventId) {
        await supabase
          .from('appointments')
          .update({ calendar_event_id: calendarEventId })
          .eq('id', appointment.id);
      }
    }

    const calendarNote = calendarEventId
      ? '\n📅 Calendar invite sent with reminder.'
      : '';

    return res.json({
      message: `✅ Your appointment is confirmed!\n\n**Booking ID:** ${appointment.id.slice(0, 8).toUpperCase()}\n✂️ ${appointment.services.name}\n👩‍🎨 with ${appointment.employees.name}\n🗓 ${formatDate(appointment.appointment_date)}\n⏰ ${formatTime(appointment.appointment_time.slice(0, 5))}\n👤 ${appointment.customer_name}${calendarNote}\n\nSee you then! Anything else I can help with?`,
      pendingBooking: null,
      appointment,
    });
  } catch (err) {
    next(err);
  }
}
