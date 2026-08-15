/**
 * Live AI Booking Feed — shows recent AI-booked appointments.
 * appointments: full list (we'll show the last few AI-confirmed ones)
 */
export default function AiBookingFeed({ appointments }) {
  // Show the 3 most recently created confirmed appointments
  const recent = [...appointments]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 3);

  function timeAgo(ts) {
    const diff = Math.floor((Date.now() - new Date(ts)) / 1000);
    if (diff < 60)   return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  }

  function formatTime(t) {
    if (!t) return '';
    const [hh, mm] = t.slice(0, 5).split(':').map(Number);
    return `${hh % 12 || 12}:${String(mm).padStart(2, '0')} ${hh >= 12 ? 'PM' : 'AM'}`;
  }

  if (recent.length === 0) {
    return (
      <div className="feed-empty">
        <span className="material-symbols-outlined" style={{ fontSize: 32, opacity: 0.3 }}>smart_toy</span>
        <p>No AI bookings yet.</p>
      </div>
    );
  }

  return (
    <div className="feed-list">
      {recent.map(appt => {
        const isAutoBooked = !!appt.calendar_event_id;
        return (
          <div
            key={appt.id}
            className={`feed-card neo-shadow-sm ${appt.status === 'pending' ? 'feed-card--needs-approval' : ''}`}
          >
            <div className="feed-card-header">
              <span className={`feed-badge ${isAutoBooked ? 'feed-badge--auto' : 'feed-badge--pending'}`}>
                {isAutoBooked ? (
                  <>
                    <span className="material-symbols-outlined" style={{ fontSize: 12 }}>smart_toy</span>
                    Auto-Booked
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined" style={{ fontSize: 12 }}>warning</span>
                    Needs Approval
                  </>
                )}
              </span>
              <span className="feed-card-time">{timeAgo(appt.created_at)}</span>
            </div>

            <p className="feed-card-quote">
              "{appt.services?.name} for {appt.customer_name}"
            </p>

            <div className="feed-card-tags">
              {appt.services?.name && (
                <span className="feed-tag">{appt.services.name}</span>
              )}
              <span className="feed-tag">{appt.appointment_date}</span>
              <span className="feed-tag">{formatTime(appt.appointment_time)}</span>
              {appt.employees?.name && (
                <span className="feed-tag">{appt.employees.name}</span>
              )}
            </div>

            <div className="feed-card-footer">
              <span
                style={{
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: appt.status === 'confirmed' ? 'var(--success)' : 'var(--charcoal-light)',
                }}
              >
                {appt.status}
              </span>
              {appt.calendar_event_id && (
                <span style={{ fontSize: '0.75rem', color: 'var(--charcoal-light)' }}>📅 Synced</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
