import dayjs from 'dayjs';
import { supabase } from '../db/supabase.js';
import { handleChat } from '../controllers/chatController.js';
import {
  isSlotAvailable,
  getEmployeesForService,
} from '../services/availabilityService.js';
import {
  createCalendarEvent,
  deleteCalendarEvent,
  getAvailability,
} from '../services/calendarService.js';

// Helper delay to respect free tier RPM limits
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Mock Express req/res
function mockReqRes(body) {
  let responseData = null;
  let statusCode = 200;

  const req = { body };
  const res = {
    status: (code) => {
      statusCode = code;
      return res;
    },
    json: (data) => {
      responseData = data;
      return res;
    },
  };
  const next = (err) => {
    if (err) console.error('Next Error:', err);
  };

  return { req, res, next, getResponse: () => ({ status: statusCode, data: responseData }) };
}

async function runAllTests() {
  console.log('================================================================');
  console.log('🧪 RUNNING COMPREHENSIVE SALONAI BOOKING SCENARIO TEST SUITE');
  console.log('================================================================\n');

  const tomorrow = dayjs().add(1, 'day').format('YYYY-MM-DD');
  const targetDate = dayjs(tomorrow).day() === 0 ? dayjs().add(2, 'day').format('YYYY-MM-DD') : tomorrow;

  const results = [];

  // -------------------------------------------------------------
  // TEST 1: Specific Stylist Requested ("Haircut tomorrow at 4 PM with Sarah")
  // -------------------------------------------------------------
  console.log('▶ [TEST 1] "I want a haircut tomorrow at 4 PM with Sarah."');
  const t1 = mockReqRes({
    message: `I want a haircut tomorrow at 4 PM with Sarah. My name is Alex Ray and email is alex@example.com`,
    history: [],
  });
  await handleChat(t1.req, t1.res, t1.next);
  const r1 = t1.getResponse().data;
  console.log('  Response:', r1.message.slice(0, 140).replace(/\n/g, ' ') + '...');
  const t1Passed = r1.pendingBooking && r1.pendingBooking.employeeName === 'Sarah' && r1.pendingBooking.time === '16:00';
  console.log(`  Result: ${t1Passed ? 'PASSED ✅' : 'FAILED ❌'}\n`);
  results.push({ name: 'TEST 1: Stylist Sarah requested', passed: t1Passed });
  await delay(12000); // Pacing for rate limits

  // -------------------------------------------------------------
  // TEST 2: No Stylist Preference ("Anyone is fine")
  // -------------------------------------------------------------
  console.log('▶ [TEST 2] "I want a haircut tomorrow at 4 PM. Anyone is fine."');
  const t2 = mockReqRes({
    message: `I want a haircut tomorrow at 4 PM. Anyone is fine. My name is Jordan Lee, email jordan@example.com`,
    history: [],
  });
  await handleChat(t2.req, t2.res, t2.next);
  const r2 = t2.getResponse().data;
  console.log('  Response:', r2.message.slice(0, 140).replace(/\n/g, ' ') + '...');
  const t2Passed = r2.pendingBooking && r2.pendingBooking.time === '16:00' && !!r2.pendingBooking.employeeName;
  console.log(`  Result: ${t2Passed ? 'PASSED ✅' : 'FAILED ❌'}\n`);
  results.push({ name: 'TEST 2: No stylist preference (Best Available)', passed: t2Passed });
  await delay(12000);

  // -------------------------------------------------------------
  // TEST 3: Specific Stylist Unavailable -> Alternatives offered
  // -------------------------------------------------------------
  console.log('▶ [TEST 3] Specific Stylist Sarah is unavailable at 4 PM -> Alternatives offered');
  const { data: sarah } = await supabase.from('employees').select('id, name').ilike('name', 'Sarah').single();
  const { data: haircut } = await supabase.from('services').select('id, name').ilike('name', 'Haircut').single();

  const { data: blockSarahAppt } = await supabase.from('appointments').insert({
    customer_name: 'Existing Client',
    customer_email: 'client@example.com',
    service_id: haircut.id,
    employee_id: sarah.id,
    appointment_date: targetDate,
    appointment_time: '16:00',
    status: 'confirmed',
  }).select('id').single();

  const t3 = mockReqRes({
    message: `I want a haircut tomorrow at 4 PM with Sarah. My name is Taylor Swift, email taylor@example.com`,
    history: [],
  });
  await handleChat(t3.req, t3.res, t3.next);
  const r3 = t3.getResponse().data;
  console.log('  Response:', r3.message.replace(/\n/g, ' '));
  const t3Passed = !r3.pendingBooking && r3.message.includes('Sarah is not available') && (r3.message.includes('Emma') || r3.message.includes('David') || r3.message.includes('available at'));
  console.log(`  Result: ${t3Passed ? 'PASSED ✅' : 'FAILED ❌'}\n`);
  results.push({ name: 'TEST 3: Sarah unavailable alternatives', passed: t3Passed });

  if (blockSarahAppt?.id) {
    await supabase.from('appointments').delete().eq('id', blockSarahAppt.id);
  }
  await delay(12000);

  // -------------------------------------------------------------
  // TEST 4: Invalid Stylist Capability ("Facial with David")
  // -------------------------------------------------------------
  console.log('▶ [TEST 4] "I want a facial with David." (David does not do Facials)');
  const t4 = mockReqRes({
    message: `I want a facial tomorrow at 2 PM with David. My name is Chris Evans, email chris@example.com`,
    history: [],
  });
  await handleChat(t4.req, t4.res, t4.next);
  const r4 = t4.getResponse().data;
  console.log('  Response:', r4.message.replace(/\n/g, ' '));
  const t4Passed = !r4.pendingBooking && r4.message.includes('David') && (r4.message.includes('Emma') || r4.message.includes('does not offer'));
  console.log(`  Result: ${t4Passed ? 'PASSED ✅' : 'FAILED ❌'}\n`);
  results.push({ name: 'TEST 4: Incompatible stylist service rejected', passed: t4Passed });
  await delay(12000);

  // -------------------------------------------------------------
  // TEST 5: Missing Date & Time ("I need a haircut.")
  // -------------------------------------------------------------
  console.log('▶ [TEST 5] "I need a haircut." (Missing date/time)');
  const t5 = mockReqRes({
    message: `I need a haircut.`,
    history: [],
  });
  await handleChat(t5.req, t5.res, t5.next);
  const r5 = t5.getResponse().data;
  console.log('  Response:', r5.message.replace(/\n/g, ' '));
  const t5Passed = !r5.pendingBooking && r5.message.length > 10;
  console.log(`  Result: ${t5Passed ? 'PASSED ✅' : 'FAILED ❌'}\n`);
  results.push({ name: 'TEST 5: Missing date/time prompt', passed: t5Passed });
  await delay(12000);

  // -------------------------------------------------------------
  // TEST 6: Missing Service ("I need something Saturday afternoon.")
  // -------------------------------------------------------------
  console.log('▶ [TEST 6] "I need something Saturday afternoon." (Missing treatment)');
  const t6 = mockReqRes({
    message: `I need something Saturday afternoon.`,
    history: [],
  });
  await handleChat(t6.req, t6.res, t6.next);
  const r6 = t6.getResponse().data;
  console.log('  Response:', r6.message.replace(/\n/g, ' '));
  const t6Passed = !r6.pendingBooking && r6.message.length > 10;
  console.log(`  Result: ${t6Passed ? 'PASSED ✅' : 'FAILED ❌'}\n`);
  results.push({ name: 'TEST 6: Missing treatment prompt', passed: t6Passed });
  await delay(12000);

  // -------------------------------------------------------------
  // TEST 7: Full Confirmation & Live Google Calendar sync
  // -------------------------------------------------------------
  console.log('▶ [TEST 7] Explicit Booking Confirmation + Supabase + Google Calendar sync');
  const pendingBookingData = {
    serviceId: haircut.id,
    serviceName: 'Haircut',
    employeeId: sarah.id,
    employeeName: 'Sarah',
    date: targetDate,
    time: '15:30',
    customerName: 'Sam Altman',
    customerEmail: 'sam@openai.com',
    durationMin: 45,
  };

  const t7 = mockReqRes({
    message: 'Yes, please confirm the appointment.',
    history: [],
    pendingBooking: pendingBookingData,
  });
  await handleChat(t7.req, t7.res, t7.next);
  const r7 = t7.getResponse().data;
  console.log('  Response:', r7.message.replace(/\n/g, ' '));
  const t7Passed = !!r7.appointment?.id && r7.message.includes('confirmed');
  console.log(`  Result: ${t7Passed ? 'PASSED ✅' : 'FAILED ❌'}\n`);
  results.push({ name: 'TEST 7: Full confirmation & execution', passed: t7Passed });
  await delay(12000);

  // -------------------------------------------------------------
  // TEST 8: Prevent Duplicate Booking
  // -------------------------------------------------------------
  console.log('▶ [TEST 8] Prevent Duplicate Booking (Same stylist + same slot)');
  const t8 = mockReqRes({
    message: 'Yes, please confirm the appointment.',
    history: [],
    pendingBooking: pendingBookingData, // Re-submitting identical slot
  });
  await handleChat(t8.req, t8.res, t8.next);
  const r8 = t8.getResponse().data;
  console.log('  Response:', r8.message.replace(/\n/g, ' '));
  const t8Passed = !r8.appointment && r8.message.includes('just booked');
  console.log(`  Result: ${t8Passed ? 'PASSED ✅' : 'FAILED ❌'}\n`);
  results.push({ name: 'TEST 8: Duplicate slot blocked', passed: t8Passed });

  // Clean up created appointment and Google Calendar event from Test 7
  if (r7.appointment?.id) {
    const { data: apptWithCal } = await supabase.from('appointments').select('calendar_event_id').eq('id', r7.appointment.id).single();
    if (apptWithCal?.calendar_event_id) {
      await deleteCalendarEvent(apptWithCal.calendar_event_id);
    }
    await supabase.from('appointments').delete().eq('id', r7.appointment.id);
  }

  // -------------------------------------------------------------
  // TEST 9, 10, 11: Supabase vs Google Calendar Conflict Evaluation
  // -------------------------------------------------------------
  console.log('▶ [TEST 9, 10, 11] Availability Matrix (Supabase vs Google Calendar)');
  const checkTime = '11:00';

  // 11: Both Free
  const freeBefore = await isSlotAvailable(sarah.id, targetDate, checkTime);
  console.log(`  - TEST 11 (Both Free): Slot ${checkTime} available = ${freeBefore} (Expected: true)`);

  // 10: Supabase conflict
  const { data: dbBlock } = await supabase.from('appointments').insert({
    customer_name: 'Conflict Test',
    customer_email: 'conflict@test.com',
    service_id: haircut.id,
    employee_id: sarah.id,
    appointment_date: targetDate,
    appointment_time: checkTime,
    status: 'confirmed',
  }).select('id').single();

  const freeWithDbConflict = await isSlotAvailable(sarah.id, targetDate, checkTime);
  console.log(`  - TEST 10 (Supabase Conflicted): Slot ${checkTime} available = ${freeWithDbConflict} (Expected: false)`);

  if (dbBlock?.id) {
    await supabase.from('appointments').delete().eq('id', dbBlock.id);
  }

  // 9: Google Calendar conflict
  const calEventId = await createCalendarEvent({
    customerName: 'GCal Block User',
    customerEmail: 'gcal@test.com',
    serviceName: 'Haircut',
    employeeName: 'Sarah',
    date: targetDate,
    time: checkTime,
    durationMin: 45,
  });

  const freeWithGCalConflict = await isSlotAvailable(sarah.id, targetDate, checkTime);
  console.log(`  - TEST 9 (Google Calendar Conflicted): Slot ${checkTime} available = ${freeWithGCalConflict} (Expected: false)`);

  if (calEventId) {
    await deleteCalendarEvent(calEventId);
  }

  const matrixPassed = freeBefore === true && freeWithDbConflict === false && freeWithGCalConflict === false;
  console.log(`  Result: ${matrixPassed ? 'PASSED ✅' : 'FAILED ❌'}\n`);
  results.push({ name: 'TEST 9, 10, 11: Availability matrix (Supabase vs GCal)', passed: matrixPassed });

  // -------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------
  console.log('================================================================');
  console.log('📊 FINAL TEST RESULTS:');
  results.forEach((r, idx) => console.log(`  ${idx + 1}. ${r.name}: ${r.passed ? '✅ PASSED' : '❌ FAILED'}`));
  console.log('================================================================\n');
}

runAllTests().catch(err => {
  console.error('Error running test scenarios:', err);
  process.exit(1);
});
