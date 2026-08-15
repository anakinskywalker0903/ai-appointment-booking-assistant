import { Link } from 'react-router-dom';

const NAV_ITEMS = [
  { id: 'overview',      label: 'Overview',      icon: 'dashboard' },
  { id: 'appointments',  label: 'Appointments',  icon: 'event_available' },
  { id: 'calendar',      label: 'Calendar',      icon: 'calendar_month' },
  { id: 'staff',         label: 'Staff',         icon: 'badge' },
  { id: 'customers',     label: 'Customers',     icon: 'group' },
  { id: 'ai-bookings',   label: 'AI Bookings',   icon: 'smart_toy' },
  { id: 'notifications', label: 'Notifications', icon: 'notifications' },
  { id: 'settings',      label: 'Settings',      icon: 'settings' },
];

export default function AdminSidebar({ activeTab = 'overview', onSelectTab, onLogout, onHelp }) {
  return (
    <nav className="admin-sidebar" aria-label="Admin navigation">
      {/* Brand */}
      <div className="admin-sidebar-brand">
        <div className="admin-sidebar-logo">
          <span className="material-symbols-outlined fill" style={{ fontSize: 26 }}>content_cut</span>
        </div>
        <div>
          <div className="admin-sidebar-name">StylistAI<br />Admin</div>
          <div className="admin-sidebar-sub">Salon Management</div>
        </div>
      </div>



      {/* Main functional nav */}
      <div className="admin-nav-list">
        {NAV_ITEMS.map(item => {
          const active = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectTab(item.id)}
              className={`admin-nav-item ${active ? 'admin-nav-item--active' : ''}`}
            >
              <span className={`material-symbols-outlined ${active ? 'fill' : ''}`} style={{ fontSize: 20 }}>
                {item.icon}
              </span>
              {item.label}
            </button>
          );
        })}
      </div>

      {/* Footer */}
      <div className="admin-sidebar-footer">
        <button type="button" className="admin-nav-item" onClick={onHelp}>
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>help</span>
          Help
        </button>
        <button type="button" className="admin-nav-item admin-nav-item--btn" onClick={onLogout}>
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>logout</span>
          Logout
        </button>
      </div>
    </nav>
  );
}
