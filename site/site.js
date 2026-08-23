(function(){
  'use strict';

  // Fallback canon in case /data/site.json is unavailable.
  const FALLBACK = {
    meta: { cycle: '2999.09' },
    facts: {
      founded: 2041,
      present_year: 2999,
      active_meters: 214116882,
      read_interval_seconds: 4,
      estimated_reads_since_founding: 0,
      energy_consumption: { yottajoules_per_41_days: 1 },
      regulator: 'Joint Settlement Authority Ceres',
      payment_route: 'ISP-2041'
    },
    mix: {
      the_beam: { label: 'The Beam', value: 46, color: '#ff3ea5', source: 'relayed Mercury sunlight' },
      fusion: { label: 'Fusion', value: 31, color: '#35e0e0', source: 'Ceres, Callisto, 11 licensed hulls' },
      moontide: { label: 'Moontide', value: 14, color: '#d8e838', source: 'Europa flex' },
      stored_light: { label: 'Stored light', value: 9, color: '#ff7a1a', source: 'flywheels, mass batteries' }
    },
    rates: {
      porchlight: { sunward: 0.0042, shade: 0.0114, unit: 'credits/MJ', for: 'household structures' },
      corner_main: { sunward: 0.0061, shade: 0.0138, unit: 'credits/MJ', for: 'commercial structures' },
      underway: { flat: 0.0088, unit: 'credits/MJ', for: 'ships and tugs' },
      first_light: { note: 'read not billed for first 3 cycles', for: 'new settlements' }
    },
    accounts: [
      { id: 'ISP-000000112', name: 'Meter 112', location: 'Earth Reserve Ohio', status: 'active', note: 'oldest account' },
      { id: 'ISP-TR4-NS-001', name: 'New Sheboygan', location: 'Tow Route 4', status: 'current' },
      { id: 'ISP-TR4-HG-044', name: 'Halverson Green', location: 'Tow Route 4', status: 'current' },
      { id: 'ISP-EU-AUTONOMOUS', name: 'Europa Autonomous Grid', location: 'Europa', status: 'autonomous', note: 'pays own bill since 2093' },
      { id: 'ISP-BELT-UNPAID', name: 'Belt households', location: 'Asteroid Belt', status: 'delinquent', note: 'unpaid since 2087' }
    ],
    routes: [
      { id: 'TR-4', name: 'Tow Route 4', places: ['New Sheboygan', 'Halverson Green'], status: 'current' },
      { id: 'PI-1', name: 'Phobos Interchange', places: ['transfer node', 'beamline terminus'], status: 'settled' }
    ],
    timelines: [
      { year: 2041, event: 'In-Space Power founded' },
      { year: 2087, event: 'Belt households last paid' },
      { year: 2091, event: 'Meter 112 activated' },
      { year: 2093, event: 'Europa began paying its own bill' },
      { year: 2709, event: 'Halverson Green joined Tow Route 4' },
      { year: 2711, event: 'New Sheboygan joined Tow Route 4' }
    ],
    personas: [],
    events: [],
    chains: {}
  };

  function formatNumber(n) {
    return n.toLocaleString('en-US');
  }

  function formatCredits(v) {
    return '¤' + v.toFixed(4);
  }

  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  }

  function renderChart(mix) {
    const container = document.getElementById('mixChart');
    if (!container) return;
    const data = Object.values(mix).sort((a, b) => b.value - a.value);
    const total = data.reduce((s, d) => s + d.value, 0);

    const ns = 'http://www.w3.org/2000/svg';
    const size = 400;
    const cx = size / 2;
    const cy = size / 2;
    const radius = 160;
    const innerRadius = 96;

    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', `0 0 ${size} ${size}`);

    let angle = -Math.PI / 2;
    data.forEach(item => {
      const sliceAngle = (item.value / total) * Math.PI * 2;
      const endAngle = angle + sliceAngle;

      const x1 = cx + radius * Math.cos(angle);
      const y1 = cy + radius * Math.sin(angle);
      const x2 = cx + radius * Math.cos(endAngle);
      const y2 = cy + radius * Math.sin(endAngle);
      const ix1 = cx + innerRadius * Math.cos(angle);
      const iy1 = cy + innerRadius * Math.sin(angle);
      const ix2 = cx + innerRadius * Math.cos(endAngle);
      const iy2 = cy + innerRadius * Math.sin(endAngle);

      const largeArc = sliceAngle > Math.PI ? 1 : 0;
      const d = [
        `M ${ix1} ${iy1}`,
        `L ${x1} ${y1}`,
        `A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`,
        `L ${ix2} ${iy2}`,
        `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${ix1} ${iy1}`,
        'Z'
      ].join(' ');

      const path = document.createElementNS(ns, 'path');
      path.setAttribute('d', d);
      path.setAttribute('fill', item.color);
      svg.appendChild(path);

      const midAngle = angle + sliceAngle / 2;
      const labelRadius = innerRadius + (radius - innerRadius) / 2;
      const lx = cx + labelRadius * Math.cos(midAngle);
      const ly = cy + labelRadius * Math.sin(midAngle);

      const text = document.createElementNS(ns, 'text');
      text.setAttribute('x', lx);
      text.setAttribute('y', ly);
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('dominant-baseline', 'middle');
      text.setAttribute('fill', '#16101f');
      text.setAttribute('font-size', '14');
      text.setAttribute('font-weight', '800');
      text.textContent = item.value + '%';
      svg.appendChild(text);

      angle = endAngle;
    });

    container.innerHTML = '';
    container.appendChild(svg);
  }

  function renderLegend(mix) {
    const container = document.getElementById('mixLegend');
    if (!container) return;
    const data = Object.values(mix).sort((a, b) => b.value - a.value);
    container.innerHTML = '';
    data.forEach(item => {
      const div = el('div', 'legend-item');
      const dt = el('dt');
      dt.innerHTML = `<span class="swatch" style="--c:${item.color}"></span>${item.label}`;
      const dd = el('dd', '', `${item.value}% — ${item.source}`);
      div.appendChild(dt);
      div.appendChild(dd);
      container.appendChild(div);
    });
  }

  function renderPlans(rates) {
    const container = document.getElementById('plans');
    if (!container) return;
    const order = ['porchlight', 'corner_main', 'underway', 'first_light'];
    const labels = {
      porchlight: 'Porchlight',
      corner_main: 'Corner Main',
      underway: 'Underway',
      first_light: 'First Light'
    };
    container.innerHTML = '';
    order.forEach(key => {
      const r = rates[key];
      if (!r) return;
      const art = el('article', key === 'first_light' ? 'plan plan-highlight' : 'plan');
      art.appendChild(el('h3', '', labels[key]));
      art.appendChild(el('p', 'plan-for', r.for));

      const rateP = el('p', 'plan-rate');
      if (r.sunward !== undefined && r.shade !== undefined) {
        rateP.innerHTML = `<span class="rate-sun">${formatCredits(r.sunward)}</span> <span class="rate-shade">${formatCredits(r.shade)}</span>`;
      } else if (r.flat !== undefined) {
        rateP.innerHTML = `<span class="rate-flat">${formatCredits(r.flat)}</span>`;
      } else if (r.note) {
        rateP.innerHTML = `<span class="rate-free">${r.note}</span>`;
      }
      art.appendChild(rateP);

      const note = key === 'first_light'
        ? 'Per MJ. For new settlements; read but not billed for the first three cycles.'
        : `Per MJ. ${r.for}.`;
      art.appendChild(el('p', 'plan-note', note));
      container.appendChild(art);
    });
  }

  function renderFacts(facts, timelines) {
    const container = document.getElementById('factsGrid');
    if (!container) return;
    const yearsSince = facts.present_year - facts.founded;
    const items = [
      { num: yearsSince, label: 'years since founding' },
      { num: 'Meter 112', label: 'oldest account — Earth Reserve Ohio' },
      { num: '1 YJ', label: 'consumed every 41 days' },
      { num: 'JSAC', label: 'regulator — ' + facts.regulator },
      { num: '2087', label: 'Belt households unpaid since' },
      { num: '2093', label: 'Europa paying its own bill since' }
    ];
    container.innerHTML = '';
    items.forEach(item => {
      const div = el('div', 'fact');
      div.appendChild(el('span', 'fact-num', String(item.num)));
      div.appendChild(el('span', 'fact-label', item.label));
      container.appendChild(div);
    });

    // Update hero stats if elements exist
    const activeMeters = document.getElementById('activeMeters');
    if (activeMeters) activeMeters.textContent = formatNumber(facts.active_meters);
    const readInterval = document.getElementById('readInterval');
    if (readInterval) readInterval.textContent = facts.read_interval_seconds + 's';
    const estimatedReads = document.getElementById('estimatedReads');
    if (estimatedReads) estimatedReads.textContent = String(facts.estimated_reads_since_founding);
    const foundedYear = document.getElementById('foundedYear');
    if (foundedYear) foundedYear.textContent = String(facts.founded);
    const presentYear = document.getElementById('presentYear');
    if (presentYear) presentYear.textContent = String(facts.present_year);
  }

  function renderLedger(routes) {
    const container = document.getElementById('ledgerEntries');
    if (!container) return;
    container.innerHTML = '';
    routes.forEach(route => {
      const div = el('div', 'ledger-entry');
      div.appendChild(el('span', 'ledger-route', route.name));
      div.appendChild(el('span', 'ledger-places', route.places.join(' · ')));
      div.appendChild(el('span', 'ledger-status', route.status));
      container.appendChild(div);
    });
  }

  function kindLabel(kind) {
    const map = {
      statement: 'Official statement',
      comment: 'Comment',
      complaint: 'Complaint',
      acknowledgment: 'Acknowledgment',
      footnote: 'Correction to record'
    };
    return map[kind] || kind;
  }

  function renderStream(events, personas) {
    const container = document.getElementById('streamEntries');
    if (!container) return;
    if (!events || events.length === 0) {
      container.innerHTML = '<p class="stream-empty">No notices this cycle.</p>';
      return;
    }

    const personaMap = {};
    personas.forEach(p => { personaMap[p.id] = p; });

    const sorted = events.slice().sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    container.innerHTML = '';

    sorted.forEach(ev => {
      const persona = personaMap[ev.persona_id] || { name: ev.persona_id, type: ev.role };
      const article = el('article', `stream-entry stream-${ev.role}`);
      article.dataset.role = ev.role;

      const header = el('div', 'stream-header');
      header.appendChild(el('span', 'stream-kind', kindLabel(ev.kind)));
      header.appendChild(el('time', 'stream-time', ev.timestamp.replace('T', ' ').replace('Z', '')));
      article.appendChild(header);

      const title = el('h3', 'stream-title', ev.title);
      article.appendChild(title);

      const body = el('p', 'stream-body', ev.body);
      article.appendChild(body);

      const footer = el('div', 'stream-footer');
      const byline = el('span', 'stream-byline');
      byline.innerHTML = `— <strong>${persona.name}</strong> <span class="stream-role">${ev.role}</span>`;
      footer.appendChild(byline);

      if (ev.caused_by) {
        const reply = el('span', 'stream-reply', `re: ${ev.caused_by}`);
        footer.appendChild(reply);
      }

      const tags = el('span', 'stream-tags');
      tags.textContent = ev.tags.join(' · ');
      footer.appendChild(tags);

      article.appendChild(footer);
      container.appendChild(article);
    });

    // Wire filter buttons
    document.querySelectorAll('.stream-filter').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.stream-filter').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const filter = btn.dataset.filter;
        container.querySelectorAll('.stream-entry').forEach(entry => {
          entry.style.display = (filter === 'all' || entry.dataset.role === filter) ? '' : 'none';
        });
      });
    });
  }

  function renderPersonas(personas) {
    const container = document.getElementById('personasList');
    if (!container) return;
    if (!personas || personas.length === 0) {
      container.innerHTML = '<p class="stream-empty">No voices on record.</p>';
      return;
    }

    container.innerHTML = '';
    personas.forEach(p => {
      const art = el('article', 'persona-card');
      const typeClass = `persona-type persona-${p.type}`;
      art.innerHTML = `
        <h3>${p.name}</h3>
        <p class="${typeClass}">${p.type}</p>
        <p class="persona-role">${p.role}</p>
        <p class="persona-voice">${p.voice}</p>
        <ul class="persona-traits">
          ${(p.traits || []).map(t => `<li>${t}</li>`).join('')}
        </ul>
        <p class="persona-stance">Stance: ${p.stance}</p>
        <p class="persona-seen">First seen ${p.first_seen}</p>
      `;
      container.appendChild(art);
    });
  }

  function renderCycle(meta) {
    const cycle = (meta && meta.cycle) || FALLBACK.meta.cycle;
    const cycleTime = document.getElementById('cycleTime');
    if (cycleTime) {
      cycleTime.textContent = cycle;
      cycleTime.setAttribute('datetime', cycle);
    }
    // Keep page title and meta description in sync if they still contain a cycle string.
    const title = document.querySelector('title');
    if (title) title.textContent = title.textContent.replace(/Statement Cycle\s+[\d.]+/, 'Statement Cycle ' + cycle);
    const desc = document.querySelector('meta[name="description"]');
    if (desc) desc.content = desc.content.replace(/Present statement cycle\s+[\d.]+/, 'Present statement cycle ' + cycle);
    document.querySelectorAll('p').forEach(p => {
      if (p.textContent.includes('Statement cycle ')) {
        p.textContent = p.textContent.replace(/Statement cycle\s+[\d.]+/, 'Statement cycle ' + cycle);
      }
    });
  }

  function init(data) {
    renderCycle(data.meta || FALLBACK.meta);
    renderChart(data.mix || FALLBACK.mix);
    renderLegend(data.mix || FALLBACK.mix);
    renderPlans(data.rates || FALLBACK.rates);
    renderFacts(data.facts || FALLBACK.facts, data.timelines || FALLBACK.timelines);
    renderLedger(data.routes || FALLBACK.routes);
    renderStream(data.events || FALLBACK.events, data.personas || FALLBACK.personas);
    renderPersonas(data.personas || FALLBACK.personas);
  }

  // Fetch live data shard; fallback if missing or fails.
  fetch('/data/site.json')
    .then(r => r.ok ? r.json() : Promise.reject(new Error('status ' + r.status)))
    .then(data => init(data))
    .catch(err => {
      console.warn('Could not load /data/site.json, using fallback.', err);
      init(FALLBACK);
    });
})();
