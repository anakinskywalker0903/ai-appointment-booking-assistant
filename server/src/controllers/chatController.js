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
      id: e.id,
      name: e.name,
      role: e.role,
      services: (e.employee_services || []).map(es => es.services).filter(Boolean),
    }));

    // Call Gemini
    let intentResult;
    try {
      intentResult = await extractIntent(message, history, services, employees);
    } catch (aiError) {
      console.error('[Gemini Error]', aiError.message);
      return res.json({
        message: "I'm sorry, I had a little trouble understanding that. Could you please rephrase?",
        pendingBooking: pendingBooking || null,
      });
    }

    const { intent, usage } = intentResult;
    if (usage) {
      console.log(`[Gemini Usage] in:${usage.promptTokenCount} out:${usage.candidatesTokenCount} total:${usage.totalTokenCount}`);
    }

    // ── Route on intent ────────────────────────────────────────────────────
    switch (intent.intent) {

      case 'BOOK_APPOINTMENT': {
        // ── Confirmation of pending booking ──────────────────────────────
        if (pendingBooking && (intent.confirmationResponse === 'YES' || /yes|confirm|book it|sure|please/i.test(message))) {
          return await confirmBooking(pendingBooking, res, next);
        }
        if (pendingBooking && (intent.confirmationResponse === 'NO' || /no|cancel|nevermind|stop/i.test(message))) {
          return res.json({
            message: "No problem at all! The booking has been cancelled. Let me know if there's another time or service you'd like to try.",
            pendingBooking: null,
            intent,
          });
        }

        // ── Validate service ─────────────────────────────────────────────
        const matchedService = intent.service
          ? services.find(s => s.name.toLowerCase() === intent.service.toLowerCase())
          : null;

        if (intent.service && !matchedService) {
          return res.json({
            message: `I'm sorry, we don't offer "${intent.service}". We offer: ${services.map(s => s.name).join(', ')}. Which treatment would you like?`,
            pendingBooking: null,
            intent,
          });
        }

        // ── Validate date ────────────────────────────────────────────────
        if (intent.date) {
          if (isPast(intent.date)) {
            return res.json({
              message: "That date has already passed. Could you please provide a future date?",
              pendingBooking: null,
              intent,
            });
          }
          if (isWeekend(intent.date)) {
            return res.json({
              message: "We're closed on Sundays! Could you choose a weekday or Saturday?",
              pendingBooking: null,
              intent,
            });
          }
        }

        // ── Missing critical fields (service, date, time) ────────────────
        if (!matchedService || !intent.date || !intent.time) {
          return res.json({
            message: intent.message,
            pendingBooking: null,
            intent,
          });
        }

        // ── Validate stylist / employee capability ───────────────────────
        let preferredEmployee = null;
        if (intent.employeePreference) {
          preferredEmployee = employees.find(
            e => e.name.toLowerCase() === intent.employeePreference.toLowerCase()
          );

          if (!preferredEmployee) {
            return res.json({
              message: `I'm sorry, we don't have a stylist named "${intent.employeePreference}". Our team includes ${employees.map(e => e.name).join(', ')}. Would you like to book with one of them, or anyone who's available?`,
              pendingBooking: null,
              intent,
            });
          }

          // Check if preferred stylist performs this service
          const canPerform = preferredEmployee.services.some(s => s.id === matchedService.id);
          if (!canPerform) {
            const capable = await getEmployeesForService(matchedService.id);
            return res.json({
              message: `${preferredEmployee.name} does not offer ${matchedService.name}. For ${matchedService.name}, you can book with: ${capable.map(e => e.name).join(', ')}. Would you like to book with one of them?`,
              pendingBooking: null,
              intent,
            });
          }
        }

        // ── Check Availability (Supabase + Google Calendar) ──────────────
        const durationMin = matchedService.duration_minutes || 45;

        if (preferredEmployee) {
          // Specific stylist requested
          const available = await isSlotAvailable(preferredEmployee.id, intent.date, intent.time, durationMin);

          if (!available) {
            // Find alternatives for requested stylist
            const alts = await getAlternativesForEmployee(preferredEmployee.id, intent.date, intent.time, 2, durationMin);
            const altText = alts.length > 0
              ? `${preferredEmployee.name} is available at: ${alts.map(formatTime).join(', ')}.`
              : `${preferredEmployee.name} has no more open slots on ${formatDate(intent.date)}.`;

            // Check if other capable stylists are available at the EXACT requested time
            const capable = await getEmployeesForService(matchedService.id);
            const othersAtSameTime = [];
            for (const emp of capable) {
              if (emp.id === preferredEmployee.id) continue;
              const isOtherFree = await isSlotAvailable(emp.id, intent.date, intent.time, durationMin);
              if (isOtherFree) othersAtSameTime.push(emp.name);
            }

            const otherText = othersAtSameTime.length > 0
              ? ` Alternatively, ${othersAtSameTime.join(' or ')} is available at ${formatTime(intent.time)}.`
              : '';

            return res.json({
              message: `${preferredEmployee.name} is not available at ${formatTime(intent.time)} on ${formatDate(intent.date)}. ${altText}${otherText} Which would you prefer?`,
              pendingBooking: null,
              intent,
            });
          }

          // Stylist IS available — check for customer contact info
          if (!intent.customerName || !intent.customerEmail) {
            return res.json({
              message: intent.message || `Great, ${preferredEmployee.name} is available at ${formatTime(intent.time)} on ${formatDate(intent.date)}! Could you please share your full name and email to complete the reservation?`,
              pendingBooking: null,
              intent,
            });
          }

          // All fields present — ask for confirmation
          return res.json({
            message: `Here is your booking summary:\n\n✂️ **${matchedService.name}** (${durationMin} min)\n💇‍♀️ Stylist: **${preferredEmployee.name}**\n🗓 Date: **${formatDate(intent.date)}**\n⏰ Time: **${formatTime(intent.time)}**\n👤 Customer: **${intent.customerName}**\n📧 Email: **${intent.customerEmail}**\n\nShall I confirm this appointment?`,
            pendingBooking: {
              serviceId: matchedService.id,
              serviceName: matchedService.name,
              employeeId: preferredEmployee.id,
              employeeName: preferredEmployee.name,
              date: intent.date,
              time: intent.time,
              customerName: intent.customerName,
              customerEmail: intent.customerEmail,
              durationMin,
            },
            intent,
          });

        } else {
          // No stylist preference ("anyone is fine")
          const options = await findBestAvailable(matchedService.id, intent.date, intent.time, durationMin);

          if (options.length === 0) {
            return res.json({
              message: `I'm sorry, we have no available openings for ${matchedService.name} on ${formatDate(intent.date)}. Would you like to check another day?`,
              pendingBooking: null,
              intent,
            });
          }

          const best = options[0];

          // Check for customer contact info
          if (!intent.customerName || !intent.customerEmail) {
            return res.json({
              message: intent.message || `I found an open slot with ${best.employee.name} at ${formatTime(best.bestSlot)} on ${formatDate(intent.date)}! Could you please share your full name and email to prepare the booking?`,
              pendingBooking: null,
              intent,
            });
          }

          const otherOptions = options.slice(1, 3)
            .map(o => `${o.employee.name} at ${formatTime(o.bestSlot)}`)
            .join(', or ');

          const altText = otherOptions ? `\n*(Also available: ${otherOptions})*` : '';

          return res.json({
            message: `I found the best available slot:\n\n✂️ **${matchedService.name}** (${durationMin} min)\n💇‍♀️ Stylist: **${best.employee.name}**\n🗓 Date: **${formatDate(intent.date)}**\n⏰ Time: **${formatTime(best.bestSlot)}**\n👤 Customer: **${intent.customerName}**\n📧 Email: **${intent.customerEmail}**${altText}\n\nShall I confirm this appointment?`,
            pendingBooking: {
              serviceId: matchedService.id,
              serviceName: matchedService.name,
              employeeId: best.employee.id,
              employeeName: best.employee.name,
              date: intent.date,
              time: best.bestSlot,
              customerName: intent.customerName,
              customerEmail: intent.customerEmail,
              durationMin,
            },
            intent,
          });
        }
      }

      // ── CHECK AVAILABILITY ─────────────────────────────────────────────
      case 'CHECK_AVAILABILITY': {
        if (!intent.date) {
          return res.json({ message: intent.message, pendingBooking: null, intent });
        }

        if (isPast(intent.date)) {
          return res.json({ message: "That date has passed. Please provide a future date.", pendingBooking: null, intent });
        }
        if (isWeekend(intent.date)) {
          return res.json({ message: "We are closed on Sundays. Would you like to check a weekday or Saturday?", pendingBooking: null, intent });
        }

        // Specific stylist availability
        if (intent.employeePreference) {
          const targetEmp = employees.find(e => e.name.toLowerCase() === intent.employeePreference.toLowerCase());
          if (!targetEmp) {
            return res.json({
              message: `We don't have a stylist named "${intent.employeePreference}". Our team: ${employees.map(e => e.name).join(', ')}.`,
              pendingBooking: null,
              intent,
            });
          }

          const slots = await getAvailableSlotsForEmployee(targetEmp.id, intent.date, 45);
          if (slots.length === 0) {
            return res.json({
              message: `${targetEmp.name} has no available slots on ${formatDate(intent.date)}.`,
              pendingBooking: null,
              intent,
            });
          }

          return res.json({
            message: `${targetEmp.name} is available on ${formatDate(intent.date)} at:\n\n${slots.map(formatTime).join(' · ')}\n\nWould you like to book one of these times?`,
            pendingBooking: null,
            intent,
          });
        }

        // General availability across all stylists
        const matchedService = intent.service
          ? services.find(s => s.name.toLowerCase() === intent.service.toLowerCase())
          : null;

        const serviceId = matchedService?.id || services[0]?.id;
        const options = await findBestAvailable(serviceId, intent.date, null, matchedService?.duration_minutes || 45);

        if (options.length === 0) {
          return res.json({
            message: `We have no available openings on ${formatDate(intent.date)}. Would you like to check another date?`,
            pendingBooking: null,
            intent,
          });
        }

        const summary = options.map(o => `**${o.employee.name}**: ${o.availableSlots.slice(0, 4).map(formatTime).join(', ')}`).join('\n');
        return res.json({
          message: `Here is our availability on ${formatDate(intent.date)}:\n\n${summary}\n\nWhich stylist or time would you prefer?`,
          pendingBooking: null,
          intent,
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

// ── Booking confirmation & execution ─────────────────────────────────────────

async function confirmBooking(pendingBooking, res, next) {
  try {
    // 1. Race-condition check on Supabase & Google Calendar
    const slotFree = await isSlotAvailable(
      pendingBooking.employeeId,
      pendingBooking.date,
      pendingBooking.time,
      pendingBooking.durationMin
    );

    if (!slotFree) {
      return res.json({
        message: "Oh no! That slot was just booked by another customer. Let me help you find the next closest time.",
        pendingBooking: null,
      });
    }

    // 2. Insert into Supabase
    const { data: appointment, error: insertErr } = await supabase
      .from('appointments')
      .insert({
        customer_name:    pendingBooking.customerName,
        customer_email:   pendingBooking.customerEmail,
        service_id:       pendingBooking.serviceId,
        employee_id:      pendingBooking.employeeId,
        appointment_date: pendingBooking.date,
        appointment_time: pendingBooking.time,
        status:           'confirmed',
      })
      .select(`
        id,
        customer_name,
        customer_email,
        appointment_date,
        appointment_time,
        status,
        services ( name, duration_minutes ),
        employees ( name )
      `)
      .single();

    if (insertErr) {
      if (insertErr.code === '23505') {
        return res.json({
          message: "That slot was just taken. Please choose a different time.",
          pendingBooking: null,
        });
      }
      throw insertErr;
    }

    // 3. Create Google Calendar Event (if connected)
    let calendarEventId = null;
    let calendarSyncSuccess = false;

    if (isCalendarConnected()) {
      try {
        calendarEventId = await createCalendarEvent({
          customerName:  pendingBooking.customerName,
          customerEmail: pendingBooking.customerEmail,
          serviceName:   pendingBooking.serviceName,
          employeeName:  pendingBooking.employeeName,
          date:          pendingBooking.date,
          time:          pendingBooking.time,
          durationMin:   pendingBooking.durationMin,
        });

        if (calendarEventId) {
          calendarSyncSuccess = true;
          // Store calendar_event_id in Supabase
          await supabase
            .from('appointments')
            .update({ calendar_event_id: calendarEventId })
            .eq('id', appointment.id);
        }
      } catch (calErr) {
        console.error('[Google Calendar Sync Failed]:', calErr.message);
        // Non-blocking: Supabase appointment remains confirmed
      }
    }

    const calendarNote = calendarSyncSuccess
      ? '\n📅 **Google Calendar event created** with 24h & 30m reminders.'
      : '';

    return res.json({
      message: `🎉 **Your appointment is confirmed!**\n\n**Booking ID:** \`${appointment.id.slice(0, 8).toUpperCase()}\`\n✂️ Treatment: **${appointment.services.name}**\n💇‍♀️ Stylist: **${appointment.employees.name}**\n🗓 Date: **${formatDate(appointment.appointment_date)}**\n⏰ Time: **${formatTime(appointment.appointment_time.slice(0, 5))}**\n👤 Customer: **${appointment.customer_name}** (${appointment.customer_email})${calendarNote}\n\nWe look forward to seeing you at SalonAI! Is there anything else you need?`,
      pendingBooking: null,
      appointment,
    });
  } catch (err) {
    next(err);
  }
}
