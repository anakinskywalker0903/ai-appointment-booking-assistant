/**
 * Shows available time slot options when a pendingBooking exists.
 * The "selected" slot is the one in pendingBooking.
 * onConfirm / onCancel — quick action handlers
 */
export default function AvailableOptions({ pendingBooking, onConfirm, onCancel, loading }) {
  if (!pendingBooking) return null;

  function formatTime(t) {
    if (!t) return '';
    const [hh, mm] = t.split(':').map(Number);
    return `${hh % 12 || 12}:${String(mm).padStart(2, '0')} ${hh >= 12 ? 'PM' : 'AM'}`;
  }

  return (
    <div className="avail-panel neo-shadow-md">
      <h3 className="avail-panel-title">Available Options</h3>

      {/* Selected slot — shows confirmed state */}
      <div className="avail-slot avail-slot--selected">
        <span className="material-symbols-outlined fill avail-slot-check">check_circle</span>
        <div className="avail-slot-time">{formatTime(pendingBooking.time)}</div>
        <div className="avail-slot-name">{pendingBooking.employeeName}</div>
        <div className="avail-slot-label">Selected</div>
      </div>

      {/* Confirm / cancel row */}
      <div className="avail-actions">
        <button
          className="btn btn-success"
          onClick={onConfirm}
          disabled={loading}
          style={{ flex: 1 }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 15 }}>check_circle</span>
          Confirm
        </button>
        <button
          className="btn btn-danger"
          onClick={onCancel}
          disabled={loading}
          style={{ flex: 1 }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 15 }}>cancel</span>
          Cancel
        </button>
      </div>
    </div>
  );
}
