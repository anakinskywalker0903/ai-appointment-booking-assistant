/**
 * Timeline view of today's appointments.
 * appointments: filtered list
 * onConfirm(id) / onCancel(id)
 * updating: id currently being updated (for loading state)
 */
export default function AppointmentTimeline({ appointments, onConfirm, onCancel, updating, onViewAll }) {
  function formatTime(t) {
    if (!t) return '';
    const [hh, mm] = t.slice(0, 5).split(':').map(Number);
    return `${hh % 12 || 12}:${String(mm).padStart(2, '0')}`;
  }

  const STATUS_MAP = {
    confirmed: { label: 'Confirmed',  bg: 'var(--blue-light)', color: 'var(--charcoal-dark)' },
    pending:   { label: 'Pending',    bg: 'var(--orange)',      color: '#fff' },
    cancelled: { label: 'Cancelled',  bg: 'var(--error-bg)',    color: 'var(--error)' },
  };

  if (appointments.length === 0) {
    return (
      <div className="timeline-empty">
        <span className="material-symbols-outlined" style={{ fontSize: 36, opacity: 0.3 }}>event_busy</span>
        <p>No appointments found.</p>
      </div>
    );
  }

  return (
    <div className="timeline-list">
      {appointments.map((appt, idx) => {
        const status = STATUS_MAP[appt.status] || STATUS_MAP.pending;
        const isLast = idx === appointments.length - 1;

        return (
          <div key={appt.id} className="timeline-item">
            {/* Time column */}
            <div className="timeline-time-col">
              <span className="timeline-time">{formatTime(appt.appointment_time)}</span>
              {!isLast && <div className="timeline-line" />}
            </div>

            {/* Card */}
            <div className="timeline-card neo-card neo-shadow-sm">
              <div className="timeline-card-top">
                <div>
                  <div className="timeline-card-name">{appt.customer_name}</div>
                  <div className="timeline-card-service">
                    {appt.services?.name || '—'}
                  </div>
                </div>
                <span
                  className="timeline-badge"
                  style={{ background: status.bg, color: status.color }}
                >
                  {status.label.toUpperCase()}
                </span>
              </div>

              <div className="timeline-card-footer">
                <div className="timeline-card-stylist">
                  <span className="material-symbols-outlined" style={{ fontSize: 14 }}>content_cut</span>
                  Stylist: {appt.employees?.name || 'Any'}
                  {appt.calendar_event_id && (
                    <span title="Synced to Google Calendar" style={{ marginLeft: 8 }}>📅</span>
                  )}
                </div>

                {appt.status !== 'cancelled' && (
                  <div className="timeline-card-actions">
                    {appt.status !== 'confirmed' && (
                      <button
                        className="btn btn-success"
                        onClick={() => onConfirm(appt.id)}
                        disabled={updating === appt.id}
                        style={{ padding: '4px 10px', fontSize: '0.7rem' }}
                      >
                        ✓ Confirm
                      </button>
                    )}
                    <button
                      className="btn btn-danger"
                      onClick={() => onCancel(appt.id)}
                      disabled={updating === appt.id}
                      style={{ padding: '4px 10px', fontSize: '0.7rem' }}
                    >
                      ✗ Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
