import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import { API_URL } from '../App';

function BooksView({ token, user }) {
  const [books, setBooks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [authors, setAuthors] = useState([]);
  const [publishers, setPublishers] = useState([]);
  
  // Filters and Pagination
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 10;

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [modalBookId, setModalBookId] = useState('');
  const [modalTitle, setModalTitle] = useState('');
  const [modalISBN, setModalISBN] = useState('');
  const [modalDesc, setModalDesc] = useState('');
  const [modalTotal, setModalTotal] = useState('');
  const [modalStock, setModalStock] = useState('');
  const [modalShelf, setModalShelf] = useState('');
  const [modalYear, setModalYear] = useState('');
  const [modalPublisherId, setModalPublisherId] = useState('');
  const [modalAuthorIds, setModalAuthorIds] = useState([]);
  const [modalCategoryIds, setModalCategoryIds] = useState([]);

  const isStaffOrAdmin = user && (user.roles.includes('ADMIN') || user.roles.includes('STAFF'));

  useEffect(() => {
    loadCatalog();
  }, [search, selectedCategory, selectedStatus, currentPage]);

  useEffect(() => {
    if (showModal) {
      loadStaticAssets();
    }
  }, [showModal]);

  const loadCatalog = async () => {
    try {
      const headers = { 'Authorization': `Bearer ${token}` };
      const url = `${API_URL}/books?page=${currentPage}&limit=${limit}&search=${encodeURIComponent(search)}&category=${selectedCategory}&status=${selectedStatus}`;
      const response = await fetch(url, { headers });
      const data = await response.json();
      if (response.ok) {
        setBooks(data.books || []);
        setTotalPages(data.totalPages || 1);
      }
    } catch (err) {
      console.error('Failed to load books catalog:', err);
    }
  };

  const loadStaticAssets = async () => {
    try {
      const headers = { 'Authorization': `Bearer ${token}` };
      const [authorsRes, catsRes, pubsRes] = await Promise.all([
        fetch(`${API_URL}/authors`, { headers }),
        fetch(`${API_URL}/categories`, { headers }),
        fetch(`${API_URL}/publishers`, { headers })
      ]);
      if (authorsRes.ok) setAuthors(await authorsRes.json());
      if (catsRes.ok) setCategories(await catsRes.json());
      if (pubsRes.ok) setPublishers(await pubsRes.json());
    } catch (err) {
      console.error('Failed to load static assets:', err);
    }
  };

  // Pre-populate category filter dropdown
  useEffect(() => {
    const fetchCats = async () => {
      try {
        const res = await fetch(`${API_URL}/categories`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) setCategories(await res.json());
      } catch (err) {
        console.error(err);
      }
    };
    fetchCats();
  }, []);

  const handleBorrow = async (bookId) => {
    try {
      const response = await fetch(`${API_URL}/borrowings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ bookId })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Kitap ödünç alınamadı.');

      Swal.fire({
        title: 'Ödünç Alındı!',
        text: `Kitap başarıyla ödünç alındı.\nSon İade Tarihi: ${new Date(data.borrowing.dueAt).toLocaleDateString('tr-TR')}`,
        icon: 'success',
        confirmButtonText: 'Harika'
      });

      loadCatalog();
    } catch (err) {
      Swal.fire({
        title: 'Ödünç Hatası',
        text: err.message,
        icon: 'error',
        confirmButtonText: 'Tamam'
      });
    }
  };

  const handleReserve = async (bookId) => {
    try {
      const response = await fetch(`${API_URL}/reservations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ bookId })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Rezervasyon yapılamadı.');

      Swal.fire({
        title: 'Sıraya Girildi!',
        text: `Rezervasyon başarıyla oluşturuldu.\nSıra Numaranız: ${data.reservation.queuePosition}`,
        icon: 'success',
        confirmButtonText: 'Tamam'
      });

      loadCatalog();
    } catch (err) {
      Swal.fire({
        title: 'Rezervasyon Hatası',
        text: err.message,
        icon: 'error',
        confirmButtonText: 'Tamam'
      });
    }
  };

  const openBookModal = (bookId = '') => {
    if (bookId) {
      const book = books.find(b => b.id === bookId);
      if (book) {
        setModalBookId(book.id);
        setModalTitle(book.title || '');
        setModalISBN(book.isbn || '');
        setModalDesc(book.description || '');
        setModalTotal(book.totalQuantity || '');
        setModalStock(book.stock || '');
        setModalShelf(book.shelfPosition || '');
        setModalYear(book.publicationYear || '');
        setModalPublisherId(book.publisherId || '');
        setModalAuthorIds(book.authors ? book.authors.map(a => a.id) : []);
        setModalCategoryIds(book.categories ? book.categories.map(c => c.id) : []);
      }
    } else {
      setModalBookId('');
      setModalTitle('');
      setModalISBN('');
      setModalDesc('');
      setModalTotal('');
      setModalStock('');
      setModalShelf('');
      setModalYear('');
      setModalPublisherId('');
      setModalAuthorIds([]);
      setModalCategoryIds([]);
    }
    setShowModal(true);
  };

  const handleSaveBook = async (e) => {
    e.preventDefault();
    const body = {
      title: modalTitle,
      isbn: modalISBN || null,
      description: modalDesc,
      totalQuantity: parseInt(modalTotal),
      stock: parseInt(modalStock),
      shelfPosition: modalShelf,
      publicationYear: modalYear ? parseInt(modalYear) : null,
      publisherId: modalPublisherId || null,
      authorIds: modalAuthorIds,
      categoryIds: modalCategoryIds
    };

    try {
      let url = `${API_URL}/books`;
      let method = 'POST';

      if (modalBookId) {
        url += `/${modalBookId}`;
        method = 'PUT';
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Kitap kaydedilemedi.');

      Swal.fire({
        title: 'Başarılı',
        text: 'Kitap bilgileri başarıyla kaydedildi.',
        icon: 'success',
        timer: 1500,
        showConfirmButton: false
      });

      setShowModal(false);
      loadCatalog();
    } catch (err) {
      Swal.fire({
        title: 'Hata',
        text: err.message,
        icon: 'error',
        confirmButtonText: 'Tamam'
      });
    }
  };

  const handleDeleteBook = async (bookId) => {
    const result = await Swal.fire({
      title: 'Emin misiniz?',
      text: 'Bu kitap arşive kaldırılacak (soft-delete).',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: 'var(--text-muted)',
      confirmButtonText: 'Evet, Sil!',
      cancelButtonText: 'Vazgeç'
    });

    if (result.isConfirmed) {
      try {
        const response = await fetch(`${API_URL}/books/${bookId}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Silme işlemi başarısız.');

        Swal.fire({
          title: 'Silindi!',
          text: 'Kitap başarıyla silindi.',
          icon: 'success',
          timer: 1500,
          showConfirmButton: false
        });

        loadCatalog();
      } catch (err) {
        Swal.fire('Hata', err.message, 'error');
      }
    }
  };

  const exportBooksToCSV = () => {
    if (books.length === 0) return;

    let csvContent = 'data:text/csv;charset=utf-8,\uFEFF';
    csvContent += 'ISBN,Kitap Adi,Yazar,Kategori,Raf Konumu,Toplam Adet,Mevcut Adet\n';

    books.forEach(b => {
      const title = b.title.replace(/"/g, '""');
      const authorsList = b.authors ? b.authors.map(a => a.name).join('; ').replace(/"/g, '""') : '';
      const categoriesList = b.categories ? b.categories.map(c => c.name).join('; ').replace(/"/g, '""') : '';
      csvContent += `"${b.isbn || ''}","${title}","${authorsList}","${categoriesList}","${b.shelfPosition || ''}",${b.totalQuantity},${b.stock}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'kutuphane_kitap_listesi.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const showShelfLocator = (shelf) => {
    if (!shelf) return;
    const prefix = shelf.charAt(0).toUpperCase();
    const isA = prefix === 'A' ? 'active-salon' : '';
    const isB = prefix === 'B' ? 'active-salon' : '';
    const isC = prefix === 'C' ? 'active-salon' : '';

    const mapHTML = `
      <div class="library-map-wrapper">
        <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 1.25rem;">
          Aradığınız kitap <strong>${shelf}</strong> konumundadır. Bu konum kütüphane haritasında aşağıda işaretlenmiştir:
        </p>
        
        <div class="library-grid-map">
          <div class="library-entrance">🚪 GİRİŞ KAPISI</div>
          
          <div class="library-section-box ${isA}">
            <div class="section-label">SALON A</div>
            <div class="section-desc">Edebiyat & Bilim</div>
            <div class="section-marker">${prefix === 'A' ? '🎯 KİTAP BURADA' : ''}</div>
          </div>
          
          <div class="library-section-box ${isB}">
            <div class="section-label">SALON B</div>
            <div class="section-desc">Tarih & Felsefe</div>
            <div class="section-marker">${prefix === 'B' ? '🎯 KİTAP BURADA' : ''}</div>
          </div>

          <div class="library-section-box ${isC}">
            <div class="section-label">SALON C</div>
            <div class="section-desc">Sanat & Roman</div>
            <div class="section-marker">${prefix === 'C' ? '🎯 KİTAP BURADA' : ''}</div>
          </div>
        </div>

        <div style="margin-top: 1rem; font-size: 0.75rem; color: var(--text-muted);">
          Kütüphane Görevlisi Önerisi: İlgili salona giriş yaparak <strong>Raflarda ${shelf}</strong> kodlu sırayı bulunuz.
        </div>
      </div>
    `;

    Swal.fire({
      title: `Konum Bulucu`,
      html: mapHTML,
      confirmButtonText: 'Haritayı Kapat',
      confirmButtonColor: 'var(--accent-primary)',
      customClass: { popup: 'library-map-popup' }
    });
  };

  const showBarcode = (isbn, bookTitle) => {
    if (!isbn || isbn === 'Yok') {
      Swal.fire('ISBN Eksik', 'Bu kitaba ait ISBN numarası belirtilmemiş.', 'warning');
      return;
    }

    let barsHTML = '';
    const cleanIsbn = isbn.replace(/[^0-9]/g, '') || '9780000000000';
    
    for (let i = 0; i < 32; i++) {
      const digit = parseInt(cleanIsbn.charAt(i % cleanIsbn.length)) || 0;
      const barWidth = (digit % 3) + 1.5;
      const gapWidth = ((digit + 1) % 2) + 1;
      barsHTML += `<div style="display:inline-block; width:${barWidth}px; height:70px; background-color:#000; margin-right:${gapWidth}px;"></div>`;
    }

    const barcodeHTML = `
      <div style="text-align:center; background:#fff; padding:1.5rem; border-radius:8px; color:#000;">
        <h4 style="color:#64748b; font-family:var(--font-header); margin-bottom:1rem; font-size:0.8rem; text-transform:uppercase; letter-spacing:1px;">BİLGİ KÜTÜPHANESİ DEMİRBAŞ ETİKETİ</h4>
        <div style="font-size:0.85rem; font-weight:700; margin-bottom:0.75rem; color:#0b0f19;">${bookTitle}</div>
        <div style="white-space:nowrap; overflow:hidden; display:inline-block; padding:10px 0; border-top:1px solid #ddd; border-bottom:1px solid #ddd;">
          ${barsHTML}
        </div>
        <div style="font-family: 'Courier New', Courier, monospace; letter-spacing:4px; font-weight:bold; font-size:0.9rem; margin-top:0.5rem; color:#000;">
          ${isbn}
        </div>
      </div>
    `;

    Swal.fire({
      title: 'Kitap Barkodu',
      html: barcodeHTML,
      confirmButtonText: 'Kapat',
      confirmButtonColor: 'var(--accent-primary)'
    });
  };

  const toggleAuthorCheckbox = (authorId) => {
    if (modalAuthorIds.includes(authorId)) {
      setModalAuthorIds(modalAuthorIds.filter(id => id !== authorId));
    } else {
      setModalAuthorIds([...modalAuthorIds, authorId]);
    }
  };

  const toggleCategoryCheckbox = (catId) => {
    if (modalCategoryIds.includes(catId)) {
      setModalCategoryIds(modalCategoryIds.filter(id => id !== catId));
    } else {
      setModalCategoryIds([...modalCategoryIds, catId]);
    }
  };

  return (
    <section id="booksView" className="view-panel">
      <div className="catalog-actions-bar">
        <div className="filters-panel">
          <input 
            type="text" 
            placeholder="Kitap Adı, ISBN veya Yazar ara..." 
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
          />
          
          <select 
            value={selectedCategory} 
            onChange={(e) => { setSelectedCategory(e.target.value); setCurrentPage(1); }}
          >
            <option value="">Kategori Seçiniz</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          
          <select 
            value={selectedStatus} 
            onChange={(e) => { setSelectedStatus(e.target.value); setCurrentPage(1); }}
          >
            <option value="">Tüm Durumlar</option>
            <option value="rafta">Müsait (Rafta)</option>
            <option value="oduncte">Ödünçte (Stokta Yok)</option>
          </select>
        </div>

        <div className="operations-panel">
          <button className="btn btn-outline btn-sm" onClick={exportBooksToCSV}>
            <i className="fa-solid fa-file-csv"></i> Dışa Aktar
          </button>
          {isStaffOrAdmin && (
            <button className="btn btn-primary btn-sm" onClick={() => openBookModal()}>
              <i className="fa-solid fa-plus"></i> Yeni Kitap Ekle
            </button>
          )}
        </div>
      </div>

      <div className="table-container card-panel">
        <table className="data-table">
          <thead>
            <tr>
              <th>ISBN</th>
              <th>Kitap Adı</th>
              <th>Yazar</th>
              <th>Kategori</th>
              <th>Toplam / Kalan</th>
              <th>Raf Konumu</th>
              <th>Durum</th>
              <th>İşlemler</th>
            </tr>
          </thead>
          <tbody>
            {books.length === 0 ? (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                  Kitap bulunamadı.
                </td>
              </tr>
            ) : (
              books.map(book => {
                const hasStock = book.stock > 0;
                const badgeClass = hasStock ? 'badge-success' : 'badge-danger';
                const badgeText = hasStock ? `Rafta (${book.stock})` : 'Tükendi / Rezerve';

                return (
                  <tr key={book.id}>
                    <td>
                      <code 
                        style={{ fontSize: '0.75rem', cursor: 'pointer', color: 'var(--accent-primary)', fontWeight: 600 }}
                        onClick={() => showBarcode(book.isbn, book.title)}
                        title={`${book.isbn || 'ISBN Yok'} — Barkodu Görüntüle`}
                      >
                        <i className="fa-solid fa-barcode" style={{ marginRight: '4px' }}></i>
                        {book.isbn ? 'ISBN-' + book.isbn.slice(-4) : 'Yok'}
                      </code>
                    </td>
                    <td>
                      <strong>{book.title}</strong>
                      <br />
                      <small style={{ color: 'var(--text-muted)' }}>Yıl: {book.publicationYear || '-'}</small>
                    </td>
                    <td>{book.authors ? book.authors.map(a => a.name).join(', ') : 'Bilinmiyor'}</td>
                    <td>{book.categories ? book.categories.map(c => c.name).join(', ') : 'Belirtilmemiş'}</td>
                    <td>{book.totalQuantity} / {book.stock}</td>
                    <td>
                      {book.shelfPosition ? (
                        <span 
                          className="badge btn-outline" 
                          onClick={() => showShelfLocator(book.shelfPosition)}
                          style={{ cursor: 'pointer', border: '1px solid var(--border-color)' }}
                          title="Kütüphane Haritasında Göster"
                        >
                          <i className="fa-solid fa-map-location-dot" style={{ marginRight: '4px', color: 'var(--accent-primary)' }}></i>
                          <strong>{book.shelfPosition}</strong>
                        </span>
                      ) : '-'}
                    </td>
                    <td><span className={`badge ${badgeClass}`}>{badgeText}</span></td>
                    <td>
                      <div className="actions-row">
                        {hasStock ? (
                          <button className="btn btn-primary btn-sm" onClick={() => handleBorrow(book.id)} title="Ödünç Al">
                            <i className="fa-solid fa-hand-holding-hand"></i>
                          </button>
                        ) : (
                          <button className="btn btn-outline btn-sm" onClick={() => handleReserve(book.id)} title="Sıraya Gir">
                            <i className="fa-solid fa-hourglass-half"></i>
                          </button>
                        )}
                        {isStaffOrAdmin && (
                          <>
                            <button className="btn btn-outline btn-sm" onClick={() => openBookModal(book.id)} title="Düzenle">
                              <i className="fa-solid fa-pen-to-square"></i>
                            </button>
                            <button className="btn className btn-danger btn-sm" onClick={() => handleDeleteBook(book.id)} title="Sil">
                              <i className="fa-solid fa-trash"></i>
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        
        <div className="pagination-footer">
          <span>Sayfa {currentPage} / {totalPages}</span>
          <div className="pagination-buttons">
            <button 
              className="btn btn-outline btn-sm" 
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(currentPage - 1)}
            >
              <i className="fa-solid fa-chevron-left"></i>
            </button>
            <button 
              className="btn btn-outline btn-sm" 
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(currentPage + 1)}
            >
              <i className="fa-solid fa-chevron-right"></i>
            </button>
          </div>
        </div>
      </div>

      {/* Book Add / Edit Modal */}
      {showModal && (
        <div id="bookFormModal" className="modal">
          <div className="modal-content">
            <span className="close-modal" onClick={() => setShowModal(false)}>&times;</span>
            <h3>{modalBookId ? 'Kitabı Düzenle' : 'Yeni Kitap Ekle'}</h3>
            
            <form onSubmit={handleSaveBook} className="grid-form">
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="modalBookTitle">Kitap Adı</label>
                  <input 
                    type="text" 
                    id="modalBookTitle" 
                    required 
                    placeholder="Hobbit"
                    value={modalTitle}
                    onChange={(e) => setModalTitle(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="modalBookISBN">ISBN / Barkod</label>
                  <input 
                    type="text" 
                    id="modalBookISBN" 
                    placeholder="9780007270613"
                    value={modalISBN}
                    onChange={(e) => setModalISBN(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="modalBookDesc">Kitap Özeti / Açıklama</label>
                <textarea 
                  id="modalBookDesc" 
                  rows="3" 
                  placeholder="Kitap hakkında açıklama..."
                  value={modalDesc}
                  onChange={(e) => setModalDesc(e.target.value)}
                ></textarea>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="modalBookTotal">Toplam Adet</label>
                  <input 
                    type="number" 
                    id="modalBookTotal" 
                    min="1" 
                    required 
                    placeholder="5"
                    value={modalTotal}
                    onChange={(e) => {
                      setModalTotal(e.target.value);
                      if (!modalBookId) setModalStock(e.target.value);
                    }}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="modalBookStock">Raftaki (Mevcut) Adet</label>
                  <input 
                    type="number" 
                    id="modalBookStock" 
                    min="0" 
                    required 
                    placeholder="5"
                    value={modalStock}
                    onChange={(e) => setModalStock(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="modalBookShelf">Raf Konumu</label>
                  <input 
                    type="text" 
                    id="modalBookShelf" 
                    placeholder="A-12"
                    value={modalShelf}
                    onChange={(e) => setModalShelf(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="modalBookYear">Basım Yılı</label>
                  <input 
                    type="number" 
                    id="modalBookYear" 
                    placeholder="2005"
                    value={modalYear}
                    onChange={(e) => setModalYear(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="modalBookPublisher">Yayınevi</label>
                <select 
                  id="modalBookPublisher"
                  value={modalPublisherId}
                  onChange={(e) => setModalPublisherId(e.target.value)}
                >
                  <option value="">Yayınevi Seçiniz</option>
                  {publishers.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Yazarlar (Çoklu Seçim)</label>
                  <div className="checkbox-list">
                    {authors.map(a => (
                      <label key={a.id} className="checkbox-container">
                        <input 
                          type="checkbox" 
                          name="modalAuthors" 
                          value={a.id}
                          checked={modalAuthorIds.includes(a.id)}
                          onChange={() => toggleAuthorCheckbox(a.id)}
                        />
                        <span>{a.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="form-group">
                  <label>Kategoriler (Çoklu Seçim)</label>
                  <div className="checkbox-list">
                    {categories.map(c => (
                      <label key={c.id} className="checkbox-container">
                        <input 
                          type="checkbox" 
                          name="modalCategories" 
                          value={c.id}
                          checked={modalCategoryIds.includes(c.id)}
                          onChange={() => toggleCategoryCheckbox(c.id)}
                        />
                        <span>{c.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <button type="submit" className="btn btn-primary">
                <i className="fa-solid fa-save"></i> Kitabı Kaydet
              </button>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}

export default BooksView;
