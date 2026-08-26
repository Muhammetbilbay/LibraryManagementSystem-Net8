import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import { API_URL } from '../App';

function MembersView({ token, user }) {
  const [members, setMembers] = useState([]);
  const [search, setSearch] = useState('');
  
  // Modal state
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyEmail, setHistoryEmail] = useState('');
  const [historyList, setHistoryList] = useState([]);

  useEffect(() => {
    loadMembers();
  }, []);

  const loadMembers = async () => {
    try {
      const response = await fetch(`${API_URL}/users`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        setMembers(data || []);
      }
    } catch (err) {
      console.error('Failed to load members directory:', err);
    }
  };

  const handleEditUserRole = async (memberId, currentRole) => {
    const { value: newRole } = await Swal.fire({
      title: 'Kullanıcı Yetkisini Güncelle',
      input: 'select',
      inputOptions: {
        'USER': 'Üye / Öğrenci (USER)',
        'STAFF': 'Kütüphane Görevlisi (STAFF)',
        'ADMIN': 'Yönetici (ADMIN)'
      },
      inputValue: currentRole,
      showCancelButton: true,
      inputPlaceholder: 'Bir rol seçin',
      inputValidator: (value) => {
        if (!value) {
          return 'Bir rol seçmeniz gerekir!';
        }
      }
    });

    if (newRole) {
      try {
        const response = await fetch(`${API_URL}/users/${memberId}/role`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ role: newRole })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Rol güncellenemedi.');

        Swal.fire('Başarılı', 'Kullanıcı rolü başarıyla güncellendi.', 'success');
        loadMembers();
      } catch (err) {
        Swal.fire('Hata', err.message, 'error');
      }
    }
  };

  const handleEditUserDebt = async (memberId, currentDebt) => {
    const { value: newDebt } = await Swal.fire({
      title: 'Ceza / Borç Güncelle',
      input: 'number',
      inputLabel: 'Yeni Borç Tutarı (TRY)',
      inputValue: currentDebt,
      showCancelButton: true,
      inputValidator: (value) => {
        if (value === '' || isNaN(parseFloat(value))) {
          return 'Geçerli bir sayı girmeniz gerekir!';
        }
      }
    });

    if (newDebt !== undefined) {
      try {
        const response = await fetch(`${API_URL}/users/${memberId}/debt`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ debtBalance: parseFloat(newDebt) })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Borç güncellenemedi.');

        Swal.fire('Güncellendi', 'Borç bakiyesi başarıyla düzenlendi.', 'success');
        loadMembers();
      } catch (err) {
        Swal.fire('Hata', err.message, 'error');
      }
    }
  };

  const handleOpenMemberHistory = async (memberId, memberEmail) => {
    setHistoryEmail(memberEmail);
    try {
      const response = await fetch(`${API_URL}/users/${memberId}/history`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        setHistoryList(data || []);
        setShowHistoryModal(true);
      } else {
        throw new Error(data.error || 'Geçmiş yüklenemedi.');
      }
    } catch (err) {
      Swal.fire('Hata', err.message, 'error');
    }
  };

  const filteredMembers = members.filter(m => {
    const fullName = `${m.name} ${m.surname || ''}`.toLowerCase();
    const email = m.email.toLowerCase();
    const memberNo = (m.memberNo || '').toLowerCase();
    const filterText = search.toLowerCase();
    return fullName.includes(filterText) || email.includes(filterText) || memberNo.includes(filterText);
  });

  const isAdmin = user && user.roles.includes('ADMIN');

  return (
    <section id="membersView" className="view-panel">
      <div className="catalog-actions-bar">
        <div className="filters-panel">
          <input 
            type="text" 
            placeholder="Üye ad, soyad veya numara ara..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="table-container card-panel">
        <table className="data-table">
          <thead>
            <tr>
              <th>Üye Numarası</th>
              <th>Ad Soyad</th>
              <th>E-posta</th>
              <th>Telefon</th>
              <th>Ceza / Borç Durumu</th>
              <th>Kayıt Tarihi</th>
              <th>İşlemler</th>
            </tr>
          </thead>
          <tbody>
            {filteredMembers.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                  Üye bulunamadı.
                </td>
              </tr>
            ) : (
              filteredMembers.map(m => {
                const debts = parseFloat(m.debtBalance) || 0.00;
                const debtStyle = debts > 0 ? { color: 'var(--danger)', fontWeight: 'bold' } : { color: 'var(--success)' };
                const debtText = `${debts.toFixed(2)} TRY`;

                const currentRole = m.roles && m.roles.map(r => r.name)[0] || 'USER';
                const isSelf = user && m.id === user.id;

                return (
                  <tr key={m.id}>
                    <td><code style={{ fontSize: '0.8rem' }}>{m.memberNo || '-'}</code></td>
                    <td>
                      <strong>{m.name} {m.surname || ''}</strong>
                      <br />
                      <small className="badge">{m.roles ? m.roles.map(r => r.name).join(', ') : 'USER'}</small>
                    </td>
                    <td>{m.email}</td>
                    <td>{m.phone || '-'}</td>
                    <td style={debtStyle}>{debtText}</td>
                    <td>{new Date(m.createdAt).toLocaleDateString('tr-TR')}</td>
                    <td>
                      <div className="actions-row">
                        <button 
                          className="btn btn-outline btn-sm" 
                          onClick={() => handleOpenMemberHistory(m.id, m.email)} 
                          title="İşlem Geçmişi"
                        >
                          <i className="fa-solid fa-history"></i>
                        </button>
                        <button 
                          className="btn btn-outline btn-sm" 
                          onClick={() => handleEditUserDebt(m.id, debts)} 
                          title="Borç Düzenle"
                        >
                          <i className="fa-solid fa-money-bill-transfer"></i>
                        </button>
                        {isAdmin && !isSelf && (
                          <button 
                            className="btn btn-outline btn-sm" 
                            onClick={() => handleEditUserRole(m.id, currentRole)} 
                            title="Yetki Düzenle"
                          >
                            <i className="fa-solid fa-user-shield"></i>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Member Transaction History Modal */}
      {showHistoryModal && (
        <div id="memberHistoryModal" className="modal">
          <div className="modal-content" style={{ maxWidth: '700px' }}>
            <span className="close-modal" onClick={() => setShowHistoryModal(false)}>&times;</span>
            <h3>Üye İşlem Geçmişi</h3>
            <p id="historyMemberEmail" style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              Üye: {historyEmail}
            </p>
            
            <div className="table-container" style={{ maxHeight: '400px', overflowY: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Kitap Başlığı</th>
                    <th>Ödünç Alma Tarihi</th>
                    <th>Son İade Tarihi</th>
                    <th>Fiili İade Tarihi</th>
                    <th>Durum</th>
                  </tr>
                </thead>
                <tbody>
                  {historyList.length === 0 ? (
                    <tr>
                      <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                        Üyeye ait işlem bulunmamaktadır.
                      </td>
                    </tr>
                  ) : (
                    historyList.map((row, index) => (
                      <tr key={index}>
                        <td><strong>{row.book ? row.book.title : 'Bilinmeyen'}</strong></td>
                        <td>{new Date(row.borrowedAt).toLocaleDateString('tr-TR')}</td>
                        <td>{new Date(row.dueAt).toLocaleDateString('tr-TR')}</td>
                        <td>{row.returnedAt ? new Date(row.returnedAt).toLocaleDateString('tr-TR') : '-'}</td>
                        <td>
                          <span className={`badge ${row.status === 'returned' ? 'badge-success' : 'badge-danger'}`}>
                            {row.status === 'returned' ? 'İade Edildi' : 'Ödünçte'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default MembersView;
