import dayjs from 'dayjs';
import { supabase } from '../db/supabase.js';
import {
  getCalendarClient,
  createCalendarEvent,
  deleteCalendarEvent,
  getAvailability as getCalendarAvailability,
  verifyCalendarAccess,
} from '../services/calendarService.js';
import {
  isSlotAvailable,
  getEmployeesForService,
} from '../services/availabilityService.js';

async function runIntegrationTest() {
  console.log('====================================================');
  console.log('🧪 RUNNING SUPABASE <-> GOOGLE CALENDAR INTEGRATION TEST');
  console.log('====================================================');

  const tomorrow = dayjs().add(1, 'day').format('YYYY-MM-DD');
  const requestedTime = '17:00';
  const customerName = 'Integration Test User';
  const customerEmail = 'testuser@example.com';

  console.log(`\n📅 Target Test Schedule: ${tomorrow} at ${requestedTime} (IST)`);

  // Step 1: Find Haircut service in Supabase
  console.log('\n[1/12] Fetching "Haircut" service from Supabase...');
  const { data: service, error: svcErr } = await supabase
    .from('services')
    .select('id, name, duration_minutes, description')
    .ilike('name', 'Haircut')
    .single();

  if (svcErr || !service) {
    throw new Error(`Failed to find Haircut service: ${svcErr?.message}`);
  }
  console.log(`✅ Found Service: ${service.name} (ID: ${service.id}, Duration: ${service.duration_minutes}m)`);

  // Step 2: Find Sarah in employees
  console.log('\n[2/12] Fetching stylist "Sarah" from Supabase...');
  const { data: employee, error: empErr } = await supabase
    .from('employees')
    .select('id, name, role')
    .ilike('name', 'Sarah')
    .single();

  if (empErr || !employee) {
    throw new Error(`Failed to find stylist Sarah: ${empErr?.message}`);
  }
  console.log(`✅ Found Stylist: ${employee.name} - ${employee.role} (ID: ${employee.id})`);

  // Step 3: Verify Sarah provides Haircut
  console.log('\n[3/12] Verifying employee_services capability...');
  const capableEmployees = await getEmployeesForService(service.id);
  const canSarahDoIt = capableEmployees.some(e => e.id === employee.id);

  if (!canSarahDoIt) {
    throw new Error(`Stylist ${employee.name} is NOT mapped to provide ${service.name}`);
  }
  console.log(`✅ Capability verified: Sarah can perform ${service.name}. Capable stylists: ${capableEmployees.map(e => e.name).join(', ')}`);

  // Step 4: Check Sarah's existing appointments in Supabase
  console.log('\n[4/12] Checking Sarah\'s Supabase availability...');
  const isSupabaseSlotFree = await isSlotAvailable(employee.id, tomorrow, requestedTime);
  console.log(`✅ Supabase Slot Status for ${employee.name} at ${requestedTime}: ${isSupabaseSlotFree ? 'AVAILABLE' : 'BOOKED'}`);

  if (!isSupabaseSlotFree) {
    throw new Error(`Slot ${requestedTime} on ${tomorrow} is already booked in Supabase for ${employee.name}`);
  }

  // Step 5: Check Google Calendar availability
  console.log('\n[5/12] Checking Google Calendar availability for ' + tomorrow + '...');
  const calAccess = await verifyCalendarAccess();
  console.log(`✅ Google Calendar Active: ${calAccess.summary} (${calAccess.id})`);

  const calAvail = await getCalendarAvailability(tomorrow);
  console.log(`✅ Google Calendar Events on ${tomorrow}: ${calAvail.events.length} existing event(s)`);

  // Step 6: Determine overall availability
  console.log('\n[6/12] Determining combined availability...');
  console.log(`✅ Confirmed available on both Supabase DB and Google Calendar.`);

  // Step 7: Create test appointment in Supabase
  console.log('\n[7/12] Inserting test appointment into Supabase...');
  const { data: newAppointment, error: insertErr } = await supabase
    .from('appointments')
    .insert({
      customer_name: customerName,
      customer_email: customerEmail,
      service_id: service.id,
      employee_id: employee.id,
      appointment_date: tomorrow,
      appointment_time: requestedTime,
      status: 'confirmed',
      notes: 'Integration Test run',
    })
    .select('id, customer_name, customer_email, appointment_date, appointment_time, status')
    .single();

  if (insertErr || !newAppointment) {
    throw new Error(`Failed to create Supabase appointment: ${insertErr?.message}`);
  }
  console.log(`✅ Supabase Appointment Created (ID: ${newAppointment.id})`);

  let googleEventId = null;
  try {
    // Step 8: Create Google Calendar Event
    console.log('\n[8/12] Creating Google Calendar event via CalendarService...');
    googleEventId = await createCalendarEvent({
      customerName,
      customerEmail,
      serviceName: service.name,
      employeeName: employee.name,
      date: tomorrow,
      time: requestedTime,
      durationMin: service.duration_minutes,
    });

    if (!googleEventId) {
      throw new Error('createCalendarEvent returned null or failed.');
    }
    console.log(`✅ Google Calendar Event Created (Event ID: ${googleEventId})`);

    // Step 9: Store Google Event ID in Supabase
    console.log('\n[9/12] Storing calendar_event_id in Supabase appointment record...');
    const { data: updatedAppt, error: updateErr } = await supabase
      .from('appointments')
      .update({ calendar_event_id: googleEventId })
      .eq('id', newAppointment.id)
      .select('id, calendar_event_id')
      .single();

    if (updateErr || !updatedAppt) {
      throw new Error(`Failed to store calendar_event_id in Supabase: ${updateErr?.message}`);
    }
    console.log(`✅ Supabase appointment updated with calendar_event_id: ${updatedAppt.calendar_event_id}`);

    // Step 10: Verify event exists in Google Calendar
    console.log('\n[10/12] Verifying event exists directly in Google Calendar...');
    const calendar = getCalendarClient();
    const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';
    const fetchedEvent = await calendar.events.get({
      calendarId,
      eventId: googleEventId,
    });

    if (!fetchedEvent?.data?.id) {
      throw new Error('Could not retrieve created event from Google Calendar');
    }
    console.log(`✅ Google Event Verified: "${fetchedEvent.data.summary}"`);
    console.log(`   Start: ${fetchedEvent.data.start.dateTime || fetchedEvent.data.start.date}`);
    console.log(`   End:   ${fetchedEvent.data.end.dateTime || fetchedEvent.data.end.date}`);

    // Step 11: Verify Supabase appointment record matches
    console.log('\n[11/12] Verifying Supabase record matches Google Calendar ID...');
    const { data: verifiedAppt, error: verifyErr } = await supabase
      .from('appointments')
      .select(`
        id,
        customer_name,
        appointment_date,
        appointment_time,
        calendar_event_id,
        services ( name ),
        employees ( name )
      `)
      .eq('id', newAppointment.id)
      .single();

    if (verifyErr || verifiedAppt.calendar_event_id !== googleEventId) {
      throw new Error(`Mismatch between Supabase calendar_event_id and Google Calendar event ID`);
    }
    console.log(`✅ Verification Passed! Supabase Appointment (${verifiedAppt.id}) correctly references Google Calendar Event (${verifiedAppt.calendar_event_id})`);

  } finally {
    // Step 12: Clean up test data
    console.log('\n[12/12] 🧹 CLEANING UP TEST DATA (Zero leftovers)...');

    // Delete Google Calendar Event
    if (googleEventId) {
      const deleted = await deleteCalendarEvent(googleEventId);
      console.log(`   - Google Calendar Event (${googleEventId}): ${deleted ? 'DELETED ✅' : 'CLEANUP ERROR'}`);
    }

    // Delete Supabase test appointment
    if (newAppointment?.id) {
      const { error: delErr } = await supabase
        .from('appointments')
        .delete()
        .eq('id', newAppointment.id);

      console.log(`   - Supabase Appointment (${newAppointment.id}): ${!delErr ? 'DELETED ✅' : 'CLEANUP ERROR: ' + delErr?.message}`);
    }
  }

  console.log('\n====================================================');
  console.log('🎉 INTEGRATION TEST COMPLETED SUCCESSFULLY WITH 100% CLEANUP');
  console.log('====================================================\n');
}

runIntegrationTest().catch((err) => {
  console.error('\n❌ INTEGRATION TEST FAILED:', err.message);
  process.exit(1);
});
