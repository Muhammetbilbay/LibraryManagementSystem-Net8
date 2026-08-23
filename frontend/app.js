const API_URL = 'http://localhost:5000';

class LibraryApp {
  constructor() {
    this.token = localStorage.getItem('lib_token') || null;
    this.user = JSON.parse(localStorage.getItem('lib_user')) || null;
    this.theme = localStorage.getItem('lib_theme') || 'dark';

    // Pagination
    this.booksCurrentPage = 1;
    this.booksTotalPages = 1;
    this.booksLimit = 10;

    // Static collections
    this.authors = [];
    this.categories = [];
    this.publishers = [];
    this.allBooks = []; // local cache for listings
    
    // Chart instance
    this.trendChart = null;
    this.categoryChart = null;

    this.init();
  }

  async init() {
    this.setupTheme();
    this.setupSidebarNav();
    this.checkAuthStatus();
    
    if (this.token) {
      await this.fetchUserProfile();
      this.loadStaticAssets();
      this.loadDashboardData();
    } else {
      this.showAuthView();
    }
  }

  async fetchUserProfile() {
    try {
      const response = await fetch(`${API_URL}/auth/profile`, {
        headers: { 'Authorization': `Bearer ${this.token}` }
      });
      const data = await response.json();
      if (response.ok) {
        this.user = data.user;
        localStorage.setItem('lib_user', JSON.stringify(this.user));
        this.checkAuthStatus();
      } else {
        // Clear stale session keys on DB reset
        this.token = null;
        this.user = null;
        localStorage.removeItem('lib_token');
        localStorage.removeItem('lib_user');
        sessionStorage.removeItem('lib_token');
        sessionStorage.removeItem('lib_user');
        this.checkAuthStatus();
        this.showAuthView();
      }
    } catch (err) {
      console.error('Failed to sync user profile:', err.message);
    }
  }

  /* ==========================================================================
     THEME & NAVIGATION INITIALIZERS
     ========================================================================== */
  setupTheme() {
    const body = document.body;
    const sunIcon = document.getElementById('themeIconSun');
    const moonIcon = document.getElementById('themeIconMoon');

    if (this.theme === 'light') {
      body.classList.replace('dark-theme', 'light-theme');
      sunIcon.classList.add('hidden');
      moonIcon.classList.remove('hidden');
    } else {
      body.classList.replace('light-theme', 'dark-theme');
      sunIcon.classList.remove('hidden');
      moonIcon.classList.add('hidden');
    }
  }

  toggleTheme() {
    const body = document.body;
    const sunIcon = document.getElementById('themeIconSun');
    const moonIcon = document.getElementById('themeIconMoon');

    if (body.classList.contains('dark-theme')) {
      body.classList.replace('dark-theme', 'light-theme');
      sunIcon.classList.add('hidden');
      moonIcon.classList.remove('hidden');
      this.theme = 'light';
    } else {
      body.classList.replace('light-theme', 'dark-theme');
      sunIcon.classList.remove('hidden');
      moonIcon.classList.add('hidden');
      this.theme = 'dark';
    }
    localStorage.setItem('lib_theme', this.theme);
  }

  toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('open');
  }

  setupSidebarNav() {
    document.querySelectorAll('.sidebar-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const targetView = link.getAttribute('data-target');
        
        // Block unauthenticated navigation
        if (!this.token && targetView !== 'authView' && targetView !== 'forgotPasswordView') {
          Swal.fire({
            title: 'Erişim Engellendi',
            text: 'Lütfen işlem yapmak için giriş yapın.',
            icon: 'warning',
            confirmButtonText: 'Tamam'
          });
          this.showAuthView();
          return;
        }

        // Switch active tab styling
        document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
        link.classList.add('active');

        // Set Header Title
        const labelText = link.textContent.trim();
        document.getElementById('pageTitle').innerText = labelText;

        // Switch panels
        this.showView(targetView);

        // Mobile close sidebar
        document.getElementById('sidebar').classList.remove('open');

        // Fetch View-specific Data
        if (targetView === 'dashboardView') this.loadDashboardData();
        if (targetView === 'booksView') this.loadCatalog();
        if (targetView === 'borrowingsView') this.loadLoans();
        if (targetView === 'reservationsView') this.loadReservations();
        if (targetView === 'membersView') this.loadMembers();
        if (targetView === 'settingsView') this.loadSettings();
      });
    });
  }

  showView(viewId) {
    document.querySelectorAll('.view-panel').forEach(view => {
      view.classList.add('hidden');
    });
    document.getElementById(viewId).classList.remove('hidden');
  }

  checkAuthStatus() {
    const navLoans = document.getElementById('navLoans');
    const navReservations = document.getElementById('navReservations');
    const navMembers = document.getElementById('navMembers');
    const navSettings = document.getElementById('navSettings');
    const sidebarFooter = document.getElementById('sidebarFooter');
    const userControl = document.getElementById('userControlPanel');
    const debtAlert = document.getElementById('debtAlertHeader');

    if (this.token && this.user) {
      // Show user links
      navLoans.classList.remove('hidden');
      navReservations.classList.remove('hidden');

      // Admin or Staff specific views
      const isStaffOrAdmin = this.user.roles.includes('ADMIN') || this.user.roles.includes('STAFF');
      if (isStaffOrAdmin) {
        navMembers.classList.remove('hidden');
      } else {
        navMembers.classList.add('hidden');
      }

      // Check debt warnings
      const debts = parseFloat(this.user.debtBalance) || 0;
      if (debts > 0) {
        debtAlert.classList.remove('hidden');
        debtAlert.innerHTML = `
          <span class="badge badge-danger" onclick="app.openPaymentModal()" style="cursor:pointer; padding: 0.45rem 0.8rem; font-weight:700; display:inline-flex; align-items:center; gap:6px; animation: pulse 1.5s infinite;" title="Borç Öde">
            <i class="fa-solid fa-wallet"></i> Borç Öde: <strong>${debts.toFixed(2)} TRY</strong>
          </span>
        `;
      } else {
        debtAlert.classList.add('hidden');
        debtAlert.innerHTML = '';
      }

      // Populate Sidebar Footer Profile Badge
      const firstChar = this.user.name.charAt(0).toUpperCase();
      sidebarFooter.innerHTML = `
        <div class="sidebar-profile">
          <div class="profile-avatar">${firstChar}</div>
          <div class="profile-info">
            <span class="profile-name">${this.user.name}</span>
            <span class="profile-role">${this.user.roles.join(', ')}</span>
          </div>
        </div>
      `;

      // Header control panel
      userControl.innerHTML = `
        <button class="btn btn-outline btn-sm" onclick="app.handleLogout()"><i class="fa-solid fa-sign-out-alt"></i> Çıkış</button>
      `;
    } else {
      // Hide links
      navLoans.classList.add('hidden');
      navReservations.classList.add('hidden');
      navMembers.classList.add('hidden');
      debtAlert.classList.add('hidden');
      debtAlert.innerHTML = '';
      sidebarFooter.innerHTML = '';
      userControl.innerHTML = `
        <button class="btn btn-primary btn-sm" onclick="app.showAuthView()"><i class="fa-solid fa-sign-in"></i> Giriş Yap</button>
      `;
    }
  }

  showAuthView() {
    this.showView('authView');
    document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
    document.getElementById('pageTitle').innerText = 'Kullanıcı Girişi';
  }

  showForgotPasswordView() {
    this.showView('forgotPasswordView');
    document.getElementById('pageTitle').innerText = 'Şifre Yenileme';
  }

  switchAuthTab(tab) {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const tabs = document.querySelectorAll('.auth-tab');

    if (tab === 'login') {
      loginForm.classList.remove('hidden');
      registerForm.classList.add('hidden');
      tabs[0].classList.add('active');
      tabs[1].classList.remove('active');
    } else {
      loginForm.classList.add('hidden');
      registerForm.classList.remove('hidden');
      tabs[0].classList.remove('active');
      tabs[1].classList.add('active');
    }
  }

  /* ==========================================================================
     AUTHENTICATION OPERATIONS
     ========================================================================== */
  async handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const rememberMe = document.getElementById('rememberMe').checked;

    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Giriş başarısız.');

      this.token = data.token;
      this.user = data.user;

      if (rememberMe) {
        localStorage.setItem('lib_token', this.token);
        localStorage.setItem('lib_user', JSON.stringify(this.user));
      } else {
        sessionStorage.setItem('lib_token', this.token);
        sessionStorage.setItem('lib_user', JSON.stringify(this.user));
      }

      Swal.fire({
        title: 'Başarılı!',
        text: 'Giriş işlemi başarıyla tamamlandı.',
        icon: 'success',
        timer: 1500,
        showConfirmButton: false
      });

      this.checkAuthStatus();
      this.loadStaticAssets();
      this.loadDashboardData();
      
      // Default view -> Dashboard
      this.showView('dashboardView');
      const dashLink = document.querySelector('[data-target="dashboardView"]');
      dashLink.classList.add('active');
      document.getElementById('pageTitle').innerText = 'Genel Durum';
    } catch (err) {
      Swal.fire({
        title: 'Giriş Başarısız',
        text: err.message,
        icon: 'error',
        confirmButtonText: 'Tamam'
      });
    }
  }

  async handleRegister(e) {
    e.preventDefault();
    const name = document.getElementById('regName').value;
    const surname = document.getElementById('regSurname').value;
    const email = document.getElementById('regEmail').value;
    const phone = document.getElementById('regPhone').value;
    const memberNo = document.getElementById('regMemberNo').value;
    const password = document.getElementById('regPassword').value;
    const role = document.getElementById('regRole').value;

    try {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, surname, email, phone, memberNo, password, role })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Kayıt işlemi başarısız.');

      Swal.fire({
        title: 'Kayıt Başarılı!',
        text: `Hesabınız başarıyla oluşturuldu. Giriş yapabilirsiniz.\nÜye Numaranız: ${data.user.memberNo || '-'}`,
        icon: 'success',
        confirmButtonText: 'Tamam'
      });

      this.switchAuthTab('login');
      document.getElementById('loginEmail').value = email;
    } catch (err) {
      Swal.fire({
        title: 'Kayıt Hatası',
        text: err.message,
        icon: 'error',
        confirmButtonText: 'Tamam'
      });
    }
  }

  handleLogout() {
    this.token = null;
    this.user = null;
    localStorage.removeItem('lib_token');
    localStorage.removeItem('lib_user');
    sessionStorage.removeItem('lib_token');
    sessionStorage.removeItem('lib_user');

    Swal.fire({
      title: 'Çıkış Yapıldı',
      text: 'Oturum sonlandırıldı.',
      icon: 'info',
      timer: 1500,
      showConfirmButton: false
    });

    this.checkAuthStatus();
    this.showAuthView();
  }

  /* ==========================================================================
     FORGOT PASSWORD RECOVERY
     ========================================================================== */
  async handleForgotPasswordRequest(e) {
    e.preventDefault();
    const email = document.getElementById('forgotEmail').value;

    try {
      const response = await fetch(`${API_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Sıfırlama kodu oluşturulamadı.');

      // Simulation details using SweetAlert
      Swal.fire({
        title: 'Doğrulama Kodu Üretildi!',
        html: `<p>E-posta gönderimi simüle edilmiştir.</p><br><h2 style="color:var(--accent-primary); letter-spacing: 2px;">${data.resetCode}</h2><br><p>Lütfen bu kodu sıfırlama ekranına girin.</p>`,
        icon: 'info',
        confirmButtonText: 'Kodu Girmeye Başla'
      });

      // Show recovery password form
      document.getElementById('forgotReqForm').classList.add('hidden');
      document.getElementById('forgotResetForm').classList.remove('hidden');
    } catch (err) {
      Swal.fire({
        title: 'Hata',
        text: err.message,
        icon: 'error',
        confirmButtonText: 'Tamam'
      });
    }
  }

  async handlePasswordResetSubmit(e) {
    e.preventDefault();
    const email = document.getElementById('forgotEmail').value;
    const code = document.getElementById('resetCode').value;
    const newPassword = document.getElementById('resetPassword').value;

    try {
      const response = await fetch(`${API_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code, newPassword })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Şifre sıfırlanamadı.');

      Swal.fire({
        title: 'Başarılı!',
        text: 'Şifreniz güncellendi. Giriş yapabilirsiniz.',
        icon: 'success',
        confirmButtonText: 'Tamam'
      });

      // Reset forms back
      document.getElementById('forgotReqForm').classList.remove('hidden');
      document.getElementById('forgotResetForm').classList.add('hidden');
      this.showAuthView();
      this.switchAuthTab('login');
      document.getElementById('loginEmail').value = email;
    } catch (err) {
      Swal.fire({
        title: 'Hata',
        text: err.message,
        icon: 'error',
        confirmButtonText: 'Tamam'
      });
    }
  }

  /* ==========================================================================
     DASHBOARD ANALYTICS & CHARTS
     ========================================================================== */
  async loadDashboardData() {
    try {
      const headers = { 'Authorization': `Bearer ${this.token}` };

      // 1. Fetch Metrics
      const metricsRes = await fetch(`${API_URL}/dashboard/metrics`, { headers });
      const metrics = await metricsRes.json();

      document.getElementById('kpiTotalBooks').innerText = `${metrics.totalBooksQuantity} / ${metrics.totalTitles}`;
      document.getElementById('kpiBorrowedBooks').innerText = metrics.activeLoans;
      document.getElementById('kpiShelfBooks').innerText = metrics.availableBooks;
      document.getElementById('kpiReservations').innerText = metrics.activeReservations;
      document.getElementById('kpiOverdueBooks').innerText = metrics.overdueLoans;

      // 2. Fetch Activities list
      const activitiesRes = await fetch(`${API_URL}/dashboard/recent`, { headers });
      const activities = await activitiesRes.json();
      const listContainer = document.getElementById('recentActivitiesList');
      listContainer.innerHTML = '';

      if (activities.length === 0) {
        listContainer.innerHTML = '<p style="color:var(--text-muted); font-size:0.8rem;">Son işlem bulunmamaktadır.</p>';
      } else {
        activities.forEach(act => {
          const formattedDate = new Date(act.time).toLocaleDateString('tr-TR', {
            hour: '2-digit', minute: '2-digit'
          });
          listContainer.innerHTML += `
            <div class="activity-item ${act.type}">
              <p>${act.action}</p>
              <span class="activity-time">${formattedDate}</span>
            </div>
          `;
        });
      }

      // 3. Fetch monthly loans graph data
      const trendRes = await fetch(`${API_URL}/dashboard/trend`, { headers });
      const trend = await trendRes.json();
      this.renderTrendChart(trend.labels, trend.data);

      // 4. Fetch category distribution data
      const catRes = await fetch(`${API_URL}/dashboard/categories`, { headers });
      const catData = await catRes.json();
      this.renderCategoryChart(catData.labels, catData.data);

      // 5. Fetch leaderboard statistics
      const leaderboardRes = await fetch(`${API_URL}/dashboard/leaderboard`, { headers });
      const leaderboard = await leaderboardRes.json();
      this.renderLeaderboard(leaderboard.users, leaderboard.books);
    } catch (err) {
      console.error('Failed to load dashboard statistics:', err.message);
    }
  }

  renderTrendChart(labels, dataset) {
    const ctx = document.getElementById('loanTrendChart').getContext('2d');
    
    // Destroy previous instance if exists to reload values cleanly
    if (this.trendChart) {
      this.trendChart.destroy();
    }

    this.trendChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Ödünç Alma Sayısı',
          data: dataset,
          borderColor: '#06b6d4',
          backgroundColor: 'rgba(6, 182, 212, 0.08)',
          borderWidth: 3,
          fill: true,
          tension: 0.35,
          pointBackgroundColor: '#6366f1',
          pointBorderColor: '#fff',
          pointHoverRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          x: { 
            grid: { color: 'rgba(255,255,255,0.03)' },
            ticks: { color: '#64748b' }
          },
          y: { 
            grid: { color: 'rgba(255,255,255,0.03)' },
            ticks: { color: '#64748b', precision: 0 }
          }
        }
      }
    });
  }

  renderCategoryChart(labels, dataset) {
    const ctx = document.getElementById('categoryDistributionChart').getContext('2d');

    if (this.categoryChart) {
      this.categoryChart.destroy();
    }

    this.categoryChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: dataset,
          backgroundColor: [
            '#06b6d4',
            '#6366f1',
            '#10b981',
            '#f59e0b',
            '#ef4444',
            '#ec4899',
            '#8b5cf6'
          ],
          borderWidth: 0,
          hoverOffset: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'bottom',
            labels: {
              color: '#94a3b8',
              boxWidth: 12,
              font: { size: 10 }
            }
          }
        }
      }
    });
  }

  renderLeaderboard(users, books) {
    const usersContainer = document.getElementById('topUsersList');
    const booksContainer = document.getElementById('topBooksList');

    usersContainer.innerHTML = '';
    booksContainer.innerHTML = '';

    if (users.length === 0) {
      usersContainer.innerHTML = '<div style="font-size:0.85rem; color:var(--text-muted); text-align:center; padding:1rem;">Yeterli işlem verisi yok.</div>';
    } else {
      users.forEach((item, idx) => {
        usersContainer.innerHTML += `
          <div class="leaderboard-item">
            <div class="leaderboard-left">
              <span class="leaderboard-badge">${idx + 1}</span>
              <div>
                <strong>${item.name}</strong><br>
                <small style="color:var(--text-muted); font-size:0.75rem;">${item.email}</small>
              </div>
            </div>
            <span class="leaderboard-count">${item.count} Kitap</span>
          </div>
        `;
      });
    }

    if (books.length === 0) {
      booksContainer.innerHTML = '<div style="font-size:0.85rem; color:var(--text-muted); text-align:center; padding:1rem;">Yeterli işlem verisi yok.</div>';
    } else {
      books.forEach((item, idx) => {
        booksContainer.innerHTML += `
          <div class="leaderboard-item">
            <div class="leaderboard-left">
              <span class="leaderboard-badge">${idx + 1}</span>
              <div>
                <strong>${item.title}</strong><br>
                <small style="color:var(--text-muted); font-size:0.75rem;">ISBN: ${item.isbn || '-'}</small>
              </div>
            </div>
            <span class="leaderboard-count">${item.count} Defa</span>
          </div>
        `;
      });
    }
  }

  /* ==========================================================================
     KITAP YONETIMI (CRUD, FILTERS, PAGE)
     ========================================================================== */
  async loadStaticAssets() {
    try {
      const headers = { 'Authorization': `Bearer ${this.token}` };

      const [authorsRes, catsRes, pubsRes] = await Promise.all([
        fetch(`${API_URL}/authors`, { headers }),
        fetch(`${API_URL}/categories`, { headers }),
        fetch(`${API_URL}/publishers`, { headers })
      ]);

      this.authors = await authorsRes.json();
      this.categories = await catsRes.json();
      this.publishers = await pubsRes.json();

      // Populate sidebar filter select boxes
      const catSelect = document.getElementById('bookFilterCategory');
      catSelect.innerHTML = '<option value="">Tüm Kategoriler</option>';
      this.categories.forEach(c => {
        catSelect.innerHTML += `<option value="${c.id}">${c.name}</option>`;
      });

      // Show/Hide Add Book trigger button
      const isStaffOrAdmin = this.user.roles.includes('ADMIN') || this.user.roles.includes('STAFF');
      const addBookBtn = document.getElementById('addBookBtn');
      if (isStaffOrAdmin) {
        addBookBtn.classList.remove('hidden');
      } else {
        addBookBtn.classList.add('hidden');
      }
    } catch (err) {
      console.error('Static data loader error:', err.message);
    }
  }

  async loadCatalog() {
    try {
      const search = document.getElementById('bookSearchInput').value;
      const category = document.getElementById('bookFilterCategory').value;
      const status = document.getElementById('bookFilterStatus').value;

      let url = `${API_URL}/books?page=${this.booksCurrentPage}&limit=${this.booksLimit}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      if (category) url += `&category=${encodeURIComponent(category)}`;
      if (status) url += `&status=${status}`;

      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${this.token}` }
      });
      const data = await response.json();

      this.allBooks = data.books || [];
      this.booksTotalPages = data.totalPages || 1;

      this.renderCatalogTable();
    } catch (err) {
      console.error('Failed to load books catalog:', err.message);
    }
  }

  renderCatalogTable() {
    const tbody = document.getElementById('booksTableBody');
    tbody.innerHTML = '';

    if (this.allBooks.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; color:var(--text-muted);">Kitap bulunamadı.</td></tr>';
      return;
    }

    const isStaffOrAdmin = this.user.roles.includes('ADMIN') || this.user.roles.includes('STAFF');

    this.allBooks.forEach(book => {
      const hasStock = book.stock > 0;
      
      // Stock colors
      const badgeClass = hasStock ? 'badge-success' : 'badge-danger';
      const badgeText = hasStock ? `Rafta (${book.stock})` : 'Tükendi / Rezerve';

      // Actions Builder
      let actionButtons = '';
      if (hasStock) {
        actionButtons += `<button class="btn btn-primary btn-sm" onclick="app.handleBorrow('${book.id}')" title="Ödünç Al"><i class="fa-solid fa-hand-holding-hand"></i></button>`;
      } else {
        actionButtons += `<button class="btn btn-outline btn-sm" onclick="app.handleReserve('${book.id}')" title="Sıraya Gir"><i class="fa-solid fa-hourglass-half"></i></button>`;
      }

      // Add edit/delete buttons for Staff/Admin
      if (isStaffOrAdmin) {
        actionButtons += `
          <button class="btn btn-outline btn-sm" onclick="app.openBookModal('${book.id}')" title="Düzenle"><i class="fa-solid fa-pen-to-square"></i></button>
          <button class="btn btn-danger btn-sm" onclick="app.handleDeleteBook('${book.id}')" title="Sil"><i class="fa-solid fa-trash"></i></button>
        `;
      }

      tbody.innerHTML += `
        <tr>
          <td>
            <code style="font-size:0.75rem; cursor:pointer; color:var(--accent-primary); font-weight:600;" onclick="app.showBarcode('${book.isbn || ''}', '${book.title}')" title="${book.isbn || 'ISBN Yok'} — Barkodu Görüntüle">
              <i class="fa-solid fa-barcode" style="margin-right:4px;"></i>${book.isbn ? 'ISBN-' + book.isbn.slice(-4) : 'Yok'}
            </code>
          </td>
          <td><strong>${book.title}</strong><br><small style="color:var(--text-muted)">Yıl: ${book.publicationYear || '-'}</small></td>
          <td>${book.authors.map(a => a.name).join(', ') || 'Bilinmiyor'}</td>
          <td>${book.categories.map(c => c.name).join(', ') || 'Belirtilmemiş'}</td>
          <td>${book.totalQuantity} / ${book.stock}</td>
          <td>
            ${book.shelfPosition 
              ? `<span class="badge btn-outline" onclick="app.showShelfLocator('${book.shelfPosition}')" style="cursor:pointer; border: 1px solid var(--border-color);" title="Kütüphane Haritasında Göster"><i class="fa-solid fa-map-location-dot" style="margin-right:4px; color:var(--accent-primary)"></i> <strong>${book.shelfPosition}</strong></span>` 
              : '-'
            }
          </td>
          <td><span class="badge ${badgeClass}">${badgeText}</span></td>
          <td><div class="actions-row">${actionButtons}</div></td>
        </tr>
      `;
    });

    // Update pagination tags
    document.getElementById('booksPageInfo').innerText = `Sayfa ${this.booksCurrentPage} / ${this.booksTotalPages}`;
    document.getElementById('prevBooksPage').disabled = this.booksCurrentPage === 1;
    document.getElementById('nextBooksPage').disabled = this.booksCurrentPage >= this.booksTotalPages;
  }

  prevBooksPage() {
    if (this.booksCurrentPage > 1) {
      this.booksCurrentPage--;
      this.loadCatalog();
    }
  }

  nextBooksPage() {
    if (this.booksCurrentPage < this.booksTotalPages) {
      this.booksCurrentPage++;
      this.loadCatalog();
    }
  }

  showShelfLocator(shelf) {
    if (!shelf) return;
    const prefix = shelf.charAt(0).toUpperCase();
    
    // Determine which section is highlighted
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
      customClass: {
        popup: 'library-map-popup'
      }
    });
  }

  showBarcode(isbn, bookTitle) {
    if (!isbn || isbn === 'Yok') {
      Swal.fire({
        title: 'ISBN Eksik',
        text: 'Bu kitaba ait ISBN numarası belirtilmemiş.',
        icon: 'warning',
        confirmButtonText: 'Tamam'
      });
      return;
    }

    // Generate simulated barcode stripes
    let barsHTML = '';
    const cleanIsbn = isbn.replace(/[^0-9]/g, '') || '9780000000000';
    
    // Create 32 bars based on digits
    for (let i = 0; i < 32; i++) {
      const digit = parseInt(cleanIsbn.charAt(i % cleanIsbn.length)) || 0;
      const barWidth = (digit % 3) + 1.5; // width between 1.5px and 4.5px
      const gapWidth = ((digit + 1) % 2) + 1; // gap between 1px and 2px
      
      barsHTML += `<div style="display:inline-block; width:${barWidth}px; height:70px; background-color:#000; margin-right:${gapWidth}px;"></div>`;
    }

    const barcodeHTML = `
      <div style="text-align:center; background:#fff; padding:1.5rem; border-radius:8px; border:1px solid var(--border-color); color:#000;">
        <h4 style="color:#64748b; font-family:var(--font-header); margin-bottom:1rem; font-size:0.8rem; text-transform:uppercase; letter-spacing:1px;">BİLGİ KÜTÜPHANESİ DEMİRBAŞ ETİKETİ</h4>
        <div style="font-size:0.85rem; font-weight:700; margin-bottom:0.75rem; color:#0b0f19;">${bookTitle}</div>
        
        <!-- Stripes -->
        <div style="white-space:nowrap; overflow:hidden; display:inline-block; padding:10px 0; border-top:1px solid #ddd; border-bottom:1px solid #ddd;">
          ${barsHTML}
        </div>
        
        <!-- Spaced ISBN Text -->
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
  }

  openPaymentModal() {
    const modal = document.getElementById('paymentModal');
    const form = document.getElementById('paymentForm');
    form.reset();

    // Default graphic display
    document.getElementById('cardGraphicNum').innerText = '•••• •••• •••• ••••';
    document.getElementById('cardGraphicName').innerText = 'AD SOYAD';
    document.getElementById('cardGraphicExpiry').innerText = 'AA/YY';

    const debts = parseFloat(this.user.debtBalance) || 0;
    document.getElementById('paymentSubmitBtn').innerText = `Ödemeyi Tamamla (${debts.toFixed(2)} TRY)`;

    modal.classList.remove('hidden');
  }

  closePaymentModal() {
    document.getElementById('paymentModal').classList.add('hidden');
  }

  updateCardGraphic() {
    const num = document.getElementById('payCardNum').value || '•••• •••• •••• ••••';
    const name = document.getElementById('payCardName').value || 'AD SOYAD';
    const expiry = document.getElementById('payCardExpiry').value || 'AA/YY';

    document.getElementById('cardGraphicNum').innerText = num;
    document.getElementById('cardGraphicName').innerText = name.toUpperCase();
    document.getElementById('cardGraphicExpiry').innerText = expiry;
  }

  formatCardNum(input) {
    let value = input.value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    let matches = value.match(/\d{4,16}/g);
    let match = (matches && matches[0]) || '';
    let parts = [];

    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }

    if (parts.length > 0) {
      input.value = parts.join(' ');
    } else {
      input.value = value;
    }
  }

  formatExpiry(input) {
    let value = input.value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    if (value.length >= 2) {
      input.value = value.substring(0, 2) + '/' + value.substring(2, 4);
    } else {
      input.value = value;
    }
  }

  async handleProcessPayment(e) {
    e.preventDefault();
    const debts = parseFloat(this.user.debtBalance) || 0;
    if (debts <= 0) return;

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
      await new Promise(resolve => setTimeout(resolve, 2000));

      const response = await fetch(`${API_URL}/users/${this.user.id}/debt`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`
        },
        body: JSON.stringify({ debtBalance: 0.00 })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Ödeme tamamlanamadı.');

      // Play sound notification or alert success
      Swal.fire({
        title: 'Ödeme Başarılı!',
        html: `<h4>Makbuz Numarası: ${Math.floor(100000 + Math.random() * 900000)}</h4><br><p>Tüm kütüphane gecikme cezası borçlarınız başarıyla sıfırlanmıştır.</p>`,
        icon: 'success',
        confirmButtonText: 'Harika'
      });

      // Update local storage models
      this.user.debtBalance = 0.00;
      localStorage.setItem('lib_user', JSON.stringify(this.user));

      this.closePaymentModal();
      this.checkAuthStatus();
      this.loadDashboardData();
    } catch (err) {
      Swal.fire('Ödeme Hatası', err.message, 'error');
    }
  }

  /* ==========================================================================
     BOOK MODAL FOR ADDING AND EDITING
     ========================================================================== */
  openBookModal(bookId = null) {
    const modal = document.getElementById('bookFormModal');
    const form = document.getElementById('bookForm');
    const titleEl = document.getElementById('bookModalTitle');
    
    form.reset();
    document.getElementById('modalBookId').value = '';
    
    // Populate dropdowns & lists
    this.populateBookModalFields();

    if (bookId) {
      // Edit mode
      titleEl.innerText = 'Kitap Bilgilerini Düzenle';
      const book = this.allBooks.find(b => b.id === bookId);
      if (book) {
        document.getElementById('modalBookId').value = book.id;
        document.getElementById('modalBookTitle').value = book.title;
        document.getElementById('modalBookISBN').value = book.isbn || '';
        document.getElementById('modalBookDesc').value = book.description || '';
        document.getElementById('modalBookTotal').value = book.totalQuantity || 0;
        document.getElementById('modalBookStock').value = book.stock || 0;
        document.getElementById('modalBookShelf').value = book.shelfPosition || '';
        document.getElementById('modalBookYear').value = book.publicationYear || '';
        
        if (book.publisher) {
          document.getElementById('modalBookPublisher').value = book.publisher.id;
        }

        // Toggle checkboxes
        book.authors.forEach(a => {
          const cb = document.querySelector(`input[name="modalAuthors"][value="${a.id}"]`);
          if (cb) cb.checked = true;
        });

        book.categories.forEach(c => {
          const cb = document.querySelector(`input[name="modalCategories"][value="${c.id}"]`);
          if (cb) cb.checked = true;
        });
      }
    } else {
      // Add mode
      titleEl.innerText = 'Yeni Kitap Ekle';
    }

    modal.classList.remove('hidden');
  }

  closeBookModal() {
    document.getElementById('bookFormModal').classList.add('hidden');
  }

  populateBookModalFields() {
    const authList = document.getElementById('modalBookAuthorsChecklist');
    const catList = document.getElementById('modalBookCategoriesChecklist');
    const pubSelect = document.getElementById('modalBookPublisher');

    authList.innerHTML = '';
    catList.innerHTML = '';
    pubSelect.innerHTML = '<option value="">Yayınevi Seçiniz</option>';

    this.authors.forEach(a => {
      authList.innerHTML += `
        <label class="checkbox-item">
          <input type="checkbox" name="modalAuthors" value="${a.id}">
          <span>${a.name}</span>
        </label>
      `;
    });

    this.categories.forEach(c => {
      catList.innerHTML += `
        <label class="checkbox-item">
          <input type="checkbox" name="modalCategories" value="${c.id}">
          <span>${c.name}</span>
        </label>
      `;
    });

    this.publishers.forEach(p => {
      pubSelect.innerHTML += `<option value="${p.id}">${p.name}</option>`;
    });
  }

  syncStockField() {
    // When adding a new book, default stock to totalQuantity if user enters it
    const total = document.getElementById('modalBookTotal').value;
    const bookId = document.getElementById('modalBookId').value;
    if (!bookId) {
      document.getElementById('modalBookStock').value = total;
    }
  }

  async handleSaveBook(e) {
    e.preventDefault();
    const bookId = document.getElementById('modalBookId').value;
    
    const title = document.getElementById('modalBookTitle').value;
    const isbn = document.getElementById('modalBookISBN').value || null;
    const description = document.getElementById('modalBookDesc').value || '';
    const totalQuantity = document.getElementById('modalBookTotal').value;
    const stock = document.getElementById('modalBookStock').value;
    const shelfPosition = document.getElementById('modalBookShelf').value || '';
    const publicationYear = document.getElementById('modalBookYear').value || null;
    const publisherId = document.getElementById('modalBookPublisher').value || null;

    const authorIds = Array.from(document.querySelectorAll('input[name="modalAuthors"]:checked')).map(cb => cb.value);
    const categoryIds = Array.from(document.querySelectorAll('input[name="modalCategories"]:checked')).map(cb => cb.value);

    const body = { title, isbn, description, totalQuantity, stock, shelfPosition, publicationYear, publisherId, authorIds, categoryIds };
    
    try {
      let url = `${API_URL}/books`;
      let method = 'POST';

      if (bookId) {
        url += `/${bookId}`;
        method = 'PUT';
      }

      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`
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

      this.closeBookModal();
      this.loadCatalog();
    } catch (err) {
      Swal.fire({
        title: 'Hata',
        text: err.message,
        icon: 'error',
        confirmButtonText: 'Tamam'
      });
    }
  }

  async handleDeleteBook(bookId) {
    // Soft Delete SweetAlert Confirmation
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
          headers: { 'Authorization': `Bearer ${this.token}` }
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Silme işlemi başarısız.');

        Swal.fire({
          title: 'Silindi!',
          text: 'Kitap başarıyla silindi (soft delete).',
          icon: 'success',
          timer: 1500,
          showConfirmButton: false
        });

        this.loadCatalog();
      } catch (err) {
        Swal.fire({
          title: 'Hata',
          text: err.message,
          icon: 'error',
          confirmButtonText: 'Tamam'
        });
      }
    }
  }

  /* ==========================================================================
     BORROW & RETURNS MODULE
     ========================================================================== */
  async handleBorrow(bookId) {
    try {
      const response = await fetch(`${API_URL}/borrowings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`
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

      this.loadCatalog();
    } catch (err) {
      Swal.fire({
        title: 'Ödünç Hatası',
        text: err.message,
        icon: 'error',
        confirmButtonText: 'Tamam'
      });
    }
  }

  async handleReserve(bookId) {
    try {
      const response = await fetch(`${API_URL}/reservations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`
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

      this.loadCatalog();
    } catch (err) {
      Swal.fire({
        title: 'Rezervasyon Hatası',
        text: err.message,
        icon: 'error',
        confirmButtonText: 'Tamam'
      });
    }
  }

  async loadLoans() {
    try {
      const response = await fetch(`${API_URL}/borrowings`, {
        headers: { 'Authorization': `Bearer ${this.token}` }
      });
      this.allLoans = await response.json();
      this.renderLoansTable();
    } catch (err) {
      console.error('Failed to load loans table:', err.message);
    }
  }

  renderLoansTable() {
    const filterText = document.getElementById('loansSearchInput').value.toLowerCase();
    const tbody = document.getElementById('loansTableBody');
    tbody.innerHTML = '';

    const filtered = this.allLoans.filter(l => {
      const bookTitle = l.book ? l.book.title.toLowerCase() : '';
      const bookISBN = l.book ? (l.book.isbn || '').toLowerCase() : '';
      const email = l.user.email.toLowerCase();
      const memberNo = (l.user.memberNo || '').toLowerCase();
      return bookTitle.includes(filterText) || bookISBN.includes(filterText) || email.includes(filterText) || memberNo.includes(filterText);
    });

    if (filtered.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:var(--text-muted);">Ödünç kaydı bulunamadı.</td></tr>';
      return;
    }

    filtered.forEach(row => {
      const isBorrowed = row.status === 'borrowed';
      
      // Overdue check and visual calculation
      let delayBadge = '';
      let calculatedPenalty = 0;
      const dueTime = new Date(row.dueAt).getTime();
      const now = Date.now();

      if (isBorrowed && now > dueTime) {
        const elapsed = now - dueTime;
        const days = Math.ceil(elapsed / (1000 * 60 * 60 * 24));
        calculatedPenalty = days * 5.00; // dynamic fine simulation
        delayBadge = `<br><span class="badge badge-danger" style="margin-top:0.25rem;">Gecikti (+${days} Gün) - ${calculatedPenalty.toFixed(2)} TRY</span>`;
      }

      const returnBtn = isBorrowed
        ? `<button class="btn btn-primary btn-sm" onclick="app.handleReturn('${row.id}')"><i class="fa-solid fa-rotate-left"></i> İade Al</button>`
        : '<span style="color:var(--text-muted)">İade Edildi</span>';

      tbody.innerHTML += `
        <tr>
          <td><strong>${row.book ? row.book.title : 'Bilinmeyen Kitap'}</strong><br><small style="color:var(--text-muted)">ISBN: ${row.book ? row.book.isbn : '-'}</small></td>
          <td>${row.user.name} ${row.user.surname || ''}<br><small style="color:var(--text-muted)">No: ${row.user.memberNo || '-'}</small></td>
          <td>${new Date(row.borrowedAt).toLocaleDateString('tr-TR')}</td>
          <td>${new Date(row.dueAt).toLocaleDateString('tr-TR')} ${delayBadge}</td>
          <td>${row.returnedAt ? new Date(row.returnedAt).toLocaleDateString('tr-TR') : '-'}</td>
          <td><span class="badge ${isBorrowed ? 'badge-danger' : 'badge-success'}">${isBorrowed ? 'Ödünçte' : 'Teslim Edildi'}</span></td>
          <td>${returnBtn}</td>
        </tr>
      `;
    });
  }

  async handleReturn(loanId) {
    try {
      const response = await fetch(`${API_URL}/borrowings/${loanId}/return`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${this.token}` }
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

      this.loadLoans();
      this.loadCatalog();
    } catch (err) {
      Swal.fire({
        title: 'Hata',
        text: err.message,
        icon: 'error',
        confirmButtonText: 'Tamam'
      });
    }
  }

  /* ==========================================================================
     RESERVATIONS QUEUE DETAILS
     ========================================================================== */
  async loadReservations() {
    try {
      const response = await fetch(`${API_URL}/reservations`, {
        headers: { 'Authorization': `Bearer ${this.token}` }
      });
      const list = await response.json();

      const tbody = document.getElementById('reservationsTableBody');
      tbody.innerHTML = '';

      if (list.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:var(--text-muted);">Rezervasyon kaydı bulunmamaktadır.</td></tr>';
        return;
      }

      list.forEach(row => {
        const canCancel = row.status === 'pending';
        const cancelBtn = canCancel
          ? `<button class="btn btn-danger btn-sm" onclick="app.handleCancelReservation('${row.id}')"><i class="fa-solid fa-ban"></i> İptal Et</button>`
          : '-';

        const statusClass = row.status === 'pending' ? 'badge-danger' : 'badge-success';
        const statusText = row.status === 'pending' ? 'Sırada' : row.status === 'fulfilled' ? 'Alındı' : 'İptal';

        tbody.innerHTML += `
          <tr>
            <td><strong>${row.book ? row.book.title : 'Bilinmeyen Kitap'}</strong></td>
            <td>${new Date(row.reservedAt).toLocaleDateString('tr-TR')}</td>
            <td>${row.user.name} ${row.user.surname || ''}<br><small style="color:var(--text-muted)">${row.user.email}</small></td>
            <td>${row.status === 'pending' ? `<strong style="color:var(--accent-primary)">${row.queuePosition}. Sırada</strong>` : '-'}</td>
            <td><span class="badge ${statusClass}">${statusText}</span></td>
            <td>${cancelBtn}</td>
          </tr>
        `;
      });
    } catch (err) {
      console.error('Failed to load reservations:', err.message);
    }
  }

  async handleCancelReservation(resId) {
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
          headers: { 'Authorization': `Bearer ${this.token}` }
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'İptal edilemedi.');

        Swal.fire('İptal Edildi', 'Rezervasyon sıranız kaldırıldı.', 'success');
        this.loadReservations();
      } catch (err) {
        Swal.fire('Hata', err.message, 'error');
      }
    }
  }

  /* ==========================================================================
     MEMBER / USER DIRECTORY & PENALTIES
     ========================================================================== */
  async loadMembers() {
    try {
      const response = await fetch(`${API_URL}/users`, {
        headers: { 'Authorization': `Bearer ${this.token}` }
      });
      this.allMembers = await response.json();
      this.renderMembersTable();
    } catch (err) {
      console.error('Failed to load members directory:', err.message);
    }
  }

  renderMembersTable() {
    const filterText = document.getElementById('membersSearchInput').value.toLowerCase();
    const tbody = document.getElementById('membersTableBody');
    tbody.innerHTML = '';

    const filtered = this.allMembers.filter(m => {
      const fullName = `${m.name} ${m.surname || ''}`.toLowerCase();
      const email = m.email.toLowerCase();
      const memberNo = (m.memberNo || '').toLowerCase();
      return fullName.includes(filterText) || email.includes(filterText) || memberNo.includes(filterText);
    });

    if (filtered.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:var(--text-muted);">Üye bulunamadı.</td></tr>';
      return;
    }

    filtered.forEach(m => {
      const debts = parseFloat(m.debtBalance) || 0.00;
      const debtStyle = debts > 0 ? 'color:var(--danger); font-weight:bold;' : 'color:var(--success)';
      const debtText = `${debts.toFixed(2)} TRY`;

      const isAdmin = this.user.roles.includes('ADMIN');
      const currentRole = m.roles.map(r=>r.name)[0] || 'USER';
      const isSelf = m.id === this.user.id;

      // Build action buttons
      let actionButtons = `
        <button class="btn btn-outline btn-sm" onclick="app.openMemberHistory('${m.id}', '${m.email}')" title="İşlem Geçmişi"><i class="fa-solid fa-history"></i></button>
        <button class="btn btn-outline btn-sm" onclick="app.editUserDebt('${m.id}', ${debts})" title="Borç Düzenle"><i class="fa-solid fa-money-bill-transfer"></i></button>
      `;

      if (isAdmin && !isSelf) {
        actionButtons += `
          <button class="btn btn-outline btn-sm" onclick="app.editUserRole('${m.id}', '${currentRole}')" title="Yetki Düzenle"><i class="fa-solid fa-user-shield"></i></button>
        `;
      }

      tbody.innerHTML += `
        <tr>
          <td><code style="font-size:0.8rem;">${m.memberNo || '-'}</code></td>
          <td><strong>${m.name} ${m.surname || ''}</strong><br><small class="badge">${m.roles.map(r=>r.name).join(', ')}</small></td>
          <td>${m.email}</td>
          <td>${m.phone || '-'}</td>
          <td style="${debtStyle}">${debtText}</td>
          <td>${new Date(m.createdAt).toLocaleDateString('tr-TR')}</td>
          <td>
            <div class="actions-row">
              ${actionButtons}
            </div>
          </td>
        </tr>
      `;
    });
  }

  async editUserRole(userId, currentRole) {
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
        const response = await fetch(`${API_URL}/users/${userId}/role`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.token}`
          },
          body: JSON.stringify({ role: newRole })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Rol güncellenemedi.');

        Swal.fire('Başarılı', 'Kullanıcı rolü başarıyla güncellendi.', 'success');
        this.loadMembers();
      } catch (err) {
        Swal.fire('Hata', err.message, 'error');
      }
    }
  }

  async editUserDebt(userId, currentDebt) {
    const { value: newDebt } = await Swal.fire({
      title: 'Ceza / Borç Güncelle',
      input: 'number',
      inputLabel: 'Yeni Borç Tutarı (TRY)',
      inputValue: currentDebt,
      showCancelButton: true,
      inputValidator: (value) => {
        if (!value || isNaN(parseFloat(value))) {
          return 'Geçerli bir sayı girmeniz gerekir!';
        }
      }
    });

    if (newDebt !== undefined) {
      try {
        const response = await fetch(`${API_URL}/users/${userId}/debt`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.token}`
          },
          body: JSON.stringify({ debtBalance: parseFloat(newDebt) })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Borç güncellenemedi.');

        Swal.fire('Güncellendi', 'Borç bakiyesi başarıyla düzenlendi.', 'success');
        this.loadMembers();
      } catch (err) {
        Swal.fire('Hata', err.message, 'error');
      }
    }
  }

  async openMemberHistory(userId, userEmail) {
    document.getElementById('historyMemberEmail').innerText = `Üye: ${userEmail}`;
    
    try {
      const response = await fetch(`${API_URL}/users/${userId}/history`, {
        headers: { 'Authorization': `Bearer ${this.token}` }
      });
      const history = await response.json();

      const tbody = document.getElementById('memberHistoryTableBody');
      tbody.innerHTML = '';

      if (history.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:var(--text-muted)">Üyeye ait işlem bulunmamaktadır.</td></tr>';
      } else {
        history.forEach(row => {
          tbody.innerHTML += `
            <tr>
              <td><strong>${row.book ? row.book.title : 'Bilinmeyen'}</strong></td>
              <td>${new Date(row.borrowedAt).toLocaleDateString('tr-TR')}</td>
              <td>${new Date(row.dueAt).toLocaleDateString('tr-TR')}</td>
              <td>${row.returnedAt ? new Date(row.returnedAt).toLocaleDateString('tr-TR') : '-'}</td>
              <td><span class="badge ${row.status === 'returned' ? 'badge-success' : 'badge-danger'}">${row.status === 'returned' ? 'İade Edildi' : 'Ödünçte'}</span></td>
            </tr>
          `;
        });
      }

      document.getElementById('memberHistoryModal').classList.remove('hidden');
    } catch (err) {
      Swal.fire('Hata', 'Geçmiş yüklenemedi.', 'error');
    }
  }

  closeMemberHistoryModal() {
    document.getElementById('memberHistoryModal').classList.add('hidden');
  }

  /* ==========================================================================
     SYSTEM SETTINGS MODULE
     ========================================================================== */
  async loadSettings() {
    try {
      const response = await fetch(`${API_URL}/settings`, {
        headers: { 'Authorization': `Bearer ${this.token}` }
      });
      const config = await response.json();

      document.getElementById('settingsBorrowDays').value = config.maxBorrowDays;
      document.getElementById('settingsPenaltyRate').value = config.dailyPenaltyFee;
      document.getElementById('settingsMaxBooks').value = config.maxBooksLimit;

      const isStaffOrAdmin = this.user.roles.includes('ADMIN') || this.user.roles.includes('STAFF');
      const saveBtn = document.getElementById('saveSettingsBtn');
      const msg = document.getElementById('settingsMsg');

      if (isStaffOrAdmin) {
        saveBtn.classList.remove('hidden');
        msg.classList.add('hidden');
      } else {
        saveBtn.classList.add('hidden');
        msg.classList.remove('hidden');
      }
    } catch (err) {
      console.error('Failed to load system settings:', err.message);
    }
  }

  async handleUpdateSettings(e) {
    e.preventDefault();
    const maxBorrowDays = document.getElementById('settingsBorrowDays').value;
    const dailyPenaltyFee = document.getElementById('settingsPenaltyRate').value;
    const maxBooksLimit = document.getElementById('settingsMaxBooks').value;

    try {
      const response = await fetch(`${API_URL}/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`
        },
        body: JSON.stringify({ maxBorrowDays, dailyPenaltyFee, maxBooksLimit })
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
  }

  /* ==========================================================================
     EXCEL / CSV DATA EXPORTS
     ========================================================================== */
  exportBooksToCSV() {
    if (this.allBooks.length === 0) return;

    let csvContent = 'data:text/csv;charset=utf-8,\uFEFF';
    csvContent += 'ISBN,Kitap Adi,Yazar,Kategori,Raf Konumu,Toplam Adet,Mevcut Adet\n';

    this.allBooks.forEach(b => {
      const title = b.title.replace(/"/g, '""');
      const authors = b.authors.map(a => a.name).join('; ').replace(/"/g, '""');
      const categories = b.categories.map(c => c.name).join('; ').replace(/"/g, '""');
      
      csvContent += `"${b.isbn || ''}","${title}","${authors}","${categories}","${b.shelfPosition || ''}",${b.totalQuantity},${b.stock}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'kutuphane_kitap_listesi.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  exportLoans() {
    if (!this.allLoans || this.allLoans.length === 0) return;

    let csvContent = 'data:text/csv;charset=utf-8,\uFEFF';
    csvContent += 'Kitap Adi,Uye No,Uye Eposta,Odunc Tarihi,Son Teslim Tarihi,Fiili Teslim Tarihi,Durum\n';

    this.allLoans.forEach(l => {
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
  }
}

// Instantiate Global Class
const app = new LibraryApp();
