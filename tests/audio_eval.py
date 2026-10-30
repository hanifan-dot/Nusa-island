#!/usr/bin/env python3
"""Evaluasi objektif audio Bumbu 2.1 (BUKAN pengganti telinga manusia).
Merender setiap tema musik, ambience & efek secara OFFLINE di Chromium (OfflineAudioContext), lalu mengukur:
level (RMS/puncak, dBFS), clipping, DC, aktivitas/keheningan, kecerahan (centroid, energi >5 kHz),
perbedaan Muara vs Toba (histogram nada/chroma tak bergantung transposisi), dan keterbacaan efek kritis di atas musik.
Pakai:  python3 tests/audio_eval.py [folder_keluaran]   (keluaran: WAV + ringkasan; MP3 bila ffmpeg ada)"""
import base64, json, os, subprocess, sys, struct, wave
import numpy as np
from playwright.sync_api import sync_playwright

ROOT = "file://" + os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "index.html"))
OUT = sys.argv[1] if len(sys.argv) > 1 else "/tmp/nusa-audio-eval"
os.makedirs(OUT, exist_ok=True)
SR = 32000
THEMES = ["muara_pagi", "muara_siang", "muara_sore", "muara_malam", "toba_pagi", "toba_siang", "toba_sore", "toba_malam", "rumah", "kapal", "cerita", "mancing_muara", "mancing_toba"]
SFX = [("cast", None), ("splash", None), ("nibble", None), ("bite", None), ("strike", None), ("tick", None), ("surge", None), ("warn", None), ("snap", None), ("lose", None), ("lelah", None),
       ("catch", "sampah"), ("catch", "biasa"), ("catch", "langka"), ("catch", "epik"), ("catch", "legenda"),
       ("misi_baru", None), ("bab_selesai", None), ("temuan", None), ("penghargaan", None), ("gelar", None), ("pemandangan", None), ("berlayar", None), ("tiba", None),
       ("step_kayu", None), ("step_rumput", None), ("step_pasir", None), ("step_tanah", None), ("step_lantai", None), ("furn_geser", None), ("furn_taruh", None), ("click", None), ("coin", None)]
JS_MUSIC = """async ([id, secs, sr, intensity]) => {
  NW.kit.resetPoly(); const oc = new OfflineAudioContext(1, Math.ceil(secs*sr), sr); const st = NW.kit.makeStage(oc);
  const tr = new NW.music.Track(oc, st, NW.music.THEMES[id], {seed: 12345}); tr.bus.gain.value = 1; tr.intensity = intensity||0; tr.pump(secs+0.2, 100000);
  const b = await oc.startRendering(); const d = b.getChannelData(0); const u = new Uint8Array(d.buffer.slice(0)); let s=''; for (let i=0;i<u.length;i+=0x8000) s += String.fromCharCode.apply(null, u.subarray(i,i+0x8000)); return btoa(s); }"""
JS_SFX = """async ([name, arg, secs, sr]) => {
  const oc = new OfflineAudioContext(1, Math.ceil(secs*sr), sr); const st = NW.kit.makeStage(oc);
  NW.kit.resetPoly(); NW.sfxLib.play(oc, st.sfx, 0.05, name, arg); const b = await oc.startRendering(); const d = b.getChannelData(0); const u = new Uint8Array(d.buffer.slice(0)); let s=''; for (let i=0;i<u.length;i+=0x8000) s += String.fromCharCode.apply(null, u.subarray(i,i+0x8000)); return btoa(s); }"""
JS_AMB = """async ([env, secs, sr]) => {
  const oc = new OfflineAudioContext(1, Math.ceil(secs*sr), sr); const st = NW.kit.makeStage(oc); NW.kit.resetPoly(); const am = NW.ambient.create(oc, st); am.setEnv(env, 0.001);
  const b = await oc.startRendering(); const d = b.getChannelData(0); const u = new Uint8Array(d.buffer.slice(0)); let s=''; for (let i=0;i<u.length;i+=0x8000) s += String.fromCharCode.apply(null, u.subarray(i,i+0x8000)); return btoa(s); }"""
def dec(b64): return np.frombuffer(base64.b64decode(b64), dtype="<f4").astype(np.float64)
def db(x): return 20*np.log10(max(x, 1e-9))
def rms(x): return float(np.sqrt(np.mean(x**2)))
def wav(path, x, sr=SR):
    y = np.clip(x, -1, 1); w = wave.open(path, "wb"); w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr); w.writeframes((y*32767).astype("<i2").tobytes()); w.close()
def centroid(x, sr=SR):
    n = 8192; hop = n; cs = []; hf = []
    win = np.hanning(n)
    for i in range(0, len(x)-n, hop):
        sp = np.abs(np.fft.rfft(x[i:i+n]*win))**2
        if sp.sum() < 1e-12: continue
        fr = np.fft.rfftfreq(n, 1/sr); cs.append((fr*sp).sum()/sp.sum()); hf.append(sp[fr > 5000].sum()/sp.sum())
    return (float(np.mean(cs)) if cs else 0, float(np.mean(hf)) if hf else 0)
def chroma(x, sr=SR):
    n = 16384; ch = np.zeros(12); win = np.hanning(n)
    for i in range(0, len(x)-n, n//2):
        sp = np.abs(np.fft.rfft(x[i:i+n]*win)); fr = np.fft.rfftfreq(n, 1/sr)
        m = (fr > 80) & (fr < 2000); f = fr[m]; a = sp[m]**2
        pc = np.round(12*np.log2(f/440)+69).astype(int) % 12
        for k in range(12): ch[k] += a[pc == k].sum()
    return ch/ch.sum()
def activity(x, sr=SR, win=0.5, floor_db=-55):
    n = int(win*sr); vals = [db(rms(x[i:i+n])) for i in range(0, len(x)-n, n)]
    v = np.array(vals); return float((v > floor_db).mean()), float(v.max()), float(v.min())

if __name__ == "__main__":
    # level yang dihasilkan jalur nyata pada slider standar (master .7, musik .35, lingkungan .5, efek .7)
    D = dict(master=0.7, music=0.35, amb=0.5, sfx=0.7)
    with sync_playwright() as p:
        b = p.chromium.launch(); pg = b.new_page(); pg.goto(ROOT)
        BASE = pg.evaluate("NW.audio.BASE")
        gm = D["master"]*(D["music"]**2)*BASE["music"]; ga = D["master"]*(D["amb"]**2)*BASE["amb"]; gs = D["master"]*(D["sfx"]**2)*BASE["sfx"]
        print(f"pengali jalur nyata (slider standar): musik x{gm:.3f}  lingkungan x{ga:.3f}  efek x{gs:.3f}   BASE={BASE}")
        R = {"music": {}, "chroma": {}, "sfx": {}, "amb": {}}
        print("\n== MUSIK (40 dtk/tema, dihitung pada slider standar) ==")
        print(f"{'tema':16s} {'RMS dBFS':>9s} {'puncak':>8s} {'aktif%':>7s} {'centroid':>9s} {'>5kHz%':>7s} {'clip':>5s}")
        for id in THEMES:
            x = dec(pg.evaluate(JS_MUSIC, [id, 40, SR, 0])) * gm
            wav(f"{OUT}/musik_{id}.wav", x)
            act, mx, mn = activity(x); c, hf = centroid(x); R["chroma"][id] = chroma(x)
            R["music"][id] = dict(rms=db(rms(x)), peak=db(np.abs(x).max()), act=act, cen=c, hf=hf, dc=float(x.mean()), clip=int((np.abs(x) >= 0.999).sum()))
            m = R["music"][id]; print(f"{id:16s} {m['rms']:9.1f} {m['peak']:8.1f} {act*100:6.0f}% {c:9.0f} {hf*100:6.2f}% {m['clip']:5d}")
        x = dec(pg.evaluate(JS_MUSIC, ["mancing_muara", 30, SR, 0.9])) * gm; wav(f"{OUT}/musik_mancing_muara_tegang.wav", x); R["music"]["mancing_muara_tegang"] = dict(rms=db(rms(x)), peak=db(np.abs(x).max()))
        x = dec(pg.evaluate(JS_MUSIC, ["mancing_toba", 30, SR, 0.9])) * gm; wav(f"{OUT}/musik_mancing_toba_tegang.wav", x); R["music"]["mancing_toba_tegang"] = dict(rms=db(rms(x)), peak=db(np.abs(x).max()))
        print(f"mancing tegang   Muara RMS {R['music']['mancing_muara_tegang']['rms']:.1f} puncak {R['music']['mancing_muara_tegang']['peak']:.1f} · Toba RMS {R['music']['mancing_toba_tegang']['rms']:.1f} puncak {R['music']['mancing_toba_tegang']['peak']:.1f}")
        print("\n== EFEK (puncak/RMS pada slider standar, tanpa pengurangan musik) ==")
        print(f"{'efek':18s} {'puncak':>8s} {'RMS':>7s} {'durasi':>7s} {'clip':>5s}")
        for name, arg in SFX:
            x = dec(pg.evaluate(JS_SFX, [name, arg, 4, SR])) * gs; key = name + ("_" + arg if arg else "")
            nz = np.where(np.abs(x) > 0.002)[0]; dur = (nz[-1]-nz[0])/SR if len(nz) else 0
            R["sfx"][key] = dict(peak=db(np.abs(x).max()), rms=db(rms(x[nz[0]:nz[-1]+1]) if len(nz) else 0), dur=dur, clip=int((np.abs(x) >= 0.999).sum()))
            wav(f"{OUT}/efek_{key}.wav", x); m = R["sfx"][key]; print(f"{key:18s} {m['peak']:8.1f} {m['rms']:7.1f} {dur:6.2f}s {m['clip']:5d}")
        print("\n== LINGKUNGAN (lapisan; 12 dtk) ==")
        ENVS = {"muara_siang_dermaga": dict(area="muara", nightF=0, dayF=1, water=0.6, trees=0.1, market=0, view=0, dock=1, hill=0, indoor=False, fishing=False),
                "muara_pasar": dict(area="muara", nightF=0, dayF=1, water=0.1, trees=0.1, market=1, view=0, dock=0, hill=0, indoor=False, fishing=False),
                "muara_malam": dict(area="muara", nightF=1, dayF=0, water=0.3, trees=0.3, market=0, view=0, dock=0, hill=0, indoor=False, fishing=False),
                "toba_pagi_bukit": dict(area="toba", nightF=0, dayF=1, water=0.2, trees=0.4, market=0, view=1, dock=0, hill=0.6, indoor=False, fishing=False),
                "toba_malam": dict(area="toba", nightF=1, dayF=0, water=0.4, trees=0.3, market=0, view=0, dock=0, hill=0.3, indoor=False, fishing=False),
                "mancing": dict(area="muara", nightF=0, dayF=1, water=1, trees=0, market=0, view=0, dock=0, hill=0, indoor=False, fishing=True)}
        for k, env in ENVS.items():
            x = dec(pg.evaluate(JS_AMB, [env, 12, SR]))[SR:] * ga; wav(f"{OUT}/lingkungan_{k}.wav", x)
            R["amb"][k] = dict(rms=db(rms(x)), peak=db(np.abs(x).max())); print(f"{k:22s} RMS {R['amb'][k]['rms']:.1f} puncak {R['amb'][k]['peak']:.1f}")
        b.close()
    # ---- Muara vs Toba: bukan sekadar transposisi? ----
    print("\n== MUARA vs TOBA: kemiripan histogram nada (cos) — dihitung pada 12 transposisi, ambil yang TERTINGGI ==")
    for a, bb in [("muara_pagi", "toba_pagi"), ("muara_siang", "toba_siang"), ("muara_sore", "toba_sore"), ("muara_malam", "toba_malam")]:
        ca, cb = R["chroma"][a], R["chroma"][bb]
        best = max(float(np.dot(ca, np.roll(cb, k))/(np.linalg.norm(ca)*np.linalg.norm(cb))) for k in range(12))
        same = float(np.dot(ca, cb)/(np.linalg.norm(ca)*np.linalg.norm(cb)))
        R.setdefault("diff", {})[a+"~"+bb] = dict(same=same, best=best)
        print(f"{a:12s} vs {bb:11s}  sama-kunci {same:.2f}  transposisi terbaik {best:.2f}  (1.00 = hanya digeser nadanya)")
    json.dump({k: v for k, v in R.items() if k != "chroma"}, open(f"{OUT}/ringkasan.json", "w"), indent=1, default=float)
    if subprocess.call(["which", "ffmpeg"], stdout=subprocess.DEVNULL) == 0:
        for f in os.listdir(OUT):
            if f.endswith(".wav") and (f.startswith("musik_") or f.startswith("lingkungan_")):
                subprocess.call(["ffmpeg", "-y", "-loglevel", "error", "-i", f"{OUT}/{f}", "-codec:a", "libmp3lame", "-b:a", "128k", f"{OUT}/{f[:-4]}.mp3"])
    print("\nKeluaran:", OUT)
