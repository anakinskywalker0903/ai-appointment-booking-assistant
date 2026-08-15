/**
 * Shows structured data the AI extracted from the conversation.
 * intent: the latest intent object from the backend
 * pendingBooking: confirmed pending booking summary
 */
export default function AiUnderstoodPanel({ intent, pendingBooking }) {
  // Prefer pendingBooking data (more complete) over raw intent
  const service  = pendingBooking?.serviceName  || intent?.service        || null;
  const date     = pendingBooking?.date         || intent?.date           || null;
  const time     = pendingBooking?.time         || intent?.time           || null;
  const stylist  = pendingBooking?.employeeName || intent?.employeePreference || null;
  const duration = pendingBooking?.durationMin  || null;

  const hasAny = service || date || time || stylist;

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

  const rows = [
    { label: 'Service',  value: service },
    { label: 'Date',     value: formatDate(date) },
    { label: 'Time',     value: formatTime(time) },
    { label: 'Stylist',  value: stylist },
    { label: 'Duration', value: duration ? `~${duration} Mins` : null },
  ].filter(r => r.value);

  return (
    <div className="ai-panel neo-shadow-md">
      <div className="ai-panel-header">
        <span className="material-symbols-outlined" style={{ color: 'var(--orange)' }}>data_object</span>
        <h2 className="ai-panel-title">AI Understood</h2>
      </div>

      {!hasAny ? (
        <p className="ai-panel-empty">
          Start chatting — I'll extract your booking details here as we talk.
        </p>
      ) : (
        <div className="ai-panel-rows">
          {rows.map(r => (
            <div key={r.label} className="ai-panel-row">
              <span className="ai-panel-row-label">{r.label}</span>
              <span className="ai-panel-row-value">{r.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
