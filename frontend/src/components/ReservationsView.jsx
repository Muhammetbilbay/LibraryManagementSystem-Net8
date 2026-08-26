import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import { API_URL } from '../App';

function ReservationsView({ token, user }) {
  const [reservations, setReservations] = useState([]);

  useEffect(() => {
    loadReservations();
  }, []);

  const loadReservations = async () => {
    try {
      const response = await fetch(`${API_URL}/reservations`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        setReservations(data || []);
      }
    } catch (err) {
      console.error('Failed to load reservations:', err);
    }
  };

  const handleCancelReservation = async (resId) => {
    const result = await Swal.fire({
      title: 'İptal etmek istiyor musunuz?',
      text: 'Rezervasyon sıranız silinecek.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Evet, İptal Et',
      cancelButtonText: 'Vazgeç'
    });

    if (result.isConfirmed) {
      try {
        const response = await fetch(`${API_URL}/reservations/${resId}/cancel`, {
          method: 'PATCH',
          headers: { 'Authorization': `Bearer ${token}` }
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'İptal edilemedi.');

        Swal.fire('İptal Edildi', 'Rezervasyon sıranız kaldırıldı.', 'success');
        loadReservations();
      } catch (err) {
        Swal.fire('Hata', err.message, 'error');
      }
    }
  };

  return (
    <section id="reservationsView" className="view-panel">
      <div className="table-container card-panel">
        <table className="data-table">
          <thead>
            <tr>
              <th>Kitap Adı</th>
              <th>Rezervasyon Tarihi</th>
              <th>Kullanıcı (E-posta)</th>
              <th>Sıra Numarası</th>
              <th>Durum</th>
              <th>Aksiyon</th>
            </tr>
          </thead>
          <tbody>
            {reservations.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                  Rezervasyon kaydı bulunmamaktadır.
                </td>
              </tr>
            ) : (
              reservations.map(row => {
                const canCancel = row.status === 'pending';
                const statusClass = row.status === 'pending' ? 'badge-danger' : 'badge-success';
                const statusText = row.status === 'pending' ? 'Sırada' : row.status === 'fulfilled' ? 'Alındı' : 'İptal';

                return (
                  <tr key={row.id}>
                    <td><strong>{row.book ? row.book.title : 'Bilinmeyen Kitap'}</strong></td>
                    <td>{new Date(row.reservedAt).toLocaleDateString('tr-TR')}</td>
                    <td>
                      {row.user ? `${row.user.name} ${row.user.surname || ''}` : 'Bilinmeyen'}
                      <br />
                      <small style={{ color: 'var(--text-muted)' }}>{row.user ? row.user.email : '-'}</small>
                    </td>
                    <td>
                      {row.status === 'pending' ? (
                        <strong style={{ color: 'var(--accent-primary)' }}>{row.queuePosition}. Sırada</strong>
                      ) : '-'}
                    </td>
                    <td><span className={`badge ${statusClass}`}>{statusText}</span></td>
                    <td>
                      {canCancel ? (
                        <button className="btn btn-danger btn-sm" onClick={() => handleCancelReservation(row.id)}>
                          <i className="fa-solid fa-ban"></i> İptal Et
                        </button>
                      ) : '-'}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default ReservationsView;
