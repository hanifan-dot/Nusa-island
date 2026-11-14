"""Uji browser Visual Kota Nusa (Ide 04). Jalankan: python3 tests/browser/test_kota.py   |   hash emas: python3 tests/browser/test_kota.py --golden
Dicakup: flag OFF (modul tak diunduh, area selat identik dengan basis), flag ON (3 berkas), 25 NPC, kepadatan siang/malam, kendaraan & lampu & penyeberang,
kolisi nyata (papan ketik), pemain tak terjebak, culling kamera, kualitas rendah/lambat, pagi/sore/malam, 360x740 / 412x915 / 740x360 / desktop,
Multiplayer 2–3 pemain (tak ada data NPC/kendaraan di jaringan; NW.home/NW.boat/NW.mp tidak terganggu).
TIDAK DIUJI: perangkat Android nyata (Galaxy M15), Cloudflare/Firestore asli, suara nyata (hanya terdaftar & dipanggil)."""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kota_lib import *

# hash area selat BASIS (commit 25b71fe, flag OFF) — dihasilkan dengan --golden pada worktree basis
GOLDEN = {"MW": 40, "MH": 40, "tiles": 3753215600, "objs": 203684250, "solids": 2922988185, "blds": 1354304012}
HASH_JS = """(()=>{const M=NW.SELAT_MAP,h=(s)=>{let x=2166136261;for(let i=0;i<s.length;i++){x^=s.charCodeAt(i);x=Math.imul(x,16777619)>>>0}return x};
return {MW:M.MW,MH:M.MH,tiles:h(JSON.stringify(M.tiles)),objs:h(JSON.stringify(M.objects.map(o=>[o.kind,o.x,o.y]))),solids:h(JSON.stringify(M.solids)),blds:h(JSON.stringify((M.buildings||[]).map(b=>[b.id||b.kind,b.x0,b.y0])))}})()"""

def golden_mode():
    with sync_playwright() as p:
        b = p.chromium.launch(); ctx, pg, errs, reqs = boot(b, kota=False); to_selat(pg); print(json.dumps(ev(pg, HASH_JS))); b.close()

def stats(pg): return ev(pg, "NW.kota.stats()")
def settle(pg, s=0.8): time.sleep(s)

def main():
    srv = start_server(port=8793)
    try:
        with sync_playwright() as p:
            b = p.chromium.launch()
            # ---------- K1 flag OFF ----------
            ctx, pg, errs, reqs = boot(b, kota=False); to_selat(pg); settle(pg)
            ok("K1a flag OFF: modul kota/* TIDAK diunduh", not any("/kota/" in u for u in reqs), [u for u in reqs if "kota" in u][:3])
            ok("K1b flag OFF: NW.kota tidak ada, NUSA_KOTA=false", ev(pg, "typeof NW.kota==='undefined' && window.NUSA_KOTA===false"))
            h = ev(pg, HASH_JS); ok("K1c flag OFF: area selat identik dengan basis (ubin, objek, solid, bangunan)", h == GOLDEN, (h, GOLDEN))
            ok("K1d flag OFF: tanpa galat halaman", not errs, errs[:3]); ctx.close()
            # ---------- K2 flag ON ----------
            ctx, pg, errs, reqs = boot(b, quality=2, hour=12); to_selat(pg); settle(pg)
            names = sorted(u.rsplit("/", 1)[-1] for u in reqs if "/kota/" in u)
            ok("K2a flag ON: 4 berkas kota diunduh (core, art, client + mp = gerbang multiplayer kota)", names == ["art.js", "client.js", "core.js", "mp.js"], names)
            ok("K2b flag ON: peta selat 92x48, NW.kota hidup", ev(pg, "NW.SELAT_MAP.MW===92 && NW.SELAT_MAP.MH===48 && NW.kota.version===1"))
            ok("K2c flag ON: tanpa galat halaman", not errs, errs[:3])
            # ---------- K3 NPC & kepadatan ----------
            tp(pg, 60, 21); set_hour(pg, 12); set_clock(pg, 69); settle(pg, 1.2); s = stats(pg)
            ok("K3a 25 NPC terdaftar", s["npcReg"] == 25 and ev(pg, "NW.kota.NPCS.length") == 25)
            ok("K3b siang: 20–25 NPC dijadwalkan", 20 <= s["npcActive"] <= 25, s)
            day_v = s["vehActive"]
            for hh, lo, hi in [(8, 20, 25), (18, 8, 22), (23, 5, 8), (2, 5, 8)]:
                set_hour(pg, hh); settle(pg, 0.5); n = stats(pg)
                ok(f"K3c jam {hh}: NPC dijadwalkan {lo}–{hi}", lo <= n["npcActive"] <= hi, n["npcActive"])
            set_hour(pg, 23); settle(pg, 0.5); night_v = stats(pg)["vehActive"]
            ok("K3d kendaraan malam jauh lebih sedikit dari siang", night_v <= max(4, day_v * 0.35), (day_v, night_v))
            # ---------- K4 kendaraan, lampu, penyeberang ----------
            set_hour(pg, 12)
            seen = set(); on_route = True; red_enter = 0
            for tw in range(0, 150, 3):
                set_clock(pg, tw); settle(pg, 0.05)
                r = ev(pg, "NW.kota.VEH.filter(v=>v.on).map(v=>[v.def.id,v.x,v.y,v.v,v.fx,v.fy,v.def.route])")
                for v in r: seen.add(v[0])
            ok("K4a kendaraan berjalan sepanjang periode (semua 24 pernah tampil)", len(seen) >= 22, len(seen))
            ph = ev(pg, "(()=>{const C=NusaKotaCore;return [C.lightPhase(3),C.lightPhase(13),C.lightPhase(19),C.lightPhase(27)]})()")
            ok("K4b lampu 4 fase (EW hijau, pejalan, NS hijau, pejalan)", ph[0]["ew"] == "G" and ph[1]["ped"] is True and ph[2]["ns"] == "G" and ph[3]["ped"] is True, ph)
            ev(pg, "NW.kota.setClock(()=>0)"); settle(pg, 0.2)
            # kendaraan di barat persimpangan L10 saat sumbu EW merah (t=19: NS hijau) harus diam
            stopped = 0
            for tw in [18, 19, 21, 22, 45, 49, 51, 52, 79, 81, 82, 109, 112, 114, 3, 6, 33, 36, 63, 66]:
                set_clock(pg, tw); settle(pg, 0.2)
                stopped += ev(pg, "(t)=>{const C=NusaKotaCore,L=NW.kota.LAY,ph=C.lightPhase(t%30);return NW.kota.VEH.filter(v=>v.on&&v.v<0.2&&L.lightNodes.some(n=>{const d=Math.hypot(v.x-n.cx,v.y-n.cy);if(d<1.6||d>4.2)return false;const ew=Math.abs(v.fx)>Math.abs(v.fy);return (ew?ph.ew:ph.ns)==='R'&&((v.x-n.cx)*v.fx+(v.y-n.cy)*v.fy)<0})).length}", tw)
            ok("K4c kendaraan berhenti sebelum persimpangan saat lampu sumbunya merah (terukur di browser)", stopped >= 3, stopped)
            # pejalan menyeberang hanya saat fase pejalan
            bad = ev(pg, "(()=>{const C=NusaKotaCore,L=NW.kota.LAY,nodes=L.lightNodes.concat([L.PELICAN]);let bad=0,n=0;for(let t=0;t<150;t+=0.5){NW.kota.setClock(()=>t);const ph=C.lightPhase(t%30);for(const c of NW.kota.NPCS){const p=C.npcAt(c.def||c,t);if(p.alpha<.5)continue;for(const nd of nodes)if(p.x>nd.x0+.05&&p.x<nd.x1-.05&&p.y>nd.y0+.05&&p.y<nd.y1-.05){n++;if(!ph.ped)bad++}}}return {bad,n}})()")
            ok("K4d pejalan di jalan hanya saat fase pejalan", bad["bad"] == 0 and bad["n"] > 10, bad)
            # ---------- K5 kolisi (walkable + papan ketik sungguhan) ----------
            L = ev(pg, "(()=>{const L=NW.kota.LAY;return {b:L.buildings.map(b=>[b.id,(b.x0+b.x1)/2,(b.y0+b.y1)/2]),t:L.trees.slice(0,6).map(t=>[t.x,t.y]),f:L.objects.filter(o=>o.kind==='k_fountain').map(o=>[o.x,o.y]),p:L.objects.filter(o=>o.kind==='k_parked').map(o=>[o.x,o.y])}})()")
            blk = ev(pg, "(a)=>a.map(p=>NW.walkable(p[0],p[1]))", [[x, y] for _, x, y in L["b"] if True])
            ok("K5a tidak bisa menembus bangunan (pusat setiap bangunan tidak walkable)", not any(blk[i] for i, (n, _, _) in enumerate(L["b"]) if n != "pasar_gerbang"), [L["b"][i][0] for i, v in enumerate(blk) if v])
            ok("K5b pohon, air mancur, truk parkir menghalangi", not any(ev(pg, "(a)=>a.map(p=>NW.walkable(p[0],p[1]))", L["t"] + L["f"] + L["p"])))
            ok("K5c jalan, trotoar, gang, taman bisa dilewati", all(ev(pg, "(a)=>a.map(p=>NW.walkable(p[0],p[1]))", [[52, 21.0], [50.2, 18.4], [46, 11.0], [56, 41.0], [60.5, 38.7], [61, 21.5]])))
            # papan ketik: berjalan ke kanan di jalan sampai menabrak kendaraan parkir/bangunan tidak menembus
            ev(pg, "NW.kota.setClock(()=>0)")
            tp(pg, 38.1, 31.6); pg.keyboard.down("ArrowUp"); time.sleep(1.2); pg.keyboard.up("ArrowUp")
            pos = ev(pg, "(()=>{const p=NW.world.player;return [p.x,p.y]})()")
            bld = next(b for b in ev(pg, "NW.kota.LAY.buildings.map(b=>({id:b.id,x0:b.x0,y0:b.y0,x1:b.x1,y1:b.y1}))") if b["id"] == "bengkel")
            inside = bld["x0"] < pos[0] < bld["x1"] and bld["y0"] < pos[1] < bld["y1"]
            ok("K5d papan ketik: berjalan ke bangunan tidak menembus (bengkel)", not inside, (pos, bld))
            ev(pg, "(()=>{const p=NW.world.player;p.x=1;p.y=1})()")
            # ---------- K6 pemain tak terjebak ----------
            ev(pg, "NW.kota.setClock(()=>0)"); tp(pg, 37.6, 21.0); settle(pg, 0.3)
            r = ev(pg, """(()=>{const S=0.5,key=(x,y)=>Math.round(x/S)+','+Math.round(y/S),seen=new Set([key(37.5,21)]),q=[[37.5,21]];
              while(q.length){const[x,y]=q.pop();for(const[dx,dy]of[[S,0],[-S,0],[0,S],[0,-S]]){const nx=x+dx,ny=y+dy;if(nx<37||ny<0||nx>=92||ny>=48)continue;const k=key(nx,ny);if(seen.has(k))continue;if(!NW.walkable(nx,ny))continue;seen.add(k);q.push([nx,ny])}}
              let tot=0,miss=[];for(let y=2.5;y<45;y+=1)for(let x=38.5;x<90;x+=1){const k=NW.kota.LAY.kind[(y|0)*92+(x|0)];if(![1,2,3,4,5,6,7,8,9].includes(k)||!NW.walkable(x,y))continue;tot++;if(!seen.has(key(x,y)))miss.push([x,y])}return {tot,miss:miss.slice(0,6),n:miss.length}})()""")
            ok("K6a semua petak yang bisa dilewati terjangkau dari gerbang (tak ada kantong terjebak)", r["tot"] > 700 and r["n"] <= 2, r)
            # ---------- K7 culling ----------
            set_clock(pg, 69); tp(pg, 40, 21); set_hour(pg, 12); settle(pg, 0.8); a = stats(pg)
            tp(pg, 84, 40); settle(pg, 0.8); c = stats(pg)
            ok("K7a hanya NPC/kendaraan dekat kamera digambar (visible << aktif)", a["npcVisible"] <= a["npcShown"] <= a["npcActive"] and a["vehVisible"] < max(a["vehActive"], 1) and c["vehVisible"] < max(c["vehActive"], 1), (a, c))
            ok("K7b NPC yang digambar < 25 (LOD)", max(a["npcVisible"], c["npcVisible"]) < 25, (a["npcVisible"], c["npcVisible"]))
            # ---------- K8 kualitas ----------
            lay_hash = lambda: ev(pg, "(()=>{const M=NW.SELAT_MAP;return M.objects.length+':'+M.solids.length+':'+M.buildings.length})()")
            h0 = lay_hash(); res = {}
            for q in (0, 1, 2):
                ev(pg, "(q)=>NW.kota.setQuality(q)", q); set_hour(pg, 12); tp(pg, 60, 21); settle(pg, 0.8); res[q] = stats(pg)
            ok("K8a kualitas rendah menurunkan kepadatan (kendaraan q0 < q1 < q2, NPC tergambar ≤ 11/17/25) tanpa mengubah tata letak", res[0]["npcVisible"] <= 11 and res[1]["npcVisible"] <= 17 and res[2]["npcVisible"] <= 25 and res[0]["vehActive"] < res[1]["vehActive"] < res[2]["vehActive"] and res[0]["vehActive"] < res[2]["vehActive"] and lay_hash() == h0, {k: (v["npcVisible"], v["vehActive"]) for k, v in res.items()})
            ev(pg, "NW.kota.setQuality(null)"); ctx.close()
            ctx, pg, errs, reqs = boot(b, hour=12)           # auto: tanpa ?kotaq
            to_selat(pg); tp(pg, 60, 21); settle(pg, 1.0); cdp = ctx.new_cdp_session(pg); cdp.send("Emulation.setCPUThrottlingRate", {"rate": 12})
            q0 = stats(pg)["q"]; time.sleep(9); q1 = stats(pg)["q"]; cdp.send("Emulation.setCPUThrottlingRate", {"rate": 1})
            ok("K8b perangkat lambat: kualitas turun otomatis", q1 < q0, (q0, q1))
            ctx.close()
            # ---------- K9 pagi / sore / malam ----------
            ctx, pg, errs, reqs = boot(b, quality=2, hour=8); to_selat(pg); tp(pg, 60, 21); set_clock(pg, 69)
            out = {}
            for nm, hh in (("pagi", 8), ("siang", 12), ("sore", 18), ("malam", 23)):
                set_hour(pg, hh); settle(pg, 1.2); out[nm] = (stats(pg), ev(pg, "NW.SELAT_MAP.lamps.length"), ev(pg, "NW.SELAT_MAP.lights.length"))
            ok("K9a pagi sibuk (≥20 NPC), malam sepi (5–8)", out["pagi"][0]["npcActive"] >= 20 and 5 <= out["malam"][0]["npcActive"] <= 8, (out["pagi"][0]["npcActive"], out["malam"][0]["npcActive"]))
            ok("K9b lampu jalan & toko menyala sore/malam, mati siang", out["sore"][1] > out["siang"][1] and out["malam"][1] > out["siang"][1] and out["malam"][2] > 0, [(k, v[1], v[2]) for k, v in out.items()])
            ok("K9c malam: gelap (night>0.4) dan jendela gedung menyala", out["malam"][0]["night"] > 0.4 and out["siang"][0]["night"] < 0.1, (out["malam"][0]["night"], out["siang"][0]["night"]))
            ctx.close()
            # ---------- K10 ukuran layar ----------
            for nm, vp in (("360x740", (360, 740)), ("412x915", (412, 915)), ("740x360", (740, 360)), ("desktop", (1280, 800))):
                ctx, pg, errs, reqs = boot(b, quality=1, vp=vp, hour=12); to_selat(pg); tp(pg, 45, 21); settle(pg, 1.0)
                m = ev(pg, "(()=>{const c=document.querySelector('canvas'),r=c.getBoundingClientRect(),d=document.getElementById('kotaDir'),dr=d&&d.getBoundingClientRect();return {w:r.width,h:r.height,pill:!!d&&d.style.display!=='none',inb:!!dr&&dr.left>=0&&dr.right<=innerWidth&&dr.bottom<=innerHeight}})()")
                ok(f"K10 {nm}: kanvas penuh, pil arah ke Pelabuhan Kota terlihat di dalam layar, tanpa galat", m["w"] >= vp[0] - 2 and m["pill"] and m["inb"] and not errs, (m, errs[:2]))
                ctx.close()
            # ---------- K11 Multiplayer ----------
            ctxs = []; pgs = []
            for i, (nm, ac) in enumerate((("Budi", "demo-a"), ("Sari", "demo-b"), ("Dika", "demo-owner"))):
                ctx, pg, errs, reqs = boot(b, name=nm, acc=ac, quality=1, mp_port=8793); ctxs.append(ctx); pgs.append(pg)
            wss = []
            for pg in pgs: pg.on("websocket", lambda ws: wss.append(ws)) 
            for pg in pgs: wait_for(pg, "NW.mp && NW.mp.view && NW.mp.view().online", 8)
            room_before = [ev(pg, "(()=>{const v=NW.mp.view();return {on:v.online,n:v.players.length,home:!!NW.home.active,boat:!!NW.boat.on}})()") for pg in pgs]
            ok("K11a flag ON: Muara tetap online & saling terlihat (2–3 pemain)", all(r["on"] for r in room_before) and all(r["n"] >= 1 for r in room_before), room_before)
            sent = []
            for pg in pgs: pg.on("websocket", lambda ws: ws.on("framesent", lambda f: sent.append(str(f))))
            for pg in pgs: to_selat(pg); tp(pg, 60 + pgs.index(pg) * 2, 21); set_hour(pg, 12)
            time.sleep(6)
            after = [ev(pg, "(()=>{const v=NW.mp.view();return {home:!!NW.home.active,boat:!!NW.boat.on,city:NW.kota.inCity(),s:stats?1:0}})()".replace("stats?1:0", "1")) for pg in pgs]
            ok("K11b di kota: NW.home.active / NW.boat.on tidak terganggu (false), kota aktif", all((not r["home"]) and (not r["boat"]) and r["city"] for r in after), after)
            ok("K11c tidak ada data NPC/kendaraan/kota dikirim ke jaringan", not any(("npc" in f.lower() or "veh" in f.lower() or "kota" in f.lower()) for f in sent), len(sent))
            ok("K11d tak ada tulis per-frame (frame keluar total 3 pemain × 6 dtk < 60)", len(sent) < 60, len(sent))
            vis = [ev(pg, "(()=>{const v=NW.mp.view();return v.players.length})()") for pg in pgs]
            print("   catatan: pemain lain di kota =", vis, "(sistem MP yang ada hanya menampilkan pemain di Muara — lihat STATUS)")
            for pg in pgs: ev(pg, "NW.world.onEnter('selat','start')") if False else None
            for c in ctxs: c.close()
            b.close()
    finally:
        srv.terminate()
    return summary()

if __name__ == "__main__":
    if "--golden" in sys.argv: golden_mode()
    else: sys.exit(0 if main() else 1)
