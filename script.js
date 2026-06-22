// ============================================================
// SHARED FUNCTIONS - Search---know-™
// ============================================================

const LOG_KEY = 'searchknow_visit_log';
const TOTAL_KEY = 'searchknow_total_visits';
const COUNTRIES_KEY = 'searchknow_countries';
const ONLINE_KEY = 'searchknow_online';
const VISITOR_ID_KEY = 'searchknow_visitor_id';
const BLOCKED_COUNTRIES_KEY = 'searchknow_blocked_countries';
const BLOCKED_IPS_KEY = 'searchknow_blocked_ips';

function getBlockedCountries() {
    const val = localStorage.getItem(BLOCKED_COUNTRIES_KEY);
    return val ? val.split(',').map(s => s.trim().toUpperCase()).filter(s => s) : [];
}

function getBlockedIPs() {
    const val = localStorage.getItem(BLOCKED_IPS_KEY);
    return val ? val.split(',').map(s => s.trim()).filter(s => s) : [];
}

async function fetchVisitorData() {
    try {
        const res = await fetch('https://ipapi.co/json/');
        if (!res.ok) throw new Error('IP API failed');
        const data = await res.json();
        return { ip: data.ip || 'unknown', country: data.country_code || 'XX', countryName: data.country_name || 'Unknown' };
    } catch (e) {
        return { ip: 'unknown', country: 'XX', countryName: 'Unknown' };
    }
}

async function logVisit() {
    const info = await fetchVisitorData();
    const ip = info.ip, country = info.country, countryName = info.countryName;
    const blockedCountries = getBlockedCountries(), blockedIPs = getBlockedIPs();
    if (blockedCountries.includes(country) || blockedIPs.includes(ip)) return;

    let visitorId = localStorage.getItem(VISITOR_ID_KEY);
    if (!visitorId) {
        visitorId = 'v_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 6);
        localStorage.setItem(VISITOR_ID_KEY, visitorId);
    }

    let log = JSON.parse(localStorage.getItem(LOG_KEY) || '[]');
    let total = parseInt(localStorage.getItem(TOTAL_KEY) || '0');
    const today = new Date().toDateString();
    const existing = log.find(entry => entry.visitorId === visitorId && new Date(entry.timestamp).toDateString() === today);
    
    if (!existing) {
        log.unshift({ visitorId, timestamp: new Date().toISOString(), ip, country, countryName });
        if (log.length > 100) log = log.slice(0, 100);
        localStorage.setItem(LOG_KEY, JSON.stringify(log));
        total++;
        localStorage.setItem(TOTAL_KEY, String(total));
    }

    let countries = JSON.parse(localStorage.getItem(COUNTRIES_KEY) || '{}');
    countries[country] = (countries[country] || 0) + 1;
    localStorage.setItem(COUNTRIES_KEY, JSON.stringify(countries));

    let online = JSON.parse(localStorage.getItem(ONLINE_KEY) || '{}');
    const now = Date.now();
    const sessionId = visitorId + '_' + today;
    online[sessionId] = now;
    for (const key in online) { if (now - online[key] > 300000) delete online[key]; }
    localStorage.setItem(ONLINE_KEY, JSON.stringify(online));
    updateUI();
}

function updateUI() {
    const totalVisitors = document.getElementById('totalVisitors');
    const onlineNow = document.getElementById('onlineNow');
    const topCountries = document.getElementById('topCountries');
    const logBody = document.getElementById('logBody');

    if (totalVisitors) {
        totalVisitors.textContent = (parseInt(localStorage.getItem(TOTAL_KEY) || '0')).toLocaleString();
    }
    if (onlineNow) {
        const online = JSON.parse(localStorage.getItem(ONLINE_KEY) || '{}');
        onlineNow.textContent = Object.keys(online).length;
    }
    if (topCountries) {
        const countries = JSON.parse(localStorage.getItem(COUNTRIES_KEY) || '{}');
        const sorted = Object.entries(countries).sort((a, b) => b[1] - a[1]);
        const top = sorted.slice(0, 5).map(([code, count]) => {
            const flag = code === 'XX' ? '🌍' : code.split('').map(c => String.fromCodePoint(0x1F1E6 + c.charCodeAt(0) - 65)).join('');
            return `${flag} ${code} (${count})`;
        }).join(' ');
        topCountries.textContent = top || 'None yet';
    }
    if (logBody) {
        const log = JSON.parse(localStorage.getItem(LOG_KEY) || '[]');
        if (log.length === 0) {
            logBody.innerHTML = '<tr><td colspan="4" style="color:#bbb;text-align:center;padding:8px;">No visits yet</td></tr>';
        } else {
            logBody.innerHTML = log.slice(0, 20).map((entry, i) => {
                const flag = entry.country === 'XX' ? '🌍' : entry.country.split('').map(c => String.fromCodePoint(0x1F1E6 + c.charCodeAt(0) - 65)).join('');
                return `<tr><td>${i+1}</td><td class="timestamp">${new Date(entry.timestamp).toLocaleString()}</td><td><span class="flag">${flag}</span> ${entry.countryName}</td><td class="ip">${entry.ip}</td></tr>`;
            }).join('');
        }
    }
}

window.refreshStats = function() {
    updateUI();
};

// Auto-init if on a page with visitor counter
if (document.getElementById('visitorCounter')) {
    logVisit();
    setInterval(updateUI, 30000);
}

console.log('📊 Visitor tracking initialized.');
