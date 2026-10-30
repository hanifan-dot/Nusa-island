// ============================================================================
//  NUSA ISLAND — Bumbu 2.1: musik latar prosedural (NW.music)
//  Komposisi ORIGINAL untuk Nusa Island, dimainkan oleh sintesis di browser.
//  Bukan rekaman. Tidak menyalin lagu daerah / melodi pihak lain.
//  Warna "dawai & seruling" (Muara) dan "hasapi & sulim" (Toba) adalah INSPIRASI UMUM
//  timbre; suaranya sintetis dan tidak mengklaim sebagai instrumen tradisional asli.
//
//  Setiap tema = daftar bar (siklus 8 bar) + fungsi yang menjadwalkan nada per bar.
//  Variasi: tiap siklus memilih varian (melodi penuh / hanya petikan / gema) sehingga
//  tidak berulang persis sama dan tidak melelahkan.
// ============================================================================
(function () {
const NW = (window.NW = window.NW || {});
const K = NW.kit;

// ---------- motif yang dipakai ulang (stinger, jingle, tema perjalanan) ----------
const MOTIF = {
  harap:  ["D5", "F#5", "A5"],           // naik: harapan / misi baru
  jelajah: ["A4", "B4", "D5", "F#5"],    // rasa ingin tahu / temuan
  pulang: ["A5", "F#5", "D5"],           // turun lembut: tenang
};

// ---------- tema ----------
const THEMES = {};
const def = (id, o) => { THEMES[id] = Object.assign({ id, nbars: 8, send: 0.25, level: 1, spb: 16 }, o); };
const each = (arr, f) => { for (const x of arr) f(x); };

// pembantu penjadwalan di dalam bar
function strum(T, step, notes, vel, kind = "nilon", gap = 0.013) {
  notes.forEach((n, i) => T.pl(step, n, vel * (1 - i * 0.05), kind, { off: i * gap }));
}
function line(T, kind, arr, vel) { for (const [s, n, d] of arr) T.fl(s, n, d, vel, kind); }

// ================= MUARA KAMPUNG =================
// PAGI — "Pagi di Muara": D mayor, 4/4, ±72 bpm. Petikan lembut + seruling, kayu sangat ringan.
{
  const CH = [
    { p: ["D3", "A3", "F#4"], v: ["D3", "A3", "D4", "F#4", "A4"] }, { p: ["D3", "A3", "F#4"], v: ["D3", "A3", "D4", "F#4", "A4"] },
    { p: ["B2", "F#3", "D4"], v: ["B2", "F#3", "B3", "D4", "F#4"] }, { p: ["B2", "F#3", "D4"], v: ["B2", "F#3", "B3", "D4", "F#4"] },
    { p: ["G2", "D3", "B3"], v: ["G2", "D3", "G3", "B3", "D4"] }, { p: ["G2", "D3", "B3"], v: ["G2", "D3", "G3", "B3", "D4"] },
    { p: ["A2", "E3", "C#4"], v: ["A2", "E3", "A3", "C#4", "E4"] }, { p: ["A2", "E3", "C#4"], v: ["A2", "E3", "A3", "C#4", "E4"] },
  ];
  const A = [
    [[0, "F#4", 4], [4, "A4", 4], [8, "D5", 8]], [[0, "C#5", 4], [4, "A4", 4], [8, "B4", 6]],
    [[0, "D5", 6], [8, "B4", 4], [12, "A4", 4]], [[0, "F#4", 10]],
    [[0, "G4", 4], [4, "B4", 4], [8, "D5", 6], [14, "E5", 2]], [[0, "D5", 8], [8, "B4", 6]],
    [[0, "C#5", 4], [4, "E5", 6], [12, "C#5", 4]], [[0, "A4", 14]],
  ];
  const B = [ // varian: sedikit lebih tinggi & berakhir menggantung
    [[0, "A4", 4], [4, "D5", 4], [8, "F#5", 8]], [[0, "E5", 4], [4, "C#5", 4], [8, "D5", 6]],
    [[0, "F#5", 6], [8, "D5", 4], [12, "B4", 4]], [[0, "A4", 12]],
    [[0, "B4", 4], [4, "D5", 4], [8, "G5", 6]], [[0, "F#5", 8], [8, "D5", 6]],
    [[0, "E5", 4], [4, "C#5", 6], [10, "E5", 6]], [[0, "D5", 14]],
  ];
  def("muara_pagi", {
    name: "Pagi di Muara", step: 0.2083, send: 0.22, level: 0.4,
    bar(T, b, cyc) {
      const c = CH[b];
      if (b % 2 === 0) T.pd(c.p, 2 * 16, 0.17);
      const G = [[0, 0, 0.5], [4, 2, 0.3], [6, 3, 0.26], [8, 1, 0.32], [10, 3, 0.25], [12, 2, 0.28]];
      each(G, ([s, i, v]) => { if (b % 2 === 1 && s === 6) return; T.pl(s, c.v[i], v, "nilon"); });
      if (b % 4 === 3) T.pl(14, c.v[2], 0.2, "nilon");
      if (b % 2 === 1) T.tk(8, 0.1, 760);
      if (b === 7) T.tk(12, 0.07, 640);
      const m = [A, null, B, null][cyc % 4];
      if (m) line(T, "seruling", m[b].map(([s, n, d]) => [s, n, d * 0.95]), 0.34);
      else if (cyc % 4 === 3 && b === 4) T.fl(2, "A4", 6, 0.2, "seruling");
    },
  });
}
// SIANG — "Kampung yang Hidup": G mayor, 4/4, ±103 bpm. Petik ritmis, perkusi ringan, hook pendek.
{
  const V = {
    G: ["G2", "D3", "G3", "B3", "D4"], Em: ["E2", "B2", "E3", "G3", "B3"],
    C: ["C3", "G3", "C4", "E4", "G4"], D: ["D3", "A3", "D4", "F#4", "A4"],
  };
  const CH = [V.G, V.Em, V.C, V.D, V.G, V.Em, V.C, V.D];
  const HOOK = [
    [[0, "B4", 2], [2, "D5", 2], [4, "E5", 4], [8, "D5", 2], [10, "B4", 2], [12, "A4", 4]],
    [[0, "G4", 2], [2, "B4", 2], [4, "D5", 4], [8, "B4", 4], [12, "E5", 4]],
    [[0, "E5", 4], [4, "D5", 2], [6, "C5", 2], [8, "B4", 8]],
    [[0, "A4", 4], [4, "C5", 2], [6, "A4", 2], [8, "D5", 8]],
    [[0, "B4", 2], [2, "D5", 2], [4, "G5", 4], [8, "E5", 2], [10, "D5", 2], [12, "B4", 4]],
    [[0, "E5", 4], [4, "D5", 2], [6, "B4", 2], [8, "G4", 8]],
    [[0, "C5", 2], [2, "E5", 2], [4, "G5", 4], [8, "E5", 4], [12, "D5", 4]],
    [[0, "A4", 2], [2, "B4", 2], [4, "C5", 2], [6, "B4", 2], [8, "A4", 4]],
  ];
  def("muara_siang", {
    name: "Kampung yang Hidup", step: 0.1456, send: 0.16, level: 0.5,
    bar(T, b, cyc) {
      const v = CH[b];
      T.pd([v[1], v[3], v[4]], 16, 0.07);
      T.pl(0, v[0], 0.42, "nilon"); T.pl(8, v[0], 0.34, "nilon");
      strum(T, 0, v.slice(1), 0.26); strum(T, 4, v.slice(2), 0.16); strum(T, 6, v.slice(1, 4), 0.15);
      strum(T, 8, v.slice(1), 0.22); strum(T, 12, v.slice(1), 0.22); if (b % 2) strum(T, 14, v.slice(3), 0.13);
      T.tk(4, 0.15, 700); T.tk(12, 0.15, 620); if (b % 4 === 3) T.tk(14, 0.09, 820);
      for (let s = 0; s < 16; s += 2) T.sh(s, s % 8 === 4 ? 0.05 : 0.03);
      if (cyc % 2 === 0 || b < 2) line(T, "seruling", HOOK[b].map(([s, n, d]) => [s, n, d * 0.9]), 0.3);
    },
  });
}
// SORE — "Senja Dermaga": A minor, 4/4, ±58 bpm. Gitar lembut, seruling panjang, jarang.
{
  const V = {
    Am: ["A2", "E3", "A3", "C4", "E4"], F: ["F2", "C3", "F3", "A3", "C4"], C: ["C3", "G3", "C4", "E4", "G4"],
    G: ["G2", "D3", "G3", "B3", "D4"], Em: ["E2", "B2", "E3", "G3", "B3"],
  };
  const CH = [V.Am, V.F, V.C, V.G, V.Am, V.F, V.Em, V.Am];
  const M = [
    [[0, "E5", 12]], [[0, "C5", 6], [8, "A4", 8]], [[0, "G4", 8], [8, "E5", 8]], [[0, "D5", 12]],
    [[0, "C5", 8], [8, "B4", 4], [12, "A4", 4]], [[0, "A4", 12]], [[0, "G4", 6], [8, "B4", 8]], [[0, "A4", 16]],
  ];
  def("muara_sore", {
    name: "Senja Dermaga", step: 0.2586, send: 0.36, level: 0.35,
    bar(T, b, cyc) {
      const v = CH[b];
      T.pd([v[1], v[2], v[3]], 16, 0.19, { att: 1.6 });
      T.pl(0, v[0], 0.42, "nilon"); T.pl(6, v[2], 0.24, "nilon"); T.pl(10, v[3], 0.21, "nilon");
      if (b % 2 === 0) T.pl(14, v[4], 0.17, "nilon");
      if (cyc % 3 !== 2) line(T, "seruling", M[b].map(([s, n, d]) => [s, n, d * 0.97]), 0.33);
      else if (b === 0 || b === 4) T.fl(4, b ? "E5" : "C5", 10, 0.2, "seruling");
    },
  });
}
// MALAM — "Malam di Muara": D dorian, ±48 bpm. Petikan jarang, pad lembut, ruang hening.
{
  const PADS = [["D3", "A3", "C4", "E4"], ["Bb2", "F3", "A3", "D4"], ["G2", "D3", "Bb3", "E4"], ["A2", "E3", "G3", "D4"]];
  const NOTES = [["A3", "D4", "F4", "A4", "C5", "E5"], ["F4", "A4", "D5"], ["D4", "G4", "Bb4", "E5"], ["E4", "A4", "D5", "G4"]];
  const SL = [0, 5, 8, 11, 14, 19, 22, 27];
  def("muara_malam", {
    name: "Malam di Muara", step: 0.3125, send: 0.45, level: 0.20,
    bar(T, b, cyc) {
      const q = b >> 1;
      if (b % 2 === 0) T.pd(PADS[q], 2 * 16, 0.19, { att: 3.5, lp: 900 });
      T.pl(0, PADS[q][0], 0.26, "bass", { prio: 1 });
      const pool = NOTES[q], n = b % 2 ? 2 : 3;
      for (let i = 0; i < n; i++) { const s = SL[(T.r() * SL.length) | 0]; if (s < 16) T.pl(s, pool[(T.r() * pool.length) | 0], 0.15 + T.r() * 0.06, "kalimba", { lp: 3200 }); }
      if (cyc % 3 === 0) {
        if (b === 0) T.fl(2, "A4", 10, 0.24, "seruling"); if (b === 1) { T.fl(0, "D5", 6, 0.22, "seruling"); T.fl(8, "C5", 8, 0.2, "seruling"); }
        if (b === 2) T.fl(2, "D5", 10, 0.22, "seruling"); if (b === 3) T.fl(0, "A4", 12, 0.2, "seruling");
      }
    },
  });
}

// ================= KAMPUNG TEPIAN TOBA — "Angin dari Toba" =================
// Meter 6/8 (12 langkah per bar), gerak lambat & lapang, dawai bergaya hasapi + seruling bergaya sulim,
// gong kecil. Skala pentatonik + nada pedal terbuka (kuint kosong): sengaja berbeda dari Muara.
const HAS = (lo, f5, r, t3, hi, top) => ({ lo, f5, r, t3, hi, top });
{
  const V = {
    Em: HAS("E2", "B2", "E3", "G3", "B3", "E4"), G: HAS("G2", "D3", "G3", "B3", "D4", "G4"), D: HAS("D2", "A2", "D3", "E3", "A3", "D4"),
  };
  const CH = [V.Em, V.Em, V.G, V.G, V.D, V.D, V.Em, V.Em];
  const PADN = [["E3", "B3", "E4"], ["E3", "B3", "E4"], ["G3", "D4", "B4"], ["G3", "D4", "B4"], ["D3", "A3", "E4"], ["D3", "A3", "E4"], ["E3", "B3", "G4"], ["E3", "B3", "E4"]];
  const MEL = [
    [[0, "B4", 6], [6, "E5", 3], [9, "G5", 3]], [[0, "A5", 6], [6, "G5", 3], [9, "E5", 3]],
    [[0, "D5", 6], [6, "G5", 6]], [[0, "B4", 6], [6, "D5", 3], [9, "B4", 3]],
    [[0, "E5", 6], [6, "A5", 6]], [[0, "G5", 3], [3, "E5", 3], [6, "D5", 6]],
    [[0, "E5", 3], [3, "G5", 3], [6, "B5", 6]], [[0, "E5", 12]],
  ];
  def("toba_pagi", {
    name: "Angin dari Toba · Pagi", step: 0.30, spb: 12, send: 0.5, level: 0.39,
    bar(T, b, cyc) {
      const v = CH[b];
      if (b % 2 === 0) T.pd(PADN[b], 24, 0.15, { att: 4, lp: 1000 });
      T.pl(0, v.lo, 0.46, "hasapi"); T.pl(2, v.f5, 0.24, "hasapi"); T.pl(3, v.r, 0.28, "hasapi"); T.pl(5, v.hi, 0.2, "hasapi");
      T.pl(6, v.lo, 0.33, "hasapi"); if (b % 2 === 0) { T.pl(8, v.f5, 0.21, "hasapi"); T.pl(11, v.t3, 0.18, "hasapi"); }
      if (b === 0 || b === 4) T.og(0, v.lo, 0.1);
      const mode = cyc % 3;
      if (mode === 0 || (mode === 1 && b >= 4)) line(T, "sulim", MEL[b].map(([s, n, d]) => [s, n, d * 0.96]), 0.31);
    },
  });
}
{
  const V = {
    A: HAS("A2", "E3", "A3", "C#4", "E4", "A4"), G: HAS("G2", "D3", "G3", "B3", "D4", "G4"), D: HAS("D2", "A2", "D3", "F#3", "A3", "D4"),
  };
  const CH = [V.A, V.A, V.G, V.G, V.D, V.D, V.A, V.A];
  const MEL = [
    [[0, "E5", 3], [3, "A5", 3], [6, "B5", 3], [9, "A5", 3]], [[0, "E5", 3], [3, "C#5", 3], [6, "E5", 6]],
    [[0, "D5", 3], [3, "G5", 3], [6, "B5", 3], [9, "G5", 3]], [[0, "D5", 6], [6, "B4", 6]],
    [[0, "A4", 3], [3, "D5", 3], [6, "F#5", 3], [9, "E5", 3]], [[0, "D5", 6], [6, "A4", 6]],
    [[0, "E5", 3], [3, "A5", 3], [6, "E5", 3], [9, "C#5", 3]], [[0, "A4", 9], [9, "E5", 3]],
  ];
  def("toba_siang", {
    name: "Angin dari Toba · Siang", step: 0.21, spb: 12, send: 0.34, level: 0.41,
    bar(T, b, cyc) {
      const v = CH[b];
      T.pd([v.r, v.hi, v.top], 24, 0.07, { lp: 1500, att: 1.2 });
      T.pl(0, v.lo, 0.44, "hasapi"); T.pl(2, v.f5, 0.24, "hasapi"); T.pl(3, v.r, 0.29, "hasapi"); T.pl(4, v.t3, 0.19, "hasapi");
      T.pl(6, v.lo, 0.36, "hasapi"); T.pl(8, v.f5, 0.23, "hasapi"); T.pl(9, v.r, 0.28, "hasapi"); T.pl(10, v.t3, 0.19, "hasapi");
      if (b % 2) T.pl(11, v.hi, 0.17, "hasapi");
      T.dr(0, 0.26, 130); T.dr(6, 0.2, 150); T.tk(3, 0.12, 760); T.tk(9, 0.12, 700);
      for (const s of [0, 3, 6, 9]) T.sh(s, s % 6 === 0 ? 0.045 : 0.03);
      if (b === 0 || b === 4) T.og(0, v.lo, 0.09);
      if (cyc % 2 === 0 || b < 4) line(T, "sulim", MEL[b].map(([s, n, d]) => [s, n, d * 0.92]), 0.3);
    },
  });
}
{
  const V = {
    D: HAS("D2", "A2", "D3", "E3", "A3", "E4"), G: HAS("G2", "D3", "G3", "B3", "D4", "G4"),
    Em: HAS("E2", "B2", "E3", "G3", "B3", "E4"), A: HAS("A2", "E3", "A3", "B3", "E4", "A4"),
  };
  const CH = [V.D, V.D, V.G, V.G, V.Em, V.Em, V.A, V.A];
  const MEL = [
    [[0, "A4", 9], [9, "D5", 3]], [[0, "F#5", 12]], [[0, "E5", 6], [6, "D5", 6]], [[0, "B4", 12]],
    [[0, "G5", 6], [6, "E5", 6]], [[0, "B5", 12]], [[0, "A5", 6], [6, "F#5", 3], [9, "E5", 3]], [[0, "A4", 12]],
  ];
  def("toba_sore", {
    name: "Angin dari Toba · Sore", step: 0.40, spb: 12, send: 0.62, level: 0.335,
    bar(T, b, cyc) {
      const v = CH[b];
      if (b % 2 === 0) T.pd([v.r, v.hi, v.top, CH[b].lo.replace(/2$/, "3")], 24, 0.2, { att: 5, lp: 1100 });
      if (b % 2 === 0) { T.pl(0, v.lo, 0.4, "hasapi"); T.pl(9, v.hi, 0.15, "hasapi"); }
      T.pl(6, v.f5, 0.19, "hasapi");
      if (b === 0 || b === 4) T.og(0, v.lo, 0.13);
      if (cyc % 3 !== 2) line(T, "sulim", MEL[b].map(([s, n, d]) => [s, n, d * 0.98]), 0.3);
      else if (b === 2 || b === 6) T.fl(0, b === 2 ? "E5" : "A5", 9, 0.2, "sulim");
    },
  });
}
{
  const PADS = [["A2", "E3", "A3", "C4"], ["G2", "D3", "G3", "B3"], ["F2", "C3", "F3", "A3"], ["E2", "B2", "E3", "G3"]];
  const POOL = ["A4", "C5", "D5", "E5", "G5"];
  def("toba_malam", {
    name: "Angin dari Toba · Malam", step: 0.45, spb: 12, send: 0.62, level: 0.20,
    bar(T, b, cyc) {
      const q = b >> 1;
      if (b % 2 === 0) T.pd(PADS[q], 24, 0.2, { att: 5, lp: 800 });
      if (b % 2 === 0) T.pl(0, PADS[q][0], 0.3, "bass", { prio: 1 });
      const n = b % 2 ? 2 : 3;
      for (let i = 0; i < n; i++) T.pl([1, 4, 7, 10][(T.r() * 4) | 0], POOL[(T.r() * POOL.length) | 0], 0.12 + T.r() * 0.05, "kalimba", { lp: 3000 });
      if (b === 0 && cyc % 2 === 0) T.og(3, "E2", 0.09);
      if (b === 2 && cyc % 3 === 0) { T.fl(2, "E5", 9, 0.19, "sulim"); T.fl(14, "D5", 8, 0.17, "sulim"); }
    },
  });
}

// ================= RUMAHKU =================
{
  const V = {
    F: ["F2", "C3", "F3", "A3", "C4"], Dm: ["D3", "A3", "D4", "F4", "A4"], Bb: ["Bb2", "F3", "Bb3", "D4", "F4"],
    C: ["C3", "G3", "C4", "E4", "G4"], Gm: ["G2", "D3", "G3", "Bb3", "D4"],
  };
  const CH = [V.F, V.Dm, V.Bb, V.C, V.F, V.Dm, V.Gm, V.C];
  const MEL = [
    [[0, "A4"], [6, "C5"], [10, "A4"]], [[0, "D5"], [6, "C5"], [10, "A4"]], [[0, "F4"], [4, "A4"], [8, "Bb4"], [12, "D5"]], [[0, "E5"], [8, "G4"]],
    [[0, "C5"], [6, "A4"], [10, "F4"]], [[0, "F4"], [6, "A4"], [12, "D5"]], [[0, "Bb4"], [8, "G4"], [12, "A4"]], [[0, "G4"], [8, "E4"], [12, "G4"]],
  ];
  def("rumah", {
    name: "Rumahku", step: 0.2206, send: 0.3, level: 0.64,
    bar(T, b, cyc) {
      const v = CH[b];
      T.pd([v[1], v[2], v[3]], 16, 0.13, { att: 1.8 });
      each([[0, 0, 0.36], [4, 2, 0.2], [6, 3, 0.18], [8, 1, 0.22], [10, 4, 0.16], [12, 2, 0.16]], ([s, i, vv]) => T.pl(s, v[i], vv, "nilon"));
      each(MEL[b], ([s, n]) => T.pl(s, n, 0.2, "kalimba", { lp: 3600 }));
      if (cyc % 2 === 1 && (b === 3 || b === 7)) T.fl(0, b === 3 ? "E5" : "G4", 8, 0.16, "seruling");
    },
  });
}

// ================= PERJALANAN KAPAL (tema singkat) =================
{
  const D = ["D3", "A3", "D4", "F#4", "A4"], A = ["A2", "E3", "A3", "C#4", "E4"], G = ["G2", "D3", "G3", "B3", "D4"];
  def("kapal", {
    name: "Berlayar", step: 0.13, nbars: 4, send: 0.3, level: 0.43,
    bar(T, b) {
      const v = [D, A, G, A][b];
      T.pl(0, v[0], 0.4, "nilon"); strum(T, 0, v.slice(1), 0.24); strum(T, 4, v.slice(2), 0.15); strum(T, 8, v.slice(1), 0.2); strum(T, 12, v.slice(2), 0.15);
      T.tk(4, 0.13, 700); T.tk(12, 0.13, 640); T.sh(2, 0.04); T.sh(6, 0.04); T.sh(10, 0.04); T.sh(14, 0.04);
      const m = [[[0, "A4", 4], [4, "D5", 4], [8, "F#5", 4], [12, "A5", 4]], [[0, "G5", 4], [4, "F#5", 4], [8, "E5", 8]],
        [[0, "D5", 4], [4, "G5", 4], [8, "B5", 8]], [[0, "A5", 6], [8, "F#5", 4], [12, "D5", 4]]][b];
      line(T, "seruling", m, 0.3);
    },
  });
}

// ================= SAMUDRA NUSANTARA (Bumbu 2.4) =================
// BERLAYAR — "Layar Terkembang": G mayor, ±80 bpm. Petikan bergelombang seperti ombak, seruling lapang.
{
  const V = { G: ["G2", "D3", "G3", "B3", "D4"], D: ["D3", "A3", "D4", "F#4", "A4"], Em: ["E2", "B2", "E3", "G3", "B3"], C: ["C3", "G3", "C4", "E4", "G4"] };
  const CH = [V.G, V.D, V.Em, V.C, V.G, V.D, V.C, V.D];
  const M = [
    [[0, "B4", 4], [4, "D5", 4], [8, "G5", 6], [14, "F#5", 2]], [[0, "A5", 6], [8, "F#5", 4], [12, "D5", 4]],
    [[0, "E5", 4], [4, "G5", 4], [8, "B5", 8]], [[0, "A5", 4], [4, "G5", 4], [8, "E5", 8]],
    [[0, "D5", 4], [4, "G5", 4], [8, "B5", 6], [14, "A5", 2]], [[0, "F#5", 6], [8, "A5", 4], [12, "F#5", 4]],
    [[0, "E5", 4], [4, "G5", 4], [8, "C6", 6], [14, "B5", 2]], [[0, "A5", 12]],
  ];
  const WAVE = [[0, 1], [2, 2], [4, 3], [6, 4], [8, 3], [10, 2], [12, 3], [14, 4]];
  def("samudra", {
    name: "Layar Terkembang", step: 0.1875, send: 0.3, level: 0.42,
    bar(T, b, cyc) {
      const v = CH[b];
      if (b % 2 === 0) T.pd([v[1], v[3], v[4]], 32, 0.09, { att: 1.4 });
      T.pl(0, v[0], 0.4, "nilon"); T.pl(8, v[0], 0.3, "nilon");
      for (const [st, i] of WAVE) T.pl(st, v[i], 0.15 + (st === 0 || st === 8 ? 0.05 : 0), "nilon");
      T.tk(4, 0.12, 660); T.tk(12, 0.12, 600); for (let st = 2; st < 16; st += 4) T.sh(st, 0.03);
      if (cyc % 3 !== 2) line(T, "seruling", M[b], 0.29); else if (b % 2 === 0) T.pl(0, M[b][0][1], 0.2, "kalimba");
    },
  });
}
// BERLAYAR MALAM — "Laut Malam": E minor, ±50 bpm. Pad luas, kalimba jarang seperti bintang, ruang hening.
{
  const PADS = [["E3", "B3", "G4"], ["C3", "G3", "E4"], ["A2", "E3", "C4"], ["B2", "F#3", "D#4"]];
  const STAR = [["B5", "E6"], ["G5", "C6"], ["E5", "A5"], ["F#5", "B5"]];
  def("samudra_malam", {
    name: "Laut Malam", step: 0.3, send: 0.5, level: 0.24,
    bar(T, b, cyc) {
      const q = b >> 1;
      if (b % 2 === 0) T.pd(PADS[q], 32, 0.17, { att: 3, lp: 1000 });
      if (b % 2 === 0) T.pl(0, PADS[q][0], 0.22, "bass", { prio: 1 });
      if (T.r() < 0.6) T.pl(4 + ((T.r() * 8) | 0), STAR[q][(T.r() * 2) | 0], 0.12, "kalimba", { lp: 3400 });
      if (cyc % 2 === 1 && b === 6) T.fl(0, "B4", 12, 0.15, "seruling");
    },
  });
}
// PELABUHAN — "Pelabuhan Pagi": C mayor, ±94 bpm. Kalimba riang di atas petikan, kayu ringan.
{
  const V = { C: ["C3", "G3", "C4", "E4", "G4"], Am: ["A2", "E3", "A3", "C4", "E4"], F: ["F2", "C3", "F3", "A3", "C4"], G: ["G2", "D3", "G3", "B3", "D4"] };
  const CH = [V.C, V.Am, V.F, V.G, V.C, V.Am, V.F, V.G];
  const MEL = [[[0, "E5"], [4, "G5"], [8, "C6"], [12, "G5"]], [[0, "A5"], [6, "E5"], [10, "C5"]], [[0, "F5"], [4, "A5"], [8, "C6"], [12, "A5"]], [[0, "G5"], [6, "D5"], [10, "B4"]],
    [[0, "E5"], [4, "G5"], [8, "E6"], [12, "D6"]], [[0, "C6"], [6, "A5"], [10, "E5"]], [[0, "F5"], [4, "C6"], [8, "A5"], [12, "F5"]], [[0, "G5"], [8, "D5"]]];
  def("pelabuhan", {
    name: "Pelabuhan Pagi", step: 0.16, send: 0.2, level: 0.44,
    bar(T, b, cyc) {
      const v = CH[b];
      T.pd([v[1], v[3], v[4]], 16, 0.07);
      T.pl(0, v[0], 0.4, "nilon"); T.pl(8, v[0], 0.3, "nilon");
      strum(T, 2, v.slice(2), 0.18); strum(T, 6, v.slice(1, 4), 0.14); strum(T, 10, v.slice(2), 0.18); strum(T, 14, v.slice(3), 0.12);
      T.tk(4, 0.13, 720); T.tk(12, 0.13, 640); for (let st = 0; st < 16; st += 2) T.sh(st, st % 4 === 2 ? 0.04 : 0.025);
      if (cyc % 2 === 0 || b < 4) for (const [st, n] of MEL[b]) T.pl(st, n, 0.2, "kalimba", { lp: 3800 });
      else if (b % 4 === 3) T.fl(0, "G5", 8, 0.18, "seruling");
    },
  });
}
// PELABUHAN MALAM — "Lampu Dermaga": A minor, ±56 bpm. Petikan lembut, pad hangat, seruling pendek.
{
  const CH = [["A2", "E3", "A3", "C4"], ["F2", "C3", "F3", "A3"], ["C3", "G3", "C4", "E4"], ["E2", "B2", "E3", "G#3"]];
  def("pelabuhan_malam", {
    name: "Lampu Dermaga", step: 0.27, send: 0.42, level: 0.26,
    bar(T, b, cyc) {
      const c = CH[b >> 1];
      if (b % 2 === 0) T.pd(c.slice(1), 32, 0.15, { att: 2.5, lp: 1100 });
      T.pl(0, c[0], 0.3, "nilon"); T.pl(6, c[2], 0.18, "nilon"); T.pl(10, c[3], 0.16, "nilon");
      if (cyc % 2 === 0 && (b === 1 || b === 5)) T.fl(4, b === 1 ? "E5" : "C5", 8, 0.17, "seruling");
    },
  });
}

// ================= CERITA (adegan, dipakai ulang) =================
{
  const CH = [["D3", "A3", "F4"], ["Bb2", "F3", "D4"], ["F3", "C4", "A4"], ["C3", "G3", "E4"]];
  def("cerita", {
    name: "Cerita", step: 0.30, nbars: 8, send: 0.5, level: 0.4,
    bar(T, b) {
      const c = CH[b >> 1];
      if (b % 2 === 0) T.pd(c, 32, 0.2, { att: 3 });
      if (b % 2 === 0) { T.pl(0, c[0], 0.3, "bass", { prio: 1 }); T.pl(8, c[1], 0.18, "nilon"); }
      const mel = [["A4", "D5"], ["F4", "Bb4"], ["C5", "A4"], ["G4", "E5"]][b >> 1];
      T.pl(b % 2 ? 6 : 2, mel[b % 2], 0.22, "kalimba", { lp: 3400 });
      if (b === 1 || b === 5) T.fl(4, b === 1 ? "D5" : "C5", 10, 0.22, "seruling");
    },
  });
}

// ================= MEMANCING =================
// Satu tema per daerah, dua lapis: IDLE (pad sangat pelan + petikan jarang di register rendah-menengah)
// dan TEGANG (denyut berirama yang naik dengan intensitas). Tidak ada nada tinggi berulang.
function fishing(id, name, o) {
  def(id, {
    name, step: o.step, spb: 4, nbars: 16, send: o.send, level: o.level,
    bar(T, b, cyc) {
      const q = (b >> 2) % 4, c = o.ch[q], I = T.intensity || 0;
      if (b % 4 === 0) T.pd(c.pad, 4 * 4, 0.10, { att: 1.5, lp: 800 });
      if (b % 4 === 0 && T.r() < 0.5) T.pl(0, o.pool[(T.r() * o.pool.length) | 0], 0.14, o.kind, { lp: 2400 });
      if (I > 0.12) {
        T.pl(0, c.root, 0.16 + 0.7 * I, o.low);
        T.tk(0, 0.08 + 0.38 * I, o.tokp);
        if (I > 0.45) { T.pl(2, c.fifth, 0.1 + 0.42 * I, o.low); T.tk(2, 0.06 + 0.24 * I, o.tokp * 1.15); }
        if (I > 0.7 && b % 2) { T.pl(1, c.root, 0.08 + 0.34 * I, o.low); T.sh(3, 0.05 + 0.1 * I); }
        if (I > 0.35 && o.gong && b % 8 === 0) T.og(0, c.root, 0.1 + 0.2 * I);
      }
    },
  });
}
fishing("mancing_muara", "Mancing · Muara", {
  step: 0.28, level: 0.45, send: 0.4, kind: "nilon", low: "bass", tokp: 520, pool: ["D4", "F#4", "A4", "B4", "A3"],
  ch: [{ pad: ["D3", "A3", "F#4"], root: "D2", fifth: "A2" }, { pad: ["B2", "F#3", "D4"], root: "B1", fifth: "F#2" }, { pad: ["G2", "D3", "B3"], root: "G1", fifth: "D2" }, { pad: ["A2", "E3", "C#4"], root: "A1", fifth: "E2" }],
});
fishing("mancing_toba", "Mancing · Toba", {
  step: 0.30, level: 0.40, send: 0.55, kind: "hasapi", low: "bass", tokp: 470, gong: true, pool: ["E4", "G4", "A4", "B4", "E3"],
  ch: [{ pad: ["E3", "B3", "E4"], root: "E2", fifth: "B2" }, { pad: ["G3", "D4", "B4"], root: "G2", fifth: "D3" }, { pad: ["D3", "A3", "E4"], root: "D2", fifth: "A2" }, { pad: ["E3", "B3", "G4"], root: "E2", fifth: "B2" }],
});

fishing("mancing_laut", "Mancing · Laut", { // Bumbu 2.4: memancing dari kapal
  step: 0.27, level: 0.42, send: 0.45, kind: "nilon", low: "bass", tokp: 500, pool: ["G4", "B4", "D5", "E4", "D4"],
  ch: [{ pad: ["G2", "D3", "B3"], root: "G1", fifth: "D2" }, { pad: ["E3", "B3", "G4"], root: "E2", fifth: "B2" }, { pad: ["C3", "G3", "E4"], root: "C2", fifth: "G2" }, { pad: ["D3", "A3", "F#4"], root: "D2", fifth: "A2" }],
});

// ---------- penjadwal per tema ----------
class Track {
  constructor(ctx, stage, theme, opt = {}) {
    this.ctx = ctx; this.stage = stage; this.th = theme; this.id = theme.id;
    this.bus = ctx.createGain(); this.bus.gain.value = 0.0001; this.bus.connect(stage.music);
    this.sendG = ctx.createGain(); this.sendG.gain.value = theme.send; this.bus.connect(this.sendG); this.sendG.connect(stage.fxIn);
    this.level = theme.level; this.bar = 0; this.cyc = 0; this.nextT = null; this.t0 = 0; this.intensity = 0;
    this.rnd = K.mulberry32(opt.seed != null ? opt.seed : (Math.random() * 1e9) | 0);
    this.dead = false; this.fadeTimer = null; this.fading = false;
  }
  r() { return this.rnd(); }
  at(s) { return this.t0 + s * this.th.step; }
  // pembantu bagi fungsi bar tema
  pl(s, n, v, kind, o = {}) { K.pluck(this.ctx, this.bus, this.at(s) + (o.off || 0), n, v * this.level, kind, o); }
  fl(s, n, d, v, kind) { K.flute(this.ctx, this.bus, this.at(s), n, d * this.th.step, v * this.level, kind); }
  pd(notes, steps, v, o) { K.pad(this.ctx, this.bus, this.t0, notes, steps * this.th.step, v * this.level, o); }
  tk(s, v, p) { K.tok(this.ctx, this.bus, this.at(s), v * this.level, p); }
  sh(s, v) { K.shaker(this.ctx, this.bus, this.at(s), v * this.level); }
  dr(s, v, f) { K.drum(this.ctx, this.bus, this.at(s), v * this.level, f); }
  og(s, n, v) { K.ogung(this.ctx, this.bus, this.at(s), n, v * this.level); }
  // jadwalkan semua bar yang mulainya sebelum `upto`
  pump(upto, max = 4) {
    if (this.dead) return;
    const now = this.ctx.currentTime;
    if (this.nextT == null || this.nextT < now - 0.01) this.nextT = now + 0.05; // kejar bila terlambat (tab sempat tertahan)
    const len = this.th.step * this.th.spb;
    let guard = 0;
    while (this.nextT < upto && guard++ < max) {
      this.t0 = this.nextT;
      try { this.th.bar(this, this.bar % this.th.nbars, this.cyc); } catch (e) { console.error("musik:", e); }
      this.nextT += len; this.bar++;
      if (this.bar % this.th.nbars === 0) this.cyc++;
    }
  }
  fade(to, sec) {
    const g = this.bus.gain, t = this.ctx.currentTime;
    g.cancelScheduledValues(t); g.setValueAtTime(Math.max(g.value, 0.0001), t); g.linearRampToValueAtTime(Math.max(to, 0.0001), t + Math.max(0.02, sec));
  }
  dispose() {
    this.dead = true; clearTimeout(this.fadeTimer);
    try { this.bus.disconnect(); this.sendG.disconnect(); } catch (_) {}
  }
}

// ---------- render offline (untuk pengujian & evaluasi kualitas) ----------
async function render(id, seconds = 40, opt = {}) {
  const sr = opt.sr || 44100, n = Math.ceil(seconds * sr);
  const oc = new OfflineAudioContext(2, n, sr);
  const stage = K.makeStage(oc);
  stage.master.gain.value = opt.gain != null ? opt.gain : 1;
  stage.music.gain.value = 1;
  const tr = new Track(oc, stage, THEMES[id], { seed: opt.seed != null ? opt.seed : 12345 });
  tr.bus.gain.value = 1; tr.intensity = opt.intensity || 0;
  tr.pump(seconds + 0.2, 100000);
  const buf = await oc.startRendering();
  return buf;
}

NW.music = { THEMES, MOTIF, Track, render, ids: Object.keys(THEMES) };
})();
