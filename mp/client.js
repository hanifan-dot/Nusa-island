// =========================================================
//  NUSA ISLAND — Tahap 4: klien Dunia Bersama (NW.mp)
//  - Hanya untuk akun Google nyata yang sudah menyetujui. Tanpa pemain palsu: yang tampil = koneksi nyata di server.
//  - Mengirim HANYA posisi/arah/bendera tampilan/nama/chat/emoji. Tidak ada koin, item, atau save yang lewat jalur ini.
//  - Hemat HP & data: kirim ≤4×/detik hanya saat bergerak, heartbeat 15 dtk saat diam, berhenti saat tab tersembunyi,
//    menerima hanya perubahan (delta), mode "Hemat data" ≈1,7 paket/detik, maksimal 12 pemain digambar.
//  - Server memutuskan segalanya (kapasitas, kecepatan, chat); klien hanya menampilkan.
// =========================================================
(function () {
"use strict";
window.NW = window.NW || {};
const P = NW.MPProto;
if (!P) return;
const N = () => window.Nusa;
const PREF_KEY = "nusa-mp-prefs-v1";
const loadPrefs = () => { try { return Object.assign({ consent: null, on: true, chat: true, low: false }, JSON.parse(localStorage.getItem(PREF_KEY) || "{}")); } catch (e) { return { consent: null, on: true, chat: true, low: false }; } };
let prefs = loadPrefs();
const savePrefs = () => { try { localStorage.setItem(PREF_KEY, JSON.stringify(prefs)); } catch (e) {} };

const R = { house: null, fails: 0, kickedAt: {}, roomNo: 0, vcount: 0, want: null, resume: null, pending: null, manualLeave: false, err: null, rooms: null, roomsAt: 0, hbSent: 0, helloAt: 0, holdSent: undefined, ws: null, state: "off", why: "", me: null, room: "", n: 0, cap: P.ROOM_CAP, players: new Map(), log: [], self: { bubble: null, emote: null }, typing: false,
  tx: 0, rx: 0, lastProf: 0, profKey: "", gotWelcomeEver: false, listeners: [], retry: 0, nextTry: 0, lastSend: 0, lastHb: 0, sent: null, hiddenAt: 0, vis: false, endpoint: undefined, helloSent: false, gotWelcome: false };
const emit = () => R.listeners.forEach((f) => { try { f(); } catch (e) {} });
const setState = (s, why) => { if (R.state !== s || (why !== undefined && why !== R.why)) { R.state = s; if (why !== undefined) R.why = why; emit(); } };
const now = () => performance.now();
const user = () => (NW.cloud && NW.cloud.user) || null;

// ---------- apakah boleh jalan? ----------
function testMode() { return !!(NW.cloud && NW.cloud.demo && window.NUSA_MP_TEST); }   // celah uji, HANYA di mode demo
function backendReady() { return testMode() || !!(NW.cloud && NW.cloud.adapter && NW.cloud.adapter.idToken && !NW.cloud.demo); }
async function findEndpoint() {
  if (testMode()) return window.NUSA_MP_TEST.ws;
  const cfg = window.NUSA_FIREBASE && window.NUSA_FIREBASE.mpBase; if (cfg && /^wss?:\/\//.test(cfg)) return cfg.replace(/\/+$/, "");
  try { const r = await fetch("mp/endpoint.json", { cache: "no-store" }); if (r.ok) { const j = await r.json(); if (j && typeof j.ws === "string" && /^wss:\/\//.test(j.ws)) return j.ws.replace(/\/+$/, ""); } } catch (e) { /* tidak ada berkas = belum diaktifkan */ }
  return null;
}
async function getToken() {
  if (testMode()) return window.NUSA_MP_TEST.token(user().uid);
  return NW.cloud.adapter.idToken();
}

// ---------- keadaan lokal pemain ----------
// Kunjungi Rumah Teman: bila sedang di Rumahku (sendiri atau rumah teman) target = ruang RUMAH (id publik dari NW.house, bukan input pemain mentah); selain itu Muara.
const wantHouse = () => { try { return (NW.house && NW.house.roomWanted && NW.house.roomWanted()) || null; } catch (e) { return null; } };
const gz = (x, y) => (R.house ? 0 : NW.groundZ ? NW.groundZ(x, y) : 0);
const homeScene = () => (NW.home && NW.home.active ? NW.home.scene : null);
function local() {
  const w = NW.world && NW.world.player, mode = N().mode(), a = NW.areas && NW.areas.cur;
  if (R.house) {
    if (!w) return { vis: false };
    const sc = homeScene(), vis = !!sc && N().isStarted();
    return { vis, x: w.x, y: w.y, d: w.dir | 0, f: (w.moving ? P.F.MOVING : 0) | (w.sit ? P.F.SIT : 0) | (sc === "room" ? P.F.IN : 0) };
  }
  const fishing = mode === "fish" && N().fishFrom() === "dock";
  const inMuara = !!a && a.id === P.AREA && !(NW.home && NW.home.active) && !(NW.boat && NW.boat.on);
  const vis = !!w && inMuara && (mode === "world" || fishing) && N().isStarted();
  if (!w) return { vis: false };
  return { vis, x: w.x, y: w.y, d: w.dir | 0, f: (w.moving && !fishing ? P.F.MOVING : 0) | (w.sit ? P.F.SIT : 0) | (fishing ? P.F.FISH : 0) };
}
function profile() {
  let name = "Pemancing", rank = 0; try { name = NW.look.playerName(); rank = NW.look.rank ? NW.look.rank() : 0; } catch (e) {}
  return { n: name, r: rank | 0, rd: Math.max(0, Math.min(9, (N().S.up && N().S.up.rod) | 0)) };
}

// ---------- jam server (siang/malam sama untuk semua pemain di server yang sama) ----------
// Jam HP TIDAK dipakai. Sampel: jam server `st` dari pesan welcome/heartbeat, dikoreksi setengah RTT, lalu dijalankan dengan performance.now()
// (monoton, tidak terpengaruh ubah jam HP). Koreksi kecil dihaluskan; hanya selisih >1,5 dtk yang langsung diganti.
const CK = { have: false, srv: 0, perf: 0 };
const serverNow = (t) => CK.srv + ((t === undefined ? now() : t) - CK.perf);
function clockSample(st, sentAt) {
  if (!Number.isFinite(st)) return;
  const t1 = now(), rtt = sentAt ? Math.max(0, t1 - sentAt) : 150;
  if (rtt > 4000) return;                                        // sampel terlalu lambat tidak dipercaya
  const est = st + rtt / 2;
  if (!CK.have || Math.abs(est - serverNow(t1)) > 1500) { CK.srv = est; CK.perf = t1; CK.have = true; return; }
  CK.srv = serverNow(t1) + (est - serverNow(t1)) * (rtt < 400 ? 0.3 : 0.1); CK.perf = t1;
}
// jam dunia bersama bila tersambung & sedang terlihat di Muara; selain itu null (game memakai jam lokal seperti biasa, tetap berlanjut tanpa lompatan)
function sharedHour() { return R.ws && R.gotWelcome && R.vis && CK.have ? P.sharedHour(serverNow()) : null; }

// ---------- koneksi ----------
function send(o) {
  const ws = R.ws; if (!ws || ws.readyState !== 1) return false;
  const t = JSON.stringify(o); ws.send(t); R.tx += t.length; R.lastSend = now(); return true;
}
function eligible() {
  return !!(NW.cloud && NW.cloud.enabled && user() && backendReady() && prefs.consent === true && prefs.on && N().isStarted());
}
const ERR = { full: (r) => `Server ${r || ""} penuh (${P.ROOM_CAP}/${P.ROOM_CAP}). Coba ID lain atau Gabung Acak.`.replace("Server  ", "Server "), bad_room: () => `ID server harus angka 1–${P.MAX_ROOMS}.`, rate: () => "Terlalu sering berpindah server. Tunggu sebentar lalu coba lagi.", busy: () => "Dunia Bersama sedang tidak tersedia. Coba lagi nanti.", disabled: () => "Dunia Bersama sedang dimatikan oleh pemilik game." };
function wsQuery() {
  const q = R.pending ? R.pending : R.resume ? { room: R.resume } : {};
  const a = []; if (q.room) a.push("room=" + encodeURIComponent(q.room)); else if (q.mode === "random") a.push("mode=random");
  return a.length ? "?" + a.join("&") : "";
}
async function connect() {
  if (R.ws || R.state === "connecting") return;
  setState("connecting", "");
  try {
    if (R.endpoint === undefined) R.endpoint = await findEndpoint();
    if (!R.endpoint) { R.endpoint = undefined; R.nextTry = now() + 60000; return setState("off", "no-endpoint"); }
    const token = await getToken(), target = R.house;
    if (target !== wantHouse() || (target && (R.kickedAt[target] || 0) > now())) { setState("off", ""); return; }   // pindah ruang / dikeluarkan saat menunggu token
    const ws = new WebSocket(R.endpoint + "/ws" + (target ? "?h=" + encodeURIComponent(target) : wsQuery()), [P.SUBPROTOCOL, token]);
    R.ws = ws; R.helloSent = false; R.gotWelcome = false; R.err = null; R.attempt = target ? {} : R.pending || (R.resume ? { room: R.resume, resumed: true } : {});
    ws.onopen = () => { R.retry = 0; helloNow(); };
    ws.onmessage = (e) => { R.rx += (e.data || "").length; try { onMsg(JSON.parse(e.data), ws); } catch (err) { /* abaikan paket rusak */ } };
    ws.onclose = (e) => onClose(ws, e);
    ws.onerror = () => {};
  } catch (e) {
    R.ws = null; backoff(); setState("error", "gagal-token");
  }
}
function helloNow() {
  const L = local(); if (!L.vis) return;               // masuk hanya bila sedang di Muara (terlihat)
  const p = profile();
  R.helloAt = now();
  if (send({ t: "hello", n: p.n, r: p.r, rd: p.rd, x: P.qz(L.x), y: P.qz(L.y), d: L.d, f: L.f })) { R.helloSent = true; R.sent = { x: L.x, y: L.y, d: L.d, f: L.f }; R.vis = true; R.holdSent = undefined; if (prefs.low) send({ t: "o", lo: 1 }); }
}
function backoff() { R.retry = Math.min(R.retry + 1, 6); R.nextTry = now() + Math.min(30000, 1000 * Math.pow(2, R.retry)) * (0.7 + Math.random() * 0.6); }
function reset() { R.players.clear(); R.me = null; R.vis = false; R.helloSent = false; R.gotWelcome = false; R.n = 0; R.vcount = 0; R.holdSent = undefined; }
function onClose(ws, e) {
  if (R.ws !== ws) return;
  R.ws = null; reset();
  const code = e && e.code, why = R.err && R.err.e;
  if (code === 4010 && R.house) { R.kickedAt[R.house] = now() + P.HOUSE.KICK_MS; const h = R.house; setState("kicked", "Pemilik rumah mengeluarkanmu."); if (NW.house && NW.house.onKicked) NW.house.onKicked(h); return; }
  if (R.house && !R.gotWelcomeEver && ++R.fails >= 2 && NW.house && NW.house.onRoomFail) NW.house.onRoomFail(R.house);    // tak bisa masuk ruang: minta server memastikan izin (privat/dikeluarkan)
  if (R.house && code >= 4006 && code <= 4009) { R.nextTry = now() + 20000; return setState("off", "ditolak"); }       // ruang rumah menolak (penuh/laju): jangan menyentuh pilihan server Muara
  if (code === 4002) return setState("replaced", "Akunmu masuk dari perangkat lain.");
  if (code === 4005) return setState("blocked", "Koneksi ditutup karena terlalu banyak pesan tidak sah.");
  if (code >= 4006 && code <= 4009) {                                       // penolakan dari server: pesan jelas, TIDAK dicoba terus-menerus
    const e2 = why || (code === 4006 ? "full" : code === 4007 ? "bad_room" : code === 4008 ? "rate" : "busy"), room = R.err && R.err.room;
    const wasPending = !!R.pending, wasResume = !!(R.attempt && R.attempt.resumed);
    R.pending = null;
    R.lastError = { e: e2, room: room || (R.attempt && R.attempt.room) || null, at: Date.now(), msg: ERR[e2] ? ERR[e2](room || (R.attempt && R.attempt.room)) : "Tidak bisa masuk server." };
    if (wasPending && R.resume && e2 !== "busy" && e2 !== "disabled") { R.nextTry = 0; setState("off", "ditolak"); N().toast(R.lastError.msg, "bad"); return; }   // gagal pindah → kembali ke server sebelumnya
    if (wasResume && e2 === "full") { R.resume = null; R.nextTry = 0; N().toast(`Server ${room} penuh, mencari server lain…`); return setState("off", "ditolak"); }  // server lama penuh → otomatis cari yang lain
    R.nextTry = now() + (e2 === "rate" ? 20000 : 30000); R.manualLeave = e2 === "bad_room" || e2 === "full" ? R.manualLeave : R.manualLeave;
    return setState("off", "ditolak");
  }
  if (R.state === "off" && R.why === "keluar") return;
  if (R.state === "off" && R.why === "pindah") return;
  backoff(); setState(R.gotWelcomeEver ? "reconnecting" : "error", "putus");
}
function disconnect(why) {
  const ws = R.ws; R.ws = null;
  if (ws) { try { ws.close(1000, "bye"); } catch (e) {} }                    // server langsung mengeluarkan kita dari instance lama
  reset(); setState("off", why || "keluar");
}

// ---------- pesan masuk ----------
const SHIRTS = ["#579b8b", "#c2603b", "#4a7fb5", "#b0539b", "#d1a43a", "#6e8f3a", "#8a5ac2", "#c24a4a"], SKINS = ["#c68b5e", "#e0b08a", "#a8704a", "#f0c8a0"], HAIR = ["#2a1d14", "#14110e", "#5a3a20", "#3a2a1a"];
const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };
function setHold(p, h) {                                      // h = [spesies, gram, varian] | 0
  if (!h) { p.hold = null; p.ch.hold = null; return; }
  const k = h[0] + "|" + h[1] + "|" + h[2];
  if (p.holdKey === k && p.ch.hold) return;
  p.holdKey = k; p.hold = { i: h[0], w: h[1], v: h[2] };
  p.ch.hold = NW.hold && NW.hold.remoteFrame ? NW.hold.remoteFrame(p.hold) : null;
}
function upsert(row) {
  const [id, name, rank, rod, qx, qy, d, f, hold] = row;
  let p = R.players.get(id);
  if (!p) {
    const h = hash(id);
    p = { id, name, rank, rod, owner: row[9] === 1, hid: row[10] || "", tx: qx / P.Q, ty: qy / P.Q, d, f, bubble: null, emote: null, at: now(), hold: null,
      ch: { x: qx / P.Q, y: qy / P.Q, dir: d, walk: 0, moving: false, sit: false, rod: 0, seed: (h % 997) / 100, hold: null, rodSpec: NW.look ? NW.look.rodSpec(Math.max(0, Math.min(9, rod | 0))) : null,
        style: { shirt: SHIRTS[h % SHIRTS.length], pants: "#2b3a44", skin: SKINS[(h >> 3) % SKINS.length], hair: HAIR[(h >> 5) % HAIR.length], hat: "caping", collar: "#fff9ec" } } };
    R.players.set(id, p);
  } else { p.name = name; p.rank = rank; p.rod = rod; p.tx = qx / P.Q; p.ty = qy / P.Q; p.d = d; p.f = f; p.at = now(); if (NW.look) p.ch.rodSpec = NW.look.rodSpec(Math.max(0, Math.min(9, rod | 0))); }
  setHold(p, hold);
  return p;
}
function addLog(name, text, mine) { R.log.push({ name, text, t: Date.now(), mine: !!mine }); if (R.log.length > 80) R.log.shift(); }
function onMsg(m, ws) {
  switch (m.t) {
    case "w":
      R.me = m.me; R.room = m.room; R.n = m.n; R.vcount = m.v; R.cap = m.cap; R.players.clear();
      for (const row of m.ps) upsert(row).ch.moving = false;
      R.gotWelcome = true; R.gotWelcomeEver = true; R.fails = 0; R.holdSent = undefined;
      if (m.k !== "house") { R.roomNo = m.rn || parseInt(String(m.room).split("-")[1], 10) || 0; R.resume = R.roomNo; R.pending = null; }   // ruang rumah TIDAK mengganti server Muara yang diingat
      clockSample(m.st, R.helloAt); setTimeout(() => { if (R.ws === ws) { R.hbSent = now(); send({ t: "h" }); } }, 600); setTimeout(() => { if (R.ws === ws) { R.hbSent = now(); send({ t: "h" }); } }, 2500);   // beberapa sampel awal → jam akurat
      setState("online", ""); break;
    case "k": clockSample(m.st, R.hbSent); R.hbSent = 0; break;
    case "cnt": R.n = m.n; R.vcount = m.v; emit(); break;
    case "n": addLog("Sistem", m.r, false); emit(); break;
    case "j": { if (m.p[0] === R.me) break; const p = upsert(m.p); p.ch.x = p.tx; p.ch.y = p.ty; emit(); break; }
    case "l": R.players.delete(m.id); emit(); break;
    case "f": { const p = R.players.get(m.id); if (p) setHold(p, m.h); break; }
    case "s": for (const u of m.u) { const p = R.players.get(u[0]); if (p) { p.tx = u[1] / P.Q; p.ty = u[2] / P.Q; p.d = u[3]; p.f = u[4]; p.at = now(); } } break;
    case "c": {
      const mine = m.id === R.me, p = mine ? null : R.players.get(m.id), name = mine ? profile().n : p ? p.name : "?";
      const until = now() + Math.min(9000, 4500 + m.m.length * 60);
      if (prefs.chat) { if (mine) R.self.bubble = { text: m.m, until }; else if (p) p.bubble = { text: m.m, until }; addLog(name, m.m, mine); }
      emit(); break;
    }
    case "e": { const e = { i: m.i, from: now(), until: now() + 2600 }; if (m.id === R.me) R.self.emote = e; else { const p = R.players.get(m.id); if (p) p.emote = e; } break; }
    case "x": if (m.e) R.err = { e: m.e, room: m.room || null }; else setState(R.state, m.r); break;
  }
}

// ---------- loop jaringan (terpisah dari loop gambar; tetap jalan saat mode memancing) ----------
function switchTarget(to) {
  const ws = R.ws; R.ws = null; if (ws) { try { ws.close(1000, "pindah") } catch (e) {} }
  const keep = R.resume; reset(); R.resume = keep;                                    // server Muara yang diingat tetap dipakai saat kembali dari rumah
  R.gotWelcomeEver = false; R.sent = null; R.profKey = ""; R.lastProf = 0;
  R.house = to; R.fails = 0; R.retry = 0; R.nextTry = 0; R.room = "";
  if (!["replaced", "blocked"].includes(R.state)) { R.state = "off"; R.why = ""; }
  emit();
}
function holdKey() { const h = NW.hold && NW.hold.snapshot ? NW.hold.snapshot() : null; return h ? JSON.stringify(h) : ""; }
function netTick() {
  const t = now();
  const wh = wantHouse(); if (wh !== R.house) switchTarget(wh);
  if (R.house && (R.kickedAt[R.house] || 0) > t && R.state === "kicked") return;
  if (!eligible()) { if (R.ws) disconnect("nonaktif"); else if (R.state !== "off" || R.why === "") setState("off", prefs.consent === null && user() ? "consent" : !user() ? "login" : !backendReady() ? "no-backend" : ""); return; }
  if (document.hidden) { if (!R.hiddenAt) R.hiddenAt = t; if (t - R.hiddenAt > 20000 && R.vis) { send({ t: "v", on: 0 }); R.vis = false; R.holdSent = undefined; } if (t - R.hiddenAt > 90000 && R.ws) disconnect("tab-tersembunyi-lama"); return; }
  if (R.hiddenAt) { R.hiddenAt = 0; if (R.state === "off" && R.why === "tab-tersembunyi-lama") R.nextTry = 0; }
  const L = local();
  if (!R.ws) {
    if (R.manualLeave) return;                                               // pemain memilih "Keluar Server": tidak tersambung sampai ia memilih lagi
    if (!L.vis && R.state === "off" && !R.pending) return;                   // belum perlu tersambung sebelum benar-benar di Muara
    if (["replaced", "blocked"].includes(R.state) && !R.pending) return;
    if (t >= R.nextTry && L.vis) connect();
    return;
  }
  if (!R.gotWelcome) { if (!R.helloSent && L.vis) helloNow(); return; }
  if (!L.vis) { if (R.vis) { send({ t: "v", on: 0 }); R.vis = false; R.sent = null; R.holdSent = undefined; } if (t - R.lastSend > 15000) send({ t: "h" }); return; }
  if (!R.vis) { R.helloAt = t; send({ t: "hello", ...(() => { const p = profile(); return { n: p.n, r: p.r, rd: p.rd }; })(), x: P.qz(L.x), y: P.qz(L.y), d: L.d, f: L.f }); R.vis = true; R.sent = { x: L.x, y: L.y, d: L.d, f: L.f }; R.holdSent = undefined; return; }
  const S0 = R.sent || { x: -99, y: -99, d: -1, f: -1 }, interval = prefs.low ? 500 : 250;
  const dist = Math.hypot(L.x - S0.x, L.y - S0.y), changed = dist > 0.04 || L.d !== S0.d || L.f !== S0.f;
  if (changed && t - R.lastSend >= interval) {
    send({ t: "m", x: P.qz(L.x), y: P.qz(L.y), d: L.d, f: L.f | (dist > 4 ? P.F.TP : 0) });
    R.sent = { x: L.x, y: L.y, d: L.d, f: L.f };
  } else if (t - R.lastSend > 15000) { R.hbSent = t; send({ t: "h" }); }
  // pamer ikan: kirim HANYA saat berubah; hanya spesies+berat+varian (tanpa uid/inventaris)
  const hk = L.f & P.F.FISH ? "" : holdKey();
  // juga dikirim ulang tiap 10 dtk selama memamerkan (idempoten; memulihkan bila ada paket terlewat)
  if ((hk !== R.holdSent && t - (R.holdAt || 0) > 800) || (hk && t - (R.holdAt || 0) > 10000)) { R.holdAt = t; R.holdSent = hk; if (hk) { const h = JSON.parse(hk); send({ t: "f", i: h.i, w: h.w, v: h.v }); } else send({ t: "f" }); }
  if (t - R.lastHbAt > 15000 || !R.lastHbAt) { R.lastHbAt = t; if (t - R.lastSend > 3000) { R.hbSent = t; send({ t: "h" }); } }
  if (t - R.lastProf > 5000 || !R.lastProf) { R.lastProf = t; const p = profile(), k = p.n + "|" + p.r + "|" + p.rd; if (k !== R.profKey) { if (R.profKey) send({ t: "p", n: p.n, r: p.r, rd: p.rd }); R.profKey = k; } }
}

// ---------- tampilan (dipanggil world.js) ----------
function update(dt) {
  if (!R.players.size) return;
  const k = 1 - Math.exp(-dt * 9);
  for (const p of R.players.values()) {
    const c = p.ch, dx = p.tx - c.x, dy = p.ty - c.y, dist = Math.hypot(dx, dy);
    if (dist > 5) { c.x = p.tx; c.y = p.ty; } else { c.x += dx * k; c.y += dy * k; }
    c.moving = dist > 0.06 && !(p.f & P.F.FISH); c.dir = p.d; c.sit = !!(p.f & P.F.SIT); c.rod = p.f & P.F.FISH ? 1 : 0;
    if (c.moving) c.walk += dt * 11;
  }
}
function layer(view, inView) {
  const out = []; if (!R.players.size || !R.vis || !(NW.areas.cur && NW.areas.cur.id === P.AREA)) return out;
  const me = NW.world.player, low = prefs.low, maxN = low ? 8 : 12;
  let arr = [...R.players.values()]; if (arr.length > maxN) arr.sort((a, b) => Math.hypot(a.ch.x - me.x, a.ch.y - me.y) - Math.hypot(b.ch.x - me.x, b.ch.y - me.y)), arr = arr.slice(0, maxN);
  for (const p of arr) {
    const pt = NW.P(p.ch.x, p.ch.y); if (!inView(view, pt.x, pt.y)) continue;
    out.push({ d: p.ch.x + p.ch.y, ch: p.ch, remote: p });
    if (p.f & P.F.FISH) out.push({ d: p.ch.x + p.ch.y + 0.2, fn: (c) => drawBobber(c, p) });
  }
  return out;
}
// Ruang rumah: pemain lain di adegan (halaman/dalam) yang sama dengan kita. Hanya koneksi nyata; kosong bila tidak tersambung.
function homeLayer(scene) {
  const out = []; if (!R.house || !R.players.size || !R.vis) return out;
  const inside = scene === "room";
  for (const p of R.players.values()) if (!!(p.f & P.F.IN) === inside) out.push({ d: p.ch.x + p.ch.y, ch: p.ch, remote: p });
  return out;
}
const DIRV = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];
function drawBobber(c, p) {
  const v = DIRV[p.d & 7] || [0, 1], bx = p.ch.x + v[0] * 1.6, by = p.ch.y + v[1] * 1.6, g = gz(bx, by), q = NW.P(bx, by, Math.min(g, 0)), t = performance.now() / 1000;
  c.save(); c.globalAlpha = 0.9; c.strokeStyle = "rgba(255,255,255,.55)"; c.lineWidth = 1; c.beginPath(); c.ellipse(q.x, q.y + 1, 7 + Math.sin(t * 2) * 1.2, 3, 0, 0, 7); c.stroke();
  c.fillStyle = "#e2574c"; c.beginPath(); c.arc(q.x, q.y - 2 + Math.sin(t * 3 + p.ch.seed) * 1.2, 3, 0, 7); c.fill(); c.fillStyle = "#fff"; c.fillRect(q.x - 3, q.y - 3, 6, 1.4); c.restore();
}
function titleOf(rank) { return NW.look && NW.look.titleName ? NW.look.titleName(rank) : null; }
const liftOf = (p) => (p.hold && p.ch.hold && NW.hold && NW.hold.liftFor ? NW.hold.liftFor(p.hold.w / 1000) : 0);
function drawTag(ctx, p, scale) {
  const pb = NW.P(p.ch.x, p.ch.y, gz(p.ch.x, p.ch.y) - (p.ch.sit ? 6 : 0));
  NW.look.drawLabel(ctx, { name: p.name, title: p.owner ? "🏠 Pemilik" : titleOf(p.rank) }, pb.x, pb.y, scale, liftOf(p));
  if (p.hold && p.ch.hold && NW.hold.drawRemoteTag) NW.hold.drawRemoteTag(ctx, pb, scale, p.ch.hold);   // nama ikan + berat di bawah kaki, seperti di karakter sendiri
}

const BUBBLE_COLS = 20, BUBBLE_ROWS = 3;                   // bubble memotong pesan panjang (maks 3 baris × 20 huruf); panel obrolan tetap menampilkan lengkap
function wrap(text, n) {
  const words = []; for (const w of text.split(" ")) { const a = Array.from(w); for (let i = 0; i < a.length; i += n) words.push(a.slice(i, i + n).join("")); }   // kata tanpa spasi yang panjang dipecah
  const out = []; let l = "";
  for (const x of words) { if ((l + " " + x).trim().length > n && l) { out.push(l); l = x; } else l = (l + " " + x).trim(); }
  if (l) out.push(l);
  if (out.length > BUBBLE_ROWS) { const keep = out.slice(0, BUBBLE_ROWS); let last = Array.from(keep[BUBBLE_ROWS - 1]); if (last.length >= n) last = last.slice(0, n - 1); keep[BUBBLE_ROWS - 1] = last.join("").trimEnd() + "…"; return keep; }
  return out;
}
function bubbleLayout(ctx, x, baseY, text, scale) {
  const lines = wrap(text, BUBBLE_COLS); ctx.font = `600 ${11 * scale}px system-ui, sans-serif`;
  const w = Math.max(...lines.map((l) => ctx.measureText(l).width)) + 14 * scale, h = lines.length * 13 * scale + 8 * scale;
  return { lines, w, h, x: x - w / 2, y: baseY - h - 7 * scale };
}
function bubbleDraw(ctx, B, x, scale, alpha) {
  ctx.save(); ctx.globalAlpha = alpha; ctx.font = `600 ${11 * scale}px system-ui, sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  const { x: bx, y: by, w, h } = B, r = 8 * scale;
  ctx.fillStyle = "rgba(255,255,255,.95)"; ctx.strokeStyle = "rgba(23,63,80,.5)"; ctx.lineWidth = 1.1 * scale;
  ctx.beginPath(); ctx.moveTo(bx + r, by); ctx.arcTo(bx + w, by, bx + w, by + h, r); ctx.arcTo(bx + w, by + h, bx, by + h, r); ctx.arcTo(bx, by + h, bx, by, r); ctx.arcTo(bx, by, bx + w, by, r); ctx.closePath(); ctx.fill(); ctx.stroke();
  const tx = Math.max(bx + 9 * scale, Math.min(bx + w - 9 * scale, x));
  ctx.beginPath(); ctx.moveTo(tx - 4.5 * scale, by + h - 0.5); ctx.lineTo(tx, by + h + 5 * scale); ctx.lineTo(tx + 4.5 * scale, by + h - 0.5); ctx.fill();
  ctx.fillStyle = "#173f50"; B.lines.forEach((l, i) => ctx.fillText(l, bx + w / 2, by + 4 * scale + (i + 0.5) * 13 * scale)); ctx.restore();
}
function drawBubbles(ctx, scale) {
  if (!R.vis && !R.self.bubble && !R.self.emote) return;
  const t = now(), placed = [];
  const one = (ch, o, info, lift) => {
    const pb = NW.P(ch.x, ch.y, gz(ch.x, ch.y) - (ch.sit ? 6 : 0));
    const topLabel = NW.look.labelTop(info, pb.y, scale, lift || 0) - 5 * scale;          // tepat di atas label nama: tidak menumpuk
    if (o.bubble) {
      if (t > o.bubble.until) o.bubble = null;
      else {
        const B = bubbleLayout(ctx, pb.x, topLabel, o.bubble.text, scale);
        for (let k = 0; k < 4; k++) { const hit = placed.find((q) => B.x < q.x + q.w && B.x + B.w > q.x && B.y < q.y + q.h + 2 * scale && B.y + B.h + 6 * scale > q.y); if (!hit) break; B.y = hit.y - B.h - 8 * scale; }   // bubble pemain berdekatan tidak saling menimpa
        const Zm = NW.world.zoom || 1, cam = NW.world.cam, Wd = window.innerWidth, sl = (B.x - cam.x) * Zm + Wd / 2, sr = sl + B.w * Zm;   // jaga bubble tetap di dalam layar (pemain di tepi)
        if (sl < 6) B.x += (6 - sl) / Zm; else if (sr > Wd - 6) B.x += (Wd - 6 - sr) / Zm;
        placed.push(B); bubbleDraw(ctx, B, pb.x, scale, Math.min(1, (o.bubble.until - t) / 600));
      }
    }
    if (o.emote) { if (t > o.emote.until) o.emote = null; else { const k = (t - o.emote.from) / 2600; ctx.save(); ctx.globalAlpha = 1 - k * k; ctx.font = `${24 * scale}px serif`; ctx.textAlign = "center"; ctx.fillText(P.EMOTES[o.emote.i], pb.x, topLabel - 4 * scale - k * 16 * scale); ctx.restore(); } }
  };
  drawArrows(ctx, scale);
  let myName = "Pemancing", myTitle = null; try { myName = NW.look.playerName(); myTitle = NW.look.currentTitle(); } catch (e) {}
  one(NW.world.player, R.self, { name: myName, title: myTitle }, NW.hold ? NW.hold.labelLift() : 0);
  const sc = homeScene();
  for (const p of R.players.values()) if ((p.bubble || p.emote) && (!R.house || !!(p.f & P.F.IN) === (sc === "room"))) one(p.ch, p, { name: p.name, title: p.owner ? "🏠 Pemilik" : titleOf(p.rank) }, liftOf(p));
}

// panah penunjuk teman yang berada di luar layar (Muara 40×40 tile: teman bisa jauh di luar pandangan)
function drawArrows(ctx, scale) {
  if (R.house || !R.vis || !R.players.size || !NW.world.cam) return;
  const Z = NW.world.zoom || 1, cam = NW.world.cam, Wd = window.innerWidth, Hd = window.innerHeight, me = NW.world.player;
  const out = [];
  for (const p of R.players.values()) {
    const q = NW.P(p.ch.x, p.ch.y), sx = (q.x - cam.x) * Z + Wd / 2, sy = (q.y - 30 - cam.y) * Z + Hd / 2;
    if (sx > -10 && sx < Wd + 10 && sy > 40 && sy < Hd - 10) continue;                  // sudah terlihat
    out.push({ p, sx, sy, d: Math.hypot(p.ch.x - me.x, p.ch.y - me.y) });
  }
  out.sort((a, b) => a.d - b.d);
  for (const o of out.slice(0, 3)) {
    const ex = Math.max(30, Math.min(Wd - 30, o.sx)), ey = Math.max(76, Math.min(Hd - 150, o.sy)), ang = Math.atan2(o.sy - ey, o.sx - ex);
    const wx = (ex - Wd / 2) / Z + cam.x, wy = (ey - Hd / 2) / Z + cam.y, s = scale;
    ctx.save(); ctx.translate(wx, wy); ctx.globalAlpha = 0.92;
    ctx.fillStyle = "rgba(12,32,40,.72)"; ctx.beginPath(); ctx.arc(0, 0, 15 * s, 0, 7); ctx.fill();
    ctx.fillStyle = "#ffe08a"; ctx.save(); ctx.rotate(ang); ctx.beginPath(); ctx.moveTo(22 * s, 0); ctx.lineTo(13 * s, -6 * s); ctx.lineTo(13 * s, 6 * s); ctx.closePath(); ctx.fill(); ctx.restore();
    ctx.fillStyle = "#fff"; ctx.font = `800 ${12 * s}px system-ui, sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(Array.from(o.p.name)[0] || "?", 0, 0.5 * s);
    ctx.font = `700 ${9.5 * s}px system-ui, sans-serif`; ctx.fillStyle = "#fff"; ctx.shadowColor = "rgba(0,0,0,.7)"; ctx.shadowBlur = 2;
    const lab = `${o.p.name.length > 9 ? o.p.name.slice(0, 8) + "…" : o.p.name} ${Math.round(o.d)}m`; ctx.fillText(lab, 0, (ex < 90 ? 0 : 0) + 26 * s);
    ctx.restore();
  }
}

// ---------- API untuk UI ----------
function sendChat(text) { text = P.cleanChat(text); if (!text) return false; return send({ t: "c", m: text }); }
function sendEmote(i) { return send({ t: "e", i }); }
// pemilik rumah: keluarkan tamu (id ruang atau "*"); server menolak bila pengirim bukan pemilik. soft = tanpa larangan (dipakai saat rumah dijadikan privat)
function eject(id, soft) { return send(soft ? { t: "k", id: String(id), soft: 1 } : { t: "k", id: String(id) }); }
function clearKick(pid) { delete R.kickedAt[pid]; if (R.state === "kicked") { R.state = "off"; R.why = ""; } }
function setPref(k, v) {
  prefs[k] = v; savePrefs();
  if (k === "low" && R.ws && R.gotWelcome) send({ t: "o", lo: v ? 1 : 0 });
  if (k === "on" && !v) disconnect("keluar");
  if (k === "on" && v) { R.nextTry = 0; if (["replaced", "blocked", "off"].includes(R.state)) R.state = "off", R.why = ""; }
  emit();
}
// ---- pilih server (ID 1..12; divalidasi ulang oleh server) ----
function joinRoom(v) {
  const k = P.roomId(v); if (k == null) { R.lastError = { e: "bad_room", at: Date.now(), msg: ERR.bad_room() }; emit(); return { ok: false, error: "bad_room", msg: R.lastError.msg }; }
  if (R.ws && R.gotWelcome && R.roomNo === k) return { ok: true, same: true };
  switchTo({ room: k }); return { ok: true };
}
function joinRandom() { switchTo({ mode: "random" }); return { ok: true }; }
function joinAuto() { R.resume = null; switchTo({}); return { ok: true }; }
function switchTo(q) {
  R.lastError = null; R.manualLeave = false; R.pending = q; R.nextTry = 0; R.retry = 0;
  const ws = R.ws; R.ws = null; if (ws) { try { ws.close(1000, "pindah"); } catch (e) {} }          // keluar dari server lama dengan benar
  const keep = R.resume; reset(); R.resume = keep; setState("off", "pindah");
  setTimeout(netTick, 0);
}
function leaveServer() { R.manualLeave = true; R.pending = null; R.resume = null; R.lastError = null; disconnect("keluar"); }
async function fetchRooms(force) {
  if (!force && R.rooms && now() - R.roomsAt < 8000) return R.rooms;
  if (R.endpoint === undefined) R.endpoint = await findEndpoint(); if (!R.endpoint || !user()) return null;
  try {
    const tok = await getToken(), base = R.endpoint.replace(/^wss:/, "https:").replace(/^ws:/, "http:");
    const r = await fetch(base + "/rooms", { headers: { Authorization: "Bearer " + tok } }); if (!r.ok) return null;
    const j = await r.json(); R.rooms = j; R.roomsAt = now(); emit(); return j;
  } catch (e) { return null; }
}
function view() {
  return { house: R.house, state: R.state, why: R.why, room: R.room, roomNo: R.roomNo, n: R.n, visible: R.vcount, cap: R.cap, me: R.me, prefs: Object.assign({}, prefs), tx: R.tx, rx: R.rx, log: R.log.slice(-30), typing: R.typing,
    lastError: R.lastError || null, manualLeave: R.manualLeave, rooms: R.rooms, pending: R.pending, clock: CK.have, hour: sharedHour(),
    players: [...R.players.values()].map((p) => ({ id: p.id, name: p.name, rank: p.rank, x: p.ch.x, y: p.ch.y, f: p.f, owner: !!p.owner, hid: p.hid || "", holding: p.hold ? p.hold.i : null })), online: R.state === "online" };
}
function hook() {
  if (NW.mpUI) NW.mpUI.mount();
  setInterval(netTick, 100);
  document.addEventListener("visibilitychange", () => { if (document.hidden) R.hiddenAt = now(); });
  window.addEventListener("pagehide", () => { try { if (R.ws) R.ws.close(1000, "bye"); } catch (e) {} });
  if (NW.cloud && NW.cloud.onChange) NW.cloud.onChange(() => { if (!user() && R.ws) disconnect("logout"); emit(); });
}

NW.mp = { eject, clearKick, homeLayer, inHouse: () => !!R.house && R.vis && R.state === "online", hook, update, layer, drawTag, drawBubbles, view, sendChat, sendEmote, setPref, joinRoom, joinRandom, joinAuto, leaveServer, fetchRooms, sharedHour, onChange: (f) => R.listeners.push(f), eligible, EMOTES: P.EMOTES, ERR,
  get typing() { return R.typing; }, set typing(v) { R.typing = !!v; }, hasChatPref: () => prefs.chat, _R: R, _prefs: () => prefs, _net: netTick, _clock: CK, _serverNow: serverNow };
})();
