async function getAll() {
  const url = 'https://meteoride-im3.meteoride-im3.com/backend/api/getAll.php';
try {
    const response = await fetch(url);
    const data = await response.json();
    console.log(data); // gibt die Daten der API in der Konsole aus
  } catch (error) {
    console.error(error)
  }
}

// Initialisiert das Chart.js-Liniendiagramm
const canvas = document.querySelector('#chart');
const ctx = canvas.getContext('2d');

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

async function getByDate(date) {
  const url = `https://meteoride-im3.meteoride-im3.com/backend/api/getByDate.php?date=${date}`;
  try { 
    const response = await fetch(url);
    const data = await response.json();
    console.log(data); // gibt die Daten der API in der Konsole aus
  } catch (error) {
    console.error(error)
  }
}

function getBy3Days() {
    const url = `https://meteoride-im3.meteoride-im3.com/backend/api/getBy3Days.php`;
    try {
        const response = await fetch(url);
        const data = await response.json();
        return data;
    } catch (error) {
        console.error(error)
    }
}

const date_picker = document.querySelector('#datepicker');
let chart = null;


date_picker.addEventListener('input', async function() {
    // -> chart löschen, wenn schon vorhanden
    if (chart) {
        chart.destroy()
    }

    // -> daten laden
    const date = date_picker.value;
    const data = await getByDate(date);

    // -> daten aufbereiten
    const labels = data.map((entry) => {
        const date = new Date(entry.timestamp);
        return `${date.getHours()} Uhr`;
    })
    const numbers = data.map((entry) => {
        return entry.passengers;
    })