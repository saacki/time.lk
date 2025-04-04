const express = require('express');
const app = express();
const fetch = require('node-fetch');
const fs = require('fs');

let currentTime = null;
let fetchFailures = 0;
let lastSyncTime = null;
let lastUsedAPI = null;
const startTime = Date.now();

// Middleware to block all access except /api and /status
app.use((req, res, next) => {
  if (req.path !== '/api' && req.path !== '/status') {
    return res.redirect('https://time.lk');
  }
  next();
});

// Logger
const logStream = fs.createWriteStream('./log.txt', { flags: 'a' });
const serverTimeString = () => new Date().toLocaleString('en-GB');

console.log = (...args) => {
  const message = `[${serverTimeString()}] ${args.join(' ')}\n`;
  logStream.write(message);
  process.stdout.write(message);
};

console.error = console.log;

// APIs
async function fetchFromWorldTimeAPI() {
  const res = await fetch('https://worldtimeapi.org/api/timezone/Asia/Colombo');
  const data = await res.json();
  const date = new Date(data.datetime);
  lastUsedAPI = 'worldtimeapi.org';

  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate(),
    hour: date.getHours(),
    minute: date.getMinutes(),
    seconds: date.getSeconds(),
    milliSeconds: date.getMilliseconds(),
    timestamp: Date.now(),
    timeZone: 'Asia/Colombo'
  };
}

async function fetchFromTimeAPI() {
  const res = await fetch('https://timeapi.io/api/Time/current/zone?timeZone=Asia/Colombo');
  const data = await res.json();
  lastUsedAPI = 'timeapi.io';
  data.timestamp = Date.now();
  return data;
}

async function fetchSLTime(retries = 0) {
  try {
    const fetchStart = Date.now();
    let data;

    try {
      data = await fetchFromWorldTimeAPI();
    } catch {
      console.warn('WorldTimeAPI failed, using backup...');
      data = await fetchFromTimeAPI();
    }

    const fetchEnd = Date.now();
    const delay = fetchEnd - fetchStart;
    data.timestamp = fetchStart + delay / 2;

    currentTime = data;
    lastSyncTime = new Date();
    fetchFailures = 0;

    console.log(`Time synced from ${lastUsedAPI} with ~${delay}ms delay`);
  } catch (e) {
    fetchFailures++;
    console.error(`Failed to fetch time (${fetchFailures} time(s))`);

    if (fetchFailures >= 3) {
      console.warn(`[WARNING] Time has not synced in ${fetchFailures} attempts.`);
    }

    if (retries < 5) {
      setTimeout(() => fetchSLTime(retries + 1), 10000);
    }
  }
}

// API route
app.get('/api', (req, res) => {
  if (!currentTime) {
    return res.status(500).json({ error: 'Time not loaded yet' });
  }

  const now = Date.now();
  const elapsed = now - currentTime.timestamp;

  const base = new Date(
    currentTime.year,
    currentTime.month - 1,
    currentTime.day,
    currentTime.hour,
    currentTime.minute,
    currentTime.seconds,
    currentTime.milliSeconds || 0
  );

  const adjusted = new Date(base.getTime() + elapsed);

  const response = {
    year: adjusted.getFullYear(),
    month: adjusted.getMonth() + 1,
    day: adjusted.getDate(),
    hour: adjusted.getHours(),
    minute: adjusted.getMinutes(),
    seconds: adjusted.getSeconds(),
    milliSeconds: adjusted.getMilliseconds(),
    dateTime: adjusted.toISOString(),
    date: adjusted.toLocaleDateString('en-GB'),
    time: adjusted.toLocaleTimeString('en-GB', { hour12: false }),
    timeZone: 'Asia/Colombo',
    dayOfWeek: adjusted.toLocaleString('en-US', {
      weekday: 'long',
      timeZone: 'Asia/Colombo'
    }),
    dstActive: false
  };

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store');
  res.json(response);
});

// Status route
app.get('/status', (req, res) => {
  const uptimeMs = Date.now() - startTime;
  const memory = process.memoryUsage();

  const status = {
    status: currentTime ? 'OK' : 'Time not loaded',
    source: lastUsedAPI || 'N/A',
    fetchFailures,
    lastSync: lastSyncTime ? lastSyncTime.toLocaleString('en-GB') : 'Not synced yet',
    serverTime: new Date().toLocaleString('en-GB'),
    uptime: {
      seconds: Math.floor(uptimeMs / 1000),
      minutes: `${Math.floor(uptimeMs / 60000)} min`
    },
    memory: {
      rss: `${(memory.rss / 1024 / 1024).toFixed(2)} MB`,
      heapUsed: `${(memory.heapUsed / 1024 / 1024).toFixed(2)} MB`,
      heapTotal: `${(memory.heapTotal / 1024 / 1024).toFixed(2)} MB`
    }
  };

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.json(status);
});

// Start server
fetchSLTime();
setInterval(fetchSLTime, 86400000);

// Heartbeat log every minute
setInterval(() => {
  console.log('Heartbeat: Server is alive.');
}, 60000);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
