// NUSA ISLAND — NusaPhone (Ide 07) · inti murni (tanpa DOM/jaringan) agar bisa diuji di Node. DIMUAT HANYA bila window.NUSA_PHONE === true.
// Tidak ada uang nyata, harga, saldo, atau status bayar di sini: semua itu milik server. Berkas ini hanya: format jam/tanggal, daftar aplikasi,
// model casing (tampilan), navigasi layar, antrean notifikasi, dan penentuan tema/gerak.
(function (root) {
"use strict";

const DAYS = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const MONTHS = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const pad2 = (n) => (n < 10 ? "0" : "") + n;

// Jam dunia (S.hour pecahan 0–24) → "HH:MM"
function clock(hour) {
  let h = Number(hour); if (!Number.isFinite(h)) h = 0; h = ((h % 24) + 24) % 24;
  let hh = Math.floor(h), mm = Math.floor((h - hh) * 60); if (mm > 59) mm = 59;
  return pad2(hh) + ":" + pad2(mm);
}
// Tanggal kalender perangkat → "Sabtu, 14 November"
function dateLine(d) { const x = d instanceof Date && !Number.isNaN(d.getTime()) ? d : new Date(0); return DAYS[x.getDay()] + ", " + x.getDate() + " " + MONTHS[x.getMonth()]; }

// ---------- aplikasi ----------
// net: true → butuh server; saat koneksi putus aplikasi TERKUNCI (tidak ada mode offline palsu).
const APPS = [
  { id: "klippy", name: "Klippy", net: true, hue: "#ff7a59", hue2: "#ffb347" },
  { id: "nusachat", name: "NusaChat", net: true, hue: "#2fb39a", hue2: "#7fe0c4" },
  { id: "playgame", name: "PlayGame", net: false, hue: "#6a5acd", hue2: "#a79bff" },
  { id: "dompet", name: "Dompet Nusa", net: true, hue: "#e0a93a", hue2: "#ffd873" },
  { id: "peta", name: "Peta", net: false, hue: "#3d9bd4", hue2: "#8bd0f0" },
  { id: "pengaturan", name: "Pengaturan", net: false, hue: "#7b8a96", hue2: "#b9c6cf" },
];
const APP_IDS = APPS.map((a) => a.id);
const appOf = (id) => APPS.find((a) => a.id === id) || null;

// ---------- model & casing (tampilan saja; kepemilikan = server) ----------
// "dasar" dimiliki SEMUA pemain: aplikasi sosial penting tidak pernah terkunci. Model toko = upgrade tampilan/tema/casing.
// KONTRAK OWNER (14 Nov 2026): 6 model dalam 4 lini + ponsel dasar bawaan semua pemain.
//  kind "koin"    → dibeli dengan koin bermain (2 model);  kind "premium" → hanya lewat Payment Center/QRIS lama (4 model).
//  Harga TIDAK ada di klien (milik server). Hanya "Nusa Crown 17" yang bernama resmi; lima lainnya = label SEMENTARA data uji.
//  Pemetaan lini & kapasitas (GB virtual) = USULAN, "menunggu Owner". Inti aplikasi 3 GB. Beda model = kosmetik + penyimpanan saja.
const CORE_GB = 3;
const LINES = { A: "Lini Sementara A", B: "Lini Sementara B", C: "Lini Sementara C", D: "Lini Sementara D" };
const MODELS = {
  dasar: { id: "dasar", name: "NusaPhone Dasar", kind: "dasar", line: null, gb: 16, body: "#f3e7cf", rim: "#c9b48a", glow: "#2fb39a", radius: 26, bezel: 7, notch: "dot", aspect: 0.5 },
  s1: { id: "s1", name: "Model Sementara 1", kind: "koin", line: "A", gb: 24, body: "#ffd447", rim: "#e0a800", glow: "#ff7a59", radius: 34, bezel: 8, notch: "dot", aspect: 0.54 },
  s2: { id: "s2", name: "Model Sementara 2", kind: "koin", line: "A", gb: 32, body: "#7ad3c1", rim: "#2f9c86", glow: "#d6ffe9", radius: 30, bezel: 7, notch: "pill", aspect: 0.52 },
  s3: { id: "s3", name: "Model Sementara 3", kind: "premium", line: "B", gb: 48, body: "#5b4bb7", rim: "#3a2f86", glow: "#a79bff", radius: 22, bezel: 6, notch: "pill", aspect: 0.47 },
  s4: { id: "s4", name: "Model Sementara 4", kind: "premium", line: "C", gb: 64, body: "#e05a7a", rim: "#a82a4a", glow: "#ffc2d1", radius: 20, bezel: 6, notch: "dot", aspect: 0.46 },
  s5: { id: "s5", name: "Model Sementara 5", kind: "premium", line: "C", gb: 96, body: "#3d9bd4", rim: "#1f6a9a", glow: "#b6e6ff", radius: 18, bezel: 5, notch: "none", aspect: 0.45 },
  crown17: { id: "crown17", name: "Nusa Crown 17", kind: "premium", line: "D", gb: 128, body: "#1c1a2e", rim: "#e0b84a", glow: "#ffe08a", radius: 16, bezel: 5, notch: "none", aspect: 0.44 },
};
const MODEL_IDS = Object.keys(MODELS);
const modelOf = (id) => MODELS[id] || MODELS.dasar;
// Daftar kepemilikan dari server → hanya id yang dikenal; "dasar" SELALU ada.
function cleanOwned(list) {
  const out = ["dasar"]; if (Array.isArray(list)) for (const x of list) if (typeof x === "string" && MODELS[x] && !out.includes(x)) out.push(x);
  return out;
}
const cleanUse = (use, owned) => (typeof use === "string" && owned.includes(use) ? use : "dasar");

// ---------- tema & gerak ----------
const THEMES = ["auto", "day", "night"];
const MOTIONS = ["auto", "on", "off"];
function theme(pref, isNight) { return pref === "day" ? "day" : pref === "night" ? "night" : isNight ? "night" : "day"; }
function reduced(pref, systemReduced) { return pref === "off" ? true : pref === "on" ? false : !!systemReduced; }   // pref "off" = gerakan DIMATIKAN
function cleanPrefs(o) {
  o = o && typeof o === "object" ? o : {};
  return { theme: THEMES.includes(o.theme) ? o.theme : "auto", motion: MOTIONS.includes(o.motion) ? o.motion : "auto", casing: typeof o.casing === "string" && MODELS[o.casing] ? o.casing : "dasar" };
}

// ---------- navigasi layar ----------
// Layar: "lock" → "home" → "app". Kembali: dari dalam app ke home; di home & kunci tidak berbuat apa-apa. Tutup: menutup perangkat.
// Mesin murni: nav(state, aksi) → state baru. state = { screen, app, sub }
const NAV0 = { screen: "lock", app: null, sub: 0 };
function nav(s, a, arg) {
  s = s || NAV0;
  switch (a) {
    case "unlock": return s.screen === "lock" ? { screen: "home", app: null, sub: 0 } : s;
    case "home": return s.screen === "lock" ? s : { screen: "home", app: null, sub: 0 };
    case "back": if (s.screen === "app") return s.sub > 0 ? { screen: "app", app: s.app, sub: s.sub - 1 } : { screen: "home", app: null, sub: 0 }; return s;
    case "open": return s.screen !== "lock" && APP_IDS.includes(arg) ? { screen: "app", app: arg, sub: 0 } : s;
    case "deeper": return s.screen === "app" ? { screen: "app", app: s.app, sub: s.sub + 1 } : s;
    case "lock": return NAV0;
    default: return s;
  }
}
// Aplikasi jaringan terkunci saat koneksi putus. Selalu true bila aplikasi tidak butuh jaringan.
const appUsable = (id, linkOk) => { const a = appOf(id); return !!a && (!a.net || !!linkOk); };

// ---------- notifikasi ----------
const NOTE_MAX = 20;
function noteAdd(list, n, now) {
  list = Array.isArray(list) ? list.slice() : [];
  if (!n || typeof n.id !== "string" || !n.id || list.some((x) => x.id === n.id)) return list;
  const item = { id: n.id.slice(0, 40), icon: String(n.icon || "🔔").slice(0, 4), title: String(n.title || "").slice(0, 40), text: String(n.text || "").slice(0, 120), at: Number.isFinite(now) ? now : 0, read: false, app: APP_IDS.includes(n.app) ? n.app : null };
  list.unshift(item); return list.slice(0, NOTE_MAX);
}
const noteUnread = (list) => (Array.isArray(list) ? list.filter((x) => !x.read).length : 0);
const noteReadAll = (list) => (Array.isArray(list) ? list.map((x) => Object.assign({}, x, { read: true })) : []);

// ---------- status tautan ----------
// Tautan dianggap hidup hanya bila perangkat daring, API mode Worker aktif, pemain masuk, dan panggilan terakhir tidak gagal jaringan.
function linkOk(s) { return !!(s && s.online && s.api && s.user && !s.failed); }

const API = { CORE_GB, LINES, clock, dateLine, APPS, APP_IDS, appOf, MODELS, MODEL_IDS, modelOf, cleanOwned, cleanUse, THEMES, MOTIONS, theme, reduced, cleanPrefs, NAV0, nav, appUsable, noteAdd, noteUnread, noteReadAll, NOTE_MAX, linkOk, pad2 };
if (typeof module !== "undefined" && module.exports) module.exports = API; else root.NusaPhoneCore = API;
})(typeof window !== "undefined" ? window : globalThis);
