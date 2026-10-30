// ============================================================================
//  NUSA ISLAND — Bumbu 2.1: suara lingkungan (NW.ambient)
//  Lapisan berkelanjutan DIBUAT SEKALI per AudioContext (air, angin, daun, jangkrik, keramaian pasar)
//  lalu hanya diatur volumenya — berpindah area TIDAK menambah sumber suara baru.
//  Suara sesaat (burung, katak, kecipak, ketukan pasar, derit kayu) dijadwalkan acak & dibatasi.
// ============================================================================
(function () {
const NW = (window.NW = window.NW || {});
const K = NW.kit;

function create(ctx, stage) {
  const nodes = []; // semua sumber berkelanjutan (untuk dispose & statistik)
  const out = stage.ambIn;
  const mk = (type, freq, q) => { const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; if (q != null) f.Q.value = q; return f; };
  const gain = (v = 0) => { const g = ctx.createGain(); g.gain.value = v; return g; };
  const lfo = (freq, type = "sine") => { const o = ctx.createOscillator(); o.type = type; o.frequency.value = freq; o.start(); nodes.push(o); return o; };
  const src = (off) => { const s = K.noiseLoop(ctx, off); nodes.push(s); return s; };

  // --- air (sungai / danau): badan rendah + riak halus ---
  const water = gain(0);
  { const a = src(0.3).connect(mk("lowpass", 520, 0.5)); const ga = gain(0.7); a.connect(ga); const l = lfo(0.17), ld = gain(0.25); l.connect(ld).connect(ga.gain); ga.connect(water);
    const b = src(1.7).connect(mk("bandpass", 1500, 0.8)); const gb = gain(0.18); b.connect(gb); const l2 = lfo(0.41), l2d = gain(0.1); l2.connect(l2d).connect(gb.gain); gb.connect(water); water.connect(out); }
  // --- angin ---
  const wind = gain(0);
  { const f = mk("bandpass", 480, 0.8); src(2.2).connect(f); const l = lfo(0.07), ld = gain(260); l.connect(ld).connect(f.frequency);
    const g = gain(0.8); f.connect(g); const l2 = lfo(0.11), l2d = gain(0.35); l2.connect(l2d).connect(g.gain); g.connect(wind); wind.connect(out); }
  // --- gemerisik daun ---
  const leaves = gain(0);
  { const hp = mk("highpass", 2800, 0.5); src(0.9).connect(hp); const g = gain(0.45); hp.connect(g);
    for (const fr of [0.63, 0.37, 1.1]) { const l = lfo(fr), d = gain(0.22); l.connect(d).connect(g.gain); }
    g.connect(leaves); leaves.connect(out); }
  // --- jangkrik: dua pembawa bernada tinggi, denyut cepat dengan kelompok ---
  const crickets = gain(0);
  for (const [fc, pulse, grp] of [[4350, 16, 0.55], [4980, 13.5, 0.38]]) {
    const o = ctx.createOscillator(); o.type = "sine"; o.frequency.value = fc; o.start(); nodes.push(o);
    const a = gain(0.5), lp = mk("lowpass", 60), p = lfo(pulse, "square"), pg = gain(0.5); p.connect(lp).connect(pg).connect(a.gain);
    const b = gain(0.5), g = lfo(grp, "sine"), gg = gain(0.5); g.connect(gg).connect(b.gain);
    o.connect(a).connect(b).connect(crickets);
  }
  crickets.connect(out);
  // --- keramaian pasar yang halus ---
  const market = gain(0);
  { const bp = mk("bandpass", 720, 1.0); src(1.2).connect(bp); const g = gain(0.55); bp.connect(g);
    for (const fr of [0.52, 0.27, 0.83]) { const l = lfo(fr), d = gain(0.25); l.connect(d).connect(g.gain); }
    g.connect(market); market.connect(out); }

  const L = { water, wind, leaves, crickets, market };
  const target = { water: 0, wind: 0, leaves: 0, crickets: 0, market: 0 };
  const AMP = { water: 0.5, wind: 0.3, leaves: 0.16, crickets: 0.07, market: 0.4 }; // keseimbangan antar-lapisan

  // --- suara sesaat ---
  const pan = (p) => { if (!ctx.createStereoPanner) return null; const s = ctx.createStereoPanner(); s.pan.value = p; return s; };
  function blip(t, dest, f0, f1, dur, vol, type = "sine") {
    const o = ctx.createOscillator(), g = ctx.createGain(), nd = [o, g]; o.type = type;
    o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + Math.min(0.02, dur * 0.3)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(dest); o.start(t); o.stop(t + dur + 0.02); K.track(o, nd);
  }
  function oneShot(kind, t, vol) {
    if (!K.room(0, ctx.currentTime, 1)) return;
    const p = pan((Math.random() * 2 - 1) * 0.8), dest = p || out; if (p) p.connect(out);
    const r = Math.random;
    switch (kind) {
      case "burung": { // kicau kecil: 2-4 nada pendek naik-turun
        const n = 2 + ((r() * 3) | 0), base = 2700 + r() * 1200;
        for (let i = 0; i < n; i++) blip(t + i * 0.13, dest, base * (1 + r() * 0.15), base * (1.1 + r() * 0.35), 0.09, vol * 0.7);
        break; }
      case "tekukur": { // kuk-ku-kurr rendah, hangat
        const b = 520 + r() * 60; blip(t, dest, b * 1.1, b, 0.16, vol * 1.2); blip(t + 0.22, dest, b * 1.1, b * 0.92, 0.12, vol); blip(t + 0.4, dest, b * 1.0, b * 0.85, 0.3, vol * 1.1);
        break; }
      case "burungDanau": { // siulan panjang meluncur turun, bergaung di atas air
        const b = 1900 + r() * 400; blip(t, dest, b, b * 0.7, 0.55, vol * 0.9, "triangle"); if (r() < 0.6) blip(t + 0.7, dest, b * 1.05, b * 0.72, 0.45, vol * 0.7, "triangle");
        break; }
      case "katak": { const f = 150 + r() * 80, n = 3 + ((r() * 3) | 0);
        for (let i = 0; i < n; i++) { const tt = t + i * 0.11; const o = ctx.createOscillator(), bp = ctx.createBiquadFilter(), g = ctx.createGain(); o.type = "sawtooth"; o.frequency.setValueAtTime(f, tt); o.frequency.linearRampToValueAtTime(f * 1.25, tt + 0.07); bp.type = "bandpass"; bp.frequency.value = 520; bp.Q.value = 3.5; g.gain.setValueAtTime(0.0001, tt); g.gain.linearRampToValueAtTime(vol * 1.6, tt + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, tt + 0.07); o.connect(bp).connect(g).connect(dest); o.start(tt); o.stop(tt + 0.09); K.track(o, [o, bp, g]); }
        break; }
      case "hantu": { // burung malam: dua "hu" rendah dan jauh
        blip(t, dest, 430, 380, 0.34, vol * 1.0); blip(t + 0.55, dest, 410, 350, 0.42, vol * 0.9);
        break; }
      case "kecipak": { // air menepuk tepi dermaga
        const s = ctx.createBufferSource(), lp = ctx.createBiquadFilter(), g = ctx.createGain(); s.buffer = K.noiseBuf(ctx);
        lp.type = "lowpass"; lp.frequency.setValueAtTime(900, t); lp.frequency.exponentialRampToValueAtTime(350, t + 0.7);
        g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol * 2.2, t + 0.12); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.8);
        s.connect(lp).connect(g).connect(dest); s.start(t, Math.random() * 2); s.stop(t + 0.85); K.track(s, [s, lp, g]); break; }
      case "ketuk": { const f = 420 + r() * 300; blip(t, dest, f, f * 0.6, 0.07, vol * 1.6); if (r() < 0.5) blip(t + 0.13, dest, f * 1.2, f * 0.7, 0.06, vol * 1.2); break; }
      case "derit": { blip(t, dest, 190 + r() * 40, 150, 0.35, vol * 0.8, "sawtooth"); break; }
    }
  }
  const timers = {}; // nama -> waktu jadwal berikutnya
  const RATE = { // [min,max] detik antar kejadian
    burung: [2.5, 7], tekukur: [14, 30], burungDanau: [5, 12], katak: [1.6, 4.2], hantu: [18, 40], kecipak: [2.5, 6], ketuk: [2.5, 6], derit: [12, 25],
  };
  function pump(now, env) {
    const sched = (name, cond, vol, kind = name) => {
      if (!cond) { timers[name] = null; return; }
      if (timers[name] == null) { const [a, b] = RATE[name]; timers[name] = now + a + Math.random() * (b - a); return; }
      if (now >= timers[name]) { const [a, b] = RATE[name]; timers[name] = now + a + Math.random() * (b - a); oneShot(kind, now + 0.05, vol); }
    };
    const d = env.indoor ? 0 : 1, day = env.dayF * d, night = env.nightF * d;
    const muara = env.area === "muara", toba = env.area === "toba";
    sched("burung", day > 0.25 && !env.fishing, 0.045 * day, "burung");
    sched("tekukur", muara && day > 0.3 && !env.fishing, 0.04 * day);
    sched("burungDanau", (toba || env.fishing) && day > 0.2 && env.water > 0.15, 0.04 * day * (0.5 + env.water), "burungDanau");
    sched("katak", muara && night > 0.4, 0.04 * night, "katak");
    sched("hantu", toba && night > 0.4, 0.035 * night, "hantu");
    sched("kecipak", env.water > 0.35 && d, 0.03 * env.water, "kecipak");
    sched("ketuk", env.market > 0.35 && day > 0.3 && !env.fishing, 0.03 * env.market, "ketuk");
    sched("derit", toba && env.dock > 0.5 && d, 0.03, "derit");
  }

  // env: { area, nightF, dayF, water, trees, market, view, dock, indoor, fishing, hill }
  function setEnv(env, tau = 0.9) {
    const now = ctx.currentTime, toba = env.area === "toba", muara = env.area === "muara";
    const fish = env.fishing ? 1 : 0, ind = env.indoor ? 1 : 0;
    target.water = Math.min(1, (muara ? 0.28 : toba ? 0.34 : 0.4) + env.water * 0.62 + fish * 0.4 + env.view * 0.25);
    target.wind = Math.min(1, (muara ? 0.1 : 0.2) + env.trees * 0.14 + env.view * 0.7 + (toba ? env.hill * 0.2 : 0) + fish * 0.12 + env.water * 0.1);
    target.leaves = Math.min(1, env.trees * 0.8 + (muara ? 0.12 : 0.1)) * (1 - fish * 0.7);
    target.crickets = env.nightF * (muara ? 1 : toba ? 0.55 : 0.35) * (1 - env.water * 0.4);
    target.market = Math.min(1, env.market) * env.dayF * (muara ? 1 : 0.8) * (1 - fish);
    if (env.voyage) { target.water = 1; target.wind = 0.85; target.leaves = 0; target.crickets *= 0.3; target.market = 0; } // di atas kapal: air & angin dominan
    for (const k in L) L[k].gain.setTargetAtTime(target[k] * AMP[k], now, tau);
  }
  function indoor(on) {
    const now = ctx.currentTime;
    stage.ambLP.frequency.setTargetAtTime(on ? 620 : 20000, now, on ? 0.35 : 0.5);
    stage.amb.gain.cancelScheduledValues(now); // faktor redaman luar ruang dikelola manager lewat setVolume
  }
  function dispose() { for (const n of nodes) { try { n.stop(); } catch (_) {} try { n.disconnect(); } catch (_) {} } for (const k in L) try { L[k].disconnect(); } catch (_) {} nodes.length = 0; }
  return { setEnv, pump, indoor, dispose, oneShot, target, get sources() { return nodes.length; } };
}
NW.ambient = { create };
})();
