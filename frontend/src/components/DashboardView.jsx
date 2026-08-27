import React, { useState, useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';
import { API_URL } from '../App';

function DashboardView({ token, user }) {
  const [metrics, setMetrics] = useState({
    totalBooksQuantity: 0,
    totalTitles: 0,
    activeLoans: 0,
    availableBooks: 0,
    activeReservations: 0,
    overdueLoans: 0
  });

  const [activities, setActivities] = useState([]);
  const [topUsers, setTopUsers] = useState([]);
  const [topBooks, setTopBooks] = useState([]);

  const trendChartRef = useRef(null);
  const categoryChartRef = useRef(null);
  const trendCanvasRef = useRef(null);
  const categoryCanvasRef = useRef(null);

  useEffect(() => {
    loadDashboardData();
    return () => {
      if (trendChartRef.current) trendChartRef.current.destroy();
      if (categoryChartRef.current) categoryChartRef.current.destroy();
    };
  }, []);

  const loadDashboardData = async () => {
    try {
      const headers = { 'Authorization': `Bearer ${token}` };

      // 1. Fetch Metrics
      const metricsRes = await fetch(`${API_URL}/dashboard/metrics`, { headers });
      const metricsData = await metricsRes.json();
      setMetrics(metricsData);

      // 2. Fetch Activities list
      const activitiesRes = await fetch(`${API_URL}/dashboard/recent`, { headers });
      const activitiesData = await activitiesRes.json();
      setActivities(activitiesData);

      // 3. Fetch monthly loans graph data & render
      const trendRes = await fetch(`${API_URL}/dashboard/trend`, { headers });
      const trendData = await trendRes.json();
      renderTrendChart(trendData.labels, trendData.data);

      // 4. Fetch category distribution data & render
      const catRes = await fetch(`${API_URL}/dashboard/categories`, { headers });
      const catData = await catRes.json();
      renderCategoryChart(catData.labels, catData.data);

      // 5. Fetch leaderboard statistics
      const leaderboardRes = await fetch(`${API_URL}/dashboard/leaderboard`, { headers });
      const leaderboardData = await leaderboardRes.json();
      setTopUsers(leaderboardData.users || []);
      setTopBooks(leaderboardData.books || []);
    } catch (err) {
      console.error('Failed to load dashboard statistics:', err.message);
    }
  };

  const renderTrendChart = (labels, dataset) => {
    if (!trendCanvasRef.current) return;
    const ctx = trendCanvasRef.current.getContext('2d');
    
    if (trendChartRef.current) {
      trendChartRef.current.destroy();
    }

    trendChartRef.current = new Chart(ctx, {
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
  };

  const renderCategoryChart = (labels, dataset) => {
    if (!categoryCanvasRef.current) return;
    const ctx = categoryCanvasRef.current.getContext('2d');

    if (categoryChartRef.current) {
      categoryChartRef.current.destroy();
    }

    categoryChartRef.current = new Chart(ctx, {
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
  };

  return (
    <section id="dashboardView" className="view-panel">
      {/* Metrics Row */}
      <div className="kpi-grid">
        <div className="kpi-card cyan">
          <div className="kpi-body">
            <span className="kpi-title">Toplam Kitap / Eser</span>
            <span className="kpi-value">{metrics.totalBooksQuantity} / {metrics.totalTitles}</span>
          </div>
          <div className="kpi-icon"><i className="fa-solid fa-book"></i></div>
        </div>

        <div className="kpi-card orange">
          <div className="kpi-body">
            <span className="kpi-title">Ödünç Verilenler</span>
            <span className="kpi-value">{metrics.activeLoans}</span>
          </div>
          <div className="kpi-icon"><i className="fa-solid fa-hand-holding-hand"></i></div>
        </div>

        <div className="kpi-card green">
          <div className="kpi-body">
            <span className="kpi-title">Raftaki Kitap Sayısı</span>
            <span className="kpi-value">{metrics.availableBooks}</span>
          </div>
          <div className="kpi-icon"><i className="fa-solid fa-building-columns"></i></div>
        </div>

        <div className="kpi-card red">
          <div className="kpi-body">
            <span className="kpi-title">Sırada Bekleyenler</span>
            <span className="kpi-value">{metrics.activeReservations}</span>
          </div>
          <div className="kpi-icon"><i className="fa-solid fa-hourglass-half"></i></div>
        </div>

        <div className="kpi-card purple">
          <div className="kpi-body">
            <span className="kpi-title">Geciken Kitaplar</span>
            <span className="kpi-value">{metrics.overdueLoans}</span>
          </div>
          <div className="kpi-icon"><i className="fa-solid fa-circle-exclamation"></i></div>
        </div>
      </div>

      {/* Charts and Activities row */}
      <div className="dashboard-charts-row">
        <div className="chart-container card-panel">
          <h3>Aylık Ödünç Grafik Analizi</h3>
          <div style={{ position: 'relative', height: '270px', width: '100%' }}>
            <canvas ref={trendCanvasRef}></canvas>
          </div>
        </div>

        <div className="chart-container card-panel">
          <h3>Kategori Dağılımı</h3>
          <div style={{ position: 'relative', height: '270px', width: '100%' }}>
            <canvas ref={categoryCanvasRef}></canvas>
          </div>
        </div>

        <div className="activities-container card-panel">
          <h3>Son İşlemler</h3>
          <div className="activities-list">
            {activities.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Son işlem bulunmamaktadır.</p>
            ) : (
              activities.map((act, index) => {
                const formattedDate = new Date(act.time).toLocaleDateString('tr-TR', {
                  hour: '2-digit', minute: '2-digit'
                });
                return (
                  <div key={index} className={`activity-item ${act.type}`}>
                    <p>{act.action}</p>
                    <span className="activity-time">{formattedDate}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Leaderboard Analytics Row */}
      <div className="leaderboard-row">
        <div className="card-panel">
          <h3>🏆 En Fazla Okuyan Üyeler</h3>
          <div className="leaderboard-list">
            {topUsers.length === 0 ? (
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center', padding: '1rem' }}>
                Yeterli işlem verisi yok.
              </div>
            ) : (
              topUsers.map((item, idx) => (
                <div key={idx} className="leaderboard-item">
                  <div className="leaderboard-left">
                    <span className="leaderboard-badge">{idx + 1}</span>
                    <div>
                      <strong>{item.name}</strong><br />
                      <small style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{item.email}</small>
                    </div>
                  </div>
                  <span className="leaderboard-count">{item.count} Kitap</span>
                </div>
              ))
            )}
          </div>
        </div>
        
        <div className="card-panel">
          <h3>📚 En Çok Tercih Edilen Kitaplar</h3>
          <div className="leaderboard-list">
            {topBooks.length === 0 ? (
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center', padding: '1rem' }}>
                Yeterli işlem verisi yok.
              </div>
            ) : (
              topBooks.map((item, idx) => (
                <div key={idx} className="leaderboard-item">
                  <div className="leaderboard-left">
                    <span className="leaderboard-badge">{idx + 1}</span>
                    <div>
                      <strong>{item.title}</strong><br />
                      <small style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>ISBN: {item.isbn || '-'}</small>
                    </div>
                  </div>
                  <span className="leaderboard-count">{item.count} Defa</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export default DashboardView;
