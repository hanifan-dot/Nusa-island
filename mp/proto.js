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
const MAP_W = 40, MAP_H = 40;         // world/map.js (MW, MH)
const Q = 20;                         // posisi dikirim sebagai bilangan bulat = tile × 20 (resolusi 0,05 tile)
const ROOM_CAP = 16;                  // pemain per instance (ringan untuk HP Android)
const MAX_ROOMS = 12;                 // instance Muara paling banyak → ≤192 pemain online
const TIMEOUT_MS = 45000;             // tanpa kabar selama ini = dianggap keluar (heartbeat klien tiap 15 dtk)
const TICK_MS = 200;                  // siaran perubahan posisi ≤5 kali/detik
const MAX_SPEED = 9;                  // tile/detik (jalan kaki ≈ 4–6); lebih dari ini ditahan server
const CHAT_MAX = 80, NAME_MAX = 14;
const F = { MOVING: 1, SIT: 2, FISH: 4, TP: 8 };   // bendera tampilan
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

const API = { WORLD_HPS, WORLD_EPOCH_MS, sharedHour, roomId, VARIANTS, cleanHold, VERSION, SUBPROTOCOL, AREA, MAP_W, MAP_H, Q, ROOM_CAP, MAX_ROOMS, TIMEOUT_MS, TICK_MS, MAX_SPEED, CHAT_MAX, NAME_MAX, F, EMOTES, cleanName, cleanChat, maskBad, qz, uq, clampInt };
if (typeof module !== "undefined" && module.exports) module.exports = API;
else { root.NW = root.NW || {}; root.NW.MPProto = API; }
})(typeof window !== "undefined" ? window : globalThis);
