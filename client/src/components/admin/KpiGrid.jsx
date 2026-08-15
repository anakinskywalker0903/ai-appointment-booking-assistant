/**
 * 4-card KPI stat grid.
 * appointments: full appointments array (used to derive counts)
 * calConnected: boolean
 */
export default function KpiGrid({ appointments, calConnected }) {
  const today = new Date().toISOString().slice(0, 10);

  const todayCount    = appointments.filter(a => a.appointment_date === today).length;
  const confirmedToday = appointments.filter(a => a.appointment_date === today && a.status === 'confirmed');
  const upcoming      = appointments.filter(a => a.appointment_date >= today && a.status !== 'cancelled');

  // Next upcoming appointment time
  const nextAppt = upcoming.sort((a, b) =>
    `${a.appointment_date}${a.appointment_time}`.localeCompare(`${b.appointment_date}${b.appointment_time}`)
  )[0];

  function formatTime(t) {
    if (!t) return '—';
    const [hh, mm] = t.slice(0, 5).split(':').map(Number);
    return `${hh % 12 || 12}:${String(mm).padStart(2, '0')} ${hh >= 12 ? 'PM' : 'AM'}`;
  }

  // Unique active stylists from today's bookings
  const activeStylists = [...new Set(
    appointments.filter(a => a.appointment_date === today && a.status !== 'cancelled')
      .map(a => a.employees?.id).filter(Boolean)
  )].length;

  const cards = [
    {
      label:   "Today's Bookings",
      value:   todayCount || '0',
      icon:    'event_note',
      iconBg:  'var(--orange)',
      sub:     confirmedToday.length > 0 ? `${confirmedToday.length} confirmed` : 'No bookings yet',
      subIcon: 'trending_up',
    },
    {
      label:   'Upcoming',
      value:   upcoming.length || '0',
      icon:    'schedule',
      iconBg:  'var(--blue-light)',
      sub:     nextAppt ? `Next: ${formatTime(nextAppt.appointment_time)}` : 'None scheduled',
      subIcon: 'arrow_forward',
    },
    {
      label:   'Confirmed',
      value:   appointments.filter(a => a.status === 'confirmed').length || '0',
      icon:    'payments',
      iconBg:  'var(--teal)',
      sub:     'All time',
      subIcon: 'trending_up',
    },
    {
      label:   'Active Stylists',
      value:   activeStylists || '—',
      icon:    'badge',
      iconBg:  'var(--silver)',
      sub:     calConnected ? '📅 Calendar synced' : 'Calendar not connected',
      subIcon: 'info',
    },
  ];

  return (
    <div className="kpi-grid">
      {cards.map(card => (
        <div key={card.label} className="kpi-card neo-card neo-shadow-md">
          <div className="kpi-card-header">
            <span className="kpi-card-label">{card.label}</span>
            <span
              className="kpi-card-icon material-symbols-outlined"
              style={{ background: card.iconBg }}
            >
              {card.icon}
            </span>
          </div>
          <div className="kpi-card-value">{card.value}</div>
          <div className="kpi-card-sub">
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>{card.subIcon}</span>
            {card.sub}
          </div>
        </div>
      ))}
    </div>
  );
}
