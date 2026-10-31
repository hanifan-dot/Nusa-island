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

const API = { VERSION, SUBPROTOCOL, AREA, MAP_W, MAP_H, Q, ROOM_CAP, MAX_ROOMS, TIMEOUT_MS, TICK_MS, MAX_SPEED, CHAT_MAX, NAME_MAX, F, EMOTES, cleanName, cleanChat, maskBad, qz, uq, clampInt };
if (typeof module !== "undefined" && module.exports) module.exports = API;
else { root.NW = root.NW || {}; root.NW.MPProto = API; }
})(typeof window !== "undefined" ? window : globalThis);
