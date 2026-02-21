// ===== Analytics (Chart.js) =====
function renderAnalytics() {
    const terminados = projects.filter(p => p.status === 'terminado' && p.completedAt);

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Get month boundaries
    const thisMonthStart = new Date(currentYear, currentMonth, 1);
    const prevMonthStart = new Date(currentYear, currentMonth - 1, 1);
    const prevMonthEnd = new Date(currentYear, currentMonth, 0);

    // Calculate monthly utilities
    let currentMonthUtil = 0;
    let prevMonthUtil = 0;

    // Build last 6 months data for the chart
    const monthLabels = [];
    const monthData = [];

    for (let i = 5; i >= 0; i--) {
        const mDate = new Date(currentYear, currentMonth - i, 1);
        const mEnd = new Date(currentYear, currentMonth - i + 1, 0);
        const label = mDate.toLocaleDateString('es-MX', { month: 'short', year: '2-digit' });
        monthLabels.push(label);

        const monthUtil = terminados
            .filter(p => {
                const d = new Date(p.completedAt);
                return d >= mDate && d <= mEnd;
            })
            .reduce((sum, p) => sum + (parseFloat(p.utilidad) || 0), 0);

        monthData.push(monthUtil);

        if (i === 0) currentMonthUtil = monthUtil;
        if (i === 1) prevMonthUtil = monthUtil;
    }

    // Update stat cards
    const totalCompleted = terminados.length;
    const totalUtilidad = terminados.reduce((sum, p) => sum + (parseFloat(p.utilidad) || 0), 0);
    const avgProfit = totalCompleted > 0 ? totalUtilidad / totalCompleted : 0;

    document.getElementById('stat-current-month').textContent = `$${currentMonthUtil.toLocaleString()}`;
    document.getElementById('stat-current-month').className = `stat-value ${currentMonthUtil >= 0 ? 'utilidad-positive' : 'utilidad-negative'}`;

    document.getElementById('stat-prev-month').textContent = `$${prevMonthUtil.toLocaleString()}`;
    document.getElementById('stat-prev-month').className = `stat-value ${prevMonthUtil >= 0 ? 'utilidad-positive' : 'utilidad-negative'}`;

    document.getElementById('stat-total-completed').textContent = totalCompleted;
    document.getElementById('stat-avg-profit').textContent = `$${Math.round(avgProfit).toLocaleString()}`;
    document.getElementById('stat-avg-profit').className = `stat-value ${avgProfit >= 0 ? 'utilidad-positive' : 'utilidad-negative'}`;

    // Render Chart
    const ctx = document.getElementById('profit-chart');
    if (!ctx) return;

    if (profitChart) {
        profitChart.destroy();
    }

    profitChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: monthLabels,
            datasets: [{
                label: 'Utilidad ($)',
                data: monthData,
                backgroundColor: monthData.map(v => v >= 0 ? 'rgba(16, 185, 129, 0.7)' : 'rgba(239, 68, 68, 0.7)'),
                borderColor: monthData.map(v => v >= 0 ? '#10b981' : '#ef4444'),
                borderWidth: 2,
                borderRadius: 8,
                borderSkipped: false,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: '#1a1a1d',
                    titleColor: '#f5f5f7',
                    bodyColor: '#a1a1a6',
                    borderColor: '#2a2a2e',
                    borderWidth: 1,
                    padding: 12,
                    cornerRadius: 8,
                    callbacks: {
                        label: function (context) {
                            const val = context.parsed.y;
                            return `Utilidad: ${val >= 0 ? '+' : ''}$${val.toLocaleString()}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(42, 42, 46, 0.5)' },
                    ticks: { color: '#a1a1a6', font: { family: 'Inter' } }
                },
                y: {
                    grid: { color: 'rgba(42, 42, 46, 0.5)' },
                    ticks: {
                        color: '#a1a1a6',
                        font: { family: 'Inter' },
                        callback: function (value) {
                            return '$' + value.toLocaleString();
                        }
                    }
                }
            }
        }
    });
}


