/**
 * BookingBubbles — Floating cloud-like chips that progressively appear
 * as the AI extracts booking details from the conversation.
 * Replaces the old AiUnderstoodPanel.
 */
export default function BookingBubbles({ intent, pendingBooking }) {
  const service  = pendingBooking?.serviceName  || intent?.service            || null;
  const date     = pendingBooking?.date         || intent?.date               || null;
  const time     = pendingBooking?.time         || intent?.time               || null;
  const stylist  = pendingBooking?.employeeName || intent?.employeePreference || null;
  const duration = pendingBooking?.durationMin  || null;
  const name     = pendingBooking?.customerName || intent?.customerName       || null;

  function formatDate(d) {
    if (!d) return null;
    const dt = new Date(d + 'T12:00:00');
    return dt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  }

  function formatTime(t) {
    if (!t) return null;
    const [hh, mm] = t.split(':').map(Number);
    return `${hh % 12 || 12}:${String(mm).padStart(2, '0')} ${hh >= 12 ? 'PM' : 'AM'}`;
  }

  const chips = [
    { icon: 'content_cut',  label: service,  key: 'service' },
    { icon: 'person',       label: stylist,  key: 'stylist' },
    { icon: 'calendar_today', label: formatDate(date), key: 'date' },
    { icon: 'schedule',     label: formatTime(time),   key: 'time' },
    { icon: 'timer',        label: duration ? `${duration} min` : null, key: 'duration' },
    { icon: 'badge',        label: name, key: 'name' },
  ].filter(c => c.label);

  if (chips.length === 0) return null;

  return (
    <div className="booking-bubbles">
      {chips.map((chip, i) => (
        <div
          key={chip.key}
          className="booking-bubble"
          style={{ animationDelay: `${i * 80}ms` }}
        >
          <span className="material-symbols-outlined booking-bubble-icon">{chip.icon}</span>
          <span className="booking-bubble-text">{chip.label}</span>
        </div>
      ))}
    </div>
  );
}
