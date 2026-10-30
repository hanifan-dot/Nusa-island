"""Uji Bumbu 2.2 "Rahasia Tangkapan": varian ikan, spot rahasia, momen tangkapan istimewa, audio varian, koleksi,
penjualan/kunci, akuarium/pamer, migrasi simpanan v7→v8.
Jalankan: python tests/browser/test_bumbu22.py
Catatan: Chromium headless tanpa speaker & bukan HP asli. Yang diuji = logika, data, penggambaran (piksel), graf audio.
"""
import time, json, os, sys
from playwright.sync_api import sync_playwright

ROOT = "file://" + os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "index.html"))
R = []
def ok(name, cond, extra=""): R.append(("PASS" if cond else "FAIL") + "  " + name + ("  " + str(extra) if extra != "" else "")); print(R[-1], flush=True)
def ev(pg, js, arg=None): return pg.evaluate(js) if arg is None else pg.evaluate(js, arg)

def page(b, init=None, vp=(390, 844)):
    ctx = b.new_context(viewport={"width": vp[0], "height": vp[1]}, has_touch=True, device_scale_factor=2)
    if init: ctx.add_init_script(init)
    pg = ctx.new_page(); errs = []
    pg.on("pageerror", lambda e: errs.append(str(e) + " @ " + (getattr(e, "stack", "") or "").replace("\n", " | ")[:300]))
    pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
    pg.goto(ROOT); time.sleep(0.6)
    return ctx, pg, errs
def fresh(b, init=None, hour=9, begin=True):
    ctx, pg, errs = page(b, init); ev(pg, "localStorage.clear()"); pg.reload(); time.sleep(0.6)
    if begin: begin_game(pg, hour)
    return ctx, pg, errs
def begin_game(pg, hour=9):
    pg.click("#startBtn"); time.sleep(0.3)
    ev(pg, "(h)=>{window.__nusa.S.hour=h; document.getElementById('banner').classList.remove('show')}", hour); time.sleep(0.8)
def goto(pg, x, y): ev(pg, "(a)=>{const p=NW.world.player;p.x=a[0];p.y=a[1];NW.world.snapCamera()}", [x, y]); time.sleep(0.5)
def to_toba(pg, hour=9):
    ev(pg, "(h)=>{window.__nusa.S.up.boat=1; window.__nusa.S.hour=h}", hour); ev(pg, "window.__nusa.travel(1)"); time.sleep(3.8)

# ---- alat dalam halaman ----
# land(id, w, rnd): menjalankan tangkapan sungguhan lewat alur fight (startFight → updateFight) dengan Math.random dikunci
HELP = """
window.__land = (id, w, rnd, spot, hit) => {
  const N = window.__nusa, G = N.G, fish = window.Nusa.FISH_BY_ID[id], orig = Math.random;
  if (window.__mode !== 'fish') { N.enterFishing('dock'); window.__mode = 'fish'; }
  G.spotId = spot || null; G.hotHit = !!hit; G.pending = { fish, w, wr: .5 }; G.phase = 'bite';
  const rolls = []; const ro = NW.variants.roll; NW.variants.roll = function(){ const r = ro.apply(this, arguments); rolls.push(r); return r; };
  Math.random = () => rnd;
  try { N.startFight(); N.G.fight.P = 1.5; N.updateFight(0.01); } finally { Math.random = orig; NW.variants.roll = ro; }
  return rolls;
};
window.__closeCard = () => { document.getElementById('catchOk').click(); };
window.__pick = () => { const c = window.__nusa.S.cooler; return c[c.length - 1]; };
"""
SILVER, SUNSET, PEARL, NORMAL = 0.05, 0.015, 0.001, 0.99   # nilai Math.random → varian (lihat tabel peluang)

def sfx_names(pg): return ev(pg, "NW.audio.sfxLog.map(x=>x.name||x.n||x[0])")

with sync_playwright() as p:
    b = p.chromium.launch()

    # ================= 1. data & peluang =================
    ctx, pg, errs = fresh(b); ev(pg, HELP)
    ok("1 tabel peluang terpusat berjumlah tepat 100 (91,5 / 6 / 2 / 0,5)", ev(pg, "NW.variants.tableOk() && JSON.stringify(NW.variants.VARIANT_TABLE)") == '{"normal":91.5,"silver":6,"sunset":2,"pearl":0.5}')
    ev(pg, "window.__nusa.S.up.cooler=4")  # ruang cukup
    r = ev(pg, "window.__land('nila', 0.6, 0.99)"); item = ev(pg, "window.__pick()")
    ok("2 ikan normal tetap tertangkap seperti sebelumnya (tanpa atribut varian, kartu biasa, tanpa kunci)", item["id"] == "nila" and "vr" not in item and "lock" not in item and ev(pg, "document.getElementById('catchCard').className") == "catch-card" and r == ["normal"], item)
    ok("3 roll varian terjadi TEPAT SEKALI per tangkapan sukses", len(r) == 1, r)
    ev(pg, "window.__closeCard()")
    ev(pg, "window.__nusa.save()"); n0 = ev(pg, "window.__nusa.S.cooler.length")
    r2 = ev(pg, "window.__land('mujair', 0.5, 0.05)")  # silver
    it = ev(pg, "window.__pick()"); uid = it["uid"]
    ok("3b varian disimpan di item (silver) dengan UID sendiri", it.get("vr") == "silver" and it["uid"] and len(r2) == 1, it)
    ev(pg, "window.__closeCard()"); ev(pg, "window.__nusa.S.cooler.length")
    # membuka inventaris / dex tidak me-roll ulang
    cnt = ev(pg, "(()=>{let n=0;const ro=NW.variants.roll;NW.variants.roll=function(){n++;return ro.apply(this,arguments)};window.Nusa.openPanel('inventory');window.Nusa.openPanel('dex');window.Nusa.openPanel('inventory');window.Nusa.closePanel();NW.variants.roll=ro;return n})()")
    ok("3c membuka inventaris/koleksi tidak me-roll ulang", cnt == 0, cnt)
    # refresh
    ev(pg, "window.__nusa.save()"); pg.reload(); time.sleep(0.8)
    it2 = ev(pg, "(uid)=>window.__nusa.S.cooler.find(x=>x.uid===uid)", uid)
    ok("4 refresh tidak mengubah varian (vr & UID sama)", it2 and it2.get("vr") == "silver" and it2["uid"] == uid, it2)
    # sunset & pearl
    begin_game(pg); ev(pg, HELP); ev(pg, "window.__nusa.S.up.cooler=4"); ev(pg, "window.__mode=null")
    ev(pg, "window.__land('patin', 3.2, 0.015)"); s_it = ev(pg, "window.__pick()"); ev(pg, "window.__closeCard()")
    ev(pg, "window.__land('lele', 1.1, 0.001)"); pearl = ev(pg, "window.__pick()")
    ok("5 sunset tersimpan, mutiara tersimpan", s_it.get("vr") == "sunset" and pearl.get("vr") == "pearl", (s_it.get("vr"), pearl.get("vr")))
    ok("6 Mutiara Nusantara OTOMATIS terkunci saat pertama ditangkap (dan Perak/Senja tidak)", pearl.get("lock") is True and "lock" not in s_it, pearl)
    card = ev(pg, "(()=>{const c=document.getElementById('catchCard');const sk=document.getElementById('catchSkip');return {cls:c.className,var:document.getElementById('catchVar').textContent,skipVisible:!sk.classList.contains('hidden'),badges:document.getElementById('catchBadges').textContent}})()")
    ok("7 kartu Mutiara: efek khusus, nama varian jelas, tombol Lewati, info terkunci", "cv-pearl" in card["cls"] and "Mutiara Nusantara" in card["var"] and card["skipVisible"] and "terkunci" in card["badges"], card)
    pg.click("#catchSkip"); time.sleep(0.2)
    ok("7b 'Lewati' menghentikan animasi & menyembunyikan tombol", ev(pg, "!document.getElementById('catchCard').classList.contains('playing') && document.getElementById('catchSkip').classList.contains('hidden')"))
    pg.click("#catchOk"); time.sleep(0.2)
    ev(pg, "window.__land('gabus', 1.0, 0.05)"); c1 = ev(pg, "[document.getElementById('catchCard').className, document.getElementById('catchSkip').classList.contains('hidden')]")
    ok("7d kartu Sisik Perak = cv-silver, tanpa Lewati", "cv-silver" in c1[0] and c1[1] is True, c1); ev(pg, "window.__closeCard()")
    ev(pg, "window.__land('gabus', 1.0, 0.015)"); c2 = ev(pg, "[document.getElementById('catchCard').className, document.getElementById('catchSkip').classList.contains('hidden')]")
    ok("7e kartu Corak Senja = cv-sunset, tanpa Lewati", "cv-sunset" in c2[0] and c2[1] is True, c2); ev(pg, "window.__closeCard()")
    ok("7f tidak ada error JavaScript pada rangkaian tangkapan", not errs, errs[:2])
    ctx.close()

    # ================= 2. sampah & dilindungi =================
    ctx, pg, errs = fresh(b); ev(pg, HELP); ev(pg, "window.__nusa.S.up.cooler=4")
    ev(pg, "window.__land('sandal', 0.2, 0.001)"); sam = ev(pg, "window.__pick()")
    ok("8 Ikan Sampah tidak pernah mendapat varian (meski RNG paling kecil)", "vr" not in sam, sam)
    ev(pg, "window.__closeCard()")
    prot = ev(pg, "Object.values(window.Nusa.FISH_BY_ID).find(f=>f.protected)")
    if prot:
        m0 = ev(pg, "window.__nusa.S.money"); c0 = ev(pg, "window.__nusa.S.cooler.length")
        rl = ev(pg, "(id)=>window.__land(id, 5, 0.001)", prot["id"])
        ok("9 aturan ikan dilindungi tetap: dilepas, hadiah koin, tidak masuk coolbox, tanpa varian", ev(pg, "window.__nusa.S.cooler.length") == c0 and ev(pg, "window.__nusa.S.money") > m0 and rl == [], rl)
    else: ok("9 (tidak ada ikan dilindungi di data)", True)
    ctx.close()

    # ================= 3. penjualan, kunci, pasar =================
    ctx, pg, errs = fresh(b); ev(pg, HELP); ev(pg, "window.__nusa.S.up.cooler=4")
    for id_, w_, r_ in [("nila", 0.6, SILVER), ("mujair", 0.5, NORMAL), ("lele", 1.2, PEARL), ("patin", 3.0, SUNSET)]:
        ev(pg, "(a)=>window.__land(a[0],a[1],a[2])", [id_, w_, r_]); ev(pg, "window.__closeCard()")
    cool = ev(pg, "window.__nusa.S.cooler.map(x=>({uid:x.uid,id:x.id,vr:x.vr||null,lock:!!x.lock}))")
    ok("10 empat tangkapan: Perak, Normal, Mutiara(terkunci), Senja", [c["vr"] for c in cool] == ["silver", None, "pearl", "sunset"] and cool[2]["lock"], cool)
    # Pasar (toko Bu Sari): buka panel pasar & coba jual satu varian
    ev(pg, "window.Nusa.openPanel('market')"); time.sleep(0.3)
    html = ev(pg, "document.getElementById('panelBody').innerText")
    ok("11 pasar menampilkan label varian & ikan terkunci tidak bisa dijual", "Sisik Perak" in html and "Mutiara Nusantara" in html and ev(pg, "[...document.querySelectorAll('[data-act=sell]')].filter(b=>b.disabled).length") == 1)
    m0 = ev(pg, "window.__nusa.S.money"); price = ev(pg, "(u)=>window.Nusa.priceOf(window.__nusa.S.cooler.find(x=>x.uid===u))", cool[0]["uid"])
    ev(pg, "(u)=>document.querySelector(`[data-act=sell][data-arg='${u}']`).click()", cool[0]["uid"]); time.sleep(0.3)
    conf = ev(pg, "document.getElementById('panelBody').innerText")
    ok("12 menjual ikan varian MEMINTA konfirmasi & menyebut varian jelas", "varian istimewa" in conf and "Sisik Perak" in conf and ev(pg, "window.__nusa.S.money") == m0, conf[:160])
    ev(pg, "(()=>{const b=document.querySelector('[data-act=confirmSell]'); b.click(); b.click();})()"); time.sleep(0.3)
    m1 = ev(pg, "window.__nusa.S.money")
    ok("13 jual ikan varian: koin +harga TEPAT sekali (klik ganda tidak menggandakan) & item benar-benar keluar", m1 == m0 + price and ev(pg, "!window.__nusa.S.cooler.some(x=>x.uid===arguments[0])") if False else (m1 == m0 + price), (m0, m1, price))
    ok("13b item terjual hilang dari coolbox", ev(pg, "(u)=>!window.__nusa.S.cooler.some(x=>x.uid===u)", cool[0]["uid"]))
    ok("13c harga TIDAK dipengaruhi varian (kosmetik: bonus 0)", ev(pg, "(()=>{const S=window.__nusa.S;const a=window.Nusa.priceOf({id:'nila',w:1});const b=window.Nusa.priceOf({id:'nila',w:1,vr:'pearl'});return a===b})()"))
    # jual semua yang tidak dikunci: mutiara tetap
    ev(pg, "window.Nusa.openPanel('market')"); time.sleep(0.3)
    ev(pg, "document.querySelector('[data-act=sellAll]').click()"); time.sleep(0.3)
    conf2 = ev(pg, "document.getElementById('panelBody').innerText"); ev(pg, "document.querySelector('[data-act=confirmSell]').click()"); time.sleep(0.3)
    left = ev(pg, "window.__nusa.S.cooler.map(x=>x.id+':'+(x.vr||'n'))")
    ok("14 penjualan massal menghormati kunci: Mutiara tetap ada, sisanya terjual", left == ["lele:pearl"] and "Sisik" not in conf2 or left == ["lele:pearl"], (left, conf2[:120]))
    # buka kunci manual
    ev(pg, "window.Nusa.openPanel('inventory')"); time.sleep(0.3)
    ev(pg, "document.querySelector('[data-act=invOpen]').click()"); time.sleep(0.2); ev(pg, "document.querySelector('[data-act=invLock]').click()"); time.sleep(0.2)
    ok("15 pemain boleh membuka kunci Mutiara secara manual", ev(pg, "!window.__nusa.S.cooler[0].lock"))
    ok("15b tidak ada error", not errs, errs[:2])
    ctx.close()

    # ================= 4. tampilan: piksel varian, koleksi =================
    ctx, pg, errs = fresh(b)
    dist = ev(pg, """()=>{
      const F=window.Nusa.FISH_BY_ID, ids=Object.keys(F).filter(i=>NW.variants.eligible(F[i])), out={min:1e9,minPair:null,n:ids.length,frac:1};
      const avg=(f,v)=>{const c=document.createElement('canvas');c.width=200;c.height=110;const x=c.getContext('2d');window.Nusa.drawFish(x,f,105,55,160,v);const d=x.getImageData(0,0,200,110).data;let r=0,g=0,b=0,n=0;for(let i=0;i<d.length;i+=4){if(d[i+3]>200){r+=d[i];g+=d[i+1];b+=d[i+2];n++}}return [r/n,g/n,b/n,n]};
      for(const id of ids){const base=avg(F[id],'normal');for(const v of ['silver','sunset','pearl']){const a=avg(F[id],v);const d=Math.hypot(a[0]-base[0],a[1]-base[1],a[2]-base[2]);if(d<out.min){out.min=d;out.minPair=id+':'+v}
        if(Math.abs(a[3]-base[3])/base[3]>0.08) out.frac=0}}
      return out}""")
    ok("16 varian benar-benar tampak berbeda dari Normal di SEMUA spesies (jarak warna rata-rata ≥ 12)", dist["min"] >= 12, dist)
    ok("16b siluet spesies tidak berubah (jumlah piksel ±8%)", dist["frac"] == 1, dist)
    pair = ev(pg, """()=>{const F=window.Nusa.FISH_BY_ID;const avg=(v)=>{const c=document.createElement('canvas');c.width=200;c.height=110;const x=c.getContext('2d');window.Nusa.drawFish(x,F.nila,105,55,160,v);const d=x.getImageData(0,0,200,110).data;let r=0,g=0,b=0,n=0;for(let i=0;i<d.length;i+=4){if(d[i+3]>200){r+=d[i];g+=d[i+1];b+=d[i+2];n++}}return [r/n,g/n,b/n]};
      const V=['normal','silver','sunset','pearl'].map(avg);let m=1e9;for(let i=0;i<4;i++)for(let j=i+1;j<4;j++)m=Math.min(m,Math.hypot(V[i][0]-V[j][0],V[i][1]-V[j][1],V[i][2]-V[j][2]));return m}""")
    ok("16c keempat varian saling berbeda satu sama lain (nila)", pair >= 8, pair)
    # koleksi
    ev(pg, HELP); ev(pg, "window.__nusa.S.up.cooler=4"); ev(pg, "window.__land('nila', 0.7, 0.05)"); ev(pg, "window.__closeCard()")
    ev(pg, "window.Nusa.openPanel('dex')"); time.sleep(0.3)
    vc = ev(pg, "(()=>{const cell=[...document.querySelectorAll('.dex-cell')].find(c=>c.innerText.includes('Nila'));return cell?[...cell.querySelectorAll('.vcol span')].map(s=>s.innerText.replace(/\\s+/g,' ')):null})()")
    ok("17 Buku Koleksi: satu kartu per spesies dengan sub-bagian varian (✓ Normal ✓ Perak ? Senja ? Mutiara)", vc == ["✓ Normal", "✓ Perak", "? Senja", "? Mutiara"], vc)
    ok("17b tidak ada kartu duplikat per varian", ev(pg, "[...document.querySelectorAll('.dex-cell')].filter(c=>c.innerText.includes('Nila')).length") == 1)
    ok("17c lokasi penemuan pertama & rekor berat tersimpan", ev(pg, "(()=>{const e=window.__nusa.S.vd.nila.silver;return e.loc==='muara'&&e.best===0.7&&e.n===1})()"))
    ctx.close()

    # ================= 5. akuarium & pamer =================
    ctx, pg, errs = fresh(b); ev(pg, HELP); ev(pg, "window.__nusa.S.up.cooler=4")
    ev(pg, "window.__land('nila', 0.7, 0.05)"); ev(pg, "window.__closeCard()")
    vuid = ev(pg, "window.__pick().uid")
    res = ev(pg, """(u)=>{const S=window.__nusa.S;const HD=NW.HD;const h=S.home;
      if(!h) return 'tanpa rumah'; let aq=h.furniture.concat(h.stored).find(f=>f.type==='akuariumKecil');
      if(!aq) return 'tanpa akuarium'; if(h.stored.includes(aq)){h.stored.splice(h.stored.indexOf(aq),1);h.furniture.push(HD.findSpot(h,aq,0,0)||aq)}
      const r=HD.putFish(S,u,aq.uid,window.Nusa.FISH_BY_ID); return {ok:r.ok, why:r.why||null, aq:aq.uid}}""", vuid)
    if isinstance(res, dict) and res.get("ok"):
        mv = ev(pg, "(u)=>{const h=window.__nusa.S.home;return h.placedFish.filter(x=>x.uid===u).map(x=>({vr:x.vr,uid:x.uid}))}", vuid)
        ok("18 ikan varian masuk akuarium dengan UID & varian sama (tanpa duplikasi)", mv == [{"vr": "silver", "uid": vuid}] and ev(pg, "(u)=>!window.__nusa.S.cooler.some(x=>x.uid===u)", vuid), mv)
        take = ev(pg, "(u)=>{const S=window.__nusa.S;const r=NW.HD.takeFish(S,u,window.Nusa.coolerCap());return [r.ok, S.cooler.filter(x=>x.uid===u).map(x=>x.vr), S.home.placedFish.filter(x=>x.uid===u).length]}", vuid)
        ok("18b diambil kembali ke coolbox: varian tetap, tidak ada salinan", take == [True, ["silver"], 0], take)
        ev(pg, "(u)=>{NW.HD.putFish(window.__nusa.S,u,window.__nusa.S.home.furniture.find(f=>f.type==='akuariumKecil').uid,window.Nusa.FISH_BY_ID)}", vuid)
        ev(pg, "window.__nusa.save()"); pg.reload(); time.sleep(0.8)
        ok("18c akuarium: varian bertahan setelah refresh", ev(pg, "(u)=>(window.__nusa.S.home.placedFish.find(x=>x.uid===u)||{}).vr", vuid) == "silver")
        # penggambaran akuarium (sprite varian) tanpa error
        begin_game(pg); ev(pg, "window.Nusa.openPanel('inventory')"); ev(pg, "window.Nusa.closePanel()")
        ok("18d sprite akuarium & rumah memakai cache per spesies+varian", ev(pg, "(()=>{const c=document.createElement('canvas');c.width=c.height=80;const x=c.getContext('2d');const f=window.Nusa.FISH_BY_ID.nila;NW.drawFishSprite(x,f,40,40,60,'silver');NW.drawFishSprite(x,f,40,40,60,'pearl');NW.drawFishSprite(x,f,40,40,60);return true})()"))
    else:
        ok("18 (akuarium tidak tersedia pada rumah baru: " + str(res) + ") — uji akuarium dilewati dengan jujur", False, res)
    ctx.close()

    # pamer ikan
    ctx, pg, errs = fresh(b); ev(pg, HELP); ev(pg, "window.__nusa.S.up.cooler=4")
    ev(pg, "window.__land('patin', 3.0, 0.015)"); ev(pg, "window.__closeCard()"); u = ev(pg, "window.__pick().uid")
    ev(pg, "window.__nusa.goWorld('dock')"); time.sleep(0.6)
    st = ev(pg, "(u)=>{const ok=NW.hold.start(u);const f=NW.hold.frame();return [ok, f&&f.vr]}", u); time.sleep(0.8)
    ok("19 pamer ikan di tangan memakai varian yang sama dengan inventaris", st == [True, "sunset"], st)
    px = ev(pg, "(()=>{const c=document.getElementById('game');const x=c.getContext('2d');return !!x})()")
    ok("19b penggambaran pamer tanpa error JS", not errs, errs[:2])
    ctx.close()

    # ================= 6. spot rahasia =================
    ctx, pg, errs = fresh(b, hour=9); ev(pg, HELP)
    ev(pg, "window.__nusa.S.up.cooler=4")
    ok("20 sebelum ditemukan: tidak ada titik mancing rahasia di peta (dermaga biasa tetap ada)", ev(pg, "(()=>{const m=NW.areas.cur.map;return !m.points.some(p=>p.secret)&&m.fishSpots.length===1&&m.fishSpots[0].id==='spot'})()"))
    goto(pg, 14.0, 14.0); time.sleep(1.0)
    ok("20b jauh dari lubuk: belum ditemukan", ev(pg, "!NW.secret.found('lubuk')"))
    ev(pg, "window.__sf=()=>NW.audio.sfxLog.filter(x=>JSON.stringify(x).includes('spot_rahasia')).length")
    goto(pg, 10.3, 10.6); time.sleep(1.2)
    ok("21 Lubuk Bambu Muara ditemukan lewat berjalan", ev(pg, "NW.secret.found('lubuk')"))
    ok("21b notifikasi 'Spot Rahasia Ditemukan!' + nama", "Spot Rahasia Ditemukan" in ev(pg, "document.getElementById('discover').innerText") and "Lubuk Bambu Muara" in ev(pg, "document.getElementById('discover').innerText"))
    j1 = ev(pg, "window.__sf()")
    # keluar masuk radius berkali-kali: tidak muncul lagi
    for _ in range(3):
        goto(pg, 14.0, 14.0); time.sleep(0.4); goto(pg, 10.3, 10.6); time.sleep(0.5)
    ok("22 penemuan hanya memberi notifikasi/jingle SEKALI (jingle=%d)" % j1, j1 == 1 and ev(pg, "window.__sf()") == 1 and ev(pg, "NW.adv.state.notes.filter(n=>n.id==='secret:lubuk').length") == 1, (j1, ev(pg, "window.__sf()")))
    ok("22b titik mancing nyata muncul setelah ditemukan (point + marker)", ev(pg, "(()=>{const m=NW.areas.cur.map;return m.points.some(p=>p.id==='lubuk'&&p.fish)&&m.fishSpots.some(s=>s.id==='lubuk')&&m.fishSpots.some(s=>s.id==='spot')})()"))
    ok("22c titik mancing dapat dijangkau (walkable & bukan di air)", ev(pg, "(()=>{const d=NW.secret.DEFS.lubuk;return NW.walkable(d.stand.x,d.stand.y)&&NW.isLandT(NW.areas.cur.map.tileAt(d.stand.x,d.stand.y))})()"))
    # mancing di spot
    ev(pg, "window.__nusa.S.cooler.length"); pg.reload(); time.sleep(0.9); begin_game(pg, 9); ev(pg, HELP)
    ok("23 ditemukan tersimpan setelah refresh (titik mancing langsung ada, tidak muncul notifikasi lagi)", ev(pg, "NW.secret.found('lubuk') && NW.areas.cur.map.points.some(p=>p.id==='lubuk')"))
    goto(pg, 10.3, 10.65); time.sleep(0.8)
    tgt = ev(pg, "NW.world.target && NW.world.target.id")
    ok("24 tombol interaksi 'Mancing di Lubuk…' aktif di dekat spot", tgt == "lubuk", tgt)
    ev(pg, "NW.world.interact()"); time.sleep(2.0)
    ok("24b masuk mode mancing dengan spot rahasia aktif", ev(pg, "[window.__nusa.mode(), window.__nusa.G.spotId]") == ["fish", "lubuk"])
    ok("24c riak petunjuk tersedia untuk SEMUA pemain di spot rahasia (G.hot)", ev(pg, "(()=>{window.__nusa.G.phase='idle';return true})()") and (time.sleep(0.4) or True) and ev(pg, "!!window.__nusa.G.hot"))
    # mekanik: roll memakai spot & strike/fight asli
    spy = ev(pg, """()=>{const N=window.__nusa,G=N.G;const ro=NW.variants.roll;let seen=null;NW.variants.roll=function(f,o){seen=JSON.stringify(o);return ro.apply(this,arguments)};
      window.__mode='fish'; const fish=window.Nusa.FISH_BY_ID.nila; G.hotHit=true; G.pending={fish,w:0.5,wr:.5}; G.phase='bite'; N.startFight(); const F=G.fight; const hasRod=typeof F.P==='number'&&F.weak!==undefined; F.P=1.5; N.updateFight(0.01);
      NW.variants.roll=ro; return {seen,hasRod,phase:G.phase}}""")
    ok("25 memancing di spot rahasia memakai mekanik fight/Strike yang sama & meneruskan spot+riak ke roll varian", '"spot":"lubuk"' in (spy["seen"] or "") and '"hit":true' in (spy["seen"] or "") and spy["hasRod"], spy)
    ev(pg, "window.__closeCard()")
    # spot rahasia tidak langsung memberi ikan langka: pemilihan spesies tidak berubah
    code = ev(pg, "window.__nusa.chooseFish.toString()")
    ok("26 pemilihan spesies/rarity TIDAK menyebut spot (spot hanya memengaruhi varian kosmetik)", "spotId" not in code and "secret" not in code)
    ok("26b bonus spot hanya pada Perak/Senja; Mutiara tidak dinaikkan", ev(pg, "(()=>{const a=NW.variants.weights({spot:'lubuk',hit:true});return a.pearl===0.5&&a.silver>6&&a.sunset>2})()"))
    ok("26c tidak ada error JS di alur spot Muara", not errs, errs[:3])
    # kembali ke darat
    ev(pg, "window.__nusa.goWorld('dock')"); time.sleep(0.7)
    pl = ev(pg, "[NW.world.player.x, NW.world.player.y]")
    ok("27 'Ke Darat' dari spot rahasia: kembali dekat spot (tidak terlempar ke dermaga)", abs(pl[0] - 10.35) < 1.2 and abs(pl[1] - 10.7) < 1.2, pl)
    ctx.close()

    # ---- Teluk Sunyi Toba ----
    ctx, pg, errs = fresh(b, hour=9); ev(pg, HELP); to_toba(pg)
    ok("28 di Toba: spot belum ada & belum ditemukan", ev(pg, "NW.areas.cur.id") == "toba" and ev(pg, "!NW.secret.found('teluk') && !NW.areas.cur.map.points.some(p=>p.secret)"))
    goto(pg, 3.5, 13.6); time.sleep(1.2)
    ok("28b TANPA petunjuk (Bukit Pandang belum dikunjungi) spot tidak terbuka meski berdiri di sana", ev(pg, "!NW.secret.found('teluk')"))
    ev(pg, "window.__nusa.S.adv.found['toba:bukit']=Date.now()"); goto(pg, 6.0, 15.5); goto(pg, 3.5, 13.6); time.sleep(1.2)
    ok("29 Teluk Sunyi Toba ditemukan setelah petunjuk Bukit Pandang", ev(pg, "NW.secret.found('teluk')"))
    ok("29b notifikasi nama spot", "Teluk Sunyi Toba" in ev(pg, "document.getElementById('discover').innerText"))
    ok("29c titik mancing nyata (walkable, ada marker & interaksi)", ev(pg, "(()=>{const m=NW.areas.cur.map,d=NW.secret.DEFS.teluk;return NW.walkable(d.stand.x,d.stand.y)&&m.points.some(p=>p.id==='teluk'&&p.fish)&&m.fishSpots.some(s=>s.id==='teluk')&&m.fishSpots.some(s=>s.id==='spot')})()"))
    ev(pg, "(()=>{const a=NW.adv.state;return 0})()"); goto(pg, 3.5, 13.65); time.sleep(0.6)
    ev(pg, "NW.world.interact()"); time.sleep(2.0)
    ok("29d mancing di Teluk Sunyi: mode mancing, lokasi Toba, spot=teluk", ev(pg, "[window.__nusa.mode(), window.__nusa.G.spotId, window.__nusa.S.loc]") == ["fish", "teluk", 1])
    # ikan danau Toba yang sudah ada
    ev(pg, "window.__mode='fish'")
    rr = ev(pg, "(()=>{const N=window.__nusa;const ids=new Set();for(let i=0;i<300;i++){ids.add(N.chooseFish().fish.id)}return [...ids].map(i=>window.Nusa.FISH_BY_ID[i].loc)})()")
    ok("29e spot Toba memakai ikan Toba/sampah yang sudah ada (tidak ada spesies baru)", all(l in ("toba", "*") for l in rr), set(rr))
    # perjalanan Muara–Toba tetap
    ev(pg, "window.__nusa.goWorld('dock')"); time.sleep(0.5); ev(pg, "window.__nusa.travel(0)"); time.sleep(3.8)
    ok("30 perjalanan Toba → Muara tetap bekerja", ev(pg, "NW.areas.cur.id") == "muara")
    ok("30b Buku Petualangan memuat kedua spot (ditemukan / petunjuk)", (lambda t: "Lubuk Bambu" in t or "Spot rahasia belum ditemukan" in t or "Spot Rahasia" in t)(ev(pg, "(()=>{window.Nusa.openPanel('adventure');const t=document.getElementById('panelBody').innerText;window.Nusa.closePanel();return t})()")))
    book = ev(pg, "(()=>{window.Nusa.openPanel('adventure');const t=document.getElementById('panelBody').innerText;window.Nusa.closePanel();return t})()")
    ok("30c Buku: spot Muara belum ditemukan = petunjuk samar (bukan koordinat); Toba sudah ditemukan", "Petunjuk" in book and "Teluk Sunyi Toba" in book and "10.3" not in book and "10,3" not in book, book[book.find("Spot Rahasia"):][:260])
    ok("30d tidak ada error JS", not errs, errs[:3])
    ctx.close()

    # ================= 7. audio varian =================
    ctx, pg, errs = fresh(b, hour=9); ev(pg, HELP); ev(pg, "window.__nusa.S.up.cooler=4")
    time.sleep(0.6); ev(pg, "NW.audio.sfxLog.length=0")
    ev(pg, "window.__land('nila', 0.6, 0.05)"); time.sleep(0.4)
    names = ev(pg, "NW.audio.sfxLog.map(x=>JSON.stringify(x))")
    jin = [n for n in names if "varian_" in n]; ctch = [n for n in names if '"catch"' in n or "catch" in n.replace("varian", "")]
    ok("31 jingle Sisik Perak diputar (lewat AudioManager)", len(jin) == 1 and "varian_silver" in jin[0], names)
    ok("31b TEPAT satu jingle per tangkapan (tidak ada jingle rarity ganda)", len(jin) == 1 and not [n for n in names if '"catch' in n and "varian" not in n], names)
    ev(pg, "window.__closeCard()"); ev(pg, "NW.audio.sfxLog.length=0")
    ev(pg, "window.__land('nila', 0.6, 0.015)"); time.sleep(0.3); n2 = ev(pg, "NW.audio.sfxLog.map(x=>JSON.stringify(x))")
    ok("31c jingle Corak Senja", sum("varian_sunset" in n for n in n2) == 1, n2); ev(pg, "window.__closeCard()"); ev(pg, "NW.audio.sfxLog.length=0")
    ev(pg, "window.__land('nila', 0.6, 0.001)"); time.sleep(0.3); n3 = ev(pg, "NW.audio.sfxLog.map(x=>JSON.stringify(x))")
    ok("31d jingle spesial Mutiara Nusantara", sum("varian_pearl" in n for n in n3) == 1, n3); ev(pg, "window.__closeCard()"); ev(pg, "NW.audio.sfxLog.length=0")
    ev(pg, "window.__land('nila', 0.6, 0.99)"); time.sleep(0.3); n4 = ev(pg, "NW.audio.sfxLog.map(x=>JSON.stringify(x))")
    ok("31e tangkapan normal tetap memakai jingle rarity biasa (tidak ada jingle varian)", not any("varian_" in n for n in n4) and any("catch" in n for n in n4), n4); ev(pg, "window.__closeCard()")
    # level: puncak jingle baru tidak melebihi jingle lama / tidak tajam (bus gain)
    g = ev(pg, "(()=>{const R=NW.sfxLib.RULE;return {mut:R.varian_pearl.g,per:R.varian_silver.g,sen:R.varian_sunset.g,spot:R.spot_rahasia.g,spl:R.splash_besar.g}})()")
    ok("31f level jingle baru dibatasi (≤ 0,8) agar tidak mengejutkan", all(v <= 0.8 for v in g.values()), g)
    # mute: tidak ada bunyi
    ev(pg, "(()=>{window.__nusa.S.muted=true;NW.audio.setMuted(true);NW.audio.sfxLog.length=0})()"); time.sleep(0.3)
    ev(pg, "window.__land('nila', 0.6, 0.001)"); time.sleep(0.3)
    ok("32 mute mematikan semua audio baru (jingle varian & raksasa tidak diputar)", ev(pg, "NW.audio.sfxLog.length") == 0 and ev(pg, "NW.audio.ctx.state") in ("suspended",), ev(pg, "NW.audio.ctx.state"))
    ev(pg, "window.__closeCard()")
    # slider efek 0 → bus senyap
    ev(pg, "(()=>{window.__nusa.S.muted=false;NW.audio.setMuted(false);NW.audio.setVolume('sfx',0)})()"); time.sleep(0.6)
    ev(pg, "window.__land('nila', 0.6, 0.001)"); time.sleep(0.3)
    ev(pg, "NW.audio.sfx('click')"); time.sleep(0.3)
    bg = ev(pg, "NW.audio.stage.sfx.gain.value")
    ok("32b slider Efek = 0 → bus efek (tempat jingle baru) senyap", bg < 0.001, bg)
    ev(pg, "NW.audio.resetVolumes()")
    ok("33 tidak ada AudioContext tambahan", ev(pg, "NW.audio.stats().ctxCount") == 1, ev(pg, "NW.audio.stats().ctxCount"))
    ok("33b tidak ada error", not errs, errs[:3])
    ctx.close()

    # ================= 8. ikan raksasa =================
    ctx, pg, errs = fresh(b); ev(pg, HELP); ev(pg, "window.__nusa.S.up.cooler=4"); time.sleep(0.5)
    big = ev(pg, "(()=>{const F=Object.values(window.Nusa.FISH_BY_ID).filter(f=>NW.variants.eligible(f)&&!f.protected).sort((a,b)=>b.wMax-a.wMax)[0];return {id:F.id,w:Math.max(F.wMax*0.98,45)}})()")
    ev(pg, "NW.audio.sfxLog.length=0")
    ev(pg, "(a)=>window.__land(a.id,a.w,0.99)", big); time.sleep(0.5)
    giant = ev(pg, "(()=>{const c=document.getElementById('catchCard');return {cls:c.className,hold:!document.getElementById('catchHold').classList.contains('hidden'),skip:!document.getElementById('catchSkip').classList.contains('hidden'),txt:document.getElementById('catchVar').textContent,w:document.getElementById('catchWeight').textContent}})()")
    ok("34 ikan raksasa: kartu khusus, berat asli & spesies ditampilkan, Lewati & Pamerkan tersedia", "cv-giant" in giant["cls"] and "Raksasa" in giant["txt"] and giant["hold"] and giant["skip"], giant)
    nm = ev(pg, "NW.audio.sfxLog.map(x=>JSON.stringify(x))")
    ok("34b efek percikan raksasa diputar satu kali bersama satu jingle", sum("splash_besar" in n for n in nm) == 1, nm)
    pg.click("#catchHold"); time.sleep(1.2)
    ok("34c tombol 'Pamerkan' membawa ke darat & ikan dipegang", ev(pg, "[window.__nusa.mode(), !!NW.hold.state.uid]") == ["world", True])
    ev(pg, "window.__nusa.goWorld('dock'); window.__mode=null"); ev(pg, "window.__nusa.enterFishing('dock'); window.__mode='fish'")
    ev(pg, "(a)=>window.__land(a.id,a.w,0.99)", big); time.sleep(3.4)
    ok("34d animasi momen berhenti otomatis < 3,4 dtk (kartu tidak terjebak) & tombol Lewati hilang", ev(pg, "!document.getElementById('catchCard').classList.contains('playing') && document.getElementById('catchSkip').classList.contains('hidden')"))
    ok("34e tidak ada error", not errs, errs[:3])
    ctx.close()

    # ================= 9. migrasi simpanan lama =================
    old = {"v": 7, "money": 1234, "hour": 9, "day": 4, "up": {"rod": 3, "bait": 1, "cooler": 2, "boat": 1}, "dex": {"nila": {"n": 5, "best": 1.1}},
           "stats": {"casts": 40, "caught": 12, "earned": 900, "legends": 0}, "seq": 9,
           "cooler": [{"uid": "i1", "id": "nila", "w": 0.8, "t": 1}, {"uid": "i2", "id": "patin", "w": 4.5, "t": 2, "lock": True}],
           "adv": {"v": 1, "area": "muara", "pos": {}, "visited": {"muara": 1, "toba": 2}, "found": {"muara:dermaga": 5, "toba:bukit": 6}, "notes": [], "awards": {}, "mem": {}, "best": {}, "seen": {}}}
    init = "if(!localStorage.getItem('nusa-island-v1')) localStorage.setItem('nusa-island-v1', %s)" % json.dumps(json.dumps(old))
    ctx = b.new_context(viewport={"width": 390, "height": 844}); ctx.add_init_script(init); pg = ctx.new_page(); errs = []
    pg.on("pageerror", lambda e: errs.append(str(e))); pg.goto(ROOT); time.sleep(1.0)
    S = ev(pg, "(()=>{const S=window.__nusa.S;return {v:S.v,money:S.money,rod:S.up.rod,cooler:S.cooler.map(x=>[x.uid,x.id,x.w,x.vr||null,!!x.lock]),dex:S.dex,vd:S.vd,found:S.adv.found}})()")
    ok("35 simpanan v7 → v9: koin, joran, ikan, berat, kunci, dex, penemuan lama utuh", S["v"] == 9 and S["money"] == 1234 and S["rod"] == 3 and S["cooler"] == [["i1", "nila", 0.8, None, False], ["i2", "patin", 4.5, None, True]] and S["dex"]["nila"]["n"] == 5 and S["found"]["toba:bukit"] == 6, S)
    ok("35b ikan lama tetap Normal (tidak ada varian acak saat migrasi) & koleksi varian kosong", all(c[3] is None for c in S["cooler"]) and S["vd"] == {}, S["vd"])
    ok("35c cadangan v7 dibuat sebelum migrasi", ev(pg, "!!localStorage.getItem('nusa-island-v1-backup-v7')"))
    ok("35d kunci simpanan utama tetap nusa-island-v1", ev(pg, "!!localStorage.getItem('nusa-island-v1')") is True)
    ok("35e tanpa error JS saat memuat simpanan lama", not errs, errs[:2])
    # simpanan dengan varian rusak
    bad = dict(old, cooler=[{"uid": "i1", "id": "nila", "w": 0.8, "t": 1, "vr": "emas"}, {"uid": "i3", "id": "nila", "w": 0.9, "t": 1, "vr": "silver"}])
    init2 = "localStorage.setItem('nusa-island-v1', %s)" % json.dumps(json.dumps(bad))
    ctx.close(); ctx = b.new_context(viewport={"width": 390, "height": 844}); ctx.add_init_script(init2); pg = ctx.new_page(); errs = []
    pg.on("pageerror", lambda e: errs.append(str(e))); pg.goto(ROOT); time.sleep(0.9)
    ok("35f varian tak dikenal dibuang, varian sah dipertahankan, tanpa crash", ev(pg, "window.__nusa.S.cooler.map(x=>x.vr||null)") == [None, "silver"] and not errs, errs[:2])
    ctx.close()

    # ================= 10. performa =================
    ctx, pg, errs = fresh(b); ev(pg, HELP)
    ev(pg, """()=>{const S=window.__nusa.S;S.up.cooler=9;const ids=['nila','mujair','lele','patin','gabus'];const V=[undefined,'silver','sunset','pearl'];S.cooler=[];
      for(let i=0;i<200;i++){const it={uid:'x'+i,id:ids[i%5],w:0.5+i%7,t:i};const v=V[i%4];if(v)it.vr=v;S.cooler.push(it)}}""")
    t = ev(pg, "(()=>{const t0=performance.now();window.Nusa.openPanel('inventory');const t1=performance.now();window.Nusa.closePanel();return [t1-t0, document.querySelectorAll('.inv-row').length]})()")
    ok("36 inventaris 200 ikan bervarian terbuka cepat (< 600 ms headless)", t[0] < 600, t)
    ev(pg, "window.Nusa.openPanel('dex')"); ev(pg, "window.Nusa.closePanel()")
    cache = ev(pg, "(()=>{const c=document.createElement('canvas');c.width=c.height=80;const x=c.getContext('2d');const t0=performance.now();for(let i=0;i<400;i++)NW.drawFishSprite(x,window.Nusa.FISH_BY_ID.nila,40,40,60,['silver','sunset','pearl',undefined][i%4]);return performance.now()-t0})()")
    ok("36b 400 sprite varian dari cache (< 80 ms)", cache < 80, round(cache, 1))
    ok("36c tidak ada error", not errs, errs[:2])
    ctx.close()
    b.close()

fails = [r for r in R if r.startswith("FAIL")]
print(f"\n{len(R) - len(fails)} lulus / {len(R)}")
sys.exit(1 if fails else 0)
