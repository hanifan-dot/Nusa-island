// =========================================================
//  NUSA ISLAND — Tahap 2A: misi harian, reputasi, pertemanan NPC
// =========================================================
(() => {
"use strict";
const N = () => window.Nusa;
const $ = (id) => document.getElementById(id);

const NPC_NAMES = { darto: "Pak Darto", sari: "Bu Sari", dika: "Dika" };
const REP_LEVELS = [[0, "Pendatang"], [3, "Warga Baru"], [8, "Warga Akrab"], [15, "Nelayan Muda"], [25, "Kebanggaan Kampung"], [40, "Legenda Muara"]];
const repLevel = (r) => { let cur = REP_LEVELS[0], next = null; for (const lv of REP_LEVELS) { if (r >= lv[0]) cur = lv; else { next = lv; break; } } return { name: cur[1], at: cur[0], next }; };

// ---------- Template misi ----------
// p = progres, n = target. Teks dibuat ulang saat ditampilkan.
const fishName = (id) => (N().FISH_BY_ID[id] || {}).name || id;
const TEMPLATES = {
  catch_any: { w: 3, make: (r) => ({ n: 3 + Math.floor(r() * 3), coins: 90, stars: 1 }), text: (m) => `Tangkap ${m.n} ikan (bukan sampah)`, icon: "🎣" },
  catch_species: { w: 3, make: (r) => ({ fish: ["nila", "mujair", "patin", "gabus"][Math.floor(r() * 4)], n: 1, coins: 120, stars: 1 }), text: (m) => `Tangkap ${fishName(m.fish)}`, icon: "🐟", hint: (m) => (m.fish === "patin" || m.fish === "gabus" ? "Ikan langka — lempar jauh supaya lebih hoki." : "") },
  sell: { w: 2, make: (r) => ({ n: [150, 200, 300][Math.floor(r() * 3)], coins: 80, stars: 1 }), text: (m) => `Jual ikan senilai 🪙 ${N().fmt(m.n)}`, icon: "🏪" },
  perfect: { w: 2, make: (r) => ({ n: 2 + Math.floor(r() * 2), coins: 70, stars: 1 }), text: (m) => `Lakukan ${m.n}× Lemparan Sempurna`, icon: "✨" },
  deliver: { w: 3, make: (r) => { const opt = [["darto", "nila"], ["darto", "mujair"], ["sari", "nila"], ["sari", "lele"], ["dika", "sandal"]][Math.floor(r() * 5)]; return { npc: opt[0], fish: opt[1], n: 1, coins: 150, stars: 2 }; }, text: (m) => `Antar ${fishName(m.fish)} ke ${NPC_NAMES[m.npc]}`, icon: "🎁", hint: (m) => (m.fish === "lele" ? "Lele hanya muncul malam hari." : m.fish === "sandal" ? "Sandal jepit kadang tersangkut di kail." : "") },
  talk: { w: 1, make: (r) => ({ npc: ["darto", "sari", "dika"][Math.floor(r() * 3)], n: 1, coins: 40, stars: 1 }), text: (m) => `Ngobrol dengan ${NPC_NAMES[m.npc]}`, icon: "💬" },
  night: { w: 2, make: () => ({ n: 1, coins: 110, stars: 1 }), text: () => "Tangkap ikan di malam hari", icon: "🌙", hint: () => "Malam mulai pukul 19:00. Tidur di Rumahku untuk melewati malam." },
  trash: { w: 1, make: () => ({ n: 2, coins: 90, stars: 1 }), text: (m) => `Bersihkan muara: angkat ${m.n} sampah`, icon: "♻️", hint: () => "Sampah ikut tersangkut saat memancing. Jangan dibuang lagi ke laut!" },
};

// ---------- Periode misi ----------
// Satu periode = satu tanggal kalender di perangkat (reset 00:00), BUKAN hari di dalam game
// yang berganti tiap 8 menit. Isi misi diturunkan dari periodId (deterministik), jadi server
// nanti bisa membuat ulang daftar yang sama dan memvalidasi progres & klaim.
function periodId(d = new Date()) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }
function msToReset() { const n = new Date(), m = new Date(n.getFullYear(), n.getMonth(), n.getDate() + 1); return m - n; }
const hashStr = (s) => { let h = 2166136261; for (const ch of s) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
function rngFor(seed) { let s = (seed * 2654435761) >>> 0 || 3; return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 100000) / 100000; }; }

function generate(period, tutorial) {
  if (tutorial) { // misi perkenalan
    return [
      Object.assign({ type: "catch_any" }, { n: 2, coins: 60, stars: 1 }),
      Object.assign({ type: "talk" }, { npc: "darto", n: 1, coins: 40, stars: 1 }),
      Object.assign({ type: "sell" }, { n: 50, coins: 60, stars: 1 }),
    ].map((m, i) => init(m, period, i, "t"));
  }
  const day = Object.keys(N().S.missionLog || {}).length + 1;
  const r = rngFor(hashStr(period)), list = [], used = new Set();
  const pool = Object.keys(TEMPLATES).filter((k) => !(k === "night" && day < 2));
  while (list.length < 3) {
    let total = 0; for (const k of pool) if (!used.has(k)) total += TEMPLATES[k].w;
    let roll = r() * total, pickK = null;
    for (const k of pool) { if (used.has(k)) continue; roll -= TEMPLATES[k].w; if (roll <= 0) { pickK = k; break; } }
    if (!pickK) pickK = pool.find((k) => !used.has(k));
    used.add(pickK);
    const m = Object.assign({ type: pickK }, TEMPLATES[pickK].make(r));
    // hadiah naik sedikit seiring hari
    m.coins = Math.round(m.coins * (1 + Math.min(day, 15) * 0.06));
    list.push(init(m, period, list.length, "d"));
  }
  return list;
}
function init(m, period, i, kind) { return Object.assign(m, { id: `${period}#${kind}${i}:${m.type}`, p: 0, done: false, claimed: false }); }

function ensure() {
  const S = N().S, period = periodId();
  S.missionLog = S.missionLog || {};
  if (S.missions && Array.isArray(S.missions.list) && !S.missions.period) {
    // misi lama (Tahap 2A, per hari game) → jadikan periode hari ini, progres & klaim tetap
    S.missions.period = period;
    S.missions.list.forEach((m, i) => { if (!m.id) m.id = `${period}#m${i}:${m.type}`; if (m.claimed) logClaim(m); });
  }
  if (!S.missions || S.missions.period !== period || !Array.isArray(S.missions.list)) {
    // jenis set per periode dicatat, jadi membuat ulang periode yang sama selalu menghasilkan misi (dan ID) yang sama
    S.missionKinds = S.missionKinds || {};
    if (!S.missionKinds[period]) S.missionKinds[period] = !S.missionsTutorialDone && S.stats.caught === 0 ? "t" : "d";
    const tutorial = S.missionKinds[period] === "t";
    S.missions = { period, list: generate(period, tutorial) };
    if (tutorial) S.missionsTutorialDone = true;
    const kk = Object.keys(S.missionKinds).sort(); while (kk.length > 14) delete S.missionKinds[kk.shift()];
    // klaim yang sudah tercatat untuk periode ini tetap dianggap sudah diambil
    const claimed = new Set(S.missionLog[period] || []);
    S.missions.list.forEach((m) => { if (claimed.has(m.id)) { m.claimed = true; m.done = true; m.p = m.n; } });
    // simpan log 14 periode terakhir saja
    const keys = Object.keys(S.missionLog).sort(); while (keys.length > 14) delete S.missionLog[keys.shift()];
  }
  return S.missions.list;
}
function logClaim(m) { const S = N().S, p = S.missions.period; (S.missionLog[p] = S.missionLog[p] || []); if (!S.missionLog[p].includes(m.id)) S.missionLog[p].push(m.id); }
const isClaimed = (m) => m.claimed || ((N().S.missionLog[N().S.missions.period] || []).includes(m.id));
function advance(pred, amount = 1) {
  let changed = false;
  for (const m of ensure()) {
    if (m.done || !pred(m)) continue;
    m.p = Math.min(m.n, m.p + amount); changed = true;
    if (m.p >= m.n) {
      m.done = true;
      N().toast(`✅ Misi selesai: ${TEMPLATES[m.type].text(m)}. Ambil hadiah di 📋`, "good");
      N().tone(784, 0.12, "triangle", 0.1); N().tone(1047, 0.2, "triangle", 0.1, null, 0.12);
    }
  }
  if (changed) { refreshBadge(); N().save(); if (N().currentPanel() === "missions") N().renderPanel(); }
}

// ---------- Hubungkan dengan event game ----------
function hook() {
  const g = N();
  g.on("catch", ({ fish, night }) => {
    const junk = fish.rarity === "sampah";
    advance((m) => m.type === "catch_any" && !junk);
    advance((m) => m.type === "catch_species" && m.fish === fish.id);
    advance((m) => m.type === "night" && night && !junk);
    advance((m) => m.type === "trash" && junk);
  });
  g.on("sell", (amount) => advance((m) => m.type === "sell", amount));
  g.on("perfect", () => advance((m) => m.type === "perfect"));
  g.on("day", () => { ensure(); refreshBadge(); }); // hari game tidak mengganti misi; hanya cek periode
  setInterval(() => { if (N().S.missions && N().S.missions.period !== periodId()) { ensure(); refreshBadge(); N().toast("📋 Misi harian baru tersedia!", "good"); } }, 30000);
  g.registerPanel("missions", { title: () => "📋 Misi Harian", render: renderPanel, act });
  ensure(); refreshBadge();
}

// dipanggil dunia pulau saat ngobrol dengan NPC
function talked(npcId) {
  const S = N().S;
  advance((m) => m.type === "talk" && m.npc === npcId);
  if (!S.talked[npcId]) { S.talked[npcId] = true; addFriend(npcId, 0.34); }
}
function addFriend(npcId, amt) {
  const S = N().S, before = Math.floor(S.friends[npcId] || 0);
  S.friends[npcId] = Math.min(5, (S.friends[npcId] || 0) + amt);
  const after = Math.floor(S.friends[npcId]);
  if (after > before) N().toast(`❤️ Pertemanan dengan ${NPC_NAMES[npcId]} naik!`, "good");
}
const hearts = (npcId) => { const h = Math.floor(N().S.friends[npcId] || 0); return "❤️".repeat(h) + "🤍".repeat(5 - h); };

// pilihan "Berikan ikan" bila ada misi antar untuk NPC ini dan ikannya ada di coolbox
function deliverOption(npcId) {
  const S = N().S;
  const m = ensure().find((x) => x.type === "deliver" && x.npc === npcId && !x.done);
  if (!m) return null;
  const idx = S.cooler.findIndex((it) => it.id === m.fish && !it.lock); // ikan terkunci tidak pernah ikut terambil
  if (idx < 0) {
    const locked = S.cooler.some((it) => it.id === m.fish && it.lock);
    return { missing: true, text: locked ? `Aku butuh ${fishName(m.fish)}. Ikanmu masih terkunci 🔒, buka kuncinya di Inventaris kalau mau memberikannya.` : `Aku lagi butuh ${fishName(m.fish)}. Kalau dapat, bawa ke sini ya!` };
  }
  return {
    label: `🎁 Berikan ${fishName(m.fish)}`,
    act: () => {
      { const gone = S.cooler.splice(idx, 1)[0]; if (NW.eco && gone) NW.eco.drop([gone.uid]); } addFriend(npcId, 1);
      advance((x) => x === m); N().refreshHUD();
    },
  };
}

// ikan yang sedang dibutuhkan misi aktif (dipakai pasar untuk memperingatkan sebelum menjual)
function fishNeeds() {
  return ensure().filter((m) => m.type === "deliver" && !m.done).map((m) => ({ ids: [m.fish], n: 1, why: `Misi harian: antar ${fishName(m.fish)} ke ${NPC_NAMES[m.npc]}` }));
}

// ---------- Panel ----------
function renderPanel() {
  const S = N().S, list = ensure(), lv = repLevel(S.rep);
  const toNext = lv.next ? `${lv.next[0] - S.rep} ⭐ lagi menuju ${lv.next[1]}` : "Level tertinggi!";
  const pct = lv.next ? ((S.rep - lv.at) / (lv.next[0] - lv.at)) * 100 : 100;
  let h = `<div class="rep-card"><div class="rep-star">⭐ ${S.rep}</div><div class="grow"><b>${lv.name}</b><div class="muted">${toNext}</div>
    <div class="progress-line"><div style="width:${pct.toFixed(0)}%"></div></div></div></div>
    <p class="muted">Maksimal 3 misi per hari. Misi baru dalam <b>${(() => { const ms = msToReset(), hh = Math.floor(ms / 3600000), mm = Math.floor((ms % 3600000) / 60000); return `${hh} jam ${mm} menit`; })()}</b> (pukul 00:00 di perangkatmu).</p><div class="list">`;
  list.forEach((m, i) => {
    const T = TEMPLATES[m.type], hint = T.hint ? T.hint(m) : "";
    const showP = m.type === "sell" ? `🪙 ${N().fmt(m.p)} / ${N().fmt(m.n)}` : `${m.p} / ${m.n}`;
    h += `<div class="mission ${m.done ? "done" : ""} ${m.claimed ? "claimed" : ""}">
      <div class="m-ic">${T.icon}</div>
      <div class="grow"><div class="nm">${T.text(m)}</div>
        <div class="bar-mini"><div style="width:${((m.p / m.n) * 100).toFixed(0)}%"></div></div>
        <div class="sub">${showP} · Hadiah 🪙 ${N().fmt(m.coins)} + ${"⭐".repeat(m.stars)}${hint ? " · " + hint : ""}</div></div>
      ${isClaimed(m) ? `<span class="muted">✔ Diambil</span>` : m.done ? `<button class="btn gold small" data-act="claim" data-arg="${i}">Ambil</button>` : ""}</div>`;
  });
  h += `</div><h3 class="sub-h">Pertemanan</h3><div class="list">`;
  for (const id of ["darto", "sari", "dika"]) h += `<div class="row friend"><div class="grow"><div class="nm">${NPC_NAMES[id]}</div></div><div class="hearts">${hearts(id)}</div></div>`;
  return h + `</div>`;
}
function act(a, arg) {
  if (a !== "claim") return;
  const S = N().S, m = ensure()[+arg];
  if (!m || !m.done || isClaimed(m)) return; // hadiah hanya sekali
  if (NW.eco && NW.eco.active()) {   // Ekonomi server: koin misi dibayar server (batas wajar, sekali per misi)
    if (m.pending) return; m.pending = true;
    NW.eco.mission(m, () => { delete m.pending; m.claimed = true; logClaim(m); S.rep += m.stars; N().sfx("coin"); N().toast(`+🪙 ${N().fmt(m.coins)} · +${m.stars} ⭐`, "good"); N().save(); N().refreshHUD(); N().renderPanel(); }, () => { delete m.pending; });
    return;
  }
  m.claimed = true; logClaim(m); S.money += m.coins; S.rep += m.stars;
  N().sfx("coin"); N().toast(`+🪙 ${N().fmt(m.coins)} · +${m.stars} ⭐`, "good");
  N().save(); N().refreshHUD(); N().renderPanel();
}
function claimable() { return ensure().filter((m) => m.done && !isClaimed(m)).length; }
function refreshBadge() {
  const b = $("misiBadge"); if (!b) return;
  const n = claimable(); b.textContent = n; b.classList.toggle("hidden", !n);
}

NW.life = { fishNeeds, periodId, msToReset, hook, talked, deliverOption, hearts, addFriend, claimable, refreshBadge, repLevel, ensure, NPC_NAMES };
})();
