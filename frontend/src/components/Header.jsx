import React, { useState } from 'react';
import Swal from 'sweetalert2';
import { API_URL } from '../App';

function Header({ user, theme, setTheme, activeView, handleLogout, fetchUserProfile }) {
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [cardName, setCardName] = useState('');
  const [cardNum, setCardNum] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCVV, setCardCVV] = useState('');

  const isDark = theme === 'dark';
  const debt = parseFloat(user?.debtBalance) || 0;

  const getPageTitle = () => {
    switch (activeView) {
      case 'dashboardView': return 'Genel Durum';
      case 'booksView': return 'Kitap Yönetimi';
      case 'borrowingsView': return 'Ödünç & İade';
      case 'reservationsView': return 'Rezervasyon Sırası';
      case 'membersView': return 'Üye Yönetimi';
      case 'settingsView': return 'Sistem Ayarları';
      default: return 'Genel Durum';
    }
  };

  const toggleTheme = () => {
    setTheme(isDark ? 'light' : 'dark');
  };

  const handleCardNumChange = (e) => {
    let value = e.target.value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    let parts = [];
    for (let i = 0; i < value.length; i += 4) {
      parts.push(value.substring(i, i + 4));
    }
    setCardNum(parts.join(' ').substring(0, 19));
  };

  const handleExpiryChange = (e) => {
    let value = e.target.value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    if (value.length >= 2) {
      setCardExpiry((value.substring(0, 2) + '/' + value.substring(2, 4)).substring(0, 5));
    } else {
      setCardExpiry(value);
    }
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    if (debt <= 0) return;

    try {
      Swal.fire({
        title: 'Ödeme Alınıyor...',
        text: 'Banka ile güvenli bağlantı kuruluyor. Lütfen bekleyiniz.',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      // Simulate network request delays
      await new Promise(resolve => setTimeout(resolve, 1500));

      const token = localStorage.getItem('lib_token') || sessionStorage.getItem('lib_token');
      const response = await fetch(`${API_URL}/users/${user.id}/debt`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ debtBalance: 0.00 })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Ödeme tamamlanamadı.');

      Swal.fire({
        title: 'Ödeme Başarılı!',
        html: `<h4>Makbuz Numarası: ${Math.floor(100000 + Math.random() * 900000)}</h4><br><p>Tüm kütüphane gecikme cezası borçlarınız başarıyla sıfırlanmıştır.</p>`,
        icon: 'success',
        confirmButtonText: 'Harika'
      });

      setShowPaymentModal(false);
      // Reset form
      setCardName('');
      setCardNum('');
      setCardExpiry('');
      setCardCVV('');
      
      // Refresh app states
      await fetchUserProfile();
    } catch (err) {
      Swal.fire('Ödeme Hatası', err.message, 'error');
    }
  };

  const toggleSidebar = () => {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.classList.toggle('open');
  };

  return (
    <>
      <header className="app-header">
        <div className="header-left">
          <button className="sidebar-toggle" id="sidebarToggle" onClick={toggleSidebar}>
            <i className="fa-solid fa-bars"></i>
          </button>
          <h1 id="pageTitle">{getPageTitle()}</h1>
        </div>

        <div className="header-right">
          {debt > 0 && (
            <div id="debtAlertHeader">
              <span 
                className="badge badge-danger" 
                onClick={() => setShowPaymentModal(true)} 
                style={{
                  cursor: 'pointer',
                  padding: '0.45rem 0.8rem',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  animation: 'pulse 1.5s infinite'
                }} 
                title="Borç Öde"
              >
                <i className="fa-solid fa-wallet"></i> Borç Öde: <strong>{debt.toFixed(2)} TRY</strong>
              </span>
            </div>
          )}

          <div className="theme-switch" onClick={toggleTheme}>
            <i className={`fa-solid fa-sun ${isDark ? '' : 'hidden'}`} id="themeIconSun"></i>
            <i className={`fa-solid fa-moon ${isDark ? 'hidden' : ''}`} id="themeIconMoon"></i>
          </div>

          <div className="user-panel" id="userControlPanel">
            <button className="btn btn-outline btn-sm btn-logout" onClick={handleLogout}>
              <i className="fa-solid fa-right-from-bracket"></i> Çıkış
            </button>
          </div>
        </div>
      </header>

      {/* Credit Card Payment Simulator Modal */}
      {showPaymentModal && (
        <div id="paymentModal" className="modal">
          <div className="modal-content" style={{ maxWidth: '420px', padding: '2rem' }}>
            <span className="close-modal" onClick={() => setShowPaymentModal(false)}>&times;</span>
            <h3 style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
              <i className="fa-solid fa-credit-card"></i> Güvenli Ödeme
            </h3>
            
            {/* Interactive Card Graphic */}
            <div className="credit-card-graphic" style={{
              background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
              color: '#fff',
              borderRadius: '12px',
              padding: '1.25rem',
              marginBottom: '1.5rem',
              boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
              position: 'relative',
              overflow: 'hidden',
              fontFamily: "'Courier New', Courier, monospace",
              height: '160px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              border: '1px solid rgba(255,255,255,0.05)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--accent-primary)', letterSpacing: '1px' }}>
                  LİBRARY CARD
                </span>
                <i className="fa-brands fa-cc-visa" style={{ fontSize: '1.8rem', color: '#fff' }}></i>
              </div>
              
              {/* Card Number Graphic */}
              <div id="cardGraphicNum" style={{ fontSize: '1.15rem', letterSpacing: '2px', textAlign: 'center', padding: '10px 0', fontWeight: 'bold' }}>
                {cardNum || '•••• •••• •••• ••••'}
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.7rem' }}>
                <div>
                  <span style={{ display: 'block', fontSize: '0.5rem', color: '#64748b', marginBottom: '2px' }}>KART SAHİBİ</span>
                  <span id="cardGraphicName" style={{ textTransform: 'uppercase' }}>
                    {cardName || 'AD SOYAD'}
                  </span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ display: 'block', fontSize: '0.5rem', color: '#64748b', marginBottom: '2px' }}>GEÇ. TAR.</span>
                  <span id="cardGraphicExpiry">{cardExpiry || 'AA/YY'}</span>
                </div>
              </div>
            </div>

            <form id="paymentForm" onSubmit={handlePaymentSubmit} className="grid-form">
              <div className="form-group">
                <label htmlFor="payCardName">Kart Üzerindeki İsim</label>
                <input 
                  type="text" 
                  id="payCardName" 
                  required 
                  placeholder="AHMET YILMAZ" 
                  value={cardName} 
                  onChange={(e) => setCardName(e.target.value)}
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="payCardNum">Kart Numarası</label>
                <input 
                  type="text" 
                  id="payCardNum" 
                  required 
                  maxLength={19} 
                  placeholder="4355 8812 3456 7890" 
                  value={cardNum} 
                  onChange={handleCardNumChange}
                />
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="payCardExpiry">Son Kullanma Tarihi</label>
                  <input 
                    type="text" 
                    id="payCardExpiry" 
                    required 
                    maxLength={5} 
                    placeholder="MM/YY" 
                    value={cardExpiry} 
                    onChange={handleExpiryChange}
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="payCardCVV">CVV</label>
                  <input 
                    type="password" 
                    id="payCardCVV" 
                    required 
                    maxLength={3} 
                    placeholder="***"
                    value={cardCVV}
                    onChange={(e) => setCardCVV(e.target.value.replace(/[^0-9]/g, ''))}
                  />
                </div>
              </div>
              
              <button type="submit" className="btn btn-primary btn-block" style={{ marginTop: '1rem' }} id="paymentSubmitBtn">
                Ödemeyi Tamamla ({debt.toFixed(2)} TRY)
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export default Header;
