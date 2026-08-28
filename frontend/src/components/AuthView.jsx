import React, { useState } from 'react';
import Swal from 'sweetalert2';
import { API_URL } from '../App';

function AuthView({ setToken, setUser }) {
  const [activeTab, setActiveTab] = useState('login'); // 'login' | 'register' | 'forgot'
  
  // Login fields
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  // Register fields
  const [regName, setRegName] = useState('');
  const [regSurname, setRegSurname] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regMemberNo, setRegMemberNo] = useState('');
  const [regPassword, setRegPassword] = useState('');

  // Forgot password fields
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showResetForm, setShowResetForm] = useState(false);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Giriş başarısız.');

      Swal.fire({
        title: 'Başarılı!',
        text: 'Giriş işlemi başarıyla tamamlandı.',
        icon: 'success',
        timer: 1500,
        showConfirmButton: false
      });

      setToken(data.token, rememberMe);
      setUser(data.user, rememberMe);
    } catch (err) {
      Swal.fire({
        title: 'Giriş Başarısız',
        text: err.message,
        icon: 'error',
        confirmButtonText: 'Tamam'
      });
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    if (regPassword.length < 5) {
      Swal.fire({
        title: 'Kayıt Hatası',
        text: 'Şifre en az 5 karakter uzunluğunda olmalıdır.',
        icon: 'warning',
        confirmButtonText: 'Tamam'
      });
      return;
    }
    try {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: regName,
          surname: regSurname,
          email: regEmail,
          phone: regPhone,
          memberNo: regMemberNo,
          password: regPassword,
          role: 'USER'
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Kayıt işlemi başarısız.');

      Swal.fire({
        title: 'Kayıt Başarılı!',
        text: `Hesabınız başarıyla oluşturuldu. Giriş yapabilirsiniz.\nÜye Numaranız: ${data.user.memberNo || '-'}`,
        icon: 'success',
        confirmButtonText: 'Tamam'
      });

      // Switch to login tab and fill email
      setActiveTab('login');
      setLoginEmail(regEmail);
      
      // Clear register form
      setRegName('');
      setRegSurname('');
      setRegEmail('');
      setRegPhone('');
      setRegMemberNo('');
      setRegPassword('');
    } catch (err) {
      Swal.fire({
        title: 'Kayıt Hatası',
        text: err.message,
        icon: 'error',
        confirmButtonText: 'Tamam'
      });
    }
  };

  const handleForgotRequestSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Sıfırlama kodu oluşturulamadı.');

      Swal.fire({
        title: 'Doğrulama Kodu Üretildi!',
        html: `<p>E-posta gönderimi simüle edilmiştir.</p><br><h2 style="color:var(--accent-primary); letter-spacing: 2px;">${data.resetCode}</h2><br><p>Lütfen bu kodu sıfırlama ekranına girin.</p>`,
        icon: 'info',
        confirmButtonText: 'Kodu Girmeye Başla'
      });

      setShowResetForm(true);
    } catch (err) {
      Swal.fire({
        title: 'Hata',
        text: err.message,
        icon: 'error',
        confirmButtonText: 'Tamam'
      });
    }
  };

  const handlePasswordResetSubmit = async (e) => {
    e.preventDefault();
    if (newPassword.length < 5) {
      Swal.fire({
        title: 'Hata',
        text: 'Şifre en az 5 karakter uzunluğunda olmalıdır.',
        icon: 'warning',
        confirmButtonText: 'Tamam'
      });
      return;
    }
    try {
      const response = await fetch(`${API_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail, code: resetCode, newPassword })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Şifre sıfırlanamadı.');

      Swal.fire({
        title: 'Başarılı!',
        text: 'Şifreniz güncellendi. Giriş yapabilirsiniz.',
        icon: 'success',
        confirmButtonText: 'Tamam'
      });

      setShowResetForm(false);
      setActiveTab('login');
      setLoginEmail(forgotEmail);
      setForgotEmail('');
      setResetCode('');
      setNewPassword('');
    } catch (err) {
      Swal.fire({
        title: 'Hata',
        text: err.message,
        icon: 'error',
        confirmButtonText: 'Tamam'
      });
    }
  };

  return (
    <div className="auth-layout-wrapper">
      {activeTab !== 'forgot' ? (
        <section id="authView" className="view-panel">
          <div className="auth-wrapper">
            <div className="auth-card">
              <div className="auth-header-brand">
                <i className="fa-solid fa-book-bookmark"></i> BİLGİ KÜTÜPHANESİ
              </div>
              
              <div className="auth-tabs">
                <button 
                  className={`auth-tab ${activeTab === 'login' ? 'active' : ''}`}
                  onClick={() => setActiveTab('login')}
                >
                  Giriş Yap
                </button>
                <button 
                  className={`auth-tab ${activeTab === 'register' ? 'active' : ''}`}
                  onClick={() => setActiveTab('register')}
                >
                  Hesap Aç
                </button>
              </div>

              {activeTab === 'login' ? (
                /* Login Form */
                <form id="loginForm" onSubmit={handleLoginSubmit}>
                  <div className="form-group">
                    <label htmlFor="loginEmail">E-posta Adresi</label>
                    <div className="input-wrapper">
                      <i className="fa-solid fa-envelope"></i>
                      <input 
                        type="email" 
                        id="loginEmail" 
                        required 
                        placeholder="admin@library.com"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                      />
                    </div>
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="loginPassword">Şifre</label>
                    <div className="input-wrapper">
                      <i className="fa-solid fa-lock"></i>
                      <input 
                        type="password" 
                        id="loginPassword" 
                        required 
                        placeholder="••••••••"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                      />
                    </div>
                  </div>
                  
                  <div className="form-row-between">
                    <label className="checkbox-container">
                      <input 
                        type="checkbox" 
                        id="rememberMe"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                      />
                      <span>Beni Hatırla</span>
                    </label>
                    <a 
                      href="#" 
                      className="forgot-pass-link"
                      onClick={(e) => {
                        e.preventDefault();
                        setActiveTab('forgot');
                        setShowResetForm(false);
                      }}
                    >
                      Şifremi Unuttum?
                    </a>
                  </div>
                  
                  <button type="submit" className="btn btn-primary btn-block">
                    Oturum Aç <i className="fa-solid fa-right-to-bracket"></i>
                  </button>
                </form>
              ) : (
                /* Register Form */
                <form id="registerForm" onSubmit={handleRegisterSubmit}>
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="regName">Ad</label>
                      <input 
                        type="text" 
                        id="regName" 
                        required 
                        placeholder="Muhammet"
                        value={regName}
                        onChange={(e) => setRegName(e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="regSurname">Soyad</label>
                      <input 
                        type="text" 
                        id="regSurname" 
                        required 
                        placeholder="Bilbay"
                        value={regSurname}
                        onChange={(e) => setRegSurname(e.target.value)}
                      />
                    </div>
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="regEmail">E-posta</label>
                    <div className="input-wrapper">
                      <i className="fa-solid fa-envelope"></i>
                      <input 
                        type="email" 
                        id="regEmail" 
                        required 
                        placeholder="user@library.com"
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="regPhone">Telefon</label>
                      <input 
                        type="text" 
                        id="regPhone" 
                        placeholder="+905555555557"
                        value={regPhone}
                        onChange={(e) => setRegPhone(e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="regMemberNo">Üye Numarası (Opsiyonel)</label>
                      <input 
                        type="text" 
                        id="regMemberNo" 
                        placeholder="Otomatik Üretilir"
                        value={regMemberNo}
                        onChange={(e) => setRegMemberNo(e.target.value)}
                      />
                    </div>
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="regPassword">Şifre</label>
                    <div className="input-wrapper">
                      <i className="fa-solid fa-lock"></i>
                      <input 
                        type="password" 
                        id="regPassword" 
                        required 
                        placeholder="••••••••" 
                        autoComplete="new-password"
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                      />
                    </div>
                  </div>
                  
                  <button type="submit" className="btn btn-primary btn-block">
                    Hesap Oluştur <i className="fa-solid fa-user-plus"></i>
                  </button>
                </form>
              )}
            </div>
          </div>
        </section>
      ) : (
        /* Forgot Password Recovery */
        <section id="forgotPasswordView" className="view-panel">
          <div className="auth-wrapper">
            <div className="auth-card">
              <h3><i className="fa-solid fa-key"></i> Şifremi Unuttum</h3>
              
              {!showResetForm ? (
                <form id="forgotReqForm" onSubmit={handleForgotRequestSubmit}>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
                    Sistemde kayıtlı e-posta adresinizi girerek bir şifre sıfırlama kodu talep edin.
                  </p>
                  <div className="form-group">
                    <label htmlFor="forgotEmail">E-posta Adresi</label>
                    <input 
                      type="email" 
                      id="forgotEmail" 
                      placeholder="ornek@email.com" 
                      required
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                    />
                  </div>
                  <button type="submit" className="btn btn-primary btn-block">Doğrulama Kodu Gönder</button>
                  <button 
                    type="button" 
                    className="btn btn-outline btn-block btn-sm" 
                    onClick={() => setActiveTab('login')} 
                    style={{ marginTop: '0.75rem' }}
                  >
                    Giriş Ekranına Dön
                  </button>
                </form>
              ) : (
                <form id="forgotResetForm" onSubmit={handlePasswordResetSubmit}>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
                    Simüle edilen 6 haneli kodu ve yeni şifrenizi girerek işlemi tamamlayın.
                  </p>
                  <div className="form-group">
                    <label htmlFor="resetCode">Gelen 6 Haneli Kod</label>
                    <input 
                      type="text" 
                      id="resetCode" 
                      placeholder="******" 
                      required
                      value={resetCode}
                      onChange={(e) => setResetCode(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="resetPassword">Yeni Şifre</label>
                    <input 
                      type="password" 
                      id="resetPassword" 
                      placeholder="••••••••" 
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                  </div>
                  <button type="submit" className="btn btn-primary btn-block">Şifreyi Güncelle</button>
                  <button 
                    type="button" 
                    className="btn btn-outline btn-block btn-sm" 
                    onClick={() => setShowResetForm(false)} 
                    style={{ marginTop: '0.75rem' }}
                  >
                    Geri Dön
                  </button>
                </form>
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

export default AuthView;
