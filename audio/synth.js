// ============================================================================
//  NUSA ISLAND — Bumbu 2.1: perangkat sintesis suara (NW.kit)
//  Semua suara DIHASILKAN di browser (sintesis prosedural). Tidak ada file rekaman,
//  tidak ada sampel pihak ketiga. Nada "petikan" memakai sintesis senar Karplus–Strong
//  sehingga terdengar seperti dawai dipetik, bukan osilator murni.
//  PENTING: ini suara sintetis — bukan rekaman hasapi/sulim/gitar asli.
//  Modul ini murni: menerima (ctx, tujuan, waktu, ...) sehingga bisa dipakai live
//  (AudioContext) maupun render offline (OfflineAudioContext) untuk pengujian.
// ============================================================================
(function () {
const NW = (window.NW = window.NW || {});

function mulberry32(a) { return function () { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
// "F#4" -> nomor MIDI, 60 = C4
function midi(n) {
  if (typeof n === "number") return n;
  const m = /^([A-G])([#b]?)(-?\d)$/.exec(n); if (!m) throw new Error("nada salah: " + n);
  return 12 * (+m[3] + 1) + NOTE[m[1]] + (m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0);
}
const hz = (n) => 440 * Math.pow(2, (midi(n) - 69) / 12);

// ---- pencacah suara (untuk membatasi polifoni & menguji kebocoran) ----
const stats = { live: 0, started: 0, ended: 0, skipped: 0, maxLive: 0 };
const MAX_VOICES = 28; // polifoni maksimum pada satu saat
const poly = []; // suara terjadwal {s,e}: polifoni dihitung dari tumpang-tindih WAKTU (bukan jumlah yang sudah dijadwalkan)
function track(src, nodes, voicesOn = true) {
  stats.live++; stats.started++; if (stats.live > stats.maxLive) stats.maxLive = stats.live;
  src.onended = () => { stats.live--; stats.ended++; for (const n of nodes) { try { n.disconnect(); } catch (_) {} } };
}
// true bila masih ada ruang untuk suara pada waktu t (dan memesan tempatnya selama dur detik).
// prio=0 (hiasan) mengalah lebih dulu: batasnya 6 suara lebih rendah.
function room(prio = 0, t = 0, dur = 1) {
  let n = 0; for (let i = 0; i < poly.length; i++) { const v = poly[i]; if (v.s <= t && v.e > t) n++; }
  if (n >= MAX_VOICES - (prio ? 0 : 6)) { stats.skipped++; return false; }
  poly.push({ s: t, e: t + dur });
  if (poly.length > 600) { const keep = t - 12; for (let i = poly.length - 1; i >= 0; i--) if (poly[i].e < keep) poly.splice(i, 1); }
  return true;
}

// ---- kebisingan putih (sekali per context) ----
const noiseCache = new WeakMap();
function noiseBuf(ctx) {
  let b = noiseCache.get(ctx); if (b) return b;
  const sr = ctx.sampleRate; b = ctx.createBuffer(1, sr * 3, sr);
  const d = b.getChannelData(0), r = mulberry32(7);
  for (let i = 0; i < d.length; i++) d[i] = r() * 2 - 1;
  noiseCache.set(ctx, b); return b;
}
// sumber noise berulang untuk ambience (offset acak supaya tiap lapisan tidak seragam)
function noiseLoop(ctx, offset = 0) {
  const s = ctx.createBufferSource(); s.buffer = noiseBuf(ctx); s.loop = true; s.start(0, offset % 2.9); return s;
}

// ---- Karplus–Strong: senar dipetik, di-cache per (jenis, panjang delay) ----
const ksCache = new Map(); const KS_MAX = 64;
const KIND = {
  //            T60(dtk) terang   tubuh(Hz,dB)  lowpass akhir
  nilon:   { t60: 1.7, bright: 0.42, lp: 4200 },              // gitar nilon: hangat
  hasapi:  { t60: 1.25, bright: 0.85, lp: 6200, body: [1250, 4.5] }, // lute berdawai: lebih nyaring & "nasal" (sintetis, bukan rekaman)
  kalimba: { t60: 1.0, bright: 0.9, lp: 7000 },               // petikan tinggi, bening
  bass:    { t60: 1.9, bright: 0.25, lp: 1600 },              // dawai rendah (drone)
};
function ksBuffer(ctx, kind, freq) {
  const sr = ctx.sampleRate, K = KIND[kind] || KIND.nilon;
  const N = Math.max(4, Math.round(sr / freq - 0.5));
  const key = sr + "|" + kind + "|" + N;
  let e = ksCache.get(key);
  if (e) { ksCache.delete(key); ksCache.set(key, e); return e; }
  const len = Math.floor(sr * Math.min(K.t60 * 1.15, 2.6));
  const buf = ctx.createBuffer(1, len, sr), d = buf.getChannelData(0), rnd = mulberry32(N * 131 + kind.length);
  let prev = 0; const a = 0.12 + 0.85 * K.bright;
  for (let i = 0; i < N; i++) { prev += a * ((rnd() * 2 - 1) - prev); d[i] = prev; }
  const rho = Math.exp(Math.log(1e-3) * (N + 0.5) / (K.t60 * sr)); // peluruhan per putaran
  for (let i = N; i < len; i++) d[i] = rho * 0.5 * (d[i - N] + d[i - N + 1]);
  let pk = 0; for (let i = 0; i < len; i++) { const v = Math.abs(d[i]); if (v > pk) pk = v; }
  const g = 0.9 / (pk || 1); for (let i = 0; i < len; i++) d[i] *= g;
  // ujung dipudarkan supaya tidak ada klik
  const fl = Math.min(len, Math.floor(sr * 0.05)); for (let i = 0; i < fl; i++) d[len - 1 - i] *= i / fl;
  e = { buf, f0: sr / (N + 0.5) };
  ksCache.set(key, e); if (ksCache.size > KS_MAX) ksCache.delete(ksCache.keys().next().value);
  return e;
}
// petik satu nada
function pluck(ctx, out, t, note, vel = 0.5, kind = "nilon", opt = {}) {
  const f = hz(note), K = KIND[kind] || KIND.nilon;
  if (!room(opt.prio, t, opt.dur ? opt.dur + 0.5 : K.t60)) return;
  const e = ksBuffer(ctx, kind, f);
  const s = ctx.createBufferSource(); s.buffer = e.buf; s.playbackRate.value = f / e.f0;
  const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = opt.lp || K.lp; lp.Q.value = 0.4;
  const g = ctx.createGain(); const dur = opt.dur || e.buf.duration / s.playbackRate.value;
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vel, t + 0.004);
  if (opt.dur) g.gain.setTargetAtTime(0.0001, t + opt.dur, 0.12);
  let tail = s.connect(lp); const nodes = [s, lp, g];
  if (K.body) { const bq = ctx.createBiquadFilter(); bq.type = "peaking"; bq.frequency.value = K.body[0]; bq.Q.value = 1.4; bq.gain.value = K.body[1]; tail = tail.connect(bq); nodes.push(bq); }
  tail.connect(g).connect(out);
  s.start(t); s.stop(t + Math.min(dur, opt.dur ? opt.dur + 0.8 : dur) + 0.05);
  track(s, nodes);
}

// ---- seruling / sulim (bukan rekaman; suara sintetis bergaya tiup) ----
const FLUTE = {
  seruling: { h2: 0.16, h3: 0.05, breath: 0.55, vib: 12, att: 0.11, scoop: 0.985 }, // hangat, lembut
  sulim:    { h2: 0.30, h3: 0.10, breath: 1.0,  vib: 7,  att: 0.07, scoop: 0.975 }, // lebih bernapas & cerah
};
function flute(ctx, out, t, note, dur, vel = 0.4, kind = "seruling", opt = {}) {
  if (!room(opt.prio, t, dur + 0.4)) return;
  const F = FLUTE[kind] || FLUTE.seruling, f = hz(note), end = t + dur;
  const g = ctx.createGain(), nodes = [g];
  const a = Math.min(F.att, dur * 0.4);
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vel, t + a);
  g.gain.setValueAtTime(vel * 0.92, Math.max(t + a, end - 0.05)); g.gain.setTargetAtTime(0.0001, end, 0.09);
  g.connect(out);
  const vibG = ctx.createGain(); vibG.gain.setValueAtTime(0, t); vibG.gain.linearRampToValueAtTime(F.vib * (opt.vib ?? 1), t + Math.min(0.5, dur * 0.7));
  const lfo = ctx.createOscillator(); lfo.frequency.value = 4.8 + (f % 1.7) * 0.4; lfo.connect(vibG); nodes.push(vibG, lfo);
  let firstOsc = null;
  for (const [mul, amp] of [[1, 1], [2, F.h2], [3, F.h3]]) {
    const o = ctx.createOscillator(); o.type = "sine";
    o.frequency.setValueAtTime(f * mul * F.scoop, t); o.frequency.linearRampToValueAtTime(f * mul, t + 0.07);
    vibG.connect(o.detune);
    const og = ctx.createGain(); og.gain.value = amp; o.connect(og).connect(g); o.start(t); o.stop(end + 0.5); nodes.push(o, og);
    if (!firstOsc) firstOsc = o;
  }
  lfo.start(t); lfo.stop(end + 0.5);
  // desah napas: noise bernada di sekitar frekuensi nada, kuat saat awal
  const n = ctx.createBufferSource(); n.buffer = noiseBuf(ctx); n.loop = true;
  const bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = Math.min(f * 2.2, 6500); bp.Q.value = 2.2;
  const ng = ctx.createGain(); const nv = vel * 0.22 * F.breath;
  ng.gain.setValueAtTime(0.0001, t); ng.gain.linearRampToValueAtTime(nv, t + 0.03); ng.gain.setTargetAtTime(nv * 0.28, t + 0.06, 0.1);
  ng.gain.setValueAtTime(nv * 0.28, Math.max(t + 0.2, end - 0.05)); ng.gain.setTargetAtTime(0.0001, end, 0.07);
  n.connect(bp).connect(ng).connect(out); n.start(t, (f * 7) % 2.5); n.stop(end + 0.4); nodes.push(n, bp, ng);
  // sumber terakhir yang berhenti menutup hitungan
  firstOsc.onended = null; track(n, nodes);
}

// ---- pad lembut (akor panjang) ----
function pad(ctx, out, t, notes, dur, vel = 0.2, opt = {}) {
  const lpf = opt.lp || 1200;
  for (const nt of notes) {
    if (!room(0, t, dur + (opt.rel || 1.8))) return;
    const f = hz(nt), end = t + dur;
    const g = ctx.createGain(), lp = ctx.createBiquadFilter(), nodes = [g, lp];
    lp.type = "lowpass"; lp.frequency.value = lpf; lp.Q.value = 0.3;
    const att = Math.min(dur * 0.38, opt.att || 2.6), rel = opt.rel || 1.8;
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vel / Math.sqrt(notes.length), t + att);
    g.gain.setValueAtTime(vel / Math.sqrt(notes.length), Math.max(t + att, end - 0.05)); g.gain.setTargetAtTime(0.0001, end, rel / 3);
    lp.connect(g).connect(out);
    let last = null;
    for (const dt of [-6, 6]) {
      const o = ctx.createOscillator(); o.type = opt.type || "triangle"; o.frequency.value = f; o.detune.value = dt;
      o.connect(lp); o.start(t); o.stop(end + rel + 0.1); nodes.push(o); last = o;
    }
    track(last, nodes);
  }
}

// ---- perkusi ringan ----
function tok(ctx, out, t, vel = 0.25, pitch = 640) { // ketukan kayu
  if (!room(0, t, 0.15)) return;
  const o = ctx.createOscillator(), g = ctx.createGain(), nodes = [o, g];
  o.type = "sine"; o.frequency.setValueAtTime(pitch, t); o.frequency.exponentialRampToValueAtTime(pitch * 0.6, t + 0.07);
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vel, t + 0.002); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
  o.connect(g).connect(out); o.start(t); o.stop(t + 0.14);
  const n = ctx.createBufferSource(), bp = ctx.createBiquadFilter(), ng = ctx.createGain(); n.buffer = noiseBuf(ctx);
  bp.type = "bandpass"; bp.frequency.value = pitch * 2.6; bp.Q.value = 2.5; ng.gain.setValueAtTime(vel * 0.5, t); ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.03);
  n.connect(bp).connect(ng).connect(out); n.start(t, (pitch * 3) % 2.5); n.stop(t + 0.05); nodes.push(n, bp, ng);
  track(o, nodes);
}
function shaker(ctx, out, t, vel = 0.08) {
  if (!room(0, t, 0.1)) return;
  const n = ctx.createBufferSource(), hp = ctx.createBiquadFilter(), g = ctx.createGain();
  n.buffer = noiseBuf(ctx); hp.type = "highpass"; hp.frequency.value = 5200;
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vel, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
  n.connect(hp).connect(g).connect(out); n.start(t, (t * 13) % 2.5); n.stop(t + 0.09); track(n, [n, hp, g]);
}
function drum(ctx, out, t, vel = 0.3, f0 = 150) { // tepukan rendah (mirip gendang kecil, sintetis)
  if (!room(0, t, 0.3)) return;
  const o = ctx.createOscillator(), g = ctx.createGain(), nodes = [o, g];
  o.type = "sine"; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f0 * 0.55, t + 0.14);
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vel, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
  o.connect(g).connect(out); o.start(t); o.stop(t + 0.3);
  const n = ctx.createBufferSource(), lp = ctx.createBiquadFilter(), ng = ctx.createGain(); n.buffer = noiseBuf(ctx);
  lp.type = "lowpass"; lp.frequency.value = 1400; ng.gain.setValueAtTime(vel * 0.35, t); ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);
  n.connect(lp).connect(ng).connect(out); n.start(t, (f0 * 5) % 2.5); n.stop(t + 0.06); nodes.push(n, lp, ng);
  track(o, nodes);
}
function ogung(ctx, out, t, note = "D2", vel = 0.2) { // gong kecil bernada (sintetis, terinspirasi gong; bukan rekaman)
  if (!room(0, t, 3.5)) return;
  const f = hz(note), parts = [[1, 1, 3.2], [2.0, 0.5, 2.2], [2.76, 0.32, 1.5], [3.9, 0.16, 1.0]];
  let last = null; const nodes = [];
  for (const [m, a, dec] of parts) {
    const o = ctx.createOscillator(), g = ctx.createGain(); o.type = "sine";
    o.frequency.setValueAtTime(f * m * 1.012, t); o.frequency.exponentialRampToValueAtTime(f * m, t + 0.25);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vel * a, t + 0.012); g.gain.setTargetAtTime(0.0001, t + 0.02, dec / 4);
    o.connect(g).connect(out); o.start(t); o.stop(t + dec + 0.6); nodes.push(o, g); last = o;
  }
  track(last, nodes);
}

// ---- panggung (bus) + efek ruang ----
// music, amb, sfx -> master -> kompresor pengaman -> keluaran. send = gema pendek untuk kesan luas.
function makeStage(ctx, dest) {
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -9; comp.knee.value = 8; comp.ratio.value = 8; comp.attack.value = 0.004; comp.release.value = 0.2;
  const master = ctx.createGain(); master.connect(comp); comp.connect(dest || ctx.destination);
  const music = ctx.createGain(), amb = ctx.createGain(), sfx = ctx.createGain();
  const ambLP = ctx.createBiquadFilter(); ambLP.type = "lowpass"; ambLP.frequency.value = 20000; ambLP.Q.value = 0.3;
  const ambIn = ctx.createGain(); ambIn.connect(ambLP).connect(amb); // ambience masuk lewat sini (bisa diredam saat di dalam rumah)
  music.connect(master); amb.connect(master); sfx.connect(master);
  // gema: tunda 0,29 dtk dengan umpan balik lembut, disaring supaya tidak berdesis
  const fxIn = ctx.createGain(), dl = ctx.createDelay(1.0), fb = ctx.createGain(), fl = ctx.createBiquadFilter(), wet = ctx.createGain();
  dl.delayTime.value = 0.29; fb.gain.value = 0.34; fl.type = "lowpass"; fl.frequency.value = 2300; wet.gain.value = 0.9;
  fxIn.connect(dl); dl.connect(fl); fl.connect(fb); fb.connect(dl); fl.connect(wet); wet.connect(music);
  return { ctx, master, comp, music, amb, sfx, ambIn, ambLP, fxIn, dl, fb, wet };
}

function resetPoly() { poly.length = 0; }
NW.kit = { resetPoly, mulberry32, midi, hz, pluck, flute, pad, tok, shaker, drum, ogung, noiseBuf, noiseLoop, makeStage, stats, room, track, ksCache, MAX_VOICES };
})();
