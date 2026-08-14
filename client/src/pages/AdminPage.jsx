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
  const [updating,     setUpdating]     = useState(null); // id of row being updated

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

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

  useEffect(() => { fetchAppointments(); }, [fetchAppointments]);

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

  // Stats computed from full appointment list (all statuses)
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
          <h1>🗓 Admin Dashboard</h1>
          <div className="admin-header-sub">Appointment management</div>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <button id="btn-refresh" className="btn btn-ghost" onClick={fetchAppointments} disabled={loading}>
            ↻ Refresh
          </button>
          <Link to="/" className="btn btn-ghost">← Back to Chat</Link>
        </div>
      </header>

      <div className="admin-body">
        {/* Stats */}
        <div className="stats-grid">
          <div className="stat-card stat-total">
            <div className="stat-card-label">Total</div>
            <div className="stat-card-value">{stats.total}</div>
          </div>
          <div className="stat-card stat-pending">
            <div className="stat-card-label">Pending</div>
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
              <div>Loading appointments…</div>
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
                  <th>Date</th>
                  <th>Time</th>
                  <th>Status</th>
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
                    <td>{formatDate(a.appointment_date)}</td>
                    <td>{formatTime(a.appointment_time)}</td>
                    <td>
                      <span className={`badge badge-${a.status}`}>{a.status}</span>
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
