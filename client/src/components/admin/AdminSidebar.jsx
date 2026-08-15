import { Link, useLocation } from 'react-router-dom';

const NAV_ITEMS = [
  { label: 'Overview',      icon: 'dashboard',       path: '/admin' },
  { label: 'Appointments',  icon: 'event_available',  path: '/admin/appointments' },
  { label: 'Calendar',      icon: 'calendar_month',   path: '/admin/calendar' },
  { label: 'Staff',         icon: 'badge',            path: '/admin/staff' },
  { label: 'Customers',     icon: 'group',            path: '/admin/customers' },
  { label: 'AI Bookings',   icon: 'smart_toy',        path: '/admin/ai-bookings' },
  { label: 'Notifications', icon: 'notifications',    path: '/admin/notifications' },
  { label: 'Settings',      icon: 'settings',         path: '/admin/settings' },
];

export default function AdminSidebar({ onLogout }) {
  const { pathname } = useLocation();

  return (
    <nav className="admin-sidebar" aria-label="Admin navigation">
      {/* Brand */}
      <div className="admin-sidebar-brand">
        <div className="admin-sidebar-logo">
          <span className="material-symbols-outlined fill" style={{ fontSize: 28 }}>content_cut</span>
        </div>
        <div>
          <div className="admin-sidebar-name">StylistAI<br />Admin</div>
          <div className="admin-sidebar-sub">Salon Management</div>
        </div>
      </div>

      {/* New Appointment CTA */}
      <Link to="/" className="admin-new-btn">
        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add</span>
        New Appointment
      </Link>

      {/* Main nav */}
      <div className="admin-nav-list">
        {NAV_ITEMS.map(item => {
          const active = pathname === item.path || (item.path === '/admin' && pathname === '/admin');
          return (
            <Link
              key={item.label}
              to={item.path === '/admin' ? '/admin' : '/admin'}
              className={`admin-nav-item ${active ? 'admin-nav-item--active' : ''}`}
            >
              <span className={`material-symbols-outlined ${active ? 'fill' : ''}`} style={{ fontSize: 20 }}>
                {item.icon}
              </span>
              {item.label}
            </Link>
          );
        })}
      </div>

      {/* Footer */}
      <div className="admin-sidebar-footer">
        <Link to="/" className="admin-nav-item">
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>help</span>
          Help
        </Link>
        <button className="admin-nav-item admin-nav-item--btn" onClick={onLogout}>
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>logout</span>
          Logout
        </button>
      </div>
    </nav>
  );
}
