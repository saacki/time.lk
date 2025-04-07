# ⏰ Sri Lanka Time — [time.lk](https://time.lk)

A beautifully minimal, accurate Sri Lanka time display. Built with HTML, CSS, and JavaScript — featuring smooth day/night transitions, animated sun/moon, and an API for developers.

---

## 🔧 How It Works

Unlike traditional clocks that rely on the client’s or server’s system time, `time.lk` fetches official time from a **world time API**, calculates the roundtrip latency, and adjusts the result accordingly:

1. **Client request → API timestamped**  
2. **Latency measured**, time adjusted based on roundtrip delay  
3. **Displayed time is independent of user's local clock**  

This ensures **maximum accuracy**, even if the client or server clocks are incorrect.

---

## 🌐 Live Site  
👉 Visit: [https://time.lk](https://time.lk)

---

## 🐛 Debug Modes

You can simulate different themes, time states, or errors by adding query parameters like `?test=flip-day` to the URL.

| Debug Mode             | Description                                                                 |
|------------------------|-----------------------------------------------------------------------------|
| `?test=flip-day`       | Live transition from night to day in 30s                                    |
| `?test=flip-night`     | Live transition from day to night in 30s                                    |
| `?test=theme-day`      | Forces day theme                                                            |
| `?test=theme-night`    | Forces night theme                                                          |
| `?test=static`         | Shows fixed time (2:30 PM)                                                  |
| `?test=day`            | Simulates 9:30 AM                                                           |
| `?test=night`          | Simulates 10:30 PM                                                          |
| `?test=slow`           | Simulates slow loading (delay before showing clock)                         |
| `?test=error`          | Simulates API failure (shows refresh button)                                |
| `?test=ahead=3`        | Simulates your local time being **3 hours ahead** of Sri Lanka              |
| `?test=behind=5.5`     | Simulates your local time being **5.5 hours behind** Sri Lanka               |
| `?test=earth`          | Shows animated Earth loader only                                            |
| `?test=anythingelse`   | Invalid debug code — displays default SLT and a debug warning banner        |

---

## 📡 Public API

You can use the time.lk backend to get the current Sri Lanka Time in JSON format:

**Endpoint:**  
```
https://app.time.lk/api
```

**Example Response:**
```json
{
  "year": 2025,
  "month": 4,
  "day": 7,
  "hour": 23,
  "minute": 28,
  "seconds": 28,
  "milliSeconds": 842,
  "utcDateTime": "2025-04-07T17:58:28.842Z",
  "sltDateTime": "2025-04-07T23:28:28.842",
  "date": "07/04/2025",
  "time": "23:28:28",
  "timeZone": "Asia/Colombo",
  "dayOfWeek": "Monday",
  "dstActive": false
}
```

You can append `?ts=123456789` to bypass caching if needed.

---

## 🧠 Ahead / Behind Logic

When users visit `time.lk`, their local time is compared to SLT:

- SLT offset is always +330 minutes (UTC+5:30)
- Local offset is taken from `new Date().getTimezoneOffset()`
- The result is shown as "Sri Lanka is X hour(s) and Y minute(s) ahead/behind you."

You can simulate being ahead/behind using:

```bash
?test=ahead=4     # Simulate 4 hours behind SLT
?test=behind=2    # Simulate 2 hours ahead of SLT
```

---

## Accuracy & Logic

- **True SLT**: The time shown on time.lk is fetched from a backend service that does **not rely on the client or the server's local system time**.
- **Source**: The backend fetches time from [`worldtimeapi.org`](https://worldtimeapi.org/) using Colombo (Asia) timezone.
- **Fallback**: If the main API fails, the backend automatically retries using a **backup API** like [`timeapi.io`](https://timeapi.io/), ensuring time continuity even during outages.
- **Latency Compensation**: The backend measures the time delay between request and response, and compensates for it, improving accuracy further.
- **Client Display**: The fetched time is then displayed on the frontend and updated every second using JavaScript — without relying on the user's system clock.

---

## 🖥️ Technologies Used

- HTML5 + CSS3 (no frameworks)
- Vanilla JavaScript
- Font Awesome for icons
- WorldTimeAPI (via proxy)
- TimeAPI.io (via proxy) (backup)

---

## 🎨 Features

- Animated floating sun and glowing moon
- Shooting stars on night mode
- Accurate time rendering with delay correction
- Smooth transitions between day and night
- Custom Earth loader animation
- Debug & development utilities
- Return and refresh controls
- API access for developers

---

## 📜 License

MIT License. Free to use and modify. © 2025 [Sachi](https://sachi.lk)

---

🧡 _Made with love for accuracy and aesthetic._
