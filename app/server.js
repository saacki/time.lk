// js version 2.0.0
const express = require('express');
const app = express();
const fetch = require('node-fetch');
const fs = require('fs');

let currentTime = null;
let fetchFailures = 0;
let lastSyncTime = null;
let lastUsedAPI = null;
const startTime = Date.now();

// Logger
const logStream = fs.createWriteStream('./log.txt', { flags: 'a' });
const serverTimeString = () => new Date().toLocaleString('en-GB');

console.log = (...args) => {
  const message = `[${serverTimeString()}] ${args.join(' ')}\n`;
  logStream.write(message);
  process.stdout.write(message);
};
console.error = console.log;

function logHeartbeat(message) {
  process.stdout.write(`[${serverTimeString()}] ${message}\n`);
}

// --- API FETCHERS ---

async function fetchFromWorldTimeAPI() {
  const res = await fetch('https://worldtimeapi.org/api/timezone/Asia/Colombo');
  const data = await res.json();
  const rawDate = new Date(data.utc_datetime);

  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Colombo',
    hour12: false,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
  });

  const parts = formatter.formatToParts(rawDate);
  const get = type => parts.find(p => p.type === type)?.value;

  lastUsedAPI = 'worldtimeapi.org';
  return {
    year: Number(get('year')),
    month: Number(get('month')),
    day: Number(get('day')),
    hour: Number(get('hour')),
    minute: Number(get('minute')),
    seconds: Number(get('second')),
    milliSeconds: rawDate.getMilliseconds(),
    timeZone: 'Asia/Colombo'
  };
}

async function fetchFromTimeAPI() {
  const res = await fetch('https://timeapi.io/api/Time/current/zone?timeZone=Asia/Colombo');
  const data = await res.json();
  lastUsedAPI = 'timeapi.io';
  return {
    ...data,
    timeZone: 'Asia/Colombo'
  };
}

// --- TIME SYNC LOGIC ---

async function fetchSLTime() {
  const maxRetries = 3;

  const tryAPI = async (fetchFunc, name) => {
    for (let i = 1; i <= maxRetries; i++) {
      try {
        console.log(`[Attempt ${i}] Trying ${name}...`);
        const fetchStart = Date.now();
        const data = await fetchFunc();
        const fetchEnd = Date.now();
        data.timestamp = fetchStart + (fetchEnd - fetchStart) / 2;
        return data;
      } catch (e) {
        console.warn(`[${name}] Attempt ${i} failed`);
        if (i < maxRetries) await new Promise(r => setTimeout(r, 3000));
      }
    }
    return null;
  };

  let data = await tryAPI(fetchFromWorldTimeAPI, 'worldtimeapi.org');

  if (!data) {
    console.warn('Falling back to timeapi.io...');
    data = await tryAPI(fetchFromTimeAPI, 'timeapi.io');
  }

  if (data) {
    currentTime = data;
    lastSyncTime = new Date();
    fetchFailures = 0;
    console.log(`Time synced from ${lastUsedAPI}`);
  } else {
    fetchFailures++;
    console.error(`Failed to fetch time (${fetchFailures} times)`);
    setTimeout(fetchSLTime, 10000);
  }
}

// --- FORMAT OUTPUT ---

function buildResponse(baseTime) {
  const now = Date.now();
  const elapsed = now - baseTime.timestamp;

  const base = new Date(
    baseTime.year, baseTime.month - 1, baseTime.day,
    baseTime.hour, baseTime.minute, baseTime.seconds,
    baseTime.milliSeconds || 0
  );

  const adjusted = new Date(base.getTime() + elapsed);

  const utcDate = new Date(Date.UTC(
    adjusted.getFullYear(),
    adjusted.getMonth(),
    adjusted.getDate(),
    adjusted.getHours(),
    adjusted.getMinutes(),
    adjusted.getSeconds(),
    adjusted.getMilliseconds()
  ));

  utcDate.setTime(utcDate.getTime() - (5.5 * 60 * 60 * 1000));

  const y = adjusted.getFullYear();
  const m = String(adjusted.getMonth() + 1).padStart(2, '0');
  const d = String(adjusted.getDate()).padStart(2, '0');
  const h = String(adjusted.getHours()).padStart(2, '0');
  const min = String(adjusted.getMinutes()).padStart(2, '0');
  const s = String(adjusted.getSeconds()).padStart(2, '0');
  const ms = String(adjusted.getMilliseconds()).padStart(3, '0');
  const sltDateTime = `${y}-${m}-${d}T${h}:${min}:${s}.${ms}`;

  return {
    year: adjusted.getFullYear(),
    month: adjusted.getMonth() + 1,
    day: adjusted.getDate(),
    hour: adjusted.getHours(),
    minute: adjusted.getMinutes(),
    seconds: adjusted.getSeconds(),
    milliSeconds: adjusted.getMilliseconds(),
    utcDateTime: utcDate.toISOString(),
    sltDateTime,
    date: adjusted.toLocaleDateString('en-GB'),
    time: adjusted.toLocaleTimeString('en-GB', { hour12: false }),
    timeZone: 'Asia/Colombo',
    dayOfWeek: adjusted.toLocaleString('en-US', { weekday: 'long' }),
    dstActive: false
  };
}

// --- ROUTES ---

app.get('/api', (req, res) => {
  if (!currentTime) return res.status(500).json({ error: 'Time not loaded yet' });
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store');
  res.json(buildResponse(currentTime));
});

app.get('/status', (req, res) => {
  const uptime = Date.now() - startTime;
  const memory = process.memoryUsage();
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.json({
    status: currentTime ? 'OK' : 'Time not loaded',
    source: lastUsedAPI || 'N/A',
    fetchFailures,
    lastSync: lastSyncTime ? lastSyncTime.toLocaleString('en-GB') : 'Never synced',
    serverTime: new Date().toLocaleString('en-GB'),
    uptime: {
      seconds: Math.floor(uptime / 1000),
      minutes: `${Math.floor(uptime / 60000)} min`
    },
    memory: {
      rss: `${(memory.rss / 1024 / 1024).toFixed(2)} MB`,
      heapUsed: `${(memory.heapUsed / 1024 / 1024).toFixed(2)} MB`,
      heapTotal: `${(memory.heapTotal / 1024 / 1024).toFixed(2)} MB`
    }
  });
});

// --- BLOCK OTHERS ---
app.use((req, res) => {
  res.redirect('https://time.lk');
});

// --- START SERVER ---
fetchSLTime();
setInterval(fetchSLTime, 86400000);
setInterval(() => {
  logHeartbeat('Heartbeat: Server is alive.');
}, 5000);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
