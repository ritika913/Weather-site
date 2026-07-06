document.addEventListener("DOMContentLoaded", () => {
  const apiKey = "92547f910f29c4c0b1a901fdadbcf1c6"; // Your API key

  const weatherInfo = document.getElementById("weatherInfo");
  const forecast = document.getElementById("forecast");
  const loader = document.getElementById("loader");
  const cityInput = document.getElementById("cityInput");

  const menuSection = document.getElementById("menuSection");
  const weatherSection = document.getElementById("weatherSection");
  const themeLabel = document.getElementById("themeLabel");

  let lastLat = null;
  let lastLon = null;
  let forecastDataCache = null;
  let alertDataCache = null;

  // Theme Toggle Logic
  document.getElementById("themeSwitch").addEventListener("change", () => {
    const isDark = document.body.classList.toggle("dark");
    document.body.classList.toggle("light", !isDark);
    themeLabel.textContent = isDark ? "Dark Mode" : "Light Mode";
  });

  function showLoader() {
    loader.classList.remove("hidden");
  }

  function hideLoader() {
    loader.classList.add("hidden");
  }

  function getWeather() {
    const city = cityInput.value.trim();
    if (!city) return alert("Please enter a city name.");

    menuSection.classList.add("hidden");
    weatherSection.classList.remove("hidden");
    weatherInfo.innerHTML = "";
    forecast.innerHTML = "";
    forecast.classList.add("hidden");
    showLoader();

    const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric`;

    fetch(weatherUrl)
      .then(res => {
        if (!res.ok) throw new Error("City not found.");
        return res.json();
      })
      .then(data => {
        hideLoader();
        lastLat = data.coord.lat;
        lastLon = data.coord.lon;

        weatherInfo.innerHTML = `
          <img src="https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png" />
          <p><strong>${data.name}, ${data.sys.country}</strong></p>
          <p>${data.weather[0].main} (${data.weather[0].description})</p>
          <p>🌡️ Temp: ${data.main.temp} °C</p>
          <p>💧 Humidity: ${data.main.humidity}%</p>
          <p>🌬️ Wind: ${data.wind.speed} m/s</p>
        `;

        return Promise.all([
          fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${lastLat}&lon=${lastLon}&appid=${apiKey}&units=metric`),
          fetch(`https://api.openweathermap.org/data/2.5/onecall?lat=${lastLat}&lon=${lastLon}&exclude=minutely,hourly,daily&appid=${apiKey}&units=metric`),
          fetch(`https://api.openweathermap.org/data/2.5/air_pollution?lat=${lastLat}&lon=${lastLon}&appid=${apiKey}`)
        ]);
      })
      .then(async ([forecastRes, alertRes, airRes]) => {
        forecastDataCache = await forecastRes.json();
        alertDataCache = await alertRes.json();
        const airData = await airRes.json();

        const aqi = airData?.list?.[0]?.main?.aqi || 1;
        const uv = alertDataCache?.current?.uvi;

        weatherInfo.innerHTML += `<p>🧪 Air Quality: ${["Good", "Fair", "Moderate", "Poor", "Very Poor"][aqi - 1]}</p>`;
        weatherInfo.dataset.aqi = aqi;

        if (typeof uv !== "undefined") {
          weatherInfo.innerHTML += `<p>☀️ UV Index: ${uv}</p>`;
          weatherInfo.dataset.uv = uv;
        } else {
          weatherInfo.innerHTML += `<p style="color:red;">UV Index not available.</p>`;
          weatherInfo.dataset.uv = "0";
        }
      })
      .catch(err => {
        hideLoader();
        weatherInfo.innerHTML = `<p style="color:red;">${err.message}</p>`;
      });
  }

  function getLocation() {
    if (!navigator.geolocation) {
      alert("Geolocation not supported.");
      return;
    }

    showLoader();
    navigator.geolocation.getCurrentPosition((pos) => {
      lastLat = pos.coords.latitude;
      lastLon = pos.coords.longitude;

      menuSection.classList.add("hidden");
      weatherSection.classList.remove("hidden");

      const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lastLat}&lon=${lastLon}&appid=${apiKey}&units=metric`;

      fetch(weatherUrl)
        .then((res) => res.json())
        .then((data) => {
          hideLoader();
          weatherInfo.innerHTML = `
            <img src="https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png" />
            <p><strong>${data.name}, ${data.sys.country}</strong></p>
            <p>${data.weather[0].main} (${data.weather[0].description})</p>
            <p>🌡️ Temp: ${data.main.temp} °C</p>
            <p>💧 Humidity: ${data.main.humidity}%</p>
            <p>🌬️ Wind: ${data.wind.speed} m/s</p>
          `;
        });
    });
  }

  function showForecast() {
    if (!forecastDataCache) {
      alert("Please search for a city first.");
      return;
    }

    forecast.innerHTML = "<h2>5-Day Forecast</h2><div class='forecast-row'>";
    const days = {};
    forecastDataCache.list.forEach((item) => {
      const date = item.dt_txt.split(" ")[0];
      if (!days[date] && Object.keys(days).length < 5) {
        days[date] = `
          <div class="forecast-day">
            <p><strong>${new Date(date).toDateString()}</strong></p>
            <img src="https://openweathermap.org/img/wn/${item.weather[0].icon}.png" />
            <p>${item.weather[0].main}</p>
            <p>🌡️ ${item.main.temp} °C</p>
          </div>
        `;
      }
    });
    Object.values(days).forEach(card => forecast.innerHTML += card);
    forecast.innerHTML += "</div>";

    if (alertDataCache?.alerts?.length) {
      forecast.innerHTML += `<h2>⚠️ Weather Alerts</h2>`;
      alertDataCache.alerts.forEach(alert => {
        forecast.innerHTML += `
          <div class="forecast-day" style="background-color:#ffe0e0;">
            <p><strong>${alert.event}</strong></p>
            <p><em>${alert.sender_name}</em></p>
            <p>${alert.description}</p>
          </div>
        `;
      });
    }

    forecast.classList.remove("hidden");
    forecast.scrollIntoView({ behavior: "smooth" });
  }

  // Navigation Buttons
  document.getElementById("homeBtn").addEventListener("click", () => {
    location.reload();
  });

  document.getElementById("forecastBtn").addEventListener("click", showForecast);

  document.getElementById("radarBtn").addEventListener("click", () => {
    if (lastLat && lastLon) {
      forecast.classList.remove("hidden");
      forecast.innerHTML = `
        <h2>Live Radar</h2>
        <iframe
          src="https://openweathermap.org/weathermap?basemap=map&cities=true&layer=radar&lat=${lastLat}&lon=${lastLon}&zoom=6"
          width="100%" height="450" style="border:0;" allowfullscreen loading="lazy"
        ></iframe>`;
    } else {
      alert("Search for a city first to see radar data.");
    }
  });

  document.getElementById("airBtn").addEventListener("click", () => {
    if (lastLat && lastLon) {
      const aqi = parseInt(weatherInfo.dataset.aqi || 1);
      const levels = ["Good", "Fair", "Moderate", "Poor", "Very Poor"];
      forecast.classList.remove("hidden");
      forecast.innerHTML = `
        <h2>Air Quality Index</h2>
        <p>AQI Level: <strong>${levels[aqi - 1]} (${aqi})</strong></p>
      `;
    } else {
      alert("Search for a city first.");
    }
  });

  document.getElementById("healthBtn").addEventListener("click", () => {
    if (lastLat && lastLon) {
      forecast.classList.remove("hidden");

      const temp = parseFloat(weatherInfo.innerText.match(/Temp: ([\d.]+)/)?.[1]) || 25;
      const humidity = parseFloat(weatherInfo.innerText.match(/Humidity: ([\d.]+)/)?.[1]) || 50;
      const uv = parseFloat(weatherInfo.dataset.uv || 0);
      const aqi = parseInt(weatherInfo.dataset.aqi || 1);

      let tips = [];
      if (temp > 35) tips.push("☀️ Stay hydrated and avoid going out in peak afternoon.");
      if (humidity > 70) tips.push("💦 High humidity – wear breathable fabrics.");
      if (uv >= 6) tips.push("🧴 Use sunscreen. UV index is high.");
      if (aqi >= 4) tips.push("😷 Poor air quality – consider a mask outdoors.");
      if (temp < 10) tips.push("🧥 It's chilly. Dress warmly.");
      if (tips.length === 0) tips.push("✅ Weather conditions are good. Enjoy your day!");

      forecast.innerHTML = `
        <h2>Health Tips Based on Current Weather</h2>
        <ul style="text-align:left;">${tips.map(t => `<li>${t}</li>`).join("")}</ul>
      `;
    } else {
      alert("Search for a city first.");
    }
  });

  // Expose for HTML use
  window.getWeather = getWeather;
  window.getLocation = getLocation;
});
