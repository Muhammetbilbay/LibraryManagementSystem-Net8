# 📚 Kütüphane Yönetim Sistemi

Bu proje, modern ve şık bir arayüze sahip, Docker üzerinde koşan, **.NET 8.0 (C# Web API)** ve **PostgreSQL (Entity Framework Core)** tabanlı kurumsal seviyede bir Kütüphane Yönetim Sistemi (LMS) uygulamasıdır.

---

## 🛠️ Kullanılan Teknolojiler

### Arkaplan (Backend)
- **C# / .NET 8.0 Web API** (Hızlı ve güvenli sunucu altyapısı)
- **Entity Framework Core** (Veritabanı Nesne-İlişki Eşleme - ORM)
- **Npgsql (PostgreSQL)** (İlişkisel veritabanı sürücüsü)
- **JWT (JSON Web Token)** (Kimlik doğrulama ve oturum yönetimi)
- **BCrypt.Net-Next** (Şifrelerin güvenli şekilde hash'lenmesi)

### Ön Yüz (Frontend)
- **HTML5 & Vanilla CSS** (Koyu/Açık Tema destekli, modern Glassmorphism tasarım)
- **JavaScript (ES6+)** (Dinamik veri yükleme, arama ve filtreleme mantığı)
- **Chart.js** (Aylık kiralama trendi ve kategori dağılımı görsel grafikleri)
- **SweetAlert2** (Premium bildirim ve onay diyalog kutuları)

---

## 🚀 Öne Çıkan Özellikler

1. **Gelişmiş Dashboard Analitiği**:
   - Toplam kitap, mevcut kitap, aktif ödünç alma, rezervasyon sırası ve geciken kitap metrikleri.
   - Son 6 aylık ödünç alma trend grafiği (Chart.js).
   - En popüler kitaplar ve en aktif üyeler **Liderlik Tablosu (Leaderboard)**.
   - Kategorilere göre dağılım grafiği (Doughnut Chart).
   - Gerçek zamanlı **Sistem Logları (Activity Logs)** ekranı (Sadece ADMIN).

2. **Gelişmiş Kitap Yönetimi**:
   - Kitap ekleme, düzenleme, arşivleme (Soft Delete / Paranoid).
   - ISBN numaralarının son 4 hanesini gösteren kısaltılmış format (`ISBN-1234`), üzerine gelindiğinde tam ISBN gösterimi ve tıklanınca dinamik **ISBN Barkod Simülatörü**.
   - Kitabın kütüphanedeki yerini görsel olarak gösteren interaktif **Raf Bulucu (Map Locator)**.

3. **Ödünç Alma ve İade Süreçleri**:
   - Kitap ödünç alma ve geciken kitaplar için otomatik günlük ceza tutarı yansıtma.
   - Stokta olmayan kitaplar için **Rezervasyon Sırasına (Kuyruk)** girme ve sıradaki kullanıcı kitabı ödünç aldığında otomatik sıra güncelleme.
   - Kredi kartı ödeme simülatörü ile biriken gecikme cezası/borç bakiyesini sıfırlama.

4. **Üye & Yetki Yönetimi (Sadece ADMIN)**:
   - Tüm üyeleri listeleme ve borç durumlarını düzenleme.
   - Kayıt olan kullanıcılar otomatik olarak `USER` (Öğrenci/Üye) olarak atanır.
   - Admin paneli üzerinden üyelerin yetkileri (USER, STAFF, ADMIN) dinamik olarak değiştirilebilir.

---

## 🐳 Docker Kurulumu ve Çalıştırma

Projenin bilgisayarınızda çalışması için sadece **Docker** kurulu olması yeterlidir. Herhangi bir .NET veya PostgreSQL kurulumuna ihtiyaç yoktur.

1. **Servisleri Başlatın**:
   Proje ana dizininde terminali açıp şu komutu çalıştırın:
   ```bash
   docker-compose up -d --build
   ```

2. **Veritabanı Seeding (Otomatik)**:
   Sunucu ilk ayağa kalktığında veritabanı şemasını otomatik oluşturur ve içine varsayılan **5 adet Türk Klasiği** (Nutuk, İnce Memed vb.), varsayılan kullanıcılar ve geçmiş test verilerini otomatik olarak yükler.

3. **Uygulamaya Erişin**:
   - **Frontend:** Tarayıcınızda `frontend/index.html` dosyasını (örneğin Live Server ile `http://127.0.0.1:5500/frontend/index.html` adresinden) açın.
   - **Backend API:** `http://localhost:5000` portundan hizmet vermektedir.

---

## 🔑 Varsayılan Kullanıcı Giriş Bilgileri

Sistemi test etmek için hazır tanımlanmış hesaplar:

| Rol | E-posta | Şifre | Açıklama |
|---|---|---|---|
| **Yönetici (ADMIN)** | `admin@library.com` | `admin123` | Tüm yetkilere sahip hesap. Yetki ve borç düzenleyebilir, logları görebilir. |
| **Görevli (STAFF)** | `staff@library.com` | `staff123` | Kitap ve ödünç alma süreçlerini yönetebilir. |
| **Üye (USER)** | `user@library.com` | `user123` | Muhammet Bilbay hesabı. Kitap arayabilir, ödünç alabilir veya sıraya girebilir. |

---

## 📁 Dosya Yapısı

```
PROJE2 KUTUPHANE/
│
├── Controllers/         # API Endpoint controller'ları
├── Data/                # DbContext veritabanı bağlantı konfigürasyonu
├── Models/              # EF Core veritabanı modelleri
├── frontend/            # HTML, CSS ve JS arayüz dosyaları
│   ├── index.html
│   ├── style.css
│   └── app.js
│
├── Dockerfile           # .NET Web API Docker konfigürasyonu
├── docker-compose.yml   # API ve PostgreSQL orchestrator dosyası
├── LibraryAPI.csproj    # C# Proje dosyası ve NuGet paketleri
└── Program.cs           # Giriş noktası ve otomatik seed kodları
```
