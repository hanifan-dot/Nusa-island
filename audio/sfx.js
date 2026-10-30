// ============================================================================
//  NUSA ISLAND — Bumbu 2.1: efek suara & jingle (NW.sfxLib)
//  Semua dihasilkan secara prosedural (sintesis). Efek lama (cast, splash, nibble, bite, tick, surge,
//  snap, lose, catch, coin, click) tetap ada dengan nama sama, hanya lebih halus & lewat bus SFX.
//  Efek kritis (surge, warn, snap) sengaja lebih jelas daripada musik, tetapi tidak tajam/keras.
//  Setiap fungsi: (ctx, out, t, arg) -> void. `out` = bus SFX.
// ============================================================================
(function () {
const NW = (window.NW = window.NW || {});
const K = NW.kit;
const rand = (a, b) => a + Math.random() * (b - a);

function tone(ctx, out, t, f0, f1, dur, vol, type = "sine", att = 0.004) {
  const o = ctx.createOscillator(), g = ctx.createGain(); o.type = type;
  o.frequency.setValueAtTime(f0, t); if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + att); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(out); o.start(t); o.stop(t + dur + 0.02); K.track(o, [o, g]);
}
function nz(ctx, out, t, type, f0, f1, q, dur, vol, att = 0.004) {
  const s = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), g = ctx.createGain(); s.buffer = K.noiseBuf(ctx);
  fl.type = type; fl.Q.value = q; fl.frequency.setValueAtTime(f0, t); if (f1 && f1 !== f0) fl.frequency.exponentialRampToValueAtTime(f1, t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + att); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(fl).connect(g).connect(out); s.start(t, Math.random() * 2.4); s.stop(t + dur + 0.02); K.track(s, [s, fl, g]);
}
const N = K.midi, pl = (ctx, out, t, n, v, kind = "kalimba", o) => K.pluck(ctx, out, t, n, v, kind, Object.assign({ prio: 1 }, o));

const L = {
  // ---------- UI & ekonomi ----------
  click: (c, o, t) => tone(c, o, t, 700, 620, 0.045, 0.07),
  coin: (c, o, t) => { tone(c, o, t, 988, 0, 0.09, 0.07, "triangle"); tone(c, o, t + 0.08, 1319, 0, 0.18, 0.07, "triangle"); },
  ok: (c, o, t) => { tone(c, o, t, 660, 0, 0.08, 0.06, "triangle"); tone(c, o, t + 0.07, 880, 0, 0.12, 0.06, "triangle"); },

  // ---------- memancing ----------
  cast: (c, o, t) => { nz(c, o, t, "bandpass", 500, 2600, 1.2, 0.3, 0.16, 0.05); nz(c, o, t + 0.04, "bandpass", 3400, 3000, 5, 0.14, 0.05); }, // joran diayun + senar berdesing
  splash: (c, o, t) => { nz(c, o, t, "lowpass", 1300, 420, 0.6, 0.5, 0.26); tone(c, o, t, 300, 95, 0.17, 0.12); tone(c, o, t + 0.07, 520, 230, 0.1, 0.045); }, // percikan pelampung
  nibble: (c, o, t) => { tone(c, o, t, 430, 640, 0.075, 0.075); tone(c, o, t + 0.09, 400, 560, 0.06, 0.04); }, // petunjuk halus: tidak membocorkan rarity
  bite: (c, o, t) => { tone(c, o, t, 740, 0, 0.12, 0.1, "triangle"); tone(c, o, t + 0.09, 988, 0, 0.18, 0.1, "triangle"); nz(c, o, t, "bandpass", 1200, 1200, 1.5, 0.1, 0.05); },
  strike: (c, o, t) => { // gulungan menyangkut + tarikan pertama
    for (let i = 0; i < 3; i++) nz(c, o, t + i * 0.045, "bandpass", 2000 + i * 300, 0, 3, 0.04, 0.12);
    tone(c, o, t, 190, 100, 0.2, 0.2); nz(c, o, t + 0.03, "bandpass", 600, 1800, 1, 0.3, 0.12, 0.08);
  },
  tick: (c, o, t) => nz(c, o, t, "highpass", 2600 + rand(-300, 300), 0, 0.7, 0.022, 0.06, 0.001), // klik ratchet gulungan
  surge: (c, o, t) => { // ikan menyentak: dentuman + air, jelas di atas musik
    tone(c, o, t, 210, 105, 0.25, 0.3); nz(c, o, t, "bandpass", 900, 500, 0.8, 0.32, 0.28, 0.01); nz(c, o, t + 0.02, "lowpass", 1800, 600, 0.5, 0.2, 0.12);
  },
  warn: (c, o, t) => { tone(c, o, t, 880, 0, 0.06, 0.13, "triangle"); tone(c, o, t + 0.11, 880, 0, 0.06, 0.13, "triangle"); nz(c, o, t, "bandpass", 1500, 0, 2, 0.05, 0.05); }, // senar hampir putus
  snap: (c, o, t) => { // senar putus: pecah singkat + dentum, tidak melengking
    nz(c, o, t, "bandpass", 2600, 1800, 1.2, 0.14, 0.34, 0.001); tone(c, o, t, 560, 90, 0.28, 0.2, "sawtooth"); tone(c, o, t + 0.02, 120, 55, 0.25, 0.3); nz(c, o, t + 0.1, "lowpass", 900, 300, 0.5, 0.35, 0.1);
  },
  lose: (c, o, t) => { tone(c, o, t, 440, 210, 0.38, 0.1, "triangle"); tone(c, o, t + 0.06, 330, 160, 0.34, 0.06, "sine"); },
  slack: (c, o, t) => nz(c, o, t, "lowpass", 800, 300, 0.5, 0.35, 0.07),
  lelah: (c, o, t) => { nz(c, o, t, "lowpass", 900, 400, 0.4, 0.45, 0.07, 0.12); tone(c, o, t, 330, 270, 0.4, 0.035, "sine", 0.1); }, // ikan lelah: ruang untuk menggulung
  reelBack: (c, o, t) => nz(c, o, t, "bandpass", 1600, 900, 1.5, 0.35, 0.08, 0.04),

  // ---------- jingle tangkapan (singkat, bertingkat) ----------
  catch: (c, o, t, rarity) => {
    const R = rarity || "biasa";
    const T = { biasa: 1, langka: 0.8, epik: 0.46, legenda: 0.34 }[R] || 1; // jingle bertingkat tetapi puncaknya serupa
    if (T !== 1) { const g = c.createGain(); g.gain.value = T; g.connect(o); o = g; }
    if (R === "sampah") { tone(c, o, t, 260, 150, 0.2, 0.09, "triangle"); nz(c, o, t, "lowpass", 600, 300, 0.5, 0.15, 0.06); return; }
    const up = (notes, gap, v, kind, tt = t) => notes.forEach((n, i) => pl(c, o, tt + i * gap, n, v, kind));
    if (R === "biasa") { up(["D5", "F#5", "A5"], 0.1, 0.34); return; }
    if (R === "langka") { up(["D5", "F#5", "A5", "D6"], 0.1, 0.36); K.pad(c, o, t + 0.1, ["D4", "A4", "F#5"], 1.0, 0.1, { att: 0.15, rel: 0.5, lp: 2600 }); return; }
    if (R === "epik") {
      up(["D5", "F#5", "A5", "D6", "F#6"], 0.09, 0.38); K.pad(c, o, t + 0.05, ["D3", "A3", "D4", "F#4"], 1.6, 0.16, { att: 0.12, rel: 0.7, lp: 2200 });
      K.ogung(c, o, t + 0.35, "D3", 0.1); up(["A5", "D6"], 0.12, 0.2, "kalimba", t + 0.7); return;
    }
    // legenda: paling khas, tetap singkat (±2,6 dtk)
    K.ogung(c, o, t, "D2", 0.18);
    up(["D5", "F#5", "A5", "D6"], 0.11, 0.38, "kalimba", t + 0.05);
    K.flute(c, o, t + 0.55, "A5", 1.5, 0.24, "sulim", { prio: 1 }); K.flute(c, o, t + 0.9, "D6", 1.4, 0.2, "sulim", { prio: 1 });
    K.pad(c, o, t + 0.1, ["D3", "A3", "D4", "F#4", "A4"], 2.4, 0.2, { att: 0.2, rel: 0.9, lp: 2600 });
    up(["F#6", "A6", "D6", "A5", "D6"], 0.075, 0.2, "kalimba", t + 1.2);
  },

  // ---------- cerita & petualangan (motif dipakai ulang) ----------
  misi_baru: (c, o, t) => { [["D5", 0], ["F#5", 0.11], ["A5", 0.22]].forEach(([n, d]) => pl(c, o, t + d, n, 0.32)); K.flute(c, o, t + 0.25, "A5", 0.7, 0.16, "seruling", { prio: 1 }); },
  bab_selesai: (c, o, t) => { ["D5", "F#5", "A5", "D6"].forEach((n, i) => pl(c, o, t + i * 0.12, n, 0.34)); K.pad(c, o, t + 0.2, ["D4", "A4", "F#5"], 1.8, 0.14, { att: 0.2, rel: 0.8, lp: 2400 }); K.flute(c, o, t + 0.6, "A5", 1.3, 0.2, "seruling", { prio: 1 }); },
  temuan: (c, o, t) => { pl(c, o, t, "A5", 0.28); pl(c, o, t + 0.13, "D6", 0.26); K.flute(c, o, t + 0.1, "F#5", 1.1, 0.14, "seruling", { prio: 1 }); K.pad(c, o, t + 0.1, ["A4", "D5", "F#5"], 1.2, 0.08, { att: 0.3, rel: 0.6, lp: 2400 }); },
  penghargaan: (c, o, t) => {
    ["D5", "F#5", "A5"].forEach((n, i) => pl(c, o, t + i * 0.12, n, 0.34)); ["E5", "G5", "B5", "E6"].forEach((n, i) => pl(c, o, t + 0.55 + i * 0.12, n, 0.32));
    K.pad(c, o, t + 0.3, ["D3", "A3", "D4", "F#4"], 2.6, 0.18, { att: 0.3, rel: 1.0, lp: 2400 }); K.flute(c, o, t + 1.0, "A5", 1.6, 0.22, "sulim", { prio: 1 }); K.ogung(c, o, t, "D2", 0.12);
  },
  gelar: (c, o, t) => { ["D5", "E5", "F#5", "A5", "B5"].forEach((n, i) => pl(c, o, t + i * 0.08, n, 0.3)); K.ogung(c, o, t + 0.2, "A2", 0.1); K.pad(c, o, t + 0.2, ["D4", "A4", "D5"], 1.4, 0.13, { att: 0.2, rel: 0.6, lp: 2400 }); },
  pemandangan: (c, o, t) => { K.pad(c, o, t, ["D3", "A3", "E4", "A4"], 3.4, 0.17, { att: 0.9, rel: 1.4, lp: 1800 }); K.flute(c, o, t + 0.5, "E5", 2.2, 0.17, "sulim", { prio: 1 }); },
  berlayar: (c, o, t) => { tone(c, o, t, 196, 220, 0.5, 0.07, "sine", 0.05); tone(c, o, t + 0.04, 294, 330, 0.45, 0.04, "sine", 0.05); }, // sirene kapal kecil yang lembut
  tiba: (c, o, t) => { tone(c, o, t, 294, 262, 0.55, 0.06, "sine", 0.05); pl(c, o, t + 0.2, "A4", 0.2); pl(c, o, t + 0.34, "D5", 0.2); },

  // ---------- Bumbu 2.2: rahasia tangkapan (motif lama dipakai ulang, tetap lembut) ----------
  spot_rahasia: (c, o, t) => { // spot rahasia ditemukan: air + kalimba naik + sulim
    for (let i = 0; i < 3; i++) tone(c, o, t + i * 0.09, 520 + i * 160, 900 + i * 200, 0.06, 0.022);
    ["F#5", "A5", "D6", "F#6"].forEach((n, i) => pl(c, o, t + 0.12 + i * 0.1, n, 0.26, "kalimba"));
    K.flute(c, o, t + 0.3, "A5", 1.3, 0.17, "sulim", { prio: 1 }); K.pad(c, o, t + 0.1, ["D4", "A4", "F#5"], 1.5, 0.1, { att: 0.3, rel: 0.7, lp: 2200 });
  },
  varian_silver: (c, o, t, rarity) => { // kilau perak: kalimba tinggi berurutan cepat, ringan
    ["A5", "D6", "F#6", "A6", "D7"].forEach((n, i) => pl(c, o, t + i * 0.075, n, 0.26, "kalimba"));
    K.pad(c, o, t + 0.1, ["D5", "A5", "F#6"], 1.3, 0.07, { att: 0.15, rel: 0.7, lp: 3600 }); if (rarity === "legenda" || rarity === "epik") K.ogung(c, o, t, "D2", 0.07);
  },
  varian_sunset: (c, o, t, rarity) => { // hangat: sulim melengkung turun-naik + petikan lembut
    K.flute(c, o, t, "A4", 0.9, 0.17, "sulim", { prio: 1 }); K.flute(c, o, t + 0.3, "D5", 1.1, 0.17, "sulim", { prio: 1 });
    ["D5", "F#5", "A5", "B5"].forEach((n, i) => pl(c, o, t + 0.1 + i * 0.12, n, 0.28)); K.pad(c, o, t + 0.1, ["D3", "A3", "D4", "F#4"], 1.8, 0.13, { att: 0.25, rel: 0.8, lp: 2000 });
    if (rarity === "legenda" || rarity === "epik") K.ogung(c, o, t + 0.2, "A2", 0.08);
  },
  varian_pearl: (c, o, t) => { // paling istimewa tapi tetap singkat (±2,8 dtk) dan tidak tajam
    K.ogung(c, o, t, "D2", 0.15);
    ["D5", "F#5", "A5", "D6", "F#6", "A6"].forEach((n, i) => pl(c, o, t + 0.06 + i * 0.09, n, 0.3, "kalimba"));
    K.pad(c, o, t + 0.1, ["D3", "A3", "D4", "F#4", "A4"], 2.6, 0.17, { att: 0.25, rel: 1.0, lp: 2600 });
    K.flute(c, o, t + 0.6, "A5", 1.6, 0.2, "sulim", { prio: 1 }); K.flute(c, o, t + 1.0, "D6", 1.5, 0.17, "sulim", { prio: 1 });
    ["F#6", "A6", "D7", "A6", "F#6"].forEach((n, i) => pl(c, o, t + 1.45 + i * 0.07, n, 0.17, "kalimba"));
  },
  splash_besar: (c, o, t, size) => { // ikan raksasa terangkat: cipratan yang sebanding ukuran (0..1), dibatasi agar tidak mengagetkan
    const s = Math.max(0, Math.min(1, size == null ? 0.5 : size)), v = 0.55 + s * 0.45;
    nz(c, o, t, "lowpass", 1400, 400, 0.6, 0.5 + s * 0.3, 0.2 * v, 0.02); nz(c, o, t + 0.04, "bandpass", 900, 500, 0.8, 0.3 + s * 0.25, 0.14 * v, 0.02);
    tone(c, o, t, 150, 70, 0.3 + s * 0.2, 0.2 * v); for (let i = 0; i < 3 + Math.round(s * 3); i++) nz(c, o, t + 0.18 + i * 0.07, "bandpass", 1200 + i * 150, 700, 1, 0.12, 0.05 * v, 0.01);
  },

  // ---------- langkah kaki ----------
  // ---------- kapal (Bumbu 2.4) ----------
  boat_naik: (c, o, t) => { tone(c, o, t, 220, 170, 0.12, 0.09); nz(c, o, t + 0.04, "lowpass", 700, 300, 0.6, 0.45, 0.12, 0.06); }, // kayu berderit + air beriak saat menaiki kapal
  boat_jangkar: (c, o, t) => { for (let i = 0; i < 5; i++) nz(c, o, t + i * 0.07, "bandpass", 2400 - i * 180, 0, 4, 0.05, 0.06); nz(c, o, t + 0.42, "lowpass", 900, 260, 0.7, 0.55, 0.16, 0.02); tone(c, o, t + 0.42, 140, 70, 0.3, 0.12); }, // rantai + jangkar masuk air
  boat_angkat: (c, o, t) => { for (let i = 0; i < 4; i++) nz(c, o, t + i * 0.09, "bandpass", 1900 + i * 160, 0, 4, 0.05, 0.05); tone(c, o, t + 0.32, 420, 560, 0.14, 0.04, "triangle"); },
  boat_bentur: (c, o, t) => { tone(c, o, t, 160, 70, 0.22, 0.2); nz(c, o, t, "lowpass", 600, 200, 0.8, 0.3, 0.14, 0.004); }, // lambung kayu membentur (lembut)
  step_kayu: (c, o, t) => { tone(c, o, t, rand(250, 290), 170, 0.06, 0.1); nz(c, o, t, "bandpass", 900, 0, 1.4, 0.05, 0.05); },
  step_rumput: (c, o, t) => nz(c, o, t, "bandpass", rand(1000, 1300), 700, 0.8, 0.09, 0.055, 0.012),
  step_pasir: (c, o, t) => nz(c, o, t, "highpass", rand(1500, 1900), 0, 0.5, 0.11, 0.05, 0.01),
  step_tanah: (c, o, t) => { nz(c, o, t, "lowpass", rand(700, 950), 0, 0.5, 0.07, 0.085, 0.006); },
  step_lantai: (c, o, t) => { tone(c, o, t, rand(330, 380), 230, 0.05, 0.07); nz(c, o, t, "bandpass", 1100, 0, 1.2, 0.035, 0.03); },

  // ---------- Rumahku ----------
  furn_geser: (c, o, t) => nz(c, o, t, "lowpass", 800, 320, 0.7, 0.2, 0.07, 0.03),
  furn_taruh: (c, o, t) => { tone(c, o, t, 330, 200, 0.07, 0.12); pl(c, o, t + 0.05, "G4", 0.2); pl(c, o, t + 0.13, "C5", 0.2); },
  furn_ambil: (c, o, t) => { tone(c, o, t, 500, 380, 0.05, 0.06); },
  gelembung: (c, o, t) => { for (let i = 0; i < 3; i++) tone(c, o, t + i * rand(0.06, 0.16), rand(500, 800), rand(900, 1300), 0.06, 0.025); },
};
// aturan pembatasan frekuensi (detik minimal antar-pemutaran) dan prioritas
// g = penyesuaian level (hasil kalibrasi tests/audio_eval.py: puncak jingle ≈ −7…−9 dBFS, efek kritis paling jelas)
const RULE = {
  tick: { gap: 0.1 }, warn: { gap: 0.55, crit: 1, g: 1.8 }, surge: { gap: 0.25, crit: 1 }, snap: { gap: 0.3, crit: 1 }, strike: { crit: 1 },
  catch: { g: 1, crit: 1 }, bab_selesai: { g: 0.5 }, temuan: { g: 0.6 }, penghargaan: { g: 0.33 }, gelar: { g: 0.6 }, pemandangan: { g: 0.38 }, misi_baru: { g: 0.85 },
  spot_rahasia: { g: 0.55, gap: 1.2, crit: 1 }, varian_silver: { g: 0.7, gap: 1.2, crit: 1 }, varian_sunset: { g: 0.5, gap: 1.2, crit: 1 }, varian_pearl: { g: 0.42, gap: 1.5, crit: 1 }, splash_besar: { g: 0.8, gap: 0.8, crit: 1 }, // jingle tangkapan tidak boleh hilang diam-diam saat suara ramai
  nibble: { gap: 0.12 }, click: { gap: 0.03 }, coin: { gap: 0.05 },
  step_kayu: { gap: 0.2 }, step_rumput: { gap: 0.2 }, step_pasir: { gap: 0.2 }, step_tanah: { gap: 0.2 }, step_lantai: { gap: 0.2 },
  furn_geser: { gap: 0.18 }, gelembung: { gap: 0.8 },
  boat_naik: { gap: 0.6 }, boat_jangkar: { gap: 0.6 }, boat_angkat: { gap: 0.6 }, boat_bentur: { gap: 0.6, g: 0.8 },
};
// jingle/stinger: dipakai pula oleh menu uji dengar
const STINGERS = ["misi_baru", "bab_selesai", "temuan", "penghargaan", "gelar", "pemandangan", "berlayar", "tiba", "spot_rahasia", "varian_silver", "varian_sunset", "varian_pearl", "splash_besar"];
// putar satu efek dengan penyesuaian level (RULE.g). Dipakai AudioManager dan alat evaluasi offline.
function play(ctx, out, t, name, arg) {
  const fn = L[name]; if (!fn) return false;
  const g = (RULE[name] && RULE[name].g) || 1;
  if (g === 1) { fn(ctx, out, t, arg); return true; }
  const trim = ctx.createGain(); trim.gain.value = g; trim.connect(out);
  fn(ctx, trim, t, arg);
  if (typeof setTimeout === "function" && !(ctx instanceof (window.OfflineAudioContext || Object))) setTimeout(() => { try { trim.disconnect(); } catch (_) {} }, 6000);
  return true;
}
NW.sfxLib = { L, RULE, STINGERS, play };
})();
