// =========================================================
//  NUSA ISLAND — Tahap 4 Multiplayer: protokol & pembersih teks (dipakai server, klien, dan pengujian)
//  Prinsip: pesan kecil (JSON array/objek pendek), posisi dikuantisasi, tidak ada saldo/item/koin sama sekali di protokol.
//  Yang dikirim pemain HANYA: posisi, arah, bendera tampilan (jalan/duduk/memancing), nama panggilan, gelar (angka), joran (angka), chat, emoji.
// =========================================================
(function (root) {
"use strict";

const VERSION = 1;
const SUBPROTOCOL = "nusa.v1";
const AREA = "muara";                 // Tahap 4: dunia bersama hanya di Muara Kampung
const MAP_W = 40, MAP_H = 52;         // world/map.js (MW, MH) — MH 40→52 oleh Ekspansi Tanjung Lampu; server lama hanya memotong y>40 (tidak menendang)
const Q = 20;                         // posisi dikirim sebagai bilangan bulat = tile × 20 (resolusi 0,05 tile)
const ROOM_CAP = 16;                  // pemain per instance (ringan untuk HP Android)
const MIN_ROOMS = 12;                 // selalu buka 12 server pertama
const MAX_ROOMS = 64;                 // batas aman awal: 64 × 16 = 1.024 tempat; uji beban sebelum menaikkan batas
const TIMEOUT_MS = 45000;             // tanpa kabar selama ini = dianggap keluar (heartbeat klien tiap 15 dtk)
const TICK_MS = 200;                  // siaran perubahan posisi ≤5 kali/detik
const MAX_SPEED = 9;                  // tile/detik (jalan kaki ≈ 4–6); lebih dari ini ditahan server
const CHAT_MAX = 80, NAME_MAX = 16;
const F = { MOVING: 1, SIT: 2, FISH: 4, TP: 8, IN: 16 };   // bendera tampilan (IN = sedang di dalam rumah; hanya dipakai ruang rumah)
// ---- Kunjungi Rumah Teman: satu instance = satu rumah (area "rumah"), terpisah total dari Muara ----
const HOUSE = { AREA: "rumah", CAP: 12, MAP_W: 32, MAP_H: 32, KICK_CODE: 4010, KICK_MS: 60 * 60000 };
const EMOTES = ["👋", "😂", "❤️", "🎣", "👍", "😴"];
// jam dunia bersama: fungsi murni dari waktu SERVER (ms). Konstanta HARUS sama dengan HOURS_PER_SEC di game.js (dijaga tes).
const WORLD_HPS = 24 / 480;                 // 1 hari game = 8 menit nyata
const WORLD_EPOCH_MS = Date.UTC(2026, 0, 1); // titik awal tetap; pukul 06:00 pada epoch
const sharedHour = (serverMs) => ((((serverMs - WORLD_EPOCH_MS) / 1000) * WORLD_HPS + 6) % 24 + 24) % 24;
// nomor server (ID) 1..MAX_ROOMS; mengembalikan null bila tidak sah
const roomId = (v) => { if (v == null || v === "") return null; const s = String(v).trim(); if (!/^\d{1,3}$/.test(s)) return null; const n = parseInt(s, 10); return n >= 1 && n <= MAX_ROOMS ? n : null; };
// status pamer ikan (HANYA tampilan): id spesies, berat (gram), kode varian. Tidak membawa uid/inventaris/harga.
const VARIANTS = ["normal", "silver", "sunset", "pearl"];
function cleanHold(m) {
  if (!m || typeof m !== "object") return null;
  const i = String(m.i == null ? "" : m.i);
  if (!/^[a-z0-9_]{2,30}$/.test(i)) return null;
  const w = Math.floor(Number(m.w)); if (!Number.isFinite(w) || w < 1 || w > 1000000) return null;   // gram; ikan terbesar < 1000 kg
  const v = VARIANTS.includes(m.v) ? m.v : "normal";
  return { i, w, v };
}

// ---- Kapal Rombongan (Fase A): entitas kapal + kursi disinkronkan SERVER. Bawaan MATI di server (opsi boat / env NUSA_BOAT=ya). ----
// Geometri diambil dari NW.MUARA_MAP pada basis 435c63d (dermaga x32–40,y20–21; tambatan 37.2,23.4); tes browser menjaga jalur layar tetap air.
const _HW = 32, _HH = 16;   // setengah ukuran tile iso (world/boat.js: HW=TW/2, HH=TH/2) — arah 0..7 = dir8 layar kapal klien, diubah ke vektor tile
const _DIRV = Array.from({ length: 8 }, (_, i) => { const a = i * Math.PI / 4, dx = Math.cos(a), dy = Math.sin(a), x = (dx / _HW + dy / _HH) / 2, y = (dy / _HH - dx / _HW) / 2, k = Math.hypot(x, y); return [Math.round(x / k * 1e4) / 1e4, Math.round(y / k * 1e4) / 1e4]; });
const BOAT = { CAP: 3, MAX_BOATS: 5, BOARD_R: 3.2, DIRV: _DIRV, SPD: [0, 1.6, 3.2], ACC: 2.2,   // tile/dtk; 3 kursi: 0 = kapten, 1–2 = penumpang
  LANE: { x0: 34, x1: 39.6, y0: 22.4, y1: 50.5 },
  SLOTS: [[37.2, 23.4], [35.8, 24.6], [38.6, 25.2], [36.2, 27], [38.4, 28.6]], LAND: [35.5, 20.6],   // tambatan & titik turun (di dermaga)
  GRACE_MS: 20000, MIN_AWAY_MS: 8000, AREA_RE: /^[a-z][a-z0-9_]{1,23}$/, AREAS: ["muara", "laut", "selat", "toba", "sf2"], HOME: "muara" };
// ---- Kota Nusa (multiplayer area "selat"): bawaan MATI di server (opsi kota / env NUSA_KOTA=ya). Instance & room SAMA dengan Muara; yang membedakan = `area` per pemain. ----
// Server hanya memegang: area pemain, batas peta, kecepatan, titik masuk, dermaga kapal rombongan. NPC & kendaraan kota 100% lokal (tidak pernah lewat jaringan).
const KOTA = { AREAS: ["muara", "selat"], AREA: "selat", MAP: { muara: [MAP_W, MAP_H], selat: [92, 48] },   // selat = peta Kota Nusa 92×48 (peta lama 40×40 ada di dalamnya)
  ENTRY: [10.6, 20.5], ENTRY_R: 7,       // tiba berlayar sendiri (kapal tunggal lama) di Pelabuhan Kota: posisi klaim harus ≤ ENTRY_R dari sini, kalau tidak dipindah ke sini
  BERTH: [13.6, 21.95], BERTH_D: 0, LAND: [13.1, 20.45], BOARD_R: 3.4,       // tambatan kapal rombongan & titik turun di dermaga Pelabuhan Kota (sama dengan klien rombongan/delivery)
  HOP_MS: 6000, BOAT_IDLE_MS: 5 * 60000, SPEED: 8, BURST: 5, CORR_MIN: 0.75, CORR_MS: 400, HOME: [35.5, 20.6], HOME_R: 8 };   // SPEED/BURST: anggaran jarak (petak/dtk rata-rata, lonjakan maks) — jalan kaki ≈ 4–6 petak/dtk; HOME/HOME_R: titik tiba di dermaga Muara saat pindah area dari kota (klaim jauh → dipindah ke sini); CORR_*: koreksi posisi `pc` ke pemain yang ditahan (selisih min petak, jeda min ms)    // jeda minimal pindah area; kapal kosong di tambatan kota bubar setelah ini
const cleanArea = (v) => (typeof v === "string" && KOTA.AREAS.indexOf(v) >= 0 ? v : null);
const BOAT_ACTS = ["new", "join", "leave", "steer", "anchor", "go"];
// pesan klien → kapal. Mengembalikan objek bersih atau null (tidak sah). Tidak ada posisi/kecepatan/hadiah dari klien: hanya NIAT (arah, gas, jangkar, kursi).
function cleanBoat(m) {
  if (!m || typeof m !== "object" || !BOAT_ACTS.includes(m.a)) return null;
  const o = { a: m.a };
  if (m.a === "join") { const b = String(m.b == null ? "" : m.b); if (!/^b[0-9a-z]{1,6}$/.test(b)) return null; const s = m.s; if (!Number.isInteger(s) || s < 1 || s >= BOAT.CAP) return null; o.b = b; o.s = s; }
  if (m.a === "steer") { if (!Number.isInteger(m.d) || m.d < 0 || m.d > 7 || !Number.isInteger(m.th) || m.th < 0 || m.th > 2) return null; o.d = m.d; o.th = m.th; }
  if (m.a === "anchor") { if (typeof m.on !== "boolean") return null; o.on = m.on; }
  if (m.a === "go") { const a = String(m.ar == null ? "" : m.ar); if (!BOAT.AREA_RE.test(a) || BOAT.AREAS.indexOf(a) < 0) return null; o.ar = a; }
  return o;
}
// kode penampilan avatar (HANYA ID item lokal + indeks warna; tidak ada gambar). "" = bawaan. null = tidak sah.
const OUTFIT_PART = /^[tphacsr]:[a-z0-9_]{1,24}:[0-9]{1,2}$/;
function cleanOutfit(v) {
  if (v == null || v === "") return "";
  if (typeof v !== "string" || v.length > 140) return null;
  const parts = v.split("|"), seen = new Set(); if (parts.length > 7) return null;
  for (const x of parts) { if (!OUTFIT_PART.test(x) || seen.has(x[0])) return null; seen.add(x[0]); }
  return v;
}

// ---- nama panggilan ----
const RESERVED = /(admin|owner|moderator|petugas|developer|nusa ?island|pemilik|\bgm\b|official|resmi)/i;
function cleanName(v, fallback) {
  let s = String(v == null ? "" : v).normalize("NFKC").replace(/[^\p{L}\p{N} ._-]/gu, "").replace(/\s+/g, " ").trim();
  s = Array.from(s).slice(0, NAME_MAX).join("").trim();
  if (!s || RESERVED.test(s) || maskBad(s) !== s) return fallback || "Nelayan";
  return s;
}

// ---- chat ----
// masker kata kasar (Indonesia & Inggris, daftar singkat; bukan filter sempurna), tautan, email, nomor telepon
const BAD = ["anjing", "anjir", "bangsat", "bajingan", "kontol", "memek", "ngentot", "tolol", "goblok", "bego", "kampret", "asu", "jancok", "pepek", "titit", "fuck", "shit", "bitch", "cunt", "dick", "nigg\\w*", "porno?", "sex", "seks"];
const BAD_RE = new RegExp("(?<![\\p{L}\\p{N}])(" + BAD.join("|") + ")(?![\\p{L}\\p{N}])", "giu");
function maskBad(s) { return s.replace(BAD_RE, (m) => "*".repeat(Math.min(m.length, 6))); }
function cleanChat(v) {
  let s = String(v == null ? "" : v).normalize("NFKC").replace(/[\u0000-\u001f\u007f-\u009f​-‏‪-‮⁦-⁩]/g, " ").replace(/\s+/g, " ").trim();
  s = s.replace(/https?:\/\/\S+|www\.\S+|\S+\.(com|net|org|id|io|co|me|xyz|gg|ly)\b\S*/gi, "***").replace(/\S+@\S+\.\S+/g, "***").replace(/(?:\d[\s.\-]?){8,}/g, "***");
  s = maskBad(s);
  s = Array.from(s).slice(0, CHAT_MAX).join("").trim();
  return s;
}

// ---- kuantisasi ----
const qz = (v) => Math.round(v * Q);
const uq = (n) => n / Q;
const clampInt = (v, a, b, d) => { v = Math.floor(Number(v)); return Number.isFinite(v) ? Math.max(a, Math.min(b, v)) : d; };

const API = { KOTA, cleanArea, BOAT, cleanBoat, HOUSE, WORLD_HPS, WORLD_EPOCH_MS, sharedHour, roomId, VARIANTS, cleanHold, cleanOutfit, VERSION, SUBPROTOCOL, AREA, MAP_W, MAP_H, Q, ROOM_CAP, MIN_ROOMS, MAX_ROOMS, TIMEOUT_MS, TICK_MS, MAX_SPEED, CHAT_MAX, NAME_MAX, F, EMOTES, cleanName, cleanChat, maskBad, qz, uq, clampInt };
if (typeof module !== "undefined" && module.exports) module.exports = API;
else { root.NW = root.NW || {}; root.NW.MPProto = API; }
})(typeof window !== "undefined" ? window : globalThis);
