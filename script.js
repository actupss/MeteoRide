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

getAll();

const datepicker =document.querySelector('#datepicker');
datepicker.addEventListener('change', function() {
  const date = datepicker.value;
  getByDate(date);
  console.log(date);
})

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

// Funktion, um aktuelle Uhrzeit in Leipzig anzuzeigen
function updateLeipzigTime() {
  const timeElement = document.querySelector('.time');

  // Aktuelle Zeit für Zeitzone "Europe/Berlin" (Leipzig)
  const now = new Date().toLocaleTimeString('de-DE', {
    timeZone: 'Europe/Berlin',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  timeElement.textContent = now;
}

// Beim Laden der Seite sofort ausführen
updateLeipzigTime();

// Jede Sekunde neu aktualisieren
setInterval(updateLeipzigTime, 1000);

function uhrzeit() {
    var jetzt = new Date(),
        h = jetzt.getHours(),
        m = jetzt.getMinutes(),
        s = jetzt.getSeconds();
    m = fuehrendeNull(m);
    s = fuehrendeNull(s);
    document.getElementById('uhr').innerHTML = h + ':' + m + ':' + s;
    setTimeout(uhrzeit, 500);
  }
  
  function fuehrendeNull(zahl) {
    zahl = (zahl < 10 ? '0' : '' )+ zahl;  
    return zahl;
  }