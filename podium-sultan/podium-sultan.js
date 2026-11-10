// NUSA ISLAND — Podium Sultan Samudra (klien, Desain 4: Mercusuar Emas).
// Simbol penghargaan koleksi: TIDAK memberi kekuatan/bonus memancing/keuntungan permainan. Modul ini hanya MENAMPILKAN data publik dari server
// (peringkat, nama tampilan, poin, gelar). Tanpa polling: satu pemanggilan saat dibuka + muat-ulang manual dengan jeda 5 menit. Bawaan MATI (enabled=false).
// Integrasi: PodiumSultan.mount(elemen, { enabled, call: (nama, data) => callable })  — `call` = pemanggil fungsi pemain yang SUDAH ada di game.
(function (root, factory) { const m = factory(); if (typeof module === 'object' && module.exports) module.exports = m; else root.PodiumSultan = m; })(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const ANON = 'Sultan Anonim', COOLDOWN_MS = 300000;
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const clip = (s, n) => { s = String(s).replace(/[\u0000-\u001f\u007f<>]/g, '').trim(); return s.length > n ? s.slice(0, n - 1) + '…' : s; };

  /** Saring respons server: hanya {rank,name,points,title}; bidang lain (mis. uid) DIBUANG; maksimal 3; urut peringkat. */
  function model(res) {
    if (!res || typeof res !== 'object') return { status: 'unavailable', entries: [] };
    if (res.status === 'inactive') return { status: 'inactive', entries: [] };
    if (res.status !== 'ok' || !Array.isArray(res.entries)) return { status: 'unavailable', entries: [] };
    const seen = new Set(), entries = [];
    for (const e of res.entries.slice(0, 6)) {
      if (!e || !Number.isInteger(e.rank) || e.rank < 1 || e.rank > 3 || seen.has(e.rank) || !Number.isInteger(e.points) || e.points < 0 || e.points > 1000000) continue;
      seen.add(e.rank); entries.push({ rank: e.rank, name: clip(typeof e.name === 'string' ? e.name : '', 24) || ANON, points: e.points, title: clip(typeof e.title === 'string' ? e.title : '', 24) });
    }
    entries.sort((a, b) => a.rank - b.rank);
    return { status: 'ok', entries };
  }

  // Tata letak: #2 kiri, #1 tengah (lebih tinggi), #3 kanan. Menara bulat batu, pita merah-putih ala mercusuar, lentera hangat. Ringan untuk HP (tanpa filter/blur).
  const SLOT = { 1: { cx: 180, h: 118 }, 2: { cx: 66, h: 76 }, 3: { cx: 294, h: 52 } }, BASE = 296, R = 54, MEDAL = { 1: '#f2c94c', 2: '#dfe6ea', 3: '#c98a4b' };
  function drum(rank) {
    const { cx, h } = SLOT[rank], top = BASE - h;
    const bands = rank === 1 ? [0, 1, 2, 3].map((k) => `<rect x="${cx - R}" y="${BASE - 28 - k * 24 - 12}" width="${R * 2}" height="12" fill="${k % 2 ? '#f6f1ea' : '#d9453d'}"/>`).join('') : `<rect x="${cx - R}" y="${BASE - 30}" width="${R * 2}" height="14" fill="${rank === 2 ? '#d9453d' : '#2fa3b8'}"/>`;
    return `<g class="ps-drum" data-rank="${rank}"><ellipse cx="${cx}" cy="${BASE}" rx="${R}" ry="${R / 2.2}" fill="#aeb9b6"/><rect x="${cx - R}" y="${top}" width="${R * 2}" height="${h}" fill="#c9d3d0"/>${bands}` +
      `<ellipse cx="${cx}" cy="${BASE}" rx="${R}" ry="${R / 2.2}" fill="none" stroke="#fff" stroke-width="2" clip-path="inset(50% 0 0 0)"/><ellipse cx="${cx}" cy="${top}" rx="${R}" ry="${R / 2.2}" fill="#e9efed" stroke="${rank === 1 ? '#f2c94c' : '#fff'}" stroke-width="3"/>` +
      `<circle cx="${cx}" cy="${top + h / 2 + 8}" r="13" fill="${MEDAL[rank]}" stroke="#173f50" stroke-width="2"/><text x="${cx}" y="${top + h / 2 + 14}" text-anchor="middle" font-size="16" font-weight="700" fill="#173f50">${rank}</text></g>`;
  }
  function lantern(cx) { return `<g class="ps-lantern"><rect x="${cx - 2}" y="${BASE - 60}" width="4" height="46" fill="#4a3520"/><circle cx="${cx}" cy="${BASE - 66}" r="8" fill="#fff0b0" stroke="#e0b84c" stroke-width="2"/></g>`; }
  function plate(e) {
    const { cx } = SLOT[e.rank], x = cx - 54, nm = e.name.length > 12 ? e.name.slice(0, 11) + '…' : e.name;
    return `<g class="ps-plate" data-rank="${e.rank}"><title>${esc(e.rank + '. ' + e.name + ' — ' + e.points + ' Poin Koleksi — ' + e.title)}</title><rect x="${x}" y="316" width="108" height="64" rx="10" fill="#fff9ec" stroke="#e0b84c" stroke-width="2.5"/>` +
      `<text x="${cx}" y="336" text-anchor="middle" font-size="14" font-weight="700" fill="#173f50">${esc(nm)}</text><text x="${cx}" y="354" text-anchor="middle" font-size="12.5" font-weight="700" fill="#8a6412">${e.points} Poin Koleksi</text>` +
      `<text x="${cx}" y="371" text-anchor="middle" font-size="12" font-weight="600" fill="#173f50">${esc(e.title)}</text></g>`;
  }
  /** Markup SVG (semua teks dari server di-escape). */
  function svgMarkup(m) {
    const by = Object.fromEntries(m.entries.map((e) => [e.rank, e]));
    const body = [2, 3, 1].map(drum).join('') + lantern(14) + lantern(346) + (m.entries.length ? m.entries.map(plate).join('') : '<text x="180" y="350" text-anchor="middle" font-size="14" fill="#fff0b0">Belum ada Sultan Samudra</text>');
    return `<svg class="ps-svg" viewBox="0 0 360 396" role="img" aria-label="Podium Sultan Samudra: ${esc(m.entries.map((e) => e.rank + ' ' + e.name).join(', ') || 'belum ada')}"><rect width="360" height="396" rx="18" fill="#173f50"/><ellipse cx="180" cy="300" rx="170" ry="34" fill="#5d8f6a"/>${body}${by[1] ? `<text x="180" y="22" text-anchor="middle" font-size="15" font-weight="700" fill="#f2c94c">PODIUM SULTAN SAMUDRA</text>` : '<text x="180" y="22" text-anchor="middle" font-size="15" font-weight="700" fill="#f2c94c">PODIUM SULTAN SAMUDRA</text>'}</svg>`;
  }

  /** Pasang ke elemen. enabled=false (bawaan) → tidak memanggil server dan tidak menggambar apa pun. */
  function mount(el, { enabled = false, call, now = Date.now } = {}) {
    if (!enabled || !el || typeof call !== 'function') return { status: 'off', refresh: async () => null, destroy() {} };
    let last = 0, anon = false, alive = true;
    const draw = (m, me) => {
      if (!alive) return;
      el.innerHTML = `<section class="ps-wrap">${svgMarkup(m)}<p class="ps-note">Simbol penghargaan koleksi — tanpa bonus permainan.</p>` +
        (me && me.status === 'ok' ? `<p class="ps-me">${me.points} Poin Koleksi${me.title ? ' · ' + esc(me.title) : ''}</p><button type="button" class="ps-anon" data-testid="ps-anon" aria-pressed="${anon}">${anon ? 'Tampilkan nama saya' : 'Tampil sebagai Sultan Anonim'}</button>` : '') +
        `<button type="button" class="ps-reload" data-testid="ps-reload">Muat ulang</button></section>`;
      const a = el.querySelector && el.querySelector('[data-testid="ps-anon"]'), r = el.querySelector && el.querySelector('[data-testid="ps-reload"]');
      if (a) a.addEventListener('click', async () => { const res = await call('sultanPrefs', { anon: !anon }); if (res && res.status === 'ok') { anon = res.anon === true; last = 0; await refresh(true); } });
      if (r) r.addEventListener('click', () => refresh(false));
    };
    async function refresh(force) {
      if (!alive) return null;
      if (!force && last && now() - last < COOLDOWN_MS) return null;   // tanpa spam: server meng-cache 5 menit
      last = now();
      let m, me = null;
      try { m = model(await call('sultanTop', {})); if (m.status === 'ok') { me = await call('sultanMe', {}); if (me && me.status === 'ok') anon = me.anon === true; } } catch { m = { status: 'unavailable', entries: [] }; }
      if (m.status === 'inactive') { if (alive) el.innerHTML = ''; return m; }   // fitur MATI di server: tidak menampilkan apa pun
      draw(m, me); return m;
    }
    refresh(true);
    return { status: 'on', refresh, destroy() { alive = false; } };
  }
  return { model, svgMarkup, mount, ANON, COOLDOWN_MS };
});
