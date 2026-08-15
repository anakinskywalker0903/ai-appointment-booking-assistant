import emailjs from '@emailjs/browser';

/**
 * Sends an appointment confirmation email using EmailJS.
 * Reads credentials from environment variables:
 * - VITE_EMAILJS_SERVICE_ID
 * - VITE_EMAILJS_TEMPLATE_ID
 * - VITE_EMAILJS_PUBLIC_KEY
 */
export async function sendBookingEmail(appointment) {
  const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID;
  const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
  const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

  if (!serviceId || !templateId || !publicKey) {
    console.warn(
      '[EmailJS] Missing credentials (VITE_EMAILJS_SERVICE_ID, VITE_EMAILJS_TEMPLATE_ID, VITE_EMAILJS_PUBLIC_KEY). Skipping email dispatch.'
    );
    return { success: false, reason: 'unconfigured' };
  }

  // Format date and time
  const dateStr = appointment.appointment_date || appointment.date;
  const timeStr = (appointment.appointment_time || appointment.time || '').slice(0, 5);
  const serviceName = appointment.services?.name || appointment.serviceName || 'Salon Service';
  const employeeName = appointment.employees?.name || appointment.employeeName || 'Stylist';
  const customerName = appointment.customer_name || appointment.customerName || 'Valued Customer';
  const customerEmail = appointment.customer_email || appointment.customerEmail;
  const bookingId = (appointment.id || 'BK-' + Date.now()).slice(0, 8).toUpperCase();

  const templateParams = {
    to_name: customerName,
    to_email: customerEmail,
    booking_id: bookingId,
    service_name: serviceName,
    stylist_name: employeeName,
    appointment_date: dateStr,
    appointment_time: timeStr,
    salon_name: 'StylistAI Salon',
    salon_contact: 'support@stylistai.com',
  };

  try {
    const response = await emailjs.send(serviceId, templateId, templateParams, publicKey);
    console.log('[EmailJS] Confirmation email sent successfully:', response.status, response.text);
    return { success: true, response };
  } catch (err) {
    console.error('[EmailJS Error] Failed to send email:', err);
    return { success: false, error: err };
  }
}
