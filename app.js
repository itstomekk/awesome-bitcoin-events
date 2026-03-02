/* ===========================
   Awesome Bitcoin Events – app.js
=========================== */

const MONTHS = ['January','February','March','April','May','June',
                 'July','August','September','October','November','December'];

const REGION_COLORS = {
  'Americas':    '#f7931a',
  'Europe':      '#6c8ebf',
  'Asia Pacific':'#3ec997',
  'Africa':      '#e8a838',
  'Middle East': '#b36ac7',
  'Online':      '#888',
};

const REGION_GRADIENTS = {
  'Americas':    'linear-gradient(135deg, #1a1005 0%, #2e1a05 60%, #3d2208 100%)',
  'Europe':      'linear-gradient(135deg, #071524 0%, #0e2040 60%, #162952 100%)',
  'Asia Pacific':'linear-gradient(135deg, #051a14 0%, #092e22 60%, #0e3d2e 100%)',
  'Africa':      'linear-gradient(135deg, #1a1205 0%, #2e2005 60%, #3d2c08 100%)',
  'Middle East': 'linear-gradient(135deg, #140521 0%, #24083a 60%, #30094c 100%)',
  'Online':      'linear-gradient(135deg, #0d0d0d 0%, #1a1a1a 100%)',
};

// State
let allEvents = [];
let filters = { search: '', status: 'all', region: '', month: '' };

// ===========================
// Flag Emoji
// ===========================
function countryCodeToFlag(code) {
  if (!code) return '🌐';
  return code.toUpperCase().split('').map(c =>
    String.fromCodePoint(0x1F1E6 + c.charCodeAt(0) - 65)
  ).join('');
}

// ===========================
// Date Helpers
// ===========================
function getEventStatus(event) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(event.startDate);
  const end = new Date(event.endDate);
  end.setHours(23, 59, 59, 999);
  if (today >= start && today <= end) return 'happening';
  if (today > end) return 'past';
  return 'upcoming';
}

function daysLabel(event) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(event.startDate);
  const diff = Math.round((start - today) / (1000 * 60 * 60 * 24));
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff > 0) return `In ${diff} days`;
  if (diff === -1) return '1 day ago';
  return `${Math.abs(diff)} days ago`;
}

// ===========================
// Filtering
// ===========================
function applyFilters(events) {
  const q = filters.search.toLowerCase().trim();
  return events.filter(e => {
    if (q && !e.name.toLowerCase().includes(q) &&
             !e.location.toLowerCase().includes(q) &&
             !e.country.toLowerCase().includes(q)) return false;

    if (filters.status !== 'all') {
      const s = getEventStatus(e);
      if (filters.status === 'upcoming' && s === 'past') return false;
      if (filters.status === 'past' && s !== 'past') return false;
    }

    if (filters.region && e.region !== filters.region) return false;

    if (filters.month) {
      const m = new Date(e.startDate).getMonth() + 1;
      if (m !== parseInt(filters.month, 10)) return false;
    }

    return true;
  });
}

// ===========================
// Render
// ===========================
function renderEvents(events) {
  const grid = document.getElementById('eventsGrid');
  const empty = document.getElementById('emptyState');
  const count = document.getElementById('resultsCount');

  if (!events.length) {
    grid.innerHTML = '';
    empty.classList.remove('hidden');
    count.textContent = '0 events';
    return;
  }

  empty.classList.add('hidden');
  count.textContent = `${events.length} event${events.length !== 1 ? 's' : ''}`;

  // Group by month
  const grouped = {};
  events.forEach(e => {
    const month = new Date(e.startDate).getMonth();
    if (!grouped[month]) grouped[month] = [];
    grouped[month].push(e);
  });

  grid.innerHTML = Object.keys(grouped)
    .sort((a, b) => a - b)
    .map(month => {
      const evts = grouped[month];
      return `
        <div class="month-group" id="month-${parseInt(month)+1}">
          <div class="month-heading">
            <h2>${MONTHS[month]}</h2>
            <span class="month-count-badge">${evts.length}</span>
            <div class="month-rule"></div>
          </div>
          <div class="events-grid">
            ${evts.map(renderCard).join('')}
          </div>
        </div>`;
    }).join('');
}

function renderCard(event) {
  const status = getEventStatus(event);
  const flag = countryCodeToFlag(event.countryCode);
  const regionColor = REGION_COLORS[event.region] || '#888';
  const gradient = REGION_GRADIENTS[event.region] || REGION_GRADIENTS['Online'];
  const days = daysLabel(event);

  const statusLabels = { happening: '● Live Now', upcoming: 'Upcoming', past: 'Past' };
  const statusLabel = statusLabels[status];

  const imageHtml = event.image
    ? `<img class="card-image" src="${escHtml(event.image)}" alt="${escHtml(event.name)}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'" /><div class="card-image-placeholder" style="display:none;--placeholder-gradient:${gradient}"><span class="placeholder-symbol">₿</span></div>`
    : `<div class="card-image-placeholder" style="--placeholder-gradient:${gradient}"><span class="placeholder-symbol">₿</span></div>`;

  const descHtml = event.description
    ? `<p class="card-description">${escHtml(event.description)}</p>`
    : '';

  return `
    <article class="event-card" onclick="openEvent('${event.url}')">
      ${imageHtml}
      <div class="card-body">
        <div class="card-header">
          <h3 class="card-name">${escHtml(event.name)}</h3>
          <span class="status-badge ${status}">${statusLabel}</span>
        </div>
        <div class="card-meta">
          <div class="card-date">
            <svg class="meta-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            ${escHtml(event.dates)}
            <span style="color: var(--text-faint); font-weight:400; font-size:11px;">${days}</span>
          </div>
          <div class="card-location">
            <svg class="meta-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
            ${flag} ${escHtml(event.location)}${event.country !== 'Online' && event.country !== event.location ? ', ' + escHtml(event.country) : ''}
          </div>
        </div>
        ${descHtml}
        <div class="card-footer">
          <span class="card-region">
            <span class="region-dot" style="--region-color:${regionColor}"></span>
            ${escHtml(event.region)}
          </span>
          <a class="btn-visit" href="${escHtml(event.url)}" target="_blank" rel="noopener" onclick="event.stopPropagation()">
            Visit
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
          </a>
        </div>
      </div>
    </article>`;
}

function escHtml(str) {
  if (!str) return '';
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
            .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

function openEvent(url) {
  window.open(url, '_blank', 'noopener');
}

// ===========================
// Month Nav
// ===========================
function buildMonthNav(events) {
  const nav = document.getElementById('monthNav');
  if (!nav) return;

  // Count per month
  const counts = {};
  events.forEach(e => {
    const m = new Date(e.startDate).getMonth() + 1;
    counts[m] = (counts[m] || 0) + 1;
  });

  // Only show months that have events
  const months = Object.keys(counts).map(Number).sort((a, b) => a - b);

  nav.innerHTML = months.map(m => `
    <button class="month-pill${filters.month == m ? ' active' : ''}"
            data-month="${m}"
            onclick="setMonthFilter(${m})">
      <span class="month-pill-name">${MONTHS[m-1].slice(0,3)}</span>
      <span class="month-pill-count">${counts[m]}</span>
    </button>
  `).join('');
}

function setMonthFilter(m) {
  if (filters.month == m) {
    filters.month = '';
    document.getElementById('monthSelect').value = '';
  } else {
    filters.month = m;
    document.getElementById('monthSelect').value = m;
  }
  refresh();
  // Scroll to month section if filtering
  if (filters.month) {
    const el = document.getElementById(`month-${m}`);
    if (el) setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  }
}

// ===========================
// Stats
// ===========================
function updateStats(events) {
  const countries = new Set(events.map(e => e.country)).size;
  const regions = new Set(events.map(e => e.region)).size;
  document.getElementById('statTotal').textContent = events.length;
  document.getElementById('statCountries').textContent = countries;
  document.getElementById('statRegions').textContent = regions;
}

// ===========================
// Refresh (filter + render)
// ===========================
function refresh() {
  const filtered = applyFilters(allEvents);
  renderEvents(filtered);
  buildMonthNav(allEvents); // always based on all events for month pills
  // highlight active month pill
  document.querySelectorAll('.month-pill').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.month == filters.month);
  });
}

// ===========================
// Event Listeners
// ===========================
function initListeners() {
  // Search
  let searchTimer;
  document.getElementById('searchInput').addEventListener('input', e => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      filters.search = e.target.value;
      refresh();
    }, 200);
  });

  // Status chips
  document.querySelectorAll('[data-filter="status"]').forEach(btn => {
    btn.addEventListener('click', () => {
      filters.status = btn.dataset.value;
      document.querySelectorAll('[data-filter="status"]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      refresh();
    });
  });

  // Region select
  document.getElementById('regionSelect').addEventListener('change', e => {
    filters.region = e.target.value;
    refresh();
  });

  // Month select
  document.getElementById('monthSelect').addEventListener('change', e => {
    filters.month = e.target.value;
    // sync month nav
    document.querySelectorAll('.month-pill').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.month == filters.month);
    });
    refresh();
  });
}

// ===========================
// Clear filters (global)
// ===========================
function clearFilters() {
  filters = { search: '', status: 'all', region: '', month: '' };
  document.getElementById('searchInput').value = '';
  document.getElementById('regionSelect').value = '';
  document.getElementById('monthSelect').value = '';
  document.querySelectorAll('[data-filter="status"]').forEach(b => {
    b.classList.toggle('active', b.dataset.value === 'all');
  });
  refresh();
}

// ===========================
// Bootstrap
// ===========================
async function init() {
  try {
    const res = await fetch('events.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    allEvents = data.events.sort((a, b) => a.startDate.localeCompare(b.startDate));
    updateStats(allEvents);
    buildMonthNav(allEvents);
    initListeners();
    refresh();
  } catch (err) {
    console.error('Failed to load events.json:', err);
    document.getElementById('eventsGrid').innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:60px;color:#888;">
        <p style="margin-bottom:12px;">⚠ Could not load events.</p>
        <p style="font-size:13px;">Serve this directory over HTTP to load event data.<br/>
        Run: <code>python3 -m http.server 8080</code> or <code>npx serve .</code></p>
      </div>`;
  }
}

document.addEventListener('DOMContentLoaded', init);
