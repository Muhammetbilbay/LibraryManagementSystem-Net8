import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import { API_URL } from '../App';

function SettingsView({ token, user }) {
  const [maxBorrowDays, setMaxBorrowDays] = useState('');
  const [dailyPenaltyFee, setDailyPenaltyFee] = useState('');
  const [maxBooksLimit, setMaxBooksLimit] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await fetch(`${API_URL}/settings`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        setMaxBorrowDays(data.maxBorrowDays || '');
        setDailyPenaltyFee(data.dailyPenaltyFee || '');
        setMaxBooksLimit(data.maxBooksLimit || '');
      }
    } catch (err) {
      console.error('Failed to load system settings:', err);
    }
  };

  const handleUpdateSettings = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_URL}/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          maxBorrowDays: parseInt(maxBorrowDays),
          dailyPenaltyFee: parseFloat(dailyPenaltyFee),
          maxBooksLimit: parseInt(maxBooksLimit)
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Ayarlar güncellenemedi.');

      Swal.fire({
        title: 'Ayarlar Kaydedildi',
        text: 'Sistem limitleri başarıyla güncellendi.',
        icon: 'success',
        timer: 1500,
        showConfirmButton: false
      });
    } catch (err) {
      Swal.fire('Hata', err.message, 'error');
    }
  };

  const isStaffOrAdmin = user && (user.roles.includes('ADMIN') || user.roles.includes('STAFF'));

  return (
    <section id="settingsView" className="view-panel">
      <div className="card-panel" style={{ maxWidth: '500px', margin: '0 auto' }}>
        <h3>Kütüphane Kuralları ve Limitleri</h3>
        
        <form onSubmit={handleUpdateSettings} style={{ marginTop: '1.5rem' }}>
          <div className="form-group">
            <label htmlFor="settingsBorrowDays">Maksimum Ödünç Süresi (Gün)</label>
            <input 
              type="number" 
              id="settingsBorrowDays" 
              min="1" 
              required 
              value={maxBorrowDays}
              onChange={(e) => setMaxBorrowDays(e.target.value)}
              disabled={!isStaffOrAdmin}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="settingsPenaltyRate">Günlük Gecikme Cezası (TRY)</label>
            <input 
              type="number" 
              step="0.1" 
              id="settingsPenaltyRate" 
              min="0" 
              required 
              value={dailyPenaltyFee}
              onChange={(e) => setDailyPenaltyFee(e.target.value)}
              disabled={!isStaffOrAdmin}
            />
          </div>

          <div className="form-group">
            <label htmlFor="settingsMaxBooks">Üye Başına Maksimum Kitap Limiti</label>
            <input 
              type="number" 
              id="settingsMaxBooks" 
              min="1" 
              required 
              value={maxBooksLimit}
              onChange={(e) => setMaxBooksLimit(e.target.value)}
              disabled={!isStaffOrAdmin}
            />
          </div>

          {isStaffOrAdmin ? (
            <button type="submit" className="btn btn-primary btn-block" id="saveSettingsBtn">
              <i className="fa-solid fa-save"></i> Ayarları Güncelle
            </button>
          ) : (
            <div id="settingsMsg" style={{ marginTop: '1rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              Ayarları düzenleme yetkiniz bulunmamaktadır.
            </div>
          )}
        </form>
      </div>
    </section>
  );
}

export default SettingsView;
