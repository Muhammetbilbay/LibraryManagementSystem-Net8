import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import { API_URL } from '../App';

function BorrowingsView({ token, user }) {
  const [loans, setLoans] = useState([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadLoans();
  }, []);

  const loadLoans = async () => {
    try {
      const response = await fetch(`${API_URL}/borrowings`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        setLoans(data || []);
      }
    } catch (err) {
      console.error('Failed to load loans table:', err);
    }
  };

  const handleReturn = async (loanId) => {
    try {
      const response = await fetch(`${API_URL}/borrowings/${loanId}/return`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'İade alınamadı.');

      if (data.penaltyApplied > 0) {
        Swal.fire({
          title: 'Kitap İade Alındı',
          html: `<p>Gecikme cezası tespit edildi!</p><br><h3 style="color:var(--danger)">Cezası: ${data.penaltyApplied.toFixed(2)} TRY</h3><br><p>Üyenin borç bakiyesine eklenmiştir.</p>`,
          icon: 'warning',
          confirmButtonText: 'Anlaşıldı'
        });
      } else {
        Swal.fire({
          title: 'İade Alındı',
          text: 'Kitap başarıyla teslim alındı.',
          icon: 'success',
          timer: 1500,
          showConfirmButton: false
        });
      }

      loadLoans();
    } catch (err) {
      Swal.fire({
        title: 'Hata',
        text: err.message,
        icon: 'error',
        confirmButtonText: 'Tamam'
      });
    }
  };

  const exportLoans = () => {
    if (loans.length === 0) return;

    let csvContent = 'data:text/csv;charset=utf-8,\uFEFF';
    csvContent += 'Kitap Adi,Uye No,Uye Eposta,Odunc Tarihi,Son Teslim Tarihi,Fiili Teslim Tarihi,Durum\n';

    loans.forEach(l => {
      const bookTitle = l.book ? l.book.title.replace(/"/g, '""') : 'Bilinmeyen';
      const name = `${l.user.name} ${l.user.surname || ''}`.replace(/"/g, '""');
      const returned = l.returnedAt ? new Date(l.returnedAt).toLocaleDateString('tr-TR') : '-';

      csvContent += `"${bookTitle}","${l.user.memberNo || ''}","${l.user.email}","${new Date(l.borrowedAt).toLocaleDateString('tr-TR')}","${new Date(l.dueAt).toLocaleDateString('tr-TR')}","${returned}","${l.status === 'borrowed' ? 'Odunc' : 'Returned'}"\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'odunc_iade_raporu.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredLoans = loans.filter(l => {
    const bookTitle = l.book ? l.book.title.toLowerCase() : '';
    const bookISBN = l.book ? (l.book.isbn || '').toLowerCase() : '';
    const email = l.user ? l.user.email.toLowerCase() : '';
    const memberNo = l.user ? (l.user.memberNo || '').toLowerCase() : '';
    const filterText = search.toLowerCase();

    return bookTitle.includes(filterText) || 
           bookISBN.includes(filterText) || 
           email.includes(filterText) || 
           memberNo.includes(filterText);
  });

  return (
    <section id="borrowingsView" className="view-panel">
      <div className="catalog-actions-bar">
        <div className="filters-panel">
          <input 
            type="text" 
            placeholder="Üye e-posta veya kitap ara..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="operations-panel">
          <button className="btn btn-outline btn-sm" onClick={exportLoans}>
            <i className="fa-solid fa-file-excel"></i> Excel (CSV) Raporu
          </button>
        </div>
      </div>

      <div className="table-container card-panel">
        <table className="data-table">
          <thead>
            <tr>
              <th>Kitap Adı (ISBN)</th>
              <th>Üye E-posta (No)</th>
              <th>Ödünç Alma Tarihi</th>
              <th>Son İade Tarihi</th>
              <th>Fiili İade Tarihi</th>
              <th>Durum</th>
              <th>İşlem</th>
            </tr>
          </thead>
          <tbody>
            {filteredLoans.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                  Ödünç kaydı bulunamadı.
                </td>
              </tr>
            ) : (
              filteredLoans.map(row => {
                const isBorrowed = row.status === 'borrowed';
                
                // Overdue calculation
                let delayBadge = null;
                const dueTime = new Date(row.dueAt).getTime();
                const now = Date.now();

                if (isBorrowed && now > dueTime) {
                  const elapsed = now - dueTime;
                  const days = Math.ceil(elapsed / (1000 * 60 * 60 * 24));
                  const calculatedPenalty = days * 5.00;
                  delayBadge = (
                    <>
                      <br />
                      <span className="badge badge-danger" style={{ marginTop: '0.25rem' }}>
                        Gecikti (+{days} Gün) - {calculatedPenalty.toFixed(2)} TRY
                      </span>
                    </>
                  );
                }

                return (
                  <tr key={row.id}>
                    <td>
                      <strong>{row.book ? row.book.title : 'Bilinmeyen Kitap'}</strong>
                      <br />
                      <small style={{ color: 'var(--text-muted)' }}>ISBN: {row.book ? row.book.isbn : '-'}</small>
                    </td>
                    <td>
                      {row.user ? `${row.user.name} ${row.user.surname || ''}` : 'Bilinmeyen'}
                      <br />
                      <small style={{ color: 'var(--text-muted)' }}>No: {row.user ? row.user.memberNo : '-'}</small>
                    </td>
                    <td>{new Date(row.borrowedAt).toLocaleDateString('tr-TR')}</td>
                    <td>
                      {new Date(row.dueAt).toLocaleDateString('tr-TR')}
                      {delayBadge}
                    </td>
                    <td>{row.returnedAt ? new Date(row.returnedAt).toLocaleDateString('tr-TR') : '-'}</td>
                    <td>
                      <span className={`badge ${isBorrowed ? 'badge-danger' : 'badge-success'}`}>
                        {isBorrowed ? 'Ödünçte' : 'Teslim Edildi'}
                      </span>
                    </td>
                    <td>
                      {isBorrowed ? (
                        <button className="btn btn-primary btn-sm" onClick={() => handleReturn(row.id)}>
                          <i className="fa-solid fa-rotate-left"></i> İade Al
                        </button>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>İade Edildi</span>
                      )}
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

export default BorrowingsView;
