// ---- Globale Variablen ----
let chart = null;

let labels = [];
let bikesData = [];
let tempData = [];
let rainData = [];
let startIndex = 0;
const WINDOW_SIZE = 4; // immer 4 Tage sichtbar

// Elemente für Velo / Track
const bikeTrack = document.getElementById("bikeTrack");
const bike = document.querySelector(".bike");
const chartBox = document.querySelector(".chart-container");

let isDragging = false;
let dragStartX = 0;
let bikeStartLeft = 0;

// Elemente der Info-Card
const infoTempValue = document.getElementById("infoTempValue");
const infoRainValue = document.getElementById("infoRainValue");
const infoBikesValue = document.getElementById("infoBikesValue");

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

  let slotIndex;
  if (total > WINDOW_SIZE) {
    const base = labels.length - WINDOW_SIZE; // Startindex der letzten 4 Tage
    slotIndex = startIndex - base; // 0..3
  } else {
    slotIndex = startIndex; // 0..(total-1)
  }

  const steps = Math.max(WINDOW_SIZE - 1, 1);
  const step = usableWidth / steps;
  const px = slotIndex * step;

  bike.style.left = `${px}px`;
}

// startIndex aus Pixel-Position des Velos berechnen
function startIndexFromPosition(px) {
  const total = labels.length;
  if (total === 0) return 0;

  const trackWidth = bikeTrack.clientWidth || 0;
  const bikeWidth = 60;
  const usableWidth = Math.max(trackWidth - bikeWidth, 1);

  const ratio = Math.min(Math.max(px / usableWidth, 0), 1);
  const slot = Math.round(ratio * (WINDOW_SIZE - 1)); // 0..3

  if (total > WINDOW_SIZE) {
    const base = labels.length - WINDOW_SIZE;
    return base + slot; // globaler Index
  } else {
    return Math.min(slot, total - 1);
  }
}

// ---- Drag Events fürs Velo ----
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
    }
  });

  document.addEventListener("mouseup", () => {
    if (!isDragging) return;
    isDragging = false;
    document.body.style.userSelect = "";
  });
}

// ---- Daten aus getAll.php holen und vorbereiten ----
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
  } catch (error) {
    console.error(error);
  }
}

// ---- Chart.js-Initialisierung ----
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
}

// Info-Card mit aktuellsten Werten füllen
function updateInfoCardWithLatest() {
  if (
    labels.length === 0 ||
    !infoTempValue ||
    !infoRainValue ||
    !infoBikesValue
  ) {
    return;
  }

  const lastIndex = labels.length - 1;

  const latestTemp = tempData[lastIndex];
  const latestRain = rainData[lastIndex];
  const latestBikes = bikesData[lastIndex];

  infoTempValue.textContent =
    typeof latestTemp === "number" ? `${latestTemp}°` : "--°";

  infoRainValue.textContent =
    typeof latestRain === "number" ? `${latestRain}mm` : "0mm";

  infoBikesValue.textContent =
    typeof latestBikes === "number" ? latestBikes : "--";
}

async function initChart() {
  await getAll(); // füllt labels, bikesData, tempData, rainData

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
          ticks: { color: "#ffffff" },
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
  updateInfoCardWithLatest();
}

initChart();

window.addEventListener("resize", () => {
  updateBikeTrackLayout();
  positionFromStartIndex();
});

// ---- Weitere API-Funktionen (optional) ----
async function getByDate(date) {
  const url = `https://meteoride-im3.meteoride-im3.com/backend/api/getByDate.php?date=${date}`;
  try {
    const response = await fetch(url);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error(error);
    return [];
  }
}

async function getBy3Days() {
  const url = `https://meteoride-im3.meteoride-im3.com/backend/api/getBy3Days.php`;
  try {
    const response = await fetch(url);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error(error);
  }
}

// ---- Verlinkung Google Maps Leipzig ----
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
