// ---- Globale Variablen ----
let chart = null;

let labels = [];
let bikesData = [];
let tempData = [];
let rainData = [];

// Fenstergröße: Desktop/Tablet = 4, Mobile = 2
let WINDOW_SIZE = getWindowSizeForScreen();

let startIndex = 0;

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

// Label-Spans
const todayLabelEl = todayCard.querySelector(".info-bikes-label");
const yesterdayLabelEl = yesterdayCard.querySelector(".info-bikes-label");
const pastLabelEl = pastCard.querySelector(".info-bikes-label");
const oldLabelEl = oldCard.querySelector(".info-bikes-label");

// Index für "heute"
let todayIndex = null;

// ---- Fenstergröße abhängig von der Bildschirmbreite ----
function getWindowSizeForScreen() {
  const w = window.innerWidth || document.documentElement.clientWidth;
  // Mobile: bis 767 px -> 2 Tage, sonst 4 Tage
  return w <= 767 ? 2 : 4;
}

// ---- Track an Chart-Breite anpassen ----
function updateBikeTrackLayout() {
  if (!chartBox || !bikeTrack) return;
  const rect = chartBox.getBoundingClientRect();
  bikeTrack.style.left = rect.left + "px";
  bikeTrack.style.width = rect.width + "px";
}

// ---- Velo-Position aus startIndex ableiten ----
function positionFromStartIndex() {
  const total = labels.length;
  if (!bike || !bikeTrack || total === 0) return;

  const trackWidth = bikeTrack.clientWidth || 0;
  const bikeWidth = 60;
  const usableWidth = Math.max(trackWidth - bikeWidth, 0);

  const maxStart = Math.max(total - WINDOW_SIZE, 1);
  const ratio = maxStart > 0 ? startIndex / maxStart : 0;
  const px = ratio * usableWidth;

  bike.style.left = `${px}px`;
}

// ---- startIndex aus Pixel-Position ----
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

// ---- Temperatur → Card-Klasse ----
function getCardClassForTemp(temp) {
  if (temp == null || isNaN(temp)) return null;

  if (temp < 0) return "light-card";
  if (temp < 10) return "past-card";
  if (temp < 20) return "blue-card";
  return "today-card";
}

// ---- Drag fürs Velo (Desktop) ----
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
      updateChartWindow();
    }
  });

  document.addEventListener("mouseup", () => {
    if (!isDragging) return;
    isDragging = false;
    document.body.style.userSelect = "";
  });
}

// ---- Touch-Drag fürs Velo (Handy/Tablet) ----
if (bike && bikeTrack) {
  bike.addEventListener("touchstart", (e) => {
    const touch = e.touches[0];
    isDragging = true;
    dragStartX = touch.clientX;
    bikeStartLeft = parseFloat(getComputedStyle(bike).left) || 0;
    document.body.style.userSelect = "none";
    e.preventDefault();
  });

  document.addEventListener("touchmove", (e) => {
    if (!isDragging) return;
    const touch = e.touches[0];

    const dx = touch.clientX - dragStartX;
    const trackWidth = bikeTrack.clientWidth || 0;
    const bikeWidth = 60;
    const maxOffset = Math.max(trackWidth - bikeWidth, 0);

    let newLeft = bikeStartLeft + dx;
    newLeft = Math.max(0, Math.min(maxOffset, newLeft));
    bike.style.left = `${newLeft}px`;

    const newStart = startIndexFromPosition(newLeft);
    if (newStart !== startIndex && chart) {
      startIndex = newStart;
      updateChartWindow();
    }

    e.preventDefault();
  });

  document.addEventListener("touchend", () => {
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

      const validBikes = day.bikes.filter((v) => Number.isFinite(v));
      const validTemps = day.temps.filter((v) => Number.isFinite(v));
      const validRain = day.rain.filter((v) => Number.isFinite(v));

      if (
        validBikes.length === 0 &&
        validTemps.length === 0 &&
        validRain.length === 0
      ) {
        return;
      }

      const maxBikes = validBikes.length > 0 ? Math.max(...validBikes) : 0;

      const avgTemp =
        validTemps.length > 0
          ? validTemps.reduce((sum, t) => sum + t, 0) / validTemps.length
          : null;

      const avgRain =
        validRain.length > 0
          ? validRain.reduce((sum, r) => sum + r, 0) / validRain.length
          : 0;

      const d = new Date(date);
      const dd = String(d.getDate()).padStart(2, "0");
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const yy = String(d.getFullYear()).slice(-2);

      labels.push(`${dd}.${mm}.${yy}`);
      bikesData.push(maxBikes);
      tempData.push(avgTemp !== null ? Number(avgTemp.toFixed(1)) : null);
      rainData.push(Number(avgRain.toFixed(1)));
    });

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

function getWindowData() {
  const end = Math.min(startIndex + WINDOW_SIZE, labels.length);
  return {
    labels: labels.slice(startIndex, end),
    bikes: bikesData.slice(startIndex, end),
    temps: tempData.slice(startIndex, end),
    rains: rainData.slice(startIndex, end),
  };
}

// ---- Helper für Werte + Label-Text ----
function setCardValues(idx, cardEl, tempEl, rainEl, bikesEl, labelEl) {
  const t = tempData[idx];
  const r = rainData[idx];
  const b = bikesData[idx];

  tempEl.textContent = Number.isFinite(t) ? `${t}°` : "--°";
  rainEl.textContent = Number.isFinite(r) ? `${r}mm` : "0mm";
  bikesEl.textContent = Number.isFinite(b) ? b : "--";

  if (cardEl && Number.isFinite(t)) {
    cardEl.classList.remove(
      "today-card",
      "blue-card",
      "past-card",
      "light-card"
    );
    const cls = getCardClassForTemp(t);
    if (cls) cardEl.classList.add(cls);
  }

  if (labelEl) {
    if (idx === todayIndex) {
      labelEl.textContent = "Aktuell gebuchte Fahrräder";
    } else {
      labelEl.textContent = "Total gebuchte Fahrräder";
    }
  }
}

// ---- Cards positionieren ----
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

  card.style.display = "flex";

  // Faktor < 1 → Cards näher zusammen (Handy enger)
  const marginFactor = window.innerWidth <= 767 ? 0.6 : 0.85;
  const innerWidth = containerWidth * marginFactor;
  const offset = (containerWidth - innerWidth) / 2;

  const stepPx = innerWidth / steps;
  const x = offset + slot * stepPx;
  const centerX = x;

  card.style.left = `${centerX}px`;
  card.style.transform = "translateX(-50%)";
}

// ---- Cards aktualisieren ----
function positionAllCards() {
  if (labels.length === 0) return;

  const idx0 = startIndex;
  const idx1 = startIndex + 1;
  const idx2 = startIndex + 2;
  const idx3 = startIndex + 3;

  if (idx0 >= 0 && idx0 < labels.length) {
    setCardValues(
      idx0,
      todayCard,
      todayTempValue,
      todayRainValue,
      todayBikesValue,
      todayLabelEl
    );
    positionCardAtIndex(todayCard, idx0);
  } else {
    todayCard.style.display = "none";
  }

  if (idx1 >= 0 && idx1 < labels.length) {
    setCardValues(
      idx1,
      yesterdayCard,
      yesterdayTempValue,
      yesterdayRainValue,
      yesterdayBikesValue,
      yesterdayLabelEl
    );
    positionCardAtIndex(yesterdayCard, idx1);
  } else {
    yesterdayCard.style.display = "none";
  }

  if (idx2 >= 0 && idx2 < labels.length) {
    setCardValues(
      idx2,
      pastCard,
      pastTempValue,
      pastRainValue,
      pastBikesValue,
      pastLabelEl
    );
    positionCardAtIndex(pastCard, idx2);
  } else {
    pastCard.style.display = "none";
  }

  if (idx3 >= 0 && idx3 < labels.length) {
    setCardValues(
      idx3,
      oldCard,
      oldTempValue,
      oldRainValue,
      oldBikesValue,
      oldLabelEl
    );
    positionCardAtIndex(oldCard, idx3);
  } else {
    oldCard.style.display = "none";
  }
}

// ---- Chart-Fenster aktualisieren (Labels + Daten) ----
function updateChartWindow() {
  if (!chart) return;

  const win = getWindowData();
  chart.data.labels = win.labels;
  chart.data.datasets[0].data = win.bikes;
  chart.data.datasets[1].data = win.temps;
  chart.update();

  positionAllCards();
}

// ---- Initiales Setup des Charts ----
async function initChart() {
  // Fenstergröße abhängig von der aktuellen Breite setzen
  WINDOW_SIZE = getWindowSizeForScreen();

  await getAll();

  if (labels.length === 0) return;

  if (todayIndex === -1) {
    startIndex = Math.max(labels.length - WINDOW_SIZE, 0);
  } else {
    startIndex = todayIndex - (WINDOW_SIZE - 1);
    if (startIndex < 0) startIndex = 0;
    if (startIndex > labels.length - WINDOW_SIZE) {
      startIndex = Math.max(labels.length - WINDOW_SIZE, 0);
    }
  }

  const win = getWindowData();

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
            font: {
              size: 12,
              family: "Poppins",
              weight: "400",
            },
            padding: 4,
            align: "center",
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
              const b = bikesData[globalIndex];
              const t = tempData[globalIndex];
              const r = rainData[globalIndex];

              return [
                `Bikes: ${Number.isFinite(b) ? b : "--"}`,
                `Temp: ${Number.isFinite(t) ? t + "°" : "--°"}`,
                `Regen: ${Number.isFinite(r) ? r + " mm" : "0 mm"}`,
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

// ---- Resize-Handler: WINDOW_SIZE + Layout anpassen ----
window.addEventListener("resize", () => {
  const newWindowSize = getWindowSizeForScreen();

  // Nur neu berechnen, wenn sich 2 vs. 4 Tage ändert
  if (newWindowSize !== WINDOW_SIZE) {
    WINDOW_SIZE = newWindowSize;

    if (labels.length > 0) {
      startIndex = Math.max(labels.length - WINDOW_SIZE, 0);
      updateChartWindow();
      positionFromStartIndex();
    }
  }

  updateBikeTrackLayout();
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
