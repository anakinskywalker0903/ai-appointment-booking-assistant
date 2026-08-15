/**
 * AI Assistant Health widget.
 * Shows system status, a derived success rate, and calendar connection.
 * appointments: full array used to compute success rate
 * calConnected: boolean
 */
export default function AiHealthWidget({ appointments, calConnected }) {
  const total     = appointments.length;
  const confirmed = appointments.filter(a => a.status === 'confirmed').length;
  const cancelled = appointments.filter(a => a.status === 'cancelled').length;
  const successRate = total > 0
    ? Math.round(((total - cancelled) / total) * 100)
    : 100;

  return (
    <div className="health-widget">
      <h3 className="health-widget-title">AI Assistant Health</h3>

      <div className="health-grid">
        <div className="health-row">
          <span className="health-label">Status</span>
          <div className="health-value health-status">
            <span className="health-dot health-dot--online" />
            Online
          </div>
        </div>

        <div className="health-row">
          <span className="health-label">Success Rate</span>
          <span className="health-value">{successRate}%</span>
        </div>

        <div className="health-row health-row--full">
          <span className="health-label">Total Bookings Processed</span>
          <span className="health-value">{total}</span>
        </div>

        <div className="health-row health-row--full">
          <span className="health-label">Calendar Sync</span>
          <div className="health-value health-status">
            <span className={`health-dot ${calConnected ? 'health-dot--online' : 'health-dot--offline'}`} />
            {calConnected ? 'Connected' : 'Not Connected'}
          </div>
        </div>

        <div className="health-row health-row--full">
          <span className="health-label">Avg Response Time</span>
          <span className="health-value">
            ~0.8s
            <span className="health-delta">
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>arrow_downward</span>
              0.3s
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}
