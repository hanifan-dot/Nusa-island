"""Uji NusaPhone (Ide 07) · TAHAP 4 — Klippy, NusaChat, Dompet Nusa. SERVER = Worker backend ASLI + Firestore TIRUAN + server realtime uji (room-core ASLI). BUKAN bukti produksi.
PS_ONLY=klippy|chat|dompet    Butuh NUSA_BACKEND. Gambar: docs/ide07/"""
import os, sys, time, json, subprocess
H = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, H)
import phone_harness as X
import test_phone_ui as U
import test_phone_games as G
from playwright.sync_api import sync_playwright
ev, wait_for, ok = X.ev, X.wait_for, X.ok
def seed_posts(br, n, withdrawn=()):
    ps = []
    for i in range(n):
        pid = "kp-test%03d" % i
        ps.append({"id": pid, "k": "owner" if i % 5 == 0 else "npc", "who": ["Pak Darto", "Bu Indah", "Owner Nusa", "Mbok Sari"][i % 4], "av": ["👨‍🎣", "👩‍🍳", "🏝️", "👵"][i % 4], "cap": "Kabar pulau nomor %d: laut tenang, ikan banyak!" % (n - i), "at": int(time.time() * 1000) - i * 90000, "st": "withdrawn" if pid in withdrawn else "live"})
    br.post("/__klippy", {"posts": ps}); return ps
def cards(pg): return ev(pg, "document.querySelectorAll('.kp-feed .kp-card').length")
def fetch_log(pg, store):
    pg.on("request", lambda r: store.append(json.loads(r.post_data or "{}").get("data", {})) if "/fn/klippyFeed" in r.url and r.method == "POST" else None)
def sec_klippy(b, br):
    br.flag(phone=True, ocean=True, klippy=False); seed_posts(br, 15)
    ctx, A, errs = X.new_page(b, br, "demo-a", "Budi", vp=(412, 915)); U.phone_ready(A); uid = X.uid(A)
    reqs = []; A.on("request", lambda r: reqs.append(r.url) if "/fn/klippy" in r.url else None)
    G.open_app(A, "klippy"); time.sleep(1.5)
    ok("K0 saklar klippy MATI di server: Klippy menampilkan 'tidak tersedia' (bukan konten), tanpa galat skrip", "tidak tersedia" in ev(A, "document.getElementById('nphAppB').textContent") and cards(A) == 0 and not [e for e in errs if "PAGEERR" in e], reqs)
    ctx.close(); br.flag(phone=True, ocean=True, klippy=True)
    br.post("/__eco", {"uid": "x", "set": {}}) if False else None
    ctx, A, errs = X.new_page(b, br, "demo-a", "Budi", vp=(412, 915)); U.phone_ready(A); uid = X.uid(A); br.post("/__eco", {"uid": uid, "set": {"bal": 3000, "box": []}}); e0 = json.dumps(br.read("shop_economy/" + uid), sort_keys=True)
    posts = []; fetch_log(A, posts); G.open_app(A, "klippy"); wait_for(A, "document.querySelectorAll('.kp-card').length>=1", 12); time.sleep(0.5)
    ok("K1 halaman pertama: 6 kartu (avatar, nama, keterangan, lencana Owner/NPC)", cards(A) == 6 and ev(A, "!!document.querySelector('.kp-card .kp-av')&&!!document.querySelector('.kp-bd')"), cards(A))
    txt = ev(A, "document.getElementById('nphAppB').textContent")
    ok("K1b layar tanpa UID/email/token (hanya nama panggilan & avatar)", uid not in txt and "@" not in txt and "token" not in txt.lower(), txt[:60])
    U.shot(A, "kp-412x915-feed")
    ev(A, "(()=>{const b=document.getElementById('nphAppB');b.scrollTop=b.scrollHeight})()"); wait_for(A, "document.querySelectorAll('.kp-card').length>=12", 10)
    ok("K2 pemuatan malas: gulir ke bawah memuat halaman berikut (12 kartu)", cards(A) == 12, cards(A))
    ev(A, "(()=>{const b=document.getElementById('nphAppB');b.scrollTop=b.scrollHeight})()"); wait_for(A, "document.querySelectorAll('.kp-card').length>=15", 10); time.sleep(0.5)
    ok("K2b halaman terakhir: 15 kartu, tanpa duplikat, pesan 'sudah sampai kiriman terlama'", cards(A) == 15 and len(set(ev(A, "[...document.querySelectorAll('.kp-card')].map(c=>c.dataset.p)"))) == 15 and "terlama" in ev(A, "document.getElementById('nphAppB').textContent"))
    ok("K2c batas permintaan: tiap permintaan ≤ 6 kartu, kursor berurutan (3 permintaan, tanpa permintaan ganda)", [p.get("cursor") for p in posts] == [0, 6, 12] and all(p.get("limit", 6) <= 6 for p in posts), posts)
    # suka
    first = ev(A, "document.querySelector('.kp-card').dataset.p")
    A.click("[data-like='%s']" % first); wait_for(A, "document.querySelector('[data-like=\"%s\"]').getAttribute('aria-pressed')==='true'" % first, 8)
    ok("K3 suka: hitungan 1, tombol menyala; tersimpan di server", ev(A, "document.querySelector('[data-like=\"%s\"] span').textContent" % first) == "1" and br.read("shop_klippy/s-" + first)["lk"] == 1)
    A.click("[data-like='%s']" % first); wait_for(A, "document.querySelector('[data-like=\"%s\"]').getAttribute('aria-pressed')==='false'" % first, 8)
    ok("K3b batal suka → 0 (tidak negatif)", ev(A, "document.querySelector('[data-like=\"%s\"] span').textContent" % first) == "0")
    A.click("[data-like='%s']" % first); time.sleep(1.0)
    # komentar
    A.click("[data-cm='%s']" % first); wait_for(A, "!document.querySelector('.kp-det').classList.contains('hidden')", 8); time.sleep(0.6)
    A.fill(".kp-f input", "Mantap pulaunya! anjing <img src=x onerror=window.__k=1>"); A.evaluate("window.__k=0"); A.press(".kp-f input", "Enter"); wait_for(A, "document.querySelectorAll('.kp-c').length>=1", 10); time.sleep(0.4)
    c = ev(A, "document.querySelector('.kp-c').textContent")
    ok("K4 komentar tampil; kata kasar disamarkan; HTML tidak dieksekusi", "Mantap" in c and "anjing" not in c and ev(A, "window.__k") == 0 and ev(A, "document.querySelectorAll('.kp-c img').length") == 0, c)
    U.shot(A, "kp-412x915-komentar")
    A.fill(".kp-f input", "komentar kedua cepat"); A.press(".kp-f input", "Enter"); time.sleep(1.0)
    ok("K4b komentar beruntun cepat ditolak server dengan pesan ramah", "terlalu cepat" in ev(A, "document.querySelector('.kp-det').textContent").lower(), ev(A, "document.querySelector('.kp-det').textContent")[-120:])
    A.click("#nphBack"); time.sleep(0.5)
    ok("K4c tombol Kembali ponsel menutup komentar → kembali ke feed (hitungan komentar 1)", ev(A, "!document.querySelector('.kp-feed').classList.contains('hidden')") and ev(A, "document.querySelector('[data-cm=\"%s\"] span').textContent" % first) == "1")
    ok("K5 suka/komentar tidak mengubah ekonomi (koin, ikan, kuota)", json.dumps(br.read("shop_economy/" + uid), sort_keys=True) == e0)
    # ditarik oleh Owner setelah dimuat
    ps = seed_posts(br, 15, withdrawn=(first,)); time.sleep(0.2)
    A.click("[data-like='%s']" % first); time.sleep(1.2)
    ok("K6 kiriman ditarik Owner: aksi suka → kartu hilang + pesan 'sudah ditarik'", ev(A, "!document.querySelector('.kp-feed [data-p=\"%s\"]')" % first) and "sudah ditarik" in ev(A, "document.querySelector('.kp-feed').textContent"), ev(A, "document.querySelector('.kp-feed').textContent")[-160:])
    ctx.close()
    # kegagalan server & pulih
    br.flag(phone=True, ocean=True, klippy=True); seed_posts(br, 15)
    ctx, A, errs = X.new_page(b, br, "demo-a", "Budi", vp=(412, 915)); U.phone_ready(A); st = {"fail": True}
    def hook(route):
        if st["fail"]: route.abort()
        else: route.continue_()
    A.route("**/fn/klippyFeed", hook); G.open_app(A, "klippy"); wait_for(A, "/gagal dimuat|Koneksi terputus/.test(document.getElementById('nphAppB').textContent)", 15)
    ok("K7 server gagal: pesan galat/koneksi terputus ditampilkan (tidak crash, tanpa konten palsu)", ev(A, "/gagal dimuat|Koneksi terputus/.test(document.getElementById('nphAppB').textContent)") and cards(A) == 0 and not [e for e in errs if "PAGEERR" in e])
    st["fail"] = False; ok("K7b pulih setelah server kembali (tautan ponsel pulih sendiri): kartu tampil", wait_for(A, "document.querySelectorAll('.kp-card').length>=1", 45, 0.5), cards(A))
    br.flag(phone=True, ocean=True, klippy=False); ev(A, "(()=>{const b=document.getElementById('nphAppB');b.scrollTop=b.scrollHeight})()"); ev(A, "()=>{const m=document.querySelector('[data-more]');if(m)m.click()}"); time.sleep(1.5)
    ok("K8 Owner mematikan Klippy (kill switch) saat dibuka: pemuatan berikutnya → 'tidak tersedia'", wait_for(A, "/tidak tersedia/.test(document.getElementById('nphAppB').textContent)", 10)); ctx.close()
def sec_chat(b, br):
    ctxA, A, eA = X.new_page(b, br, "demo-a", "Budi", vp=(412, 915)); ctxB, B, eB = X.new_page(b, br, "demo-b", "Sari", vp=(412, 915))
    for pg in (A, B): wait_for(pg, "NW.mp.view().online", 25)
    for pg in (A, B): U.phone_ready(pg)
    wait_for(A, "NW.mp.view().players.length>=1", 15); time.sleep(1.5)
    G.open_app(A, "nusachat"); wait_for(A, "!!document.querySelector('.nc-top')", 10)
    ok("C1 NusaChat menampilkan percakapan aktif (Area Muara) & status tersambung", "Muara" in ev(A, "document.querySelector('.nc-top').textContent") and "Tersambung" in ev(A, "document.querySelector('.nc-top').textContent"), ev(A, "document.querySelector('.nc-top').textContent"))
    ev(B, "()=>NW.mp.sendChat('Halo dari Sari, anjing! http://jahat.com')"); wait_for(A, "document.querySelectorAll('.nc-m').length>=1", 10); time.sleep(0.5)
    m = ev(A, "document.querySelector('.nc-m').textContent")
    ok("C2 pesan pemain lain tampil dengan nama panggilan; teks sudah dibersihkan server (kata kasar & tautan disamarkan)", "Sari" in m and "Halo" in m and "anjing" not in m and "jahat" not in m, m)
    A.fill(".nc-f input", "Halo balik dari Budi"); A.press(".nc-f input", "Enter"); wait_for(A, "document.querySelectorAll('.nc-m.me').length>=1", 10)
    ok("C3 pesan sendiri tampil ('Kamu') lewat chat multiplayer yang sama (diterima pemain lain)", wait_for(B, "NW.mp.view().log.some(l=>/Halo balik dari Budi/.test(l.text))", 10))
    A.fill(".nc-f input", "pesan cepat 1"); A.press(".nc-f input", "Enter"); time.sleep(0.2); A.fill(".nc-f input", "pesan cepat 2"); A.press(".nc-f input", "Enter"); time.sleep(0.4)
    ok("C4 batas laju: pesan beruntun cepat ditahan dengan pesan ramah", "Pelan-pelan" in ev(A, "document.querySelector('.nc-note').textContent"), ev(A, "document.querySelector('.nc-note').textContent"))
    U.shot(A, "nc-412x915-obrolan")
    ok("C5 tidak ada UID/email/token di layar NusaChat", "@" not in ev(A, "document.getElementById('nphAppB').textContent") and X.uid(A) not in ev(A, "document.getElementById('nphAppB').textContent"))
    # blokir
    A.click(".nc-m:not(.me) .nc-x"); time.sleep(0.3); ok("C6 tombol blokir meminta konfirmasi (Yakin?)", "Yakin" in ev(A, "document.querySelector('.nc-m:not(.me) .nc-x').textContent")); A.click(".nc-m:not(.me) .nc-x"); time.sleep(0.5)
    ok("C6b setelah diblokir pesan Sari hilang dari NusaChat; pesan sendiri tetap", ev(A, "[...document.querySelectorAll('.nc-m')].every(m=>!/Sari/.test(m.textContent))") and ev(A, "document.querySelectorAll('.nc-m.me').length") >= 1)
    ev(B, "()=>NW.mp.sendChat('pesan baru dari Sari setelah blokir')"); time.sleep(2.0); ok("C6c pesan baru dari pemain terblokir juga tidak tampil", "setelah blokir" not in ev(A, "document.querySelector('.nc-log').textContent"))
    A.click("[data-man]"); time.sleep(0.3); ok("C6d daftar blokir menampilkan nama; Buka blokir mengembalikan", "Sari" in ev(A, "document.querySelector('.nc-misc').textContent")); A.click("[data-unb]"); time.sleep(0.3); A.click("[data-back]"); time.sleep(0.4)
    ok("C6e blokir tersimpan di perangkat dan bisa dibuka lagi", ev(A, "JSON.parse(localStorage.getItem('nusa_chat_block_v1')||'[]').length") == 0)
    # kebocoran antar-ruang & dikeluarkan
    ev(A, "()=>{const R=NW.mp._R;R.log.push({name:'Rahasia',text:'pesan ruang lain',t:Date.now(),mine:false,sc:'h:orangtak',id:'zz'});R.log.push({name:'Rahasia2',text:'pesan area selat',t:Date.now(),mine:false,sc:'a:selat',id:'yy'})}"); time.sleep(1.0)
    ok("C7 pesan dari ruang LAIN (Rumahku orang lain / area lain) tidak tampil di percakapan aktif", "pesan ruang lain" not in ev(A, "document.querySelector('.nc-log').textContent") and "pesan area selat" not in ev(A, "document.querySelector('.nc-log').textContent"))
    ev(A, "()=>{const R=NW.mp._R;window.__sc=NW.mp.scope;NW.mp.scope=()=>'h:pidrumah';R.log.push({name:'Tuan',text:'obrolan rumah saya',t:Date.now(),mine:false,sc:'h:pidrumah',id:'tt'})}"); time.sleep(1.2)
    ok("C7b masuk Rumahku → hanya percakapan Rumahku itu yang tampil (label Rumahku)", "Rumahku" in ev(A, "document.querySelector('.nc-top').textContent") and "obrolan rumah saya" in ev(A, "document.querySelector('.nc-log').textContent") and "Halo balik" not in ev(A, "document.querySelector('.nc-log').textContent"))
    ev(A, "()=>{NW.mp.scope=window.__sc}")
    r = ev(A, "()=>{const R=NW.mp._R;R.house='pidrumah';R.log.push({name:'Tuan',text:'obrolan rumah saya 2',t:Date.now(),mine:false,sc:'h:pidrumah',id:'tt'});R.ws.onclose({code:4010});return {left:R.log.some(l=>l.sc==='h:pidrumah'),state:NW.mp.view().state}}")
    time.sleep(1.2)
    ok("C8 tamu Rumahku DIKELUARKAN (kode 4010 server): seluruh percakapan Rumahku itu langsung dihapus dari klien, status 'kicked'", r and r["left"] is False and r["state"] == "kicked", r)
    ev(A, "()=>{window.__v=NW.mp.view;window.__sc=NW.mp.scope;NW.mp.scope=()=>'h:pidrumah';NW.mp.view=()=>Object.assign({},window.__v(),{state:'kicked',online:false})}"); time.sleep(1.2)
    ok("C8b NusaChat saat status 'kicked' di Rumahku: kolom kirim dikunci & pesan 'dikeluarkan' tampil, tanpa riwayat rumah itu", ev(A, "document.querySelector('.nc-f input').disabled") and "dikeluarkan" in ev(A, "document.querySelector('.nc-log').textContent") and "obrolan rumah" not in ev(A, "document.querySelector('.nc-log').textContent"), ev(A, "document.querySelector('.nc-log').textContent")[:100])
    ev(A, "()=>{NW.mp.view=window.__v;NW.mp.scope=window.__sc}")
    ok("C9 pesan pribadi (DM) tidak ada; dicatat sebagai tahap berikutnya di layar", "belum tersedia" in ev(A, "document.querySelector('.nc-misc').textContent") and ev(A, "!document.querySelector('[data-dm]')"))
    ok("C10 tanpa galat skrip", not [e for e in eA if "PAGEERR" in e], eA[:2]); ctxA.close(); ctxB.close()
def sec_dompet(b, br):
    br.flag(phone=True, ocean=True)
    ctx, A, errs = X.new_page(b, br, "demo-a", "Budi", vp=(412, 915)); U.phone_ready(A); uid = X.uid(A)
    ent = br.read("shop_entitlements/" + uid) or {}; ent["wallet"] = {"SIMULASI": 0, "NYATA": 7500}
    br.post("/__eco", {"uid": uid, "set": {"bal": 4321}, "ent": ent}); e0 = [br.read("shop_economy/" + uid), br.read("shop_entitlements/" + uid)]
    G.open_app(A, "dompet"); wait_for(A, "/4\\.321/.test(document.querySelector('[data-r=play]').textContent)", 10)
    ok("D1 saldo koin bermain = angka server (4.321) dan koin top-up = 7.500", "4.321" in ev(A, "document.querySelector('[data-r=play]').textContent") and "7.500" in ev(A, "document.querySelector('[data-r=topup]').textContent"))
    ok("D2 status dari backend: 'Pembayaran belum tersedia' (jujur) dan tombol Isi Koin NONAKTIF", "Pembayaran belum tersedia" in ev(A, "document.querySelector('[data-r=status]').textContent") and ev(A, "document.querySelector('[data-a=topup]').disabled"))
    U.shot(A, "dw-412x915-dompet")
    A.evaluate("document.querySelector('[data-a=topup]').click()"); time.sleep(0.6)
    ok("D3 tombol nonaktif tidak membuka Payment Center & tidak ada keberhasilan palsu", not ev(A, "NW.shopUI.isOpen()") and "berhasil" not in ev(A, "document.getElementById('nphAppB').textContent").lower())
    ok("D4 membuka Dompet tidak mengubah ekonomi/entitlement (hanya baca)", [br.read("shop_economy/" + uid), br.read("shop_entitlements/" + uid)] == e0)
    ok("D5 Payment Center lama tetap terbuka normal dari game (tab top up) dan tidak berubah", ev(A, "(async()=>{await NW.shopUI.open('topup');return NW.shopUI.isOpen()})()") is True)
    ev(A, "()=>NW.shopUI.close()"); ctx.close()
def sec_regresi():
    base = os.environ.get("BASE_REF", "origin/integrasi/final-kota-ide08-20261114"); root = os.path.abspath(os.path.join(H, "..", ".."))
    r = subprocess.run(["git", "diff", "--name-only", base + "...HEAD", "--", "shop", "firebase/functions", "firebase/firestore.rules"], cwd=root, capture_output=True, text=True)
    ok("R1 REGRESI: berkas Payment Center/Premium Shop/QRIS (shop/, firebase/functions, aturan Firestore) TIDAK diubah oleh Ide 07", r.returncode == 0 and r.stdout.strip() == "", r.stdout[:200] + r.stderr[:100])
def main():
    br = U.PB()
    try:
        with sync_playwright() as p:
            b = p.chromium.launch(); only = os.environ.get("PS_ONLY", "")
            for name, fn in (("klippy", sec_klippy), ("chat", sec_chat), ("dompet", sec_dompet)):
                if not only or only == name: fn(b, br)
            if not only or only == "regresi": sec_regresi()
            b.close()
    finally: br.close()
    f = [r for r in X.R if r.startswith("FAIL")]
    print("\nRINGKAS: %d PASS / %d FAIL" % (len(X.R) - len(f), len(f)))
    sys.exit(1 if f else 0)
if __name__ == "__main__": main()
