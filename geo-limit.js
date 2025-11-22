const geoip = require('geoip-lite');

const LONDON = { lat: 51.5074, lon: -0.1278 };
const MAX_KM = 50; // allowed radius around London

function kmBetween(lat1, lon1, lat2, lon2) {
    const R = 6371; // km
    const toRad = v => v * Math.PI / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

module.exports = function (req, res, next) {
    const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0];

    const geo = geoip.lookup(ip);
    if (!geo || !geo.ll) {
        return res.status(403).send('This site is only visible in London.');
    }

    const [lat, lon] = geo.ll;
    const dist = kmBetween(lat, lon, LONDON.lat, LONDON.lon);

    if (dist <= MAX_KM) {
        return next(); // allow access
    } else {
        return res.status(403).send('This site is only visible in London.');
    }
};
