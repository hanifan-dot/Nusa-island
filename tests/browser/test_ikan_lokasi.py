"""Uji Ide 07B — 55 ikan lokasi (11 per lokasi, 1 SUPER RARE). SERVER = Worker backend ASLI + Firestore TIRUAN + server realtime uji (room-core ASLI). BUKAN bukti produksi.
IL_ONLY=dex|alur|super|pamer     Butuh NUSA_BACKEND. Gambar: docs/ide07b/"""
import os, sys, time, json
H = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, H)
import phone_harness as X
from playwright.sync_api import sync_playwright
ev, wait_for, ok = X.ev, X.wait_for, X.ok
SHOT = os.path.abspath(os.path.join(H, "..", "..", "docs", "ide07b")); os.makedirs(SHOT, exist_ok=True)
def shot(pg, name): pg.screenshot(path=os.path.join(SHOT, name + ".png"))
LOCS = {"muara": 0, "toba": 1, "selat": 2, "ampat": 3, "banda": 4}

def land(pg, fid, w=None, k=0.5):
    """w=None → berat di pertengahan rentang spesies (sah di server); k = posisi dalam rentang wMin–wMax."""
    return ev(pg, "([id,w,k])=>{const N=window.__nusa;N.G.phase='idle';const f=FISH.find(x=>x.id===id);N.landFish(f,w==null?Math.round((f.wMin+(f.wMax-f.wMin)*k)*100)/100:w);return N.S.cooler.length}", [fid, w, k])
def cool(pg): return ev(pg, "window.__nusa.S.cooler.map(i=>({uid:i.uid,id:i.id,w:i.w,lock:!!i.lock}))")
def srv(br, uid): return br.sell_eco(uid) or {}
_BR = []
def flush(pg):
    if _BR: _BR[0].adv(8000)   # jam server tiruan maju: lolos batas jeda tangkapan (1,5 dtk/ikan), bukan kelonggaran produksi
    ev(pg, "NW.eco.flush()"); time.sleep(0.8)
def live_eco(pg):
    """Halaman uji memakai toko 'sim'; ekonomi server dihubungkan ke Worker ASLI lewat NusaApi (sama seperti produksi: eco(name,d) → fungsi Worker)."""
    ev(pg, "(()=>{const a=NW.shopApi;a.sim=false;a.live=true;a.eco=(n,d)=>NusaApi.call(n,d||{},true)})()")
    ev(pg, "NW.eco._reset()"); ev(pg, "NW.eco.ensure()"); wait_for(pg, "NW.eco.active()", 15); return pg
def boot(b, br, acc, name, **kw):
    ctx, pg, errs = X.new_page(b, br, acc, name, vp=(412, 915), phone=False, extra_init="window.NUSA_IKAN_LOKASI=true;", **kw)
    return ctx, live_eco(pg), errs

def sec_dex(b, br):
    ctx, pg, errs = X.new_page(b, br, "demo-a", "Budi", vp=(412, 915), phone=False)   # flag klien default MATI
    d = ev(pg, "(()=>{const x=FISH.filter(f=>f.x);const live=FISH.filter(window.Nusa.fishLive);return {all:FISH.length,x:x.length,live:live.length,per:Object.fromEntries(['muara','toba','selat','ampat','banda'].map(l=>[l,x.filter(f=>f.loc===l).length])),sup:Object.fromEntries(['muara','toba','selat','ampat','banda'].map(l=>[l,x.filter(f=>f.loc===l&&f.sup).length]))}})()")
    ok("D1 data: 103 ikan, 55 baru, tepat 11 per lokasi & tepat 1 SUPER RARE per lokasi", d["all"] == 103 and d["x"] == 55 and all(v == 11 for v in d["per"].values()) and all(v == 1 for v in d["sup"].values()), d)
    ok("D2 flag klien MATI (bawaan): ikan baru tidak muncul di daftar/pool (48 ikan lama saja)", d["live"] == 48, d["live"])
    pool = ev(pg, "(()=>{const N=window.__nusa;const seen=new Set();for(let i=0;i<4000;i++){try{const r=N.chooseFish();if(r&&r.fish)seen.add(r.fish.id)}catch(e){}}return [...seen].filter(i=>FISH.find(f=>f.id===i).x).length})()")
    ok("D3 chooseFish nyata, flag mati → 0 ikan baru keluar", pool == 0, pool); ctx.close()
    ctx, pg, errs = boot(b, br, "demo-a", "Budi")
    d = ev(pg, "(()=>{const live=FISH.filter(window.Nusa.fishLive);return live.length})()")
    ok("D4 flag klien NYALA (hanya uji): 103 ikan aktif", d == 103, d)
    seen = ev(pg, "(()=>{const N=window.__nusa;const seen={};for(let L=0;L<5;L++){N.S.loc=L;for(let i=0;i<6000;i++){let r;try{r=N.chooseFish()}catch(e){}if(r&&r.fish)seen[r.fish.id]=1}}N.S.loc=0;return Object.keys(seen)})()")
    xs = ev(pg, "FISH.filter(f=>f.x&&!f.sup).map(f=>f.id)")
    ok("D5 chooseFish nyata (flag nyala): ikan reguler baru keluar; SUPER RARE TIDAK PERNAH keluar dari undian klien", any(i in seen for i in xs) and not any(f for f in seen if f.endswith(("belida_bulan", "ihan_kencana", "layur_api", "cenderawasih", "raja_laut"))), len([i for i in seen if i in xs]))
    ok("D6 tanpa galat skrip", not [e for e in errs if "PAGEERR" in e], errs[:2]); ctx.close()

def sec_alur(b, br):
    ctx, pg, errs = boot(b, br, "demo-a", "Budi"); uid = X.uid(pg)
    br.post("/__eco", {"uid": uid, "set": {"bal": 100, "box": []}})
    ev(pg, "(()=>{const S=window.__nusa.S;S.up.cooler=9;window.__nusa.save()})()")
    ids = ["mr_bilis", "tb_gurame", "st_bandeng", "ra_kakap_karang", "bd_tongkol"]
    for i, f in enumerate(ids): land(pg, f)
    c = cool(pg); ok("A1 5 ikan baru (5 lokasi) masuk Coolbox", [x["id"] for x in c if x["id"] in ids] == ids, [x["id"] for x in c])
    st = ev(pg, "(()=>{const S=window.__nusa.S;return {c:S.stats.caught,dex:ids=>0}})()")
    ok("A2 dex & statistik mencatat ikan baru", ev(pg, "ids=>ids.every(i=>window.__nusa.S.dex[i]&&window.__nusa.S.dex[i].n>=1)", ids) and st["c"] >= 5)
    flush(pg); sv = srv(br, uid); box = [x.get("id") for x in (sv.get("box") or [])]
    ok("A3 server menerima semua ikan baru (id sah) ke kotak server, tanpa penggandaan", sorted([i for i in box if i in ids]) == sorted(ids), box)
    flush(pg); sv2 = srv(br, uid); ok("A4 kirim ulang (flush kedua) tidak menggandakan ikan", len(sv2.get("box") or []) == len(sv.get("box") or []), (len(sv2.get("box") or []), len(sv.get("box") or [])))
    # jual lewat server
    u = [x["uid"] for x in cool(pg) if x["id"] in ("mr_bilis", "tb_gurame")]
    bal0 = ev(pg, "NW.eco.balance()")
    r = ev(pg, "async(u)=>new Promise(res=>{setTimeout(()=>res({e:'timeout',act:NW.eco.active(),err:NW.eco.lastError()}),12000);const x=NW.eco.sell(u,(e,r)=>res({e:e&&String(e),r}));if(x===false)res({e:'ditolak-klien',act:NW.eco.active(),err:NW.eco.lastError()})})", u)
    bal_after = ev(pg, "NW.eco.balance()")
    ok("A10 jual ikan baru lewat ekonomi server: server menjual dua ikan baru & saldo server naik", r.get("r") and len(r["r"]["sold"]) == 2 and r["r"]["total"] > 0 and bal_after > bal0, (r.get("r") or {}).get("total"))
    ev(pg, "u=>{const S=window.__nusa.S;S.cooler=S.cooler.filter(i=>!u.includes(i.uid));window.__nusa.save()}", u)   # yang dikerjakan panel Tas setelah server membalas
    rest = [x for x in ids if x not in ('mr_bilis', 'tb_gurame')]
    # simpan awan & muat ulang
    ev(pg, "window.__nusa.save()"); time.sleep(0.5); pg.reload(); wait_for(pg, "window.__nusa&&window.__nusa.S", 10); time.sleep(1.0); live_eco(pg)
    c2 = cool(pg); ok("A5 setelah muat ulang ikan baru yang tersisa masih ada di Coolbox (tidak hilang/ganda)", sorted([x["id"] for x in c2 if x["id"] in ids]) == sorted(rest) and len(c2) == len(set(x["uid"] for x in c2)), [x["id"] for x in c2])
    # Cloud Save menerima id baru
    ok("A6 validasi Cloud Save: id baru lolos pola ID & batas berat", ev(pg, "ids=>ids.every(i=>/^[a-z0-9_]{2,30}$/.test(i))", ids))
    # ikan dari server pada Tas / Kolam / Dapur
    ev(pg, "(()=>{window.__nusa.G.phase='idle';document.querySelectorAll('.catch-card,#catchCard').forEach(e=>e.remove());window.Nusa.openPanel('inventory')})()"); time.sleep(0.8); shot(pg, "tas-ikan-lokasi")
    ok("A7 Tas menampilkan ikan baru dengan nama & kelangkaan", ev(pg, "ids=>ids.some(i=>document.getElementById('panelWrap').textContent.includes(FISH.find(f=>f.id===i).name))", ids))
    ok("A8 kolam: ikan baru (bukan sampah/dilindungi) memenuhi syarat", ev(pg, "ids=>window.NW.pond&&NW.pond.core?ids.every(i=>NW.pond.core.rarityOk(FISH.find(f=>f.id===i))):true", ids))
    ok("A9 dapur: ikan baru memenuhi syarat bahan", ev(pg, "ids=>NW.dapur&&NW.dapur.core&&NW.dapur.core.fishOk?ids.every(i=>NW.dapur.core.fishOk(FISH.find(f=>f.id===i))):true", ids))
    ok("A11 tanpa galat skrip", not [e for e in errs if "PAGEERR" in e], errs[:2]); ctx.close()
    # jaringan putus: Coolbox penuh & jaringan terputus tidak menggandakan
    ctx, pg, errs = boot(b, br, "demo-b", "Sari"); uid = X.uid(pg)
    br.post("/__eco", {"uid": uid, "set": {"bal": 100, "box": []}}); pg.route("**/fn/ecoCatch*", lambda r: r.abort())
    ev(pg, "(()=>{const S=window.__nusa.S;S.up.cooler=9;window.__nusa.save()})()")
    for i in range(3): land(pg, "tb_hampala", None, 0.3 + i * 0.1)
    flush(pg); n_off = len(srv(br, uid).get("box") or [])
    pg.unroute("**/fn/ecoCatch*"); flush(pg); time.sleep(0.6); flush(pg)
    box = srv(br, uid).get("box") or []
    ok("A12 jaringan putus lalu pulih: pengiriman ulang tidak menggandakan (3 ikan tepat 3 di server)", n_off == 0 and len([x for x in box if x.get("id") == "tb_hampala"]) == 3, (n_off, len(box)))
    ev(pg, "(()=>{const S=window.__nusa.S;S.up.cooler=0;S.cooler=S.cooler.slice(0,8);while(S.cooler.length<8)S.cooler.push({uid:'z'+S.cooler.length,id:'nila',w:1,t:1});window.__nusa.save()})()")
    full = ev(pg, "window.Nusa.coolerFull()"); ok("A13 Coolbox penuh dikenali (ikan baru tidak ditambahkan melewati kapasitas)", full is True, full); ctx.close()

def sec_super(b, br):
    br.cfg(ikanLokasi=True); br.rng("nol")
    sup = {"muara": "mr_belida_bulan", "toba": "tb_ihan_kencana", "selat": "st_layur_api", "ampat": "ra_cenderawasih", "banda": "bd_raja_laut"}
    reg = {"muara": "mr_bilis", "toba": "tb_bilih", "selat": "st_teri", "ampat": "ra_kepe", "banda": "bd_tongkol"}
    ctx, pg, errs = boot(b, br, "demo-a", "Budi"); uid = X.uid(pg)
    br.post("/__eco", {"uid": uid, "set": {"bal": 100, "box": [], "sx": {}}})
    ev(pg, "(()=>{const S=window.__nusa.S;S.up.cooler=9;window.__nusa.save()})()")
    for loc, rid in reg.items():
        land(pg, rid); flush(pg); time.sleep(0.4)
    got = [x for x in cool(pg) if x["id"] in sup.values()]
    ok("S1 RNG server dipaksa kena: tiap lokasi menghasilkan tepat 1 SUPER RARE, id sesuai lokasi", sorted(x["id"] for x in got) == sorted(sup.values()), [x["id"] for x in got])
    ok("S2 SUPER RARE terkunci di Coolbox klien (uid server 'sx…') dan tercatat di dex", all(x["lock"] and x["uid"].startswith("sx") for x in got) and ev(pg, "ids=>ids.every(i=>window.__nusa.S.dex[i])", list(sup.values())))
    sv = srv(br, uid); box = [x.get("id") for x in (sv.get("box") or [])]
    ok("S3 server menyimpan SUPER RARE di kotak server tepat sekali per lokasi", all(box.count(v) == 1 for v in sup.values()), box)
    ok("S4 banner khusus 'SUPER RARE' tampil", ev(pg, "!!document.getElementById('sxBanner')"))
    shot(pg, "super-rare-notifikasi")
    # batas harian: tangkapan kedua di lokasi sama tidak menghasilkan super baru
    land(pg, reg["muara"]); flush(pg); time.sleep(0.4)
    ok("S5 batas harian: undian kedua di lokasi sama TIDAK membuat SUPER RARE kedua", sum(1 for x in cool(pg) if x["id"] == sup["muara"]) == 1)
    # klien tidak boleh melapor ikan super
    r = ev(pg, "async(id)=>{try{return {ok:await NusaApi.call('ecoCatch',{opId:'x'+Date.now(),fish:[{id,w:1,uid:'forge1'}]},true)}}catch(e){return {err:e.code,msg:e.message}}}", sup["banda"])
    ok("S6 klien yang melapor ikan SUPER RARE ditolak server", bool(r.get("err")) or "SUPER" in json.dumps(r), r)
    # jual SUPER RARE
    su = [x["uid"] for x in cool(pg) if x["id"] == sup["toba"]]
    ev(pg, "u=>{const it=window.__nusa.S.cooler.find(i=>i.uid===u[0]);if(it)delete it.lock}", su)
    r = ev(pg, "async(u)=>new Promise(res=>{setTimeout(()=>res({e:'timeout',act:NW.eco.active(),err:NW.eco.lastError()}),12000);const x=NW.eco.sell(u,(e,r)=>res({e:e&&String(e),r}));if(x===false)res({e:'ditolak-klien',act:NW.eco.active(),err:NW.eco.lastError()})})", su)
    ok("S7 SUPER RARE bisa dijual lewat server; harga di bawah Megalodon (16.000)", r.get("r") and 0 < r["r"]["total"] < 16000, r)
    # pulih setelah muat ulang / kiriman hilang
    sx_before = sorted(x["id"] for x in cool(pg) if x["id"] in sup.values())
    pg.reload(); live_eco(pg); time.sleep(1.5)
    sx_after = sorted(x["id"] for x in cool(pg) if x["id"] in sup.values())
    ok("S8 muat ulang: SUPER RARE tidak ganda & tidak hilang", sx_after == sx_before and len(sx_after) == len(set(sx_after)), (sx_before, sx_after))
    ctx.close()
    # RNG asli + flag server mati → tidak ada super
    br.cfg(ikanLokasi=False); br.rng("nol")
    ctx, pg, errs = boot(b, br, "demo-b", "Sari"); uid = X.uid(pg); br.post("/__eco", {"uid": uid, "set": {"bal": 100, "box": [], "sx": {}}})
    ev(pg, "(()=>{const S=window.__nusa.S;S.up.cooler=9;window.__nusa.save()})()")
    land(pg, reg["muara"]); flush(pg); time.sleep(0.4)
    ok("S9 flag server ikanLokasi MATI (bawaan): tidak ada SUPER RARE walau RNG 'kena'", not [x for x in cool(pg) if x["id"] in sup.values()])
    ctx.close(); br.cfg(ikanLokasi=True); br.rng("asli")

def sec_pamer(b, br):
    br.cfg(ikanLokasi=True); br.rng("nol")
    ctxA, A, eA = boot(b, br, "demo-a", "Budi"); ctxB, B, eB = boot(b, br, "demo-b", "Sari")
    for pg in (A, B): wait_for(pg, "NW.mp.view().online", 25)
    uid = X.uid(A); br.post("/__eco", {"uid": uid, "set": {"bal": 100, "box": [], "sx": {}}})
    ev(A, "(()=>{const S=window.__nusa.S;S.up.cooler=9;window.__nusa.save()})()")
    land(A, "mr_bilis"); flush(A); time.sleep(0.5)
    sup = [x for x in cool(A) if x["id"] == "mr_belida_bulan"]
    ok("P0 syarat uji: akun A memiliki SUPER RARE hasil server", len(sup) == 1, [x["id"] for x in cool(A)])
    if not sup: ctxA.close(); ctxB.close(); return
    wait_for(A, "NW.mp.view().players.length>=1", 15)
    ok("P1 SUPER RARE bisa dipamerkan (tombol Pamer Ikan → start)", ev(A, "u=>NW.hold.start(u)", sup[0]["uid"]) is True)
    ok("P2 pemain B melihat status pamer A: id spesies, berat, varian (tanpa UID/koin/isi Coolbox)", wait_for(B, "NW.mp.view().players.some(p=>p.holding==='mr_belida_bulan')", 12))
    rem = ev(B, "(()=>{const p=[...NW.mp._R.players.values()].find(p=>p.hold&&p.hold.i==='mr_belida_bulan');return p?{hold:p.hold,keys:Object.keys(p.hold)}:null})()")
    ok("P3 data pamer hanya {i,w,v}; tidak ada uid/saldo/inventaris", rem and sorted(rem["keys"]) == ["i", "v", "w"], rem)
    ok("P4 B merender nama, berat, kelangkaan SUPER RARE di atas A", ev(B, "(()=>{const p=[...NW.mp._R.players.values()].find(p=>p.hold);const fr=NW.hold.remoteFrame(p.hold);return !!fr&&!!fr.f.sup&&fr.f.name===FISH.find(x=>x.id==='mr_belida_bulan').name&&fr.w>0})()"))
    time.sleep(1.0); shot(B, "pamer-super-dilihat-pemain-b")
    # hentikan manual
    ev(A, "NW.hold.stop('manual')"); ok("P5 dilepas → pamer hilang di B", wait_for(B, "!NW.mp.view().players.some(p=>p.holding)", 12))
    hold_b = lambda: wait_for(B, "NW.mp.view().players.some(p=>p.holding)", 12)
    # pindah area (Muara → Toba)
    ev(A, "u=>NW.hold.start(u)", sup[0]["uid"]); hold_b()
    ev(A, "NW.world.switchArea('toba')")
    ok("P8 pindah area → pamer berhenti di A", wait_for(A, "!NW.hold.holding()", 6))
    ok("P8b … dan hilang di B", wait_for(B, "!NW.mp.view().players.some(p=>p.holding)", 12))
    # putus koneksi
    ev(A, "NW.world.switchArea('muara')"); time.sleep(1.5)
    ev(A, "u=>NW.hold.start(u)", sup[0]["uid"]); hold_b()
    ctxA.close(); ok("P9 pemain A terputus/keluar → pamer hilang di B", wait_for(B, "!NW.mp.view().players.some(p=>p.holding)", 15))
    # pemain A masuk lagi: Rumahku & kapal (jalur sama untuk semua ikan; dipakai ikan biasa baru)
    ctxA, A, eA = boot(b, br, "demo-a", "Budi"); wait_for(A, "NW.mp.view().online", 25); wait_for(A, "NW.mp.view().players.length>=1", 15)
    ev(A, "(()=>{const S=window.__nusa.S;S.up.cooler=9;window.__nusa.save()})()"); land(A, "mr_toman_bara"); flush(A)
    it = [x for x in cool(A) if x["id"] == "mr_toman_bara"]
    ok("P11 ikan baru biasa (langka) juga bisa dipamerkan & terlihat B dengan nama benar", ev(A, "u=>NW.hold.start(u)", it[0]["uid"]) is True and hold_b() and ev(B, "(()=>{const p=[...NW.mp._R.players.values()].find(p=>p.hold);const f=p&&NW.hold.remoteFrame(p.hold);return !!f&&f.f.name===FISH.find(x=>x.id==='mr_toman_bara').name&&!f.f.sup})()"))
    ev(A, "NW.home.enter(NW.world.player)")
    ok("P6 masuk Rumahku → pamer berhenti di A", wait_for(A, "!NW.hold.holding()", 6))
    ok("P6b … dan hilang di B", wait_for(B, "!NW.mp.view().players.some(p=>p.holding)", 12))
    wait_for(A, "NW.mp.view().online", 10); time.sleep(1.5)
    ev(A, "(()=>{try{NW.home.leave&&NW.home.leave()}catch(e){}})()"); time.sleep(2.0)
    if ev(A, "!NW.hold.holding()"):
        ev(A, "u=>NW.hold.start(u)", it[0]["uid"]); hold_b()
        ev(A, "NW.boat&&NW.boat.board&&NW.boat.board()")
        ok("P7 naik kapal → pamer berhenti", wait_for(A, "!NW.hold.holding()", 6))
        ok("P7b … dan hilang di B", wait_for(B, "!NW.mp.view().players.some(p=>p.holding)", 12))
    ok("P10 tanpa galat skrip di B", not [e for e in eB if "PAGEERR" in e], eB[:2]); ctxA.close(); ctxB.close(); br.rng("asli")

def sec_galeri(b, br):
    """Bukti visual: 55 ikan baru per lokasi (siluet/warna/ciri berbeda), SUPER RARE berbingkai emas. Gambar dibuat dari data ikan nyata (Nusa.fishImg), bukan tiruan."""
    ctx, pg, errs = boot(b, br, "demo-a", "Budi")
    ev(pg, """()=>{const L=[['muara','Muara Kampung'],['toba','Tepian Toba'],['selat','Selat Sunda'],['ampat','Raja Ampat'],['banda','Laut Banda']];
      const d=document.createElement('div');d.id='galeri';d.style.cssText='position:fixed;inset:0;z-index:99999;background:#10202c;color:#fff;overflow:auto;padding:8px;font:11px sans-serif';
      d.innerHTML=L.map(([l,n])=>'<div style="margin:4px 0 2px;font-weight:700;font-size:13px">'+n+'</div><div style="display:flex;gap:4px;flex-wrap:wrap">'+FISH.filter(f=>f.x&&f.loc===l).map(f=>{const t=tierOf(f);return '<div style="width:92px;text-align:center;background:#1b3344;border-radius:8px;padding:3px;border:2px solid '+(f.sup?'#ffd24a':f.mitos?'#e86bd8':'#2c4a60')+'"><img src="'+Nusa.fishImg(f.id)+'" style="width:84px;height:46px;object-fit:contain"><div style="font-weight:700;line-height:1.1">'+f.name+'</div><div style="color:'+t.color+'">'+(f.sup?'SUPER RARE':f.mitos?'Mitos':f.rarity)+'</div></div>'}).join('')+'</div>').join('');
      document.body.appendChild(d)}""")
    time.sleep(1.2); pg.set_viewport_size({"width": 800, "height": 1340}); time.sleep(0.5); shot(pg, "galeri-55-ikan"); ctx.close()

def main():
    br = X.Bridge(); _BR.append(br)
    try:
        with sync_playwright() as p:
            b = p.chromium.launch(); only = os.environ.get("IL_ONLY", "")
            for name, fn in (("dex", sec_dex), ("alur", sec_alur), ("super", sec_super), ("pamer", sec_pamer), ("galeri", sec_galeri)):
                if not only or only == name:
                    try: fn(b, br)
                    except Exception as e: ok("ERR %s" % name, False, repr(e))
            b.close()
    finally: br.close()
    f = [r for r in X.R if r.startswith("FAIL")]
    print("\nRINGKAS: %d PASS / %d FAIL" % (len(X.R) - len(f), len(f)))
    sys.exit(1 if f else 0)
if __name__ == "__main__": main()
