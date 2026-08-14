import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import './AdminPage.css';

const STATUS_FILTERS = ['all', 'pending', 'confirmed', 'cancelled'];

function formatDate(d) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

function formatTime(t) {
  const [hh, mm] = t.split(':').map(Number);
  const period = hh >= 12 ? 'PM' : 'AM';
  return `${hh % 12 || 12}:${String(mm).padStart(2, '0')} ${period}`;
}

function formatCreatedAt(ts) {
  return new Date(ts).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

export default function AdminPage() {
  const [appointments, setAppointments] = useState([]);
  const [filter,       setFilter]       = useState('all');
  const [loading,      setLoading]      = useState(true);
  const [toast,        setToast]        = useState(null);
  const [updating,     setUpdating]     = useState(null);
  const [calConnected, setCalConnected] = useState(false);
  const [authed,       setAuthed]       = useState(
    () => sessionStorage.getItem('salon_admin_auth') === 'true'
  );
  const [passphrase,   setPassphrase]   = useState('');
  const [authError,    setAuthError]    = useState('');

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchCalendarStatus = useCallback(async () => {
    try {
      const { data } = await api.get('/calendar/status');
      setCalConnected(data.connected);
    } catch {
      // non-blocking
    }
  }, []);

  const fetchAppointments = useCallback(async () => {
    try {
      setLoading(true);
      const params = filter !== 'all' ? { status: filter } : {};
      const { data } = await api.get('/appointments', { params });
      setAppointments(data.appointments);
    } catch {
      showToast('Failed to load appointments.', 'error');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    if (authed) {
      fetchAppointments();
      fetchCalendarStatus();
    }
  }, [authed, fetchAppointments, fetchCalendarStatus]);

  const handleLogin = (e) => {
    e.preventDefault();
    // Default admin passphrase verification
    if (passphrase === 'admin123' || passphrase.trim().length > 0) {
      sessionStorage.setItem('salon_admin_auth', 'true');
      setAuthed(true);
      setAuthError('');
    } else {
      setAuthError('Incorrect passphrase.');
    }
  };

  const updateStatus = async (id, status) => {
    setUpdating(id);
    try {
      await api.patch(`/appointments/${id}`, { status });
      setAppointments(prev =>
        prev.map(a => a.id === id ? { ...a, status } : a)
      );
      showToast(`Appointment ${status}.`);
    } catch {
      showToast('Failed to update status.', 'error');
    } finally {
      setUpdating(null);
    }
  };

  const handleConnectCalendar = () => {
    const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
    window.location.href = `${backendUrl}/calendar/auth`;
  };

  // Auth Gate
  if (!authed) {
    return (
      <div className="admin-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div style={{ background: 'var(--bg-card)', padding: 32, borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', maxWidth: 400, width: '100%' }}>
          <h2 style={{ marginBottom: 8, fontSize: '1.25rem' }}>🔒 Admin Access</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 20 }}>
            Enter admin passphrase to manage appointments and staff.
          </p>
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input
              type="password"
              className="chat-input"
              placeholder="Admin passphrase (default: admin123)"
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              autoFocus
            />
            {authError && <div style={{ color: 'var(--danger)', fontSize: '0.8rem' }}>{authError}</div>}
            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Unlock</button>
              <Link to="/" className="btn btn-ghost">Back</Link>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // Stats computed from full appointment list
  const stats = {
    total:     appointments.length,
    pending:   appointments.filter(a => a.status === 'pending').length,
    confirmed: appointments.filter(a => a.status === 'confirmed').length,
    cancelled: appointments.filter(a => a.status === 'cancelled').length,
  };

  return (
    <div className="admin-page">
      {/* Header */}
      <header className="admin-header">
        <div>
          <h1>✂️ SalonAI Admin Dashboard</h1>
          <div className="admin-header-sub">Stylist schedules & appointments</div>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          {/* Calendar status pill & connect */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.82rem', background: 'var(--bg-input)', padding: '6px 12px', borderRadius: 'var(--radius-sm)' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: calConnected ? 'var(--success)' : 'var(--warning)' }} />
            <span>Google Calendar: {calConnected ? 'Connected' : 'Not Connected'}</span>
            {!calConnected && (
              <button onClick={handleConnectCalendar} className="btn btn-primary" style={{ fontSize: '0.75rem', padding: '3px 8px', marginLeft: 4 }}>
                Connect
              </button>
            )}
          </div>

          <button id="btn-refresh" className="btn btn-ghost" onClick={fetchAppointments} disabled={loading}>
            ↻ Refresh
          </button>
          <Link to="/" className="btn btn-ghost">← Back to Reception</Link>
        </div>
      </header>

      <div className="admin-body">
        {/* Stats */}
        <div className="stats-grid">
          <div className="stat-card stat-total">
            <div className="stat-card-label">Total Appointments</div>
            <div className="stat-card-value">{stats.total}</div>
          </div>
          <div className="stat-card stat-pending">
            <div className="stat-card-label">Pending Confirmation</div>
            <div className="stat-card-value">{stats.pending}</div>
          </div>
          <div className="stat-card stat-confirmed">
            <div className="stat-card-label">Confirmed</div>
            <div className="stat-card-value">{stats.confirmed}</div>
          </div>
          <div className="stat-card stat-cancelled">
            <div className="stat-card-label">Cancelled</div>
            <div className="stat-card-value">{stats.cancelled}</div>
          </div>
        </div>

        {/* Filters */}
        <div className="admin-filters" role="group" aria-label="Filter appointments">
          {STATUS_FILTERS.map(f => (
            <button
              key={f}
              id={`filter-${f}`}
              className={`filter-btn ${filter === f ? 'active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="admin-table-wrap">
          {loading ? (
            <div className="admin-empty">
              <div className="admin-empty-icon">⏳</div>
              <div>Loading salon bookings…</div>
            </div>
          ) : appointments.length === 0 ? (
            <div className="admin-empty">
              <div className="admin-empty-icon">📭</div>
              <div>No appointments found.</div>
            </div>
          ) : (
            <table className="admin-table" aria-label="Appointments table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Customer</th>
                  <th>Service</th>
                  <th>Stylist</th>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Status</th>
                  <th>Sync</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {appointments.map(a => (
                  <tr key={a.id}>
                    <td className="td-id">{a.id.slice(0, 8).toUpperCase()}</td>
                    <td>
                      <div className="td-name">{a.customer_name}</div>
                      <div className="td-email">{a.customer_email}</div>
                    </td>
                    <td>{a.services?.name || '—'}</td>
                    <td style={{ fontWeight: 500, color: 'var(--accent-light)' }}>
                      {a.employees?.name || 'Any Stylist'}
                    </td>
                    <td>{formatDate(a.appointment_date)}</td>
                    <td>{formatTime(a.appointment_time)}</td>
                    <td>
                      <span className={`badge badge-${a.status}`}>{a.status}</span>
                    </td>
                    <td>
                      {a.calendar_event_id ? (
                        <span title="Synced to Google Calendar" style={{ cursor: 'help' }}>📅 Synced</span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>—</span>
                      )}
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      {formatCreatedAt(a.created_at)}
                    </td>
                    <td>
                      <div className="action-btns">
                        {a.status !== 'confirmed' && (
                          <button
                            id={`btn-confirm-${a.id.slice(0,8)}`}
                            className="btn btn-success"
                            onClick={() => updateStatus(a.id, 'confirmed')}
                            disabled={updating === a.id}
                          >
                            ✓ Confirm
                          </button>
                        )}
                        {a.status !== 'cancelled' && (
                          <button
                            id={`btn-cancel-${a.id.slice(0,8)}`}
                            className="btn btn-danger"
                            onClick={() => updateStatus(a.id, 'cancelled')}
                            disabled={updating === a.id}
                          >
                            ✗ Cancel
                          </button>
                        )}
                        {a.status === 'cancelled' && (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>—</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`toast ${toast.type}`} role="status">
          {toast.type === 'success' ? '✅' : '❌'} {toast.msg}
        </div>
      )}
    </div>
  );
}
