// NUSA ISLAND — Ide 08C · audio ASMR dapur (potong, desis minyak, air mendidih, telur pecah, aduk, piring, wastafel, gelas/sendok).
// DIMUAT LAZY: file ini baru diunduh saat suara dapur pertama kali dibutuhkan DAN suara belum dimatikan (NW.dapurMasak.snd). Tidak ada berkas aset: semua disintesis
// (WebAudio) lewat bus SFX milik NW.audio, jadi otomatis mengikuti tombol 🔊/mute dan slider Efek Suara di Pengaturan Suara.
(function () {
"use strict";
const NW = (window.NW = window.NW || {}), K = NW.kit; if (!K || !NW.sfxLib) return;
const rand = (a, b) => a + Math.random() * (b - a);
function tone(ctx, out, t, f0, f1, dur, vol, type = "sine", att = 0.003) {
  const o = ctx.createOscillator(), g = ctx.createGain(); o.type = type;
  o.frequency.setValueAtTime(f0, t); if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + att); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(out); o.start(t); o.stop(t + dur + 0.02); K.track(o, [o, g]);
}
function nz(ctx, out, t, type, f0, f1, q, dur, vol, att = 0.003) {
  const s = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), g = ctx.createGain(); s.buffer = K.noiseBuf(ctx);
  fl.type = type; fl.Q.value = q; fl.frequency.setValueAtTime(f0, t); if (f1 && f1 !== f0) fl.frequency.exponentialRampToValueAtTime(f1, t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + att); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(fl).connect(g).connect(out); s.start(t, Math.random() * 2.4); s.stop(t + dur + 0.02); K.track(s, [s, fl, g]);
}
const L = NW.sfxLib.L, RULE = NW.sfxLib.RULE;
Object.assign(L, {
  dapur_potong: (c, o, t) => { nz(c, o, t, "bandpass", 2400, 1500, 2.2, 0.05, 0.12, 0.001); tone(c, o, t, 190, 110, 0.07, 0.12, "triangle", 0.001); nz(c, o, t + 0.02, "highpass", 5200, 0, 0.7, 0.03, 0.04, 0.001); },   // tok renyah di talenan
  dapur_kupas: (c, o, t) => { nz(c, o, t, "highpass", 3800, 6200, 0.8, 0.16, 0.07, 0.01); nz(c, o, t + 0.05, "bandpass", 2600, 1800, 1.4, 0.1, 0.05, 0.005); },
  dapur_cuci: (c, o, t) => { nz(c, o, t, "bandpass", 1800, 2600, 0.9, 0.35, 0.09, 0.05); for (let i = 0; i < 3; i++) tone(c, o, t + rand(0.02, 0.28), rand(900, 1500), rand(1500, 2200), 0.05, 0.02); },
  dapur_telur: (c, o, t) => { nz(c, o, t, "bandpass", 1500, 900, 2.5, 0.06, 0.14, 0.001); tone(c, o, t, 260, 140, 0.06, 0.1, "triangle", 0.001); nz(c, o, t + 0.07, "lowpass", 900, 400, 0.6, 0.16, 0.07, 0.01); },   // retak + plop
  dapur_aduk: (c, o, t) => { nz(c, o, t, "bandpass", 1100, 1700, 1.1, 0.24, 0.06, 0.04); tone(c, o, t + 0.04, 2350, 0, 0.1, 0.016, "sine", 0.003); tone(c, o, t + 0.13, 3100, 0, 0.08, 0.01, "sine", 0.003); },
  dapur_desis: (c, o, t) => { nz(c, o, t, "highpass", 4800, 7600, 0.6, 0.55, 0.055, 0.04); for (let i = 0; i < 5; i++) nz(c, o, t + rand(0.02, 0.5), "bandpass", rand(3500, 7000), 0, 3, 0.02, 0.05, 0.001); },   // minyak mendesis + letupan kecil
  dapur_didih: (c, o, t) => { nz(c, o, t, "lowpass", 700, 500, 0.6, 0.5, 0.045, 0.06); for (let i = 0; i < 4; i++) tone(c, o, t + rand(0, 0.45), rand(180, 360), rand(380, 640), 0.07, 0.04); },    // gelembung air
  dapur_piring: (c, o, t) => { tone(c, o, t, 3200, 3000, 0.16, 0.045, "sine", 0.001); tone(c, o, t, 4900, 4700, 0.1, 0.025, "sine", 0.001); tone(c, o, t, 160, 100, 0.06, 0.08, "triangle", 0.001); },
  dapur_gelas: (c, o, t) => { tone(c, o, t, 2800, 2760, 0.42, 0.04, "sine", 0.001); tone(c, o, t, 4200, 4150, 0.3, 0.022, "sine", 0.001); },
  dapur_sendok: (c, o, t) => { tone(c, o, t, 3700, 3600, 0.2, 0.03, "triangle", 0.001); nz(c, o, t, "highpass", 6000, 0, 0.7, 0.02, 0.03, 0.001); },
  dapur_air: (c, o, t) => { nz(c, o, t, "bandpass", 2200, 1500, 0.7, 0.8, 0.07, 0.08); nz(c, o, t + 0.1, "highpass", 3500, 0, 0.6, 0.6, 0.03, 0.1); },    // keran mengalir
  dapur_sabun: (c, o, t) => { nz(c, o, t, "highpass", 5200, 8000, 0.9, 0.12, 0.05, 0.01); for (let i = 0; i < 4; i++) tone(c, o, t + rand(0, 0.2), rand(1800, 3200), rand(2400, 4000), 0.03, 0.015); },
  dapur_gosok: (c, o, t) => { nz(c, o, t, "bandpass", 2000, 3200, 1.3, 0.14, 0.06, 0.03); },
  dapur_bumbu: (c, o, t) => { nz(c, o, t, "highpass", 4200, 0, 0.7, 0.22, 0.05, 0.02); },
  dapur_balik: (c, o, t) => { nz(c, o, t, "bandpass", 700, 1500, 1, 0.14, 0.08, 0.02); nz(c, o, t + 0.16, "lowpass", 1100, 500, 0.6, 0.1, 0.1, 0.002); tone(c, o, t + 0.16, 150, 90, 0.08, 0.06, "triangle", 0.002); },
  dapur_taruh: (c, o, t) => { nz(c, o, t, "lowpass", 1500, 500, 0.7, 0.2, 0.1, 0.002); tone(c, o, t, 140, 80, 0.09, 0.07, "triangle", 0.002); nz(c, o, t + 0.03, "highpass", 5000, 0, 0.7, 0.3, 0.04, 0.02); },
  dapur_api: (c, o, t) => { nz(c, o, t, "lowpass", 2200, 700, 0.5, 0.24, 0.07, 0.01); tone(c, o, t, 90, 60, 0.15, 0.04, "sine", 0.01); },
  dapur_ding: (c, o, t) => { tone(c, o, t, 1320, 0, 0.5, 0.05, "triangle", 0.002); tone(c, o, t + 0.12, 1760, 0, 0.6, 0.05, "triangle", 0.002); },    // masakan siap
  dapur_puas: (c, o, t) => { [784, 988, 1175].forEach((f, i) => tone(c, o, t + i * 0.09, f, 0, 0.22, 0.05, "triangle", 0.004)); },
  dapur_batuk: (c, o, t) => { nz(c, o, t, "bandpass", 700, 400, 1.2, 0.09, 0.08, 0.005); nz(c, o, t + 0.13, "bandpass", 650, 380, 1.2, 0.09, 0.07, 0.005); },
  dapur_ragu: (c, o, t) => { tone(c, o, t, 300, 250, 0.2, 0.04, "triangle", 0.01); tone(c, o, t + 0.2, 280, 330, 0.2, 0.03, "triangle", 0.01); },
  dapur_mual: (c, o, t) => { tone(c, o, t, 260, 120, 0.7, 0.05, "sine", 0.05); tone(c, o, t + 0.05, 330, 150, 0.6, 0.03, "triangle", 0.05); nz(c, o, t + 0.55, "lowpass", 900, 300, 0.6, 0.3, 0.06, 0.04); },    // bunyi "bleeeh" lembut (kartun)
  dapur_buang: (c, o, t) => { nz(c, o, t, "lowpass", 1200, 400, 0.6, 0.18, 0.08, 0.01); tone(c, o, t + 0.1, 140, 90, 0.1, 0.06, "triangle", 0.002); },
});
Object.assign(RULE, {
  dapur_potong: { gap: 0.06 }, dapur_kupas: { gap: 0.08 }, dapur_cuci: { gap: 0.2 }, dapur_telur: { gap: 0.1 }, dapur_aduk: { gap: 0.12 }, dapur_desis: { gap: 0.5, g: 0.8 }, dapur_didih: { gap: 0.5, g: 0.9 },
  dapur_piring: { gap: 0.1 }, dapur_gelas: { gap: 0.15 }, dapur_sendok: { gap: 0.1 }, dapur_air: { gap: 0.6 }, dapur_sabun: { gap: 0.1 }, dapur_gosok: { gap: 0.08 }, dapur_bumbu: { gap: 0.15 },
  dapur_balik: { gap: 0.2 }, dapur_taruh: { gap: 0.3 }, dapur_api: { gap: 0.2 }, dapur_ding: { gap: 0.4, g: 0.8 }, dapur_puas: { gap: 0.6, g: 0.8 }, dapur_batuk: { gap: 0.5 }, dapur_ragu: { gap: 0.5 }, dapur_mual: { gap: 1, g: 0.8 }, dapur_buang: { gap: 0.3 },
});
NW.dapurAudio = { ready: true, names: Object.keys(L).filter((k) => k.indexOf("dapur_") === 0) };
})();
