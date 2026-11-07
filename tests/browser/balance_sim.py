"""Simulasi keseimbangan fight Bumbu 1.2 (memakai startFight/updateFight asli di dalam halaman).

Pemain simulasi: reaksi acak 0,18-0,38 dtk, ambang tegangan bergoyang, sesekali melewatkan aba-aba.
  skill=1 -> punya Membaca Tarikan + Kendali Senar; skill=0 -> tanpa keahlian.
Pakai:  python3 tests/browser/balance_sim.py            (matriks bawaan)
        python3 tests/browser/balance_sim.py '[{"fish":"marlin","w":300,"rod":6,"skill":1}]' 30
Konstanta penyetelan ada di NW.FM.TUNE (fishmath.js). Ini alat penyetelan, bukan tes lulus/gagal.
"""
import json, os, sys, time
from playwright.sync_api import sync_playwright

SIM = """
(o)=>{
 const G=window.__nusa.G, S=window.__nusa.S, N=window.__nusa;
 let last=null; window.Nusa.on('fight', r=>{last=r.result});
 const fish=FISH.find(f=>f.id===o.fish);
 const res={caught:0,snap:0,lost:0,slack:0,t:0,tc:0};
 for(let k=0;k<o.trials;k++){
   S.up.rod=o.rod; S.cooler=[]; S.skills.membaca=!!o.skill; S.skills.kendali=!!o.skill; S.skills.presisi=false;
   const wr=o.wr===undefined?Math.min(1,(o.w-fish.wMin)/(fish.wMax-fish.wMin)):o.wr;
   G.pending={fish,w:o.w,wr,challenge:!!o.challenge}; G.phase='bite'; last=null; G.perfect=false;
   N.startFight(); G.holding=false;
   const react=0.18+Math.random()*0.2; let simT=0, held=false, q=[], dt=1/60, jit=0, jT=0, miss=false, mT=0;
   while(G.fight && simT<120){
     const F=G.fight, surging=F.surge>0;
     if((jT-=dt)<=0){ jT=0.25; jit=(Math.random()-.5)*0.14; }
     if((mT-=dt)<=0){ mT=0.4; miss=Math.random()<o.missP; }
     let want=held; const hi=(surging?o.sh:o.hi)+jit;
     if(o.skill && F.warn && !miss) want=false;
     else if(F.T>hi) want=false; else if(F.T<o.lo+jit) want=true;
     q.push([simT+react,want]); while(q.length&&q[0][0]<=simT){held=q.shift()[1];}
     G.holding=held; N.updateFight(dt); simT+=dt;
   }
   res.t+=simT; if(last){res[last]=(res[last]||0)+1; if(last==='caught')res.tc+=simT;} else res.slack++;
   G.phase='idle'; G.fight=null; document.getElementById('catchWrap').classList.add('hidden');
 }
 res.rate=res.caught/o.trials; res.avgTc=res.caught?res.tc/res.caught:0; return res;
}
"""

DEFAULT = [
    {"fish": "toman", "w": 12, "rod": 0, "skill": 1}, {"fish": "gabus", "w": 3.5, "rod": 0, "skill": 1},
    {"fish": "tuna", "w": 60, "rod": 2, "skill": 1}, {"fish": "kerapu_raksasa", "w": 100, "rod": 3, "skill": 1},
    {"fish": "marlin", "w": 145, "rod": 3, "skill": 1}, {"fish": "marlin", "w": 145, "rod": 4, "skill": 1},
    {"fish": "marlin", "w": 300, "rod": 6, "skill": 1}, {"fish": "marlin", "w": 300, "rod": 8, "skill": 1},
    {"fish": "marlin", "w": 500, "rod": 8, "skill": 1}, {"fish": "marlin", "w": 500, "rod": 9, "skill": 1},
    {"fish": "marlin", "w": 500, "rod": 9, "skill": 0}, {"fish": "marlin", "w": 500, "rod": 0, "skill": 1},
]
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))


def _run_on(browser, cases, trials, tune, url, seed):
    pg = browser.new_page(); pg.goto(url or "file://" + os.path.join(ROOT, "index.html") + "?cloud=off"); time.sleep(0.6)
    pg.evaluate("localStorage.clear()"); pg.reload(); time.sleep(0.6); pg.click("#startBtn"); time.sleep(0.3)
    pg.evaluate("window.__nusa.S.muted=true; window.Nusa.toast=()=>{}")
    if tune: pg.evaluate("t=>Object.assign(NW.FM.TUNE,t)", tune)
    if seed is not None:
        pg.evaluate("s=>{let a=s>>>0;Math.random=function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}", seed)
    out = [(c, pg.evaluate(SIM, dict(dict(hi=.78, lo=.45, sh=.6, missP=.12, trials=trials), **c))) for c in cases]
    pg.close()
    return out


def run(cases, trials=30, tune=None, url=None, seed=None, browser=None):
    """Kembalikan daftar (kasus, hasil). seed: Math.random dibuat deterministik (mulberry32).
    browser: pakai browser Playwright yang sudah ada (tes), atau None untuk membuat sendiri."""
    if browser is not None:
        return _run_on(browser, cases, trials, tune, url, seed)
    with sync_playwright() as p:
        b = p.chromium.launch()
        try:
            return _run_on(b, cases, trials, tune, url, seed)
        finally:
            b.close()


if __name__ == "__main__":
    cases = json.loads(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT
    trials = int(sys.argv[2]) if len(sys.argv) > 2 else 30
    for c, r in run(cases, trials):
        print(f"{c['fish']:>14} {c['w']:>4}kg joran{c['rod'] + 1:>2} keahlian={c['skill']} -> {r['rate'] * 100:3.0f}% (putus {r['snap'] * 100 // trials}% lepas {r['lost'] * 100 // trials}%) waktu tangkap {r['avgTc']:.0f} dtk")
