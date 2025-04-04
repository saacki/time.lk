let currentSky = '';
let cachedSLTime = null;
let debugActive = false;
let tickingDebug = false;
let simulatedClientOffset = null;
let forceSLTDebug = false;
let aheadBehindDebug = false;
let aheadBehindLabel = '';
let persistentLabel = '';

function updateSriLankaTime() {
  const debugHandled = handleDebugModes();
  if (debugHandled) return;

  const fetchStart = Date.now();

  fetch(`https://app.time.lk/api?ts=${Date.now()}`)
    .then(response => response.json())
    .then(data => {
      const fetchEnd = Date.now();
      const delay = fetchEnd - fetchStart;

      cachedSLTime = new Date(
        data.year, data.month - 1, data.day,
        data.hour, data.minute, data.seconds
      );

      cachedSLTime = new Date(cachedSLTime.getTime() + delay / 2);

      renderSriLankaTime(cachedSLTime, debugActive);
    })
    .catch(() => {
      document.getElementById('sri-lanka-time').textContent = '--:--:--';
      document.getElementById('time-difference').textContent = 'Unable to fetch time.';
      document.body.classList.add('day', 'ready', 'debug');
      document.body.classList.remove('night');
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#f9d976');
      hideLoader();
    });
}

function handleDebugModes() {
  const params = new URLSearchParams(window.location.search);
  const debug = params.get('test');
  if (!debug) return false;

  debugActive = true;
  tickingDebug = false;
  forceSLTDebug = false;
  aheadBehindDebug = false;
  simulatedClientOffset = null;
  persistentLabel = '';

  const now = new Date();
  let simTime = new Date(now);

  if (debug === 'flip-day') {
    simTime.setHours(5, 59, 30, 0);
    tickingDebug = true;
    forceSLTDebug = true;
    persistentLabel = 'Live transition from night to day starting in 30s';
    renderSriLankaTime(simTime, true);
    return true;
  }

  if (debug === 'flip-night') {
    simTime.setHours(17, 59, 30, 0);
    tickingDebug = true;
    forceSLTDebug = true;
    persistentLabel = 'Live transition from day to night starting in 30s';
    renderSriLankaTime(simTime, true);
    return true;
  }

  if (debug === 'theme-day') {
    document.body.classList.add('day', 'ready', 'debug');
    document.body.classList.remove('night');
    document.getElementById('time-difference').textContent = 'Debug mode: Day theme forced';
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#f9d976');
    hideLoader();
    showDebugBanner();
    return true;
  }

  if (debug === 'theme-night') {
    document.body.classList.add('night', 'ready', 'debug');
    document.body.classList.remove('day');
    document.getElementById('time-difference').textContent = 'Debug mode: Night theme forced';
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#2c5364');
    generateStarrySky(22);
    hideLoader();
    showDebugBanner();
    return true;
  }

  if (debug === 'error') {
    document.getElementById('sri-lanka-time').textContent = '--:--:--';
    document.getElementById('time-difference').textContent = 'Debug mode: Simulated API error';
    document.body.classList.add('day', 'ready', 'debug');
    document.body.classList.remove('night');
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#f9d976');
    hideLoader();
    showDebugBanner();
    return true;
  }

  if (debug.startsWith('behind=')) {
    const offset = parseFloat(debug.split('=')[1]);
    simulatedClientOffset = -offset * 60;
    aheadBehindDebug = true;
    persistentLabel = `Sri Lanka is ${offset} hour(s) ahead of you.`;
    return false;
  }

  if (debug.startsWith('ahead=')) {
    const offset = parseFloat(debug.split('=')[1]);
    simulatedClientOffset = offset * 60;
    aheadBehindDebug = true;
    persistentLabel = `Sri Lanka is ${offset} hour(s) behind you.`;
    return false;
  }

  const fixedTimes = {
    day: 9,
    night: 22,
    static: 14
  };

  if (debug === 'slow') {
    forceSLTDebug = true;
    simTime.setHours(11, 30, 0, 0);
    persistentLabel = 'Simulating slow load';
    setTimeout(() => {
      renderSriLankaTime(simTime, true);
    }, 3000);
    return true;
  }
  
  if (debug === 'earth') {
  document.body.classList.remove('day', 'night');
  document.body.classList.add('debug');
  document.getElementById('loader')?.classList.remove('hidden');
  document.querySelector('.container')?.classList.remove('ready');
  return true;
}

  if (debug in fixedTimes) {
  simTime.setHours(fixedTimes[debug], 30, 0, 0);
  forceSLTDebug = true;
  persistentLabel = `Simulating ${debug} theme`;
  renderSriLankaTime(simTime, true);
  return true;
}

  return false;
}

function renderSriLankaTime(sriLankaTime, isDebug) {
  cachedSLTime = new Date(sriLankaTime);
  const hour = sriLankaTime.getHours();
  const minutes = String(sriLankaTime.getMinutes()).padStart(2, '0');
  const seconds = String(sriLankaTime.getSeconds()).padStart(2, '0');
  const ampm = hour >= 12 ? 'pm' : 'am';
  const displayHour = String((hour % 12 || 12)).padStart(2, '0');

  document.getElementById('sri-lanka-time').innerHTML =
    `${displayHour}:${minutes}:${seconds}<span class="ampm">${ampm}</span>`;

  setTheme(hour);
  generateStarrySky(hour);
  hideLoader();

  if (isDebug || aheadBehindDebug) {
    if (persistentLabel) {
      document.getElementById('time-difference').textContent = `Debug mode: ${persistentLabel}`;
    }
    showDebugBanner();
  } else {
    showTimeDifference(new Date());
  }
}

function setTheme(hour) {
  const isDay = hour >= 6 && hour < 18;
  document.body.classList.toggle('day', isDay);
  document.body.classList.toggle('night', !isDay);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', isDay ? '#f9d976' : '#2c5364');
}

function showTimeDifference(realClientTime) {
  const clientOffset = simulatedClientOffset !== null
    ? 330 - simulatedClientOffset
    : 330 + realClientTime.getTimezoneOffset();

  const hours = Math.floor(Math.abs(clientOffset) / 60);
  const minutes = Math.abs(clientOffset) % 60;
  const ahead = clientOffset > 0;
  const msg = clientOffset === 0
    ? "You're in the same timezone as Sri Lanka."
    : `Sri Lanka is ${hours} hour(s) and ${minutes} minute(s) ${ahead ? 'ahead' : 'behind'} of you.`;

  document.getElementById('time-difference').textContent = msg;
}

function generateStarrySky(hour) {
  const isNight = hour < 6 || hour >= 18;
  if (currentSky === (isNight ? 'night' : 'day')) return;
  currentSky = isNight ? 'night' : 'day';

  const sky = document.getElementById('sky-effects');
  sky.innerHTML = '';
  if (isNight) {
    for (let i = 0; i < 80; i++) {
      const star = document.createElement('div');
      star.className = 'star';
      star.style.top = `${Math.random() * 100}%`;
      star.style.left = `${Math.random() * 100}%`;
      star.style.animationDelay = `${Math.random() * 3}s`;
      star.style.opacity = Math.random() * 0.8 + 0.2;
      sky.appendChild(star);
    }
  }
}

function launchShootingStar() {
  if (!document.body.classList.contains('night')) return;
  const star = document.createElement('div');
  star.className = 'shooting-star';
  star.style.top = `${Math.random() * 60 + 10}%`;
  star.style.left = `${Math.random() * 100}%`;
  document.getElementById('sky-effects').appendChild(star);
  setTimeout(() => star.remove(), 1200);
}

function hideLoader() {
  document.getElementById('loader')?.classList.add('hidden');
  document.body.classList.add('ready');
}

function showDebugBanner() {
  document.getElementById('debug-banner').style.display = 'block';
  document.body.classList.add('debug');
}

setInterval(() => {
  if (!cachedSLTime) return;
  if (!debugActive || tickingDebug) {
    cachedSLTime.setSeconds(cachedSLTime.getSeconds() + 1);
    renderSriLankaTime(cachedSLTime, debugActive);
  }
}, 1000);

setInterval(() => {
  if (Math.random() > 0.6) launchShootingStar();
}, 4000);

updateSriLankaTime();
