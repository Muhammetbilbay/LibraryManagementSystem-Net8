import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import AuthView from './components/AuthView';
import DashboardView from './components/DashboardView';
import BooksView from './components/BooksView';
import BorrowingsView from './components/BorrowingsView';
import ReservationsView from './components/ReservationsView';
import MembersView from './components/MembersView';
import SettingsView from './components/SettingsView';

export const API_URL = 'https://librarymanagementsystem-net8.onrender.com';

function App() {
  const [token, setToken] = useState(
    localStorage.getItem('lib_token') || sessionStorage.getItem('lib_token') || null
  );
  const [user, setUser] = useState(
    JSON.parse(localStorage.getItem('lib_user') || sessionStorage.getItem('lib_user') || 'null')
  );
  const [activeView, setActiveView] = useState('dashboardView');
  const [theme, setTheme] = useState(localStorage.getItem('lib_theme') || 'dark');

  useEffect(() => {
    const body = document.body;
    if (theme === 'light') {
      body.classList.replace('dark-theme', 'light-theme');
    } else {
      body.classList.replace('light-theme', 'dark-theme');
    }
    localStorage.setItem('lib_theme', theme);
  }, [theme]);

  // Sync user profile on mount if token exists
  useEffect(() => {
    if (token) {
      fetchUserProfile();
    }
  }, [token]);

  const fetchUserProfile = async () => {
    try {
      const response = await fetch(`${API_URL}/auth/profile`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        setUser(data.user);
        if (localStorage.getItem('lib_token')) {
          localStorage.setItem('lib_user', JSON.stringify(data.user));
        } else {
          sessionStorage.setItem('lib_user', JSON.stringify(data.user));
        }
      } else {
        handleLogout();
      }
    } catch (err) {
      console.error('Profile sync failed:', err);
    }
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('lib_token');
    localStorage.removeItem('lib_user');
    sessionStorage.removeItem('lib_token');
    sessionStorage.removeItem('lib_user');
    setActiveView('dashboardView');
  };

  if (!token) {
    return (
      <AuthView 
        setToken={(t, remember) => {
          setToken(t);
          if (remember) {
            localStorage.setItem('lib_token', t);
          } else {
            sessionStorage.setItem('lib_token', t);
          }
        }}
        setUser={(u, remember) => {
          setUser(u);
          if (remember) {
            localStorage.setItem('lib_user', JSON.stringify(u));
          } else {
            sessionStorage.setItem('lib_user', JSON.stringify(u));
          }
        }}
      />
    );
  }

  const renderView = () => {
    switch (activeView) {
      case 'dashboardView':
        return <DashboardView token={token} user={user} />;
      case 'booksView':
        return <BooksView token={token} user={user} />;
      case 'borrowingsView':
        return <BorrowingsView token={token} user={user} />;
      case 'reservationsView':
        return <ReservationsView token={token} user={user} />;
      case 'membersView':
        return <MembersView token={token} user={user} />;
      case 'settingsView':
        return <SettingsView token={token} user={user} />;
      default:
        return <DashboardView token={token} user={user} />;
    }
  };

  return (
    <div className="app-layout">
      <Sidebar 
        user={user} 
        activeView={activeView} 
        setActiveView={setActiveView} 
      />
      <div className="main-content">
        <Header 
          user={user} 
          theme={theme} 
          setTheme={setTheme} 
          activeView={activeView} 
          handleLogout={handleLogout} 
          fetchUserProfile={fetchUserProfile}
        />
        {renderView()}
      </div>
    </div>
  );
}

export default App;
