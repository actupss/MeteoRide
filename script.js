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
const bike = document.querySelector(".bike");
const chartBox = document.querySelector(".chart-container");

let isDragging = false;
let dragStartX = 0;
let bikeStartLeft = 0;

// Cards
const todayCard = document.getElementById("todayCard");
const todayTempValue = document.getElementById("todayTempValue");
const todayRainValue = document.getElementById("todayRainValue");
const todayBikesValue = document.getElementById("todayBikesValue");

const bikeCard = document.getElementById("bikeCard");
const bikeTempValue = document.getElementById("bikeTempValue");
const bikeRainValue = document.getElementById("bikeRainValue");
const bikeBikesValue = document.getElementById("bikeBikesValue");

let todayIndex = null; // Index von heute

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
    const base = labels.length - WINDOW_SIZE;
    slotIndex = startIndex - base;
  } else {
    slotIndex = startIndex;
  }

  const steps = Math.max(WINDOW_SIZE - 1, 1);
  const step = usableWidth / steps;
  const px = slotIndex * step;

  bike.style.left = `${px}px`;
}

// startIndex aus Pixel-Position
function startIndexFromPosition(px) {
  const total = labels.length;
  if (total === 0) return 0;

  const trackWidth = bikeTrack.clientWidth || 0;
  const bikeWidth = 60;
  const usableWidth = Math.max(trackWidth - bikeWidth, 1);

  const ratio = Math.min(Math.max(px / usableWidth, 0), 1);
  const slot = Math.round(ratio * (WINDOW_SIZE - 1));

  if (total > WINDOW_SIZE) {
    const base = labels.length - WINDOW_SIZE;
    return base + slot;
  } else {
    return Math.min(slot, total - 1);
  }
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
      updateBikeCardFromBikePosition();
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

    // Index von heute
    const today = new Date();
    const todayStr = `${String(today.getDate()).padStart(2, "0")}.${String(
      today.getMonth() + 1
    ).padStart(2, "0")}.${String(today.getFullYear()).slice(-2)}`;
    todayIndex = labels.indexOf(todayStr);
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
  positionTodayCard();
  updateBikeCardFromBikePosition();
}

// ---- Cards befüllen ----
function updateTodayCard() {
  if (
    labels.length === 0 ||
    !todayTempValue ||
    !todayRainValue ||
    !todayBikesValue
  )
    return;

  let idx =
    todayIndex !== null && todayIndex !== -1
      ? todayIndex
      : labels.length - 1;

  const t = tempData[idx];
  const r = rainData[idx];
  const b = bikesData[idx];

  todayTempValue.textContent = typeof t === "number" ? `${t}°` : "--°";
  todayRainValue.textContent = typeof r === "number" ? `${r}mm` : "0mm";
  todayBikesValue.textContent = typeof b === "number" ? b : "--";
}

// Position gelbe Card bei heute
function positionTodayCard() {
  if (!todayCard || labels.length === 0 || !chartBox) return;

  let idx =
    todayIndex !== null && todayIndex !== -1
      ? todayIndex
      : labels.length - 1;

  const containerWidth = chartBox.clientWidth || 0;
  const visibleCount = Math.min(WINDOW_SIZE, labels.length);

  // sicherstellen, dass Fenster heute enthält
  const endCurrent = Math.min(startIndex + WINDOW_SIZE, labels.length);
  if (idx < startIndex || idx >= endCurrent) {
    if (labels.length > WINDOW_SIZE) {
      startIndex = Math.max(
        0,
        Math.min(idx - (WINDOW_SIZE - 1), labels.length - WINDOW_SIZE)
      );
      const end = Math.min(startIndex + WINDOW_SIZE, labels.length);
      chart.data.labels = labels.slice(startIndex, end);
      chart.data.datasets[0].data = bikesData.slice(startIndex, end);
      chart.data.datasets[1].data = tempData.slice(startIndex, end);
      chart.update();
    } else {
      startIndex = 0;
    }
  }

  const steps = Math.max(visibleCount - 1, 1);
  const slot = idx - startIndex;
  const stepPx = containerWidth / steps;
  const x = slot * stepPx;

  todayCard.style.left = `${x}px`;
  todayCard.style.transform = "translateX(-50%)";
}

// Blaue Card anhand Bike-Position
function updateBikeCardFromBikePosition() {
  if (!bikeCard || labels.length === 0 || !chartBox) return;

  const containerWidth = chartBox.clientWidth || 0;
  const bikeRect = bike.getBoundingClientRect();
  const chartRect = chartBox.getBoundingClientRect();
  const relativeX = bikeRect.left + bikeRect.width / 2 - chartRect.left;

  const visibleCount = Math.min(WINDOW_SIZE, labels.length);
  const steps = Math.max(visibleCount - 1, 1);
  const stepPx = containerWidth / steps;

  let slot = Math.round(relativeX / stepPx);
  slot = Math.max(0, Math.min(visibleCount - 1, slot));

  const idx = startIndex + slot;

  // Werte für dieses Datum setzen (Max Bikes / Temp / Rain des Tages)
  const t = tempData[idx];
  const r = rainData[idx];
  const b = bikesData[idx];

  bikeTempValue.textContent = typeof t === "number" ? `${t}°` : "--°";
  bikeRainValue.textContent = typeof r === "number" ? `${r}mm` : "0mm";
  bikeBikesValue.textContent = typeof b === "number" ? b : "--";

  bikeCard.style.left = `${slot * stepPx}px`;
  bikeCard.style.transform = "translateX(-50%)";
}

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
  updateTodayCard();
  positionTodayCard();
  updateBikeCardFromBikePosition();
}

initChart();

window.addEventListener("resize", () => {
  updateBikeTrackLayout();
  positionFromStartIndex();
  positionTodayCard();
  updateBikeCardFromBikePosition();
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
