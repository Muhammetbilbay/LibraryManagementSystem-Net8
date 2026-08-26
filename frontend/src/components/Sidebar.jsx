import React from 'react';

function Sidebar({ user, activeView, setActiveView }) {
  const isStaffOrAdmin = user && (user.roles.includes('ADMIN') || user.roles.includes('STAFF'));

  const navItems = [
    { id: 'dashboardView', label: 'Genel Durum', icon: 'fa-chart-line', show: true },
    { id: 'booksView', label: 'Kitap Yönetimi', icon: 'fa-book', show: true },
    { id: 'borrowingsView', label: 'Ödünç & İade', icon: 'fa-clock-rotate-left', show: true },
    { id: 'reservationsView', label: 'Rezervasyon Sırası', icon: 'fa-hourglass-half', show: true },
    { id: 'membersView', label: 'Üye Yönetimi', icon: 'fa-users', show: isStaffOrAdmin },
    { id: 'settingsView', label: 'Sistem Ayarları', icon: 'fa-sliders', show: isStaffOrAdmin }
  ];

  const firstChar = user && user.name ? user.name.charAt(0).toUpperCase() : '?';

  return (
    <aside className="app-sidebar" id="sidebar">
      <div>
        <div className="sidebar-header">
          <i className="fa-solid fa-book-bookmark"></i>
          <span>BİLGİ KÜTÜPHANESİ</span>
        </div>

        <nav className="sidebar-nav">
          {navItems.map(item => {
            if (!item.show) return null;
            return (
              <a
                key={item.id}
                href="#"
                className={`sidebar-link ${activeView === item.id ? 'active' : ''}`}
                onClick={(e) => {
                  e.preventDefault();
                  setActiveView(item.id);
                }}
              >
                <i className={`fa-solid ${item.icon}`}></i> {item.label}
              </a>
            );
          })}
        </nav>
      </div>

      <div className="sidebar-footer">
        {user && (
          <div className="sidebar-profile">
            <div className="profile-avatar">{firstChar}</div>
            <div className="profile-details">
              <span className="profile-name">{user.name} {user.surname || ''}</span>
              <span className="profile-role">{user.roles.join(', ')}</span>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}

export default Sidebar;
