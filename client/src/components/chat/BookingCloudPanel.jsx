/**
 * BookingCloudPanel — Right-hand side cloud panel showing real-time
 * user selections, floating chips, pending booking confirmation, and Clear/Restart Chat option.
 */
export default function BookingCloudPanel({
  intent,
  pendingBooking,
  onReset,
  onConfirm,
  onCancel,
  loading
}) {
  const service  = pendingBooking?.serviceName  || intent?.service            || null;
  const date     = pendingBooking?.date         || intent?.date               || null;
  const time     = pendingBooking?.time         || intent?.time               || null;
  const stylist  = pendingBooking?.employeeName || intent?.employeePreference || null;
  const duration = pendingBooking?.durationMin  || null;
  const name     = pendingBooking?.customerName || intent?.customerName       || null;
  const email    = pendingBooking?.customerEmail || intent?.customerEmail     || null;

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
    { icon: 'content_cut',     label: service,             tag: 'Service',  key: 'service' },
    { icon: 'person',          label: stylist,             tag: 'Stylist',  key: 'stylist' },
    { icon: 'calendar_today',  label: formatDate(date),    tag: 'Date',     key: 'date' },
    { icon: 'schedule',        label: formatTime(time),    tag: 'Time',     key: 'time' },
    { icon: 'timer',           label: duration ? `${duration} min` : null, tag: 'Duration', key: 'duration' },
    { icon: 'badge',           label: name,                tag: 'Name',     key: 'name' },
    { icon: 'mail',            label: email,               tag: 'Email',    key: 'email' },
  ].filter(c => c.label);

  const hasSelections = chips.length > 0;

  return (
    <aside className="cloud-panel neo-shadow-lg" aria-label="Booking Information Cloud">
      {/* Cloud Header */}
      <div className="cloud-panel-header">
        <div className="cloud-panel-title-wrap">
          <span className="material-symbols-outlined fill" style={{ color: 'var(--orange)', fontSize: 22 }}>
            cloud
          </span>
          <div>
            <div className="cloud-panel-title">SELECTION CLOUD</div>
            <div className="cloud-panel-sub">REAL-TIME INFO</div>
          </div>
        </div>

        {/* Clear / Restart Chat Option */}
        <button
          type="button"
          onClick={onReset}
          className="cloud-restart-btn"
          title="Restart Conversation"
          aria-label="Restart Conversation"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>refresh</span>
          <span>Clear Chat</span>
        </button>
      </div>

      {/* Cloud Body with Floating Selection Bubbles */}
      <div className="cloud-panel-body">
        {!hasSelections ? (
          <div className="cloud-empty-state">
            <div className="cloud-empty-icon-wrap">
              <span className="material-symbols-outlined" style={{ fontSize: 36, color: 'var(--orange)' }}>
                temp_preferences_custom
              </span>
            </div>
            <p className="cloud-empty-title">Waiting for your request...</p>
            <p className="cloud-empty-desc">
              Your chosen service, stylist, date, and time will float into this cloud as we talk.
            </p>
          </div>
        ) : (
          <div className="cloud-chips-grid">
            {chips.map((chip, i) => (
              <div
                key={chip.key}
                className="cloud-chip"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <div className="cloud-chip-header">
                  <span className="material-symbols-outlined cloud-chip-icon">{chip.icon}</span>
                  <span className="cloud-chip-tag">{chip.tag}</span>
                </div>
                <div className="cloud-chip-val">{chip.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Confirmation Summary Card if pendingBooking is ready */}
        {pendingBooking && (
          <div className="cloud-pending-card">
            <div className="cloud-pending-header">
              <span className="material-symbols-outlined fill" style={{ color: 'var(--orange)' }}>
                check_circle
              </span>
              <span className="cloud-pending-title">Ready to Confirm</span>
            </div>

            <div className="cloud-pending-slot">
              <div className="cloud-pending-time">{formatTime(pendingBooking.time)}</div>
              <div className="cloud-pending-meta">
                {pendingBooking.serviceName} with <strong>{pendingBooking.employeeName}</strong>
              </div>
              <div className="cloud-pending-date">{formatDate(pendingBooking.date)}</div>
            </div>

            <div className="cloud-pending-actions">
              <button
                type="button"
                className="btn btn-primary"
                onClick={onConfirm}
                disabled={loading}
                style={{ flex: 1, justifyContent: 'center' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>check</span>
                Confirm
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={onCancel}
                disabled={loading}
                style={{ flex: 1, justifyContent: 'center' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>close</span>
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
