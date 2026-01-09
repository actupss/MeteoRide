// ---- Globale Variablen ----
let chart = null;

let labels = [];
let bikesData = [];
let tempData = [];
let rainData = [];
let startIndex = 0;
const WINDOW_SIZE = 4;

// Velo / Track
const bikeTrack = document.getElementById("bikeTrack");
const bike = document.querySelector(".bike-img");
const chartBox = document.querySelector(".chart-container");

let isDragging = false;
let dragStartX = 0;
let bikeStartLeft = 0;

// Cards
const todayCard = document.getElementById("todayCard");
const todayTempValue = document.getElementById("todayTempValue");
const todayRainValue = document.getElementById("todayRainValue");
const todayBikesValue = document.getElementById("todayBikesValue");

const yesterdayCard = document.getElementById("yesterdayCard");
const yesterdayTempValue = document.getElementById("yesterdayTempValue");
const yesterdayRainValue = document.getElementById("yesterdayRainValue");
const yesterdayBikesValue = document.getElementById("yesterdayBikesValue");

const pastCard = document.getElementById("pastCard");
const pastTempValue = document.getElementById("pastTempValue");
const pastRainValue = document.getElementById("pastRainValue");
const pastBikesValue = document.getElementById("pastBikesValue");

const oldCard = document.getElementById("oldCard");
const oldTempValue = document.getElementById("oldTempValue");
const oldRainValue = document.getElementById("oldRainValue");
const oldBikesValue = document.getElementById("oldBikesValue");

// „Heute“ = neuester Tag im Datensatz
let todayIndex = null;
// Aktiver Tag unter dem Velo
let activeIndex = null;

// Track an Chart-Breite anpassen
function updateBikeTrackLayout() {
  if (!chartBox || !bikeTrack) return;
  const rect = chartBox.getBoundingClientRect();
  bikeTrack.style.left = rect.left + "px";
  bikeTrack.style.width = rect.width + "px";
}

// Velo-Position aus startIndex ableiten
function positionFromStartIndex() {
  const total = labels.length;
  if (!bike || !bikeTrack || total === 0) return;

  const trackWidth = bikeTrack.clientWidth || 0;
  const bikeWidth = 60;
  const usableWidth = Math.max(trackWidth - bikeWidth, 0);

  const maxStart = Math.max(total - WINDOW_SIZE, 1);
  const ratio = maxStart > 0 ? startIndex / maxStart : 0; // 0..1
  const px = ratio * usableWidth;

  bike.style.left = `${px}px`;
}

// startIndex aus Pixel-Position ableiten
function startIndexFromPosition(px) {
  const total = labels.length;
  if (total === 0) return 0;

  const trackWidth = bikeTrack.clientWidth || 0;
  const bikeWidth = 60;
  const usableWidth = Math.max(trackWidth - bikeWidth, 1);

  const ratio = Math.min(Math.max(px / usableWidth, 0), 1);

  let newIndex = Math.round(ratio * (total - 1));
  newIndex = Math.min(newIndex, Math.max(total - WINDOW_SIZE, 0));

  return newIndex;
}

// ---- Drag fürs Velo ----
if (bike && bikeTrack) {
  bike.addEventListener("mousedown", (e) => {
    isDragging = true;
    dragStartX = e.clientX;
    bikeStartLeft = parseFloat(getComputedStyle(bike).left) || 0;
    document.body.style.userSelect = "none";
  });

  document.addEventListener("mousemove", (e) => {
    if (!isDragging) return;

    const dx = e.clientX - dragStartX;
    const trackWidth = bikeTrack.clientWidth || 0;
    const bikeWidth = 60;
    const maxOffset = Math.max(trackWidth - bikeWidth, 0);

    let newLeft = bikeStartLeft + dx;
    newLeft = Math.max(0, Math.min(maxOffset, newLeft));
    bike.style.left = `${newLeft}px`;

    const newStart = startIndexFromPosition(newLeft);
    if (newStart !== startIndex && chart) {
      startIndex = newStart;
      const end = Math.min(startIndex + WINDOW_SIZE, labels.length);
      chart.data.labels = labels.slice(startIndex, end);
      chart.data.datasets[0].data = bikesData.slice(startIndex, end);
      chart.data.datasets[1].data = tempData.slice(startIndex, end);
      chart.update();

      // activeIndex aus Bike-Position bestimmen (relativ zum Fenster)
      const visibleCount = Math.min(WINDOW_SIZE, labels.length);
      const steps = Math.max(visibleCount - 1, 1);
      const containerWidth = chartBox.clientWidth || 0;
      const stepPx = containerWidth / steps;
      const bikeRect = bike.getBoundingClientRect();
      const chartRect = chartBox.getBoundingClientRect();
      const relativeX = bikeRect.left + bikeRect.width / 2 - chartRect.left;

      let slot = Math.round(relativeX / stepPx);
      slot = Math.max(0, Math.min(visibleCount - 1, slot));
      activeIndex = startIndex + slot;

      positionAllCards();
    }
  });

  document.addEventListener("mouseup", () => {
    if (!isDragging) return;
    isDragging = false;
    document.body.style.userSelect = "";
  });
}

// ---- Daten aus getAll.php holen ----
async function getAll() {
  const url = "https://meteoride-im3.meteoride-im3.com/backend/api/getAll.php";
  try {
    const response = await fetch(url);
    const rawData = await response.json();

    const byDate = {};
    rawData.forEach((row) => {
      const date = row.timestamp.slice(0, 10);
      if (!byDate[date]) {
        byDate[date] = { temps: [], bikes: [], rain: [] };
      }
      byDate[date].temps.push(Number(row.temperature));
      byDate[date].bikes.push(Number(row.booked_bikes));
      byDate[date].rain.push(Number(row.rain));
    });

    const allDates = Object.keys(byDate).sort();

    labels = [];
    bikesData = [];
    tempData = [];
    rainData = [];

    allDates.forEach((date) => {
      const day = byDate[date];
      const maxBikes = Math.max(...day.bikes);
      const avgTemp =
        day.temps.reduce((sum, t) => sum + t, 0) / day.temps.length;
      const avgRain = day.rain.reduce((sum, r) => sum + r, 0) / day.rain.length;

      const d = new Date(date);
      const dd = String(d.getDate()).padStart(2, "0");
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const yy = String(d.getFullYear()).slice(-2);

      labels.push(`${dd}.${mm}.${yy}`);
      bikesData.push(maxBikes);
      tempData.push(Number(avgTemp.toFixed(1)));
      rainData.push(Number(avgRain.toFixed(1)));
    });

    // „Heute“ = neuester Tag in den Daten
    todayIndex = labels.length - 1;
    activeIndex = todayIndex;
  } catch (error) {
    console.error(error);
  }
}

// ---- Chart.js ----
const canvas = document.querySelector("#chart");
const ctx = canvas.getContext("2d");

function getWindow() {
  const end = Math.min(startIndex + WINDOW_SIZE, labels.length);
  return {
    labels: labels.slice(startIndex, end),
    bikes: bikesData.slice(startIndex, end),
    temps: tempData.slice(startIndex, end),
    rains: rainData.slice(startIndex, end),
  };
}

function updateChartWindow(direction) {
  if (direction === "left") {
    if (startIndex + WINDOW_SIZE < labels.length) {
      startIndex += WINDOW_SIZE;
    }
  } else if (direction === "right") {
    if (startIndex - WINDOW_SIZE >= 0) {
      startIndex -= WINDOW_SIZE;
    }
  }

  const end = Math.min(startIndex + WINDOW_SIZE, labels.length);
  chart.data.labels = labels.slice(startIndex, end);
  chart.data.datasets[0].data = bikesData.slice(startIndex, end);
  chart.data.datasets[1].data = tempData.slice(startIndex, end);
  chart.update();
  positionAllCards();
}

// ---- Helper für Werte ----
function setCardValues(idx, tempEl, rainEl, bikesEl) {
  const t = tempData[idx];
  const r = rainData[idx];
  const b = bikesData[idx];

  tempEl.textContent = typeof t === "number" ? `${t}°` : "--°";
  rainEl.textContent = typeof r === "number" ? `${r}mm` : "0mm";
  bikesEl.textContent = typeof b === "number" ? b : "--";
}

// generische Positionsfunktion für eine Card
function positionCardAtIndex(card, idx) {
  if (!card || labels.length === 0 || !chartBox) return;

  const containerWidth = chartBox.clientWidth || 0;
  const visibleCount = Math.min(WINDOW_SIZE, labels.length);
  const steps = Math.max(visibleCount - 1, 1);
  const slot = idx - startIndex;

  if (slot < 0 || slot >= visibleCount) {
    card.style.display = "none";
    return;
  }

  const stepPx = containerWidth / steps;
  const x = slot * stepPx;

  card.style.left = `${x}px`;
  card.style.transform = "translateX(-50%)";
card.style.display = "flex";

}

// ---- Cards aktualisieren abhängig vom aktiven Tag ----
function positionAllCards() {
  if (!labels.length || !chartBox) return;

  // Fallback: wenn noch kein activeIndex gesetzt ist, nimm den neuesten Tag
  if (activeIndex === null) {
    activeIndex = labels.length - 1;
  }

  const newestIdx = labels.length - 1;

  todayCard.style.display = "none";
  yesterdayCard.style.display = "none";
  pastCard.style.display = "none";
  oldCard.style.display = "none";

  const idx0 = activeIndex;
  const idx1 = activeIndex - 1;
  const idx2 = activeIndex - 2;
  const idx3 = activeIndex - 3;

  const showCard = (card, tEl, rEl, bEl, idx) => {
    if (idx < 0 || idx >= labels.length) return;
    setCardValues(idx, tEl, rEl, bEl);
    positionCardAtIndex(card, idx);
  };

  // Velo auf neuestem Datum → 4 Balken (sofern vorhanden)
  if (activeIndex === newestIdx) {
    showCard(todayCard, todayTempValue, todayRainValue, todayBikesValue, idx0);
    showCard(
      yesterdayCard,
      yesterdayTempValue,
      yesterdayRainValue,
      yesterdayBikesValue,
      idx1
    );
    showCard(pastCard, pastTempValue, pastRainValue, pastBikesValue, idx2);
    showCard(oldCard, oldTempValue, oldRainValue, oldBikesValue, idx3);
    return;
  }

  // Velo auf vorletztem Datum → 3 Balken (aktiv + 2 ältere)
  if (activeIndex === newestIdx - 1) {
    showCard(
      yesterdayCard,
      yesterdayTempValue,
      yesterdayRainValue,
      yesterdayBikesValue,
      idx0
    );
    showCard(pastCard, pastTempValue, pastRainValue, pastBikesValue, idx1);
    showCard(oldCard, oldTempValue, oldRainValue, oldBikesValue, idx2);
    return;
  }

  // Velo auf drittletztem Datum → 2 Balken
  if (activeIndex === newestIdx - 2) {
    showCard(
      pastCard,
      pastTempValue,
      pastRainValue,
      pastBikesValue,
      idx0
    );
    showCard(oldCard, oldTempValue, oldRainValue, oldBikesValue, idx1);
    return;
  }

  // Velo auf viertletztem oder älter → nur ein Balken
  showCard(oldCard, oldTempValue, oldRainValue, oldBikesValue, idx0);
}

// ---- Initialisierung ----
async function initChart() {
  await getAll();

  if (labels.length > WINDOW_SIZE) {
    startIndex = labels.length - WINDOW_SIZE;
  } else {
    startIndex = 0;
  }

  const win = getWindow();

  chart = new Chart(ctx, {
    type: "line",
    data: {
      labels: win.labels,
      datasets: [
        {
          label: "Gebuchte Bikes",
          data: win.bikes,
          borderColor: "#000000",
          fill: false,
          tension: 0.3,
          pointRadius: 0,
        },
        {
          label: "Temperatur",
          data: win.temps,
          borderColor: "#ff4b5c",
          fill: false,
          tension: 0.3,
          pointRadius: 0,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            color: "#ffffff",
            font: { size: 12 },
          },
        },
        y: {
          grid: { display: false },
          ticks: { display: false },
        },
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const globalIndex = startIndex + ctx.dataIndex;
              return [
                `Bikes: ${bikesData[globalIndex]}`,
                `Temp: ${tempData[globalIndex]}°`,
                `Regen: ${rainData[globalIndex]} mm`,
              ];
            },
          },
        },
      },
    },
  });

  updateBikeTrackLayout();
  positionFromStartIndex();
  positionAllCards();
}

initChart();

window.addEventListener("resize", () => {
  updateBikeTrackLayout();
  positionFromStartIndex();
  positionAllCards();
});

// ---- Maps ----
const leipzigBtn = document.getElementById("leipzigBtn");
const mapsOverlay = document.getElementById("mapsOverlay");
const returnBtn = document.getElementById("returnBtn");
const mapsFrame = document.getElementById("mapsFrame");

leipzigBtn.addEventListener("click", () => {
  mapsFrame.src =
    "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d237546.53598567804!2d12.2827198!3d51.3301594!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x47a75b469ca74f47%3A0x67f2f71a86578b2d!2sLeipzig%2C%20Deutschland!5e0!3m2!1sde!2sde!4v1634567890123";
  mapsOverlay.classList.add("active");
});

returnBtn.addEventListener("click", () => {
  mapsOverlay.classList.remove("active");
  mapsFrame.src = "";
});

// ---- Aktuelle Uhrzeit ----
function updateTime() {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, "0");
  const m = String(now.getMinutes()).padStart(2, "0");
  const timeString = `${h}:${m}`;
  document.getElementById("currentTime").textContent = timeString;
}

updateTime();
setInterval(updateTime, 1000);