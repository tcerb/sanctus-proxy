# Sanctus — Backend Proxy

A lightweight Express server that proxies requests from the Sanctus frontend
to the MassTimes API, solving the browser CORS restriction.

## Quick Start

```bash
npm install
cp .env.example .env   # edit as needed
npm run dev            # development with auto-reload
npm start              # production
```

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/churches?lat=&lng=` | Nearby churches (up to 30, within 100 mi) |
| GET | `/api/churches/:id` | Single church detail |
| GET | `/api/geocode?q=` | Address → lat/lng via Nominatim |
| GET | `/health` | Health check |

## Deploy

### Render (free tier)
1. Push to GitHub
2. New Web Service → connect repo → Build: `npm install` → Start: `npm start`
3. Add env vars in Render dashboard

### Railway
```bash
npm install -g @railway/cli
railway login
railway init
railway up
```

### Vercel (serverless)
Rename `server.js` → `api/index.js`, wrap with `module.exports = app`.

### Fly.io
```bash
fly launch
fly deploy
```

## Frontend Integration

In the Sanctus frontend, replace the direct MassTimes API calls with:

```js
// Instead of: https://apiv4.updateparishdata.org/Churchs/?lat=...
const API_BASE = 'https://your-proxy.onrender.com';

const churches = await fetch(`${API_BASE}/api/churches?lat=${lat}&lng=${lng}`)
  .then(r => r.json());

const geo = await fetch(`${API_BASE}/api/geocode?q=${encodeURIComponent(query)}`)
  .then(r => r.json());
```
