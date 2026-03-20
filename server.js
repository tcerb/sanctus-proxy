/**
 * Sanctus — MassTimes API Proxy Server
 * Node.js / Express backend
 * 
 * Handles CORS by proxying requests to apiv4.updateparishdata.org
 * Deploy to: Vercel, Railway, Render, Fly.io, or any Node host
 */

const express = require('express');
const cors = require('cors');
const https = require('https');

const app = express();
const PORT = process.env.PORT || 3001;

// ── CORS ──────────────────────────────────────────────────────────────────────
// In production, replace '*' with your actual frontend domain
app.use(cors({
  origin: process.env.ALLOWED_ORIGIN || '*',
  methods: ['GET'],
}));

// ── Config ────────────────────────────────────────────────────────────────────
const MASSTIMES_API_KEY = process.env.MASSTIMES_API_KEY || '74e45c40-7f11-11e1-b0c4-0800200c9a66';
const MASSTIMES_BASE    = 'apiv4.updateparishdata.org';

// ── Helper: fetch from MassTimes ──────────────────────────────────────────────
function fetchMassTimes(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: MASSTIMES_BASE,
      path: path,
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error('Invalid JSON from MassTimes API')); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

// ── Routes ────────────────────────────────────────────────────────────────────

/**
 * GET /api/churches?lat=38.90&lng=-77.03
 * Returns up to 30 churches within 100mi, ordered by distance
 */
app.get('/api/churches', async (req, res) => {
  const { lat, lng } = req.query;

  if (!lat || !lng) {
    return res.status(400).json({ error: 'lat and lng query params are required' });
  }

  const latNum = parseFloat(lat);
  const lngNum = parseFloat(lng);

  if (isNaN(latNum) || isNaN(lngNum)) {
    return res.status(400).json({ error: 'lat and lng must be valid numbers' });
  }

  try {
    const path = `/Churchs/?lat=${latNum}&long=${lngNum}&apikey=${MASSTIMES_API_KEY}`;
    const churches = await fetchMassTimes(path);
    res.json(churches);
  } catch (err) {
    console.error('MassTimes fetch error:', err.message);
    res.status(502).json({ error: 'Failed to fetch from MassTimes API', detail: err.message });
  }
});

/**
 * GET /api/churches/:id
 * Returns a single church by ID with full worship times
 */
app.get('/api/churches/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const path = `/Churchs/${id}?apikey=${MASSTIMES_API_KEY}`;
    const church = await fetchMassTimes(path);
    res.json(church);
  } catch (err) {
    console.error('MassTimes fetch error:', err.message);
    res.status(502).json({ error: 'Failed to fetch church detail', detail: err.message });
  }
});

/**
 * GET /api/geocode?q=Washington+DC
 * Proxy to Nominatim so the frontend doesn't hit it directly
 * (Nominatim has a 1 req/s rate limit — add caching in production)
 */
app.get('/api/geocode', async (req, res) => {
  const { q } = req.query;
  if (!q) return res.status(400).json({ error: 'q param required' });

  const encodedQ = encodeURIComponent(q);

  const options = {
    hostname: 'nominatim.openstreetmap.org',
    path: `/search?q=${encodedQ}&format=json&limit=1`,
    method: 'GET',
    headers: {
      'User-Agent': 'SanctusApp/1.0 (contact@yourapp.com)', // Required by Nominatim ToS
      'Accept': 'application/json',
    },
  };

  try {
    const result = await new Promise((resolve, reject) => {
      const req2 = https.request(options, (resp) => {
        let data = '';
        resp.on('data', c => data += c);
        resp.on('end', () => {
          try { resolve(JSON.parse(data)); }
          catch (e) { reject(e); }
        });
      });
      req2.on('error', reject);
      req2.end();
    });
    res.json(result);
  } catch (err) {
    res.status(502).json({ error: 'Geocoding failed', detail: err.message });
  }
});

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'sanctus-proxy' }));

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`Sanctus proxy running on port ${PORT}`);
});

module.exports = app;
