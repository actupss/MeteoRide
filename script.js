async function getAll() {
  const url = "https://meteoride-im3.meteoride-im3.com/backend/api/getAll.php";
  try {
    const response = await fetch(url);
    const data = await response.json();
    console.log(data); // gibt die Daten der API in der Konsole aus
  } catch (error) {
    console.error(error);
  }
}

// Initialisiert das Chart.js-Liniendiagramm
const canvas = document.querySelector("#chart");
const ctx = canvas.getContext("2d");

new Chart(ctx, {
  type: "line",
  data: {
    labels: ["22.09.25", "23.09.25", "24.09.25", "Heute"],
    datasets: [
      {
        data: [200, 150, 180, 300],
        borderColor: "#000",
        fill: false,
        tension: 0.3,
        pointBackgroundColor: "#000",
      },
    ],
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: { display: false },
      y: { display: false },
    },
    plugins: {
      legend: { display: false },
      tooltip: { enabled: false },
    },
  },
});

async function getByDate(date) {
  const url = `https://meteoride-im3.meteoride-im3.com/backend/api/getByDate.php?date=${date}`;
  try {
    const response = await fetch(url);
    const data = await response.json();
    console.log(data); // gibt die Daten der API in der Konsole aus
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

let chart = null;

//////////////////////////--Verlinkung Google Maps Leipzig--//////////////////////
// Elemente
const leipzigBtn = document.getElementById("leipzigBtn");
const mapsOverlay = document.getElementById("mapsOverlay");
const returnBtn = document.getElementById("returnBtn");
const mapsFrame = document.getElementById("mapsFrame");
const chartContainer = document.querySelector(".chart-container"); // dein Chart

// Leipzig öffnen
leipzigBtn.addEventListener("click", () => {
  mapsFrame.src =
    "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d237546.53598567804!2d12.2827198!3d51.3301594!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x47a75b469ca74f47%3A0x67f2f71a86578b2d!2sLeipzig%2C%20Deutschland!5e0!3m2!1sde!2sde!4v1634567890123";
  mapsOverlay.classList.add("active");

  // Charts ausblenden (optional)
  chartContainer.style.opacity = "0.3";
});

// Zurück (Overlay schließen)
returnBtn.addEventListener("click", () => {
  mapsOverlay.classList.remove("active");
  mapsFrame.src = ""; // Iframe leeren
  chartContainer.style.opacity = "1";
});

// Hover-Effekt Charts
returnBtn.addEventListener("mouseenter", () => {
  if (!mapsOverlay.classList.contains("active")) {
    chartContainer.style.transform = "scale(1.05)";
  }
});
returnBtn.addEventListener("mouseleave", () => {
  chartContainer.style.transform = "scale(1)";
});
