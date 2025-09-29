// Initialisiert das Chart.js-Liniendiagramm
const ctx = document.getElementById('lineChart').getContext('2d');

new Chart(ctx, {
  type: 'line',
  data: {
    labels: ['22.09.25','23.09.25','24.09.25','Heute'],
    datasets: [{
      data: [200,150,180,300],
      borderColor: '#000',
      fill: false,
      tension: 0.3,
      pointBackgroundColor: '#000'
    }]
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: { display: false },
      y: { display: false }
    },
    plugins: {
      legend: { display: false },
      tooltip: { enabled: false }
    }
  }
});
