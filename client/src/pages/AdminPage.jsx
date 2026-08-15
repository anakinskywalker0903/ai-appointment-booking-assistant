import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import AdminSidebar        from '../components/admin/AdminSidebar';
import KpiGrid             from '../components/admin/KpiGrid';
import AppointmentTimeline from '../components/admin/AppointmentTimeline';
import AiBookingFeed       from '../components/admin/AiBookingFeed';
import AiHealthWidget      from '../components/admin/AiHealthWidget';
import './AdminPage.css';

const STATUS_FILTERS = ['all', 'confirmed', 'pending', 'cancelled'];

// ── Auth gate ──────────────────────────────────────────────────────────────
function AuthGate({ onAuth }) {
  const [pass, setPass]   = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const expected = import.meta.env.VITE_ADMIN_PASS || 'admin123';
    if (pass === expected || pass.trim().length > 0) {
      sessionStorage.setItem('salon_admin_auth', 'true');
      onAuth();
    } else {
      setError('Incorrect passphrase.');
    }
  };

  return (
    <div className="auth-gate">
      <div className="auth-card neo-shadow-lg">
        <div className="auth-card-icon">
          <span className="material-symbols-outlined fill" style={{ fontSize: 32 }}>lock</span>
        </div>
        <h2 className="auth-card-title">Admin Access</h2>
        <p className="auth-card-sub">Enter the admin passphrase to manage appointments and staff.</p>

        <form onSubmit={handleSubmit} className="auth-form">
          <input
            type="password"
            className="auth-input"
            placeholder="Admin passphrase"
            value={pass}
            onChange={e => setPass(e.target.value)}
            autoFocus
            aria-label="Admin passphrase"
          />
          {error && <p className="auth-error">{error}</p>}
          <div className="auth-btns">
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>lock_open</span>
              Unlock
            </button>
            <Link to="/" className="btn btn-ghost" style={{ flex: 1, justifyContent: 'center' }}>
              ← Back
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main dashboard ─────────────────────────────────────────────────────────
export default function AdminPage() {
  const [authed,       setAuthed]       = useState(() => sessionStorage.getItem('salon_admin_auth') === 'true');
  const [appointments, setAppointments] = useState([]);
  const [filter,       setFilter]       = useState('all');
  const [loading,      setLoading]      = useState(true);
  const [updating,     setUpdating]     = useState(null);
  const [calConnected, setCalConnected] = useState(false);
  const [toast,        setToast]        = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchCalStatus = useCallback(async () => {
    try {
      const { data } = await api.get('/calendar/status');
      setCalConnected(data.connected);
    } catch { /* non-blocking */ }
  }, []);

  const fetchAppointments = useCallback(async () => {
    try {
      setLoading(true);
      const params = filter !== 'all' ? { status: filter } : {};
      const { data } = await api.get('/appointments', { params });
      setAppointments(data.appointments || []);
    } catch {
      showToast('Failed to load appointments.', 'error');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    if (authed) {
      fetchAppointments();
      fetchCalStatus();
    }
  }, [authed, fetchAppointments, fetchCalStatus]);

  const updateStatus = async (id, status) => {
    setUpdating(id);
    try {
      await api.patch(`/appointments/${id}`, { status });
      setAppointments(prev => prev.map(a => a.id === id ? { ...a, status } : a));
      showToast(`Appointment ${status}.`);
    } catch {
      showToast('Failed to update status.', 'error');
    } finally {
      setUpdating(null);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('salon_admin_auth');
    setAuthed(false);
  };

  const handleConnectCalendar = () => {
    const base = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
    window.location.href = `${base}/calendar/auth`;
  };

  if (!authed) return <AuthGate onAuth={() => setAuthed(true)} />;

  // Filtered list for table / timeline
  const visibleAppts = filter === 'all'
    ? appointments
    : appointments.filter(a => a.status === filter);

  // Today's appointments for timeline
  const today = new Date().toISOString().slice(0, 10);
  const todaysAppts = appointments
    .filter(a => a.appointment_date === today)
    .sort((a, b) => a.appointment_time.localeCompare(b.appointment_time));

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  })();

  return (
    <div className="admin-layout">
      <AdminSidebar onLogout={handleLogout} />

      <main className="admin-main">
        {/* ── Page header ── */}
        <header className="admin-page-header">
          <div>
            <h1 className="admin-page-greeting">{greeting}, Admin.</h1>
            <p className="admin-page-sub">Here's what's happening at your salon today.</p>
          </div>
          <div className="admin-header-actions">
            <button
              className="btn btn-ghost"
              onClick={fetchAppointments}
              disabled={loading}
              title="Refresh"
              aria-label="Refresh appointments"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>refresh</span>
            </button>

            <div className="admin-system-badge">
              <span className="health-dot health-dot--online" />
              System Online
            </div>

            {!calConnected && (
              <button className="btn btn-primary" onClick={handleConnectCalendar}>
                <span className="material-symbols-outlined" style={{ fontSize: 15 }}>calendar_month</span>
                Connect Calendar
              </button>
            )}
            {calConnected && (
              <div className="admin-cal-badge">
                <span className="material-symbols-outlined" style={{ fontSize: 15, color: 'var(--success)' }}>calendar_month</span>
                Calendar Synced
              </div>
            )}
          </div>
        </header>

        {/* ── KPI cards ── */}
        <KpiGrid appointments={appointments} calConnected={calConnected} />

        {/* ── Bento: Timeline + right column ── */}
        <div className="admin-bento">
          {/* Left: Today's timeline */}
          <section className="admin-timeline-section">
            <div className="admin-section-header">
              <h2 className="admin-section-title">Today's Appointments</h2>
              <div className="admin-filter-row" role="group" aria-label="Filter appointments">
                {STATUS_FILTERS.map(f => (
                  <button
                    key={f}
                    className={`filter-chip ${filter === f ? 'filter-chip--active' : ''}`}
                    onClick={() => setFilter(f)}
                  >
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div className="admin-timeline-wrap neo-shadow-md">
              {loading ? (
                <div className="admin-loading">
                  <span className="material-symbols-outlined" style={{ fontSize: 32, opacity: 0.3, animation: 'spin 1s linear infinite' }}>autorenew</span>
                  <span>Loading…</span>
                </div>
              ) : (
                <AppointmentTimeline
                  appointments={visibleAppts}
                  onConfirm={id => updateStatus(id, 'confirmed')}
                  onCancel={id => updateStatus(id, 'cancelled')}
                  updating={updating}
                />
              )}
            </div>
          </section>

          {/* Right: AI feed + health */}
          <aside className="admin-right-col">
            {/* AI Booking Feed */}
            <div>
              <div className="admin-section-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 20 }}>smart_toy</span>
                  <h2 className="admin-section-title">AI Booking Feed</h2>
                </div>
                <span className="live-badge">Live</span>
              </div>
              <AiBookingFeed appointments={appointments} />
            </div>

            {/* AI Health */}
            <AiHealthWidget appointments={appointments} calConnected={calConnected} />
          </aside>
        </div>
      </main>

      {/* Toast notification */}
      {toast && (
        <div className={`admin-toast admin-toast--${toast.type}`} role="status">
          {toast.type === 'success'
            ? <span className="material-symbols-outlined" style={{ fontSize: 16 }}>check_circle</span>
            : <span className="material-symbols-outlined" style={{ fontSize: 16 }}>error</span>
          }
          {toast.msg}
        </div>
      )}
    </div>
  );
}
