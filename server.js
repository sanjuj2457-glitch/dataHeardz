// server.js
// Simple Express server that serves static files and exposes /api/gallery
// Usage:
//   npm init -y
//   npm i express xlsx cors geoip-lite
//   node server.js

const express = require('express');
const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx');
const cors = require('cors');

const londonOnly = require('./geo-limit'); // middleware you created earlier

const app = express();
const PORT = process.env.PORT || 3000;

// If behind a proxy (Heroku, Cloudflare, etc.) enable this so req.ip/x-forwarded-for works
app.set('trust proxy', true);

// Enable CORS for dev convenience (optional if serving same origin)
app.use(cors());

// Apply London-only middleware BEFORE serving static files so assets are also protected
app.use(londonOnly);

// Serve static files from project root (so index.html, style.css, assets/ are served)
app.use(express.static(path.join(__dirname, '.')));

// Helper: get filename from Windows or Unix path
function basename(p) {
    if (!p) return '';
    return p.replace(/\\/g, '/').split('/').pop();
}

// Helper: resolve image field into a browser-usable URL
function resolveImageField(raw) {
    if (!raw) return '';
    raw = String(raw).trim();
    if (!raw) return '';

    // If already an absolute http(s) URL, return as-is
    if (/^https?:\/\//i.test(raw)) return raw;

    // If relative path starting with '/', './' or 'assets/', use as-is (normalize)
    if (/^(\/|\.\/|assets\/)/i.test(raw)) {
        return raw.replace(/^\.\//, '');
    }

    // If looks like Windows absolute path, extract basename and build assets/images/...
    if (/^[A-Za-z]:[\\/]/.test(raw) || /^\\\\/.test(raw)) {
        const name = basename(raw);
        return `assets/images/${encodeURIComponent(name)}`;
    }

    // If contains slashes, extract last segment
    if (/[\\/]/.test(raw)) {
        const name = basename(raw);
        return `assets/images/${encodeURIComponent(name)}`;
    }

    // otherwise assume just a filename
    return `assets/images/${encodeURIComponent(raw)}`;
}

// API: GET /api/gallery -> returns JSON array of rows
app.get('/api/gallery', (req, res) => {
    try {
        const excelPath = path.join(__dirname, 'assets', 'data', 'gallery.xlsx');
        if (!fs.existsSync(excelPath)) {
            return res.status(404).json({ error: 'gallery.xlsx not found on server', path: '/assets/data/gallery.xlsx' });
        }

        const workbook = XLSX.readFile(excelPath, { cellDates: true });
        const firstSheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[firstSheetName];
        const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

        // Normalize rows: compute usable image src and force Show casing, etc.
        const rows = rawRows.map(r => {
            const Show = r.Show ?? r.show ?? r.SHOW ?? '';
            const Image = r.Image ?? r.image ?? r.IMAGE ?? '';
            const Description = r.Description ?? r.description ?? r.DESCRIPTION ?? '';
            const Link = r.Link ?? r.link ?? r.LINK ?? '';

            return {
                Show: String(Show).trim(),
                ImageRaw: String(Image).trim(),
                Image: resolveImageField(Image),
                Description: String(Description).trim(),
                Link: String(Link).trim(),
            };
        });

        res.json({ rows });
    } catch (err) {
        console.error('Failed to read / parse Excel', err);
        res.status(500).json({ error: 'Failed to read gallery.xlsx', detail: err.message });
    }
});

// Fallback: serve index.html for any unmatched route (SPA-friendly)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server started at http://localhost:${PORT}`);
    console.log('Serving static files from', __dirname);
    console.log('API endpoint: GET /api/gallery (reads assets/data/gallery.xlsx)');
});
