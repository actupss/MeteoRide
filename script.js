// ---- Globale Variablen ----
let chart = null;

let labels = [];
let bikesData = [];
let tempData = [];
let rainData = [];
let startIndex = 0;
const WINDOW_SIZE = 4; // immer 4 Tage sichtbar

// ---- Elemente für Velo / Track ----
const bikeTrack = document.getElementById("bikeTrack");
const bike = document.querySelector(".bike");
const chartBox = document.querySelector(".chart-container");

let isDragging = false;
let dragStartX = 0;
let bikeStartLeft = 0;

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
  if (!bike || !bikeTrack || total <= WINDOW_SIZE) return;

  const maxStart = total - WINDOW_SIZE;
  const ratio = maxStart > 0 ? startIndex / maxStart : 0; // 0..1
  const trackWidth = bikeTrack.clientWidth || 0;
  const bikeWidth = 60;
  const maxOffset = Math.max(trackWidth - bikeWidth, 0);
  const px = ratio * maxOffset;
  bike.style.left = `${px}px`;
}

// startIndex aus Pixel-Position berechnen
function startIndexFromPosition(px) {
  const total = labels.length;
  if (total <= WINDOW_SIZE) return 0;

  const maxStart = total - WINDOW_SIZE;
  const trackWidth = bikeTrack.clientWidth || 0;
  const bikeWidth = 60;
  const maxOffset = Math.max(trackWidth - bikeWidth, 1);

  const ratio = Math.min(Math.max(px / maxOffset, 0), 1);
  return Math.round(ratio * maxStart);
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
    if (newStart !== startIndex) {
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
      const date = row.timestamp.slice(0, 10); // "2025-10-04"
      if (!byDate[date]) {
        byDate[date] = { temps: [], bikes: [], rain: [] };
      }
      byDate[date].temps.push(Number(row.temperature));
      byDate[date].bikes.push(Number(row.booked_bikes));
      byDate[date].rain.push(Number(row.rain));
    });

    const allDates = Object.keys(byDate).sort(); // alle Tage chronologisch
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

// ---- Chart.js-Initialisierung mit Fenster von 4 Tagen ----
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
    // neuere Tage
    if (startIndex + WINDOW_SIZE < labels.length) {
      startIndex += WINDOW_SIZE;
    }
  } else if (direction === "right") {
    // ältere Tage
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

async function initChart() {
  await getAll(); // füllt labels, bikesData, tempData, rainData

  // Start: die 4 neuesten Tage
  if (labels.length > WINDOW_SIZE) {
    startIndex = labels.length - WINDOW_SIZE;
  } else {
    startIndex = 0;
  }

  /*const bikeTrack = document.getElementById("bikeTrack");

  const bike = document.querySelector(".bike");

  let isDragging = false;
  let dragStartX = 0;
  let bikeStartLeft = 0;

  function positionFromStartIndex() {
    const total = labels.length;
    if (!bike || total <= WINDOW_SIZE) return;

    const maxStart = total - WINDOW_SIZE;
    const ratio = startIndex / maxStart; // 0..1
    const sliderWidth = bikeSlider.clientWidth;
    const bikeWidth = 60; // geschätzt
    const maxOffset = sliderWidth - bikeWidth;
    const px = ratio * maxOffset;
    bike.style.left = `${px}px`;
  }

  function startIndexFromPosition(px) {
    const total = labels.length;
    if (total <= WINDOW_SIZE) return 0;

    const maxStart = total - WINDOW_SIZE;
    const sliderWidth = bikeSlider.clientWidth;
    const bikeWidth = 60;
    const maxOffset = sliderWidth - bikeWidth;

    const ratio = Math.min(Math.max(px / maxOffset, 0), 1);
    return Math.round(ratio * maxStart);
  }

  // ---- Drag Events ----
  bike.addEventListener("mousedown", (e) => {
    isDragging = true;
    dragStartX = e.clientX;
    bikeStartLeft = parseFloat(getComputedStyle(bike).left) || 0;
    document.body.style.userSelect = "none";
  });

  document.addEventListener("mousemove", (e) => {
    if (!isDragging) return;

    const dx = e.clientX - dragStartX;
    const sliderWidth = bikeSlider.clientWidth;
    const bikeWidth = 60;
    const maxOffset = sliderWidth - bikeWidth;

    let newLeft = bikeStartLeft + dx;
    newLeft = Math.max(0, Math.min(maxOffset, newLeft));
    bike.style.left = `${newLeft}px`;

    // Chart‑Fenster passend verschieben
    const newStart = startIndexFromPosition(newLeft);
    if (newStart !== startIndex) {
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
  });*/

  /*
bikeSlider.addEventListener("click", (event) => {
  const rect = bikeSlider.getBoundingClientRect();
  const x = event.clientX - rect.left;

  if (x < rect.width / 2) {
    updateChartWindow("right"); // nach links fahren → ältere Tage
  } else {
    updateChartWindow("left");  // nach rechts fahren → neuere Tage
  }
}); */

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
}

initChart();

window.addEventListener("resize", () => {
  updateBikeTrackLayout();
  positionFromStartIndex();
});

// ---- Weitere API-Funktionen (falls später gebraucht) ----
async function getByDate(date) {
  const url = `https://meteoride-im3.meteoride-im3.com/backend/api/getByDate.php?date=${date}`;
  try {
    const response = await fetch(url);
    const data = await response.json();
    console.log(data);
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
const chartContainer = document.querySelector(".chart-container");

leipzigBtn.addEventListener("click", () => {
  mapsFrame.src =
    "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d237546.53598567804!2d12.2827198!3d51.3301594!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x47a75b469ca74f47%3A0x67f2f71a86578b2d!2sLeipzig%2C%20Deutschland!5e0!3m2!1sde!2sde!4v1634567890123";
  mapsOverlay.classList.add("active");
  chartContainer.style.opacity = "0.3";
});

returnBtn.addEventListener("click", () => {
  mapsOverlay.classList.remove("active");
  mapsFrame.src = "";
  chartContainer.style.opacity = "1";
});

returnBtn.addEventListener("mouseenter", () => {
  if (!mapsOverlay.classList.contains("active")) {
    chartContainer.style.transform = "scale(1.05)";
  }
});

returnBtn.addEventListener("mouseleave", () => {
  chartContainer.style.transform = "scale(1)";
});

// ---- Aktuelle Uhrzeit anzeigen und jede Sekunde aktualisieren ----
function updateTime() {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, "0");
  const m = String(now.getMinutes()).padStart(2, "0");
  const timeString = `${h}:${m}`;
  document.getElementById("currentTime").textContent = timeString;
}

updateTime();
setInterval(updateTime, 1000);
