"""Uji UI Update Komunitas & Joran Lv20 (Android 360x740): tab Samudra Follower = 15 spesies + kredit, detail Leviathan, toko joran Lv 1-20 + beli Lv 11. Tidak menguji Android fisik/Firebase nyata."""
import os, sys, time, json
H = os.path.dirname(os.path.abspath(__file__))
src = open(os.path.join(H, "test_sf.py")).read().replace("\nmain()\n", "\n")
ns = {"__file__": os.path.join(H, "test_sf.py")}; exec(compile(src, "sf", "exec"), ns)
ok, ev, page, dex, R = ns["ok"], ns["ev"], ns["page"], ns["dex"], ns["R"]
from playwright.sync_api import sync_playwright
OUT = os.environ.get("SHOTS", "/tmp/nusa-komunitas/"); os.makedirs(OUT, exist_ok=True)
CRED = ["@ambaleon_12", "@candra_elx", "@_.milan24", "@dramond_12", "@muh4m4d_1lh4m100", "@nizam39791", "@derr6789ten", "@inirichee15", "@ilham.doss1", "@jual.kurma_ajwa", "@fadila49218", "@akb4r70", "@bayuwwnumber1", "@hanzz_z410", "Usulan Komunitas GRUP NUSA", "@mlfs_05", "@agusii.55", "@akhmadraffa123", "@alanaimroni"]
def main():
    with sync_playwright() as p:
        b = p.chromium.launch(); ctx, pg, errs = page(b, "&sf=preview"); dex(pg)
        ev(pg, "[...document.querySelectorAll('.dex-tabs button')].find(x=>/Samudra Follower/.test(x.textContent)).click()"); time.sleep(0.5)
        cells = ev(pg, "[...document.querySelectorAll('.sf-cell')].map(c=>c.innerText.replace(/\\n/g,' | '))"); txt = " ".join(cells)
        ok("A1 16 kartu (4 lama + 10 usulan + Udang Jala + Kontolodon)", len(cells) == 16, len(cells))
        ok("A2 semua kredit terlihat", all(c in txt for c in CRED), [c for c in CRED if c not in txt])
        ok("A3 nama: El Gran Maja, Udang Jala, Leviathan", all(n in txt for n in ["El Gran Maja", "Udang Jala", "Leviathan"]))
        ok("A4 semua ilustrasi termuat", ev(pg, "[...document.querySelectorAll('.sf-cell img')].every(i=>i.complete&&i.naturalWidth>30)"))
        ok("A5 rarity tampil di tiap kartu", ev(pg, "[...document.querySelectorAll('.sf-cell')].every(c=>/COMMON|UNCOMMON|RARE|EPIC|LEGENDARY|MYTH/i.test(c.innerText))"))
        pg.screenshot(path=OUT + "1-koleksi-samudra-follower-penuh.png", full_page=False)
        ev(pg, "document.querySelector('.sf-cell[data-arg=sf2_leviathan]').click()"); time.sleep(0.8)
        t = ev(pg, "document.getElementById('sfOv') ? document.getElementById('sfOv').innerText : ''")
        ok("B1 detail Leviathan terbuka, 4 kredit tampil", all(c in t for c in CRED[:4]), t[:80])
        d1 = ev(pg, "document.getElementById('sfCv')?document.getElementById('sfCv').toDataURL():''"); time.sleep(0.7); d2 = ev(pg, "document.getElementById('sfCv')?document.getElementById('sfCv').toDataURL():''")
        ok("B2 animasi Leviathan berjalan", d1 and d1 != d2)
        pg.screenshot(path=OUT + "2-leviathan-baru.png"); ev(pg, "document.getElementById('sfX').click()"); time.sleep(0.2)
        bk = ev(pg, "(()=>{let h='';for(let i=0;i<6;i++){h+=NW.sf2.bookHTML();NW.sf2.act('sf2p','1');}return h})()"); ok("C1 Buku Koleksi SF2 memuat kredit El Gran Maja + Udang Jala + Leviathan (kredit terlihat walau belum ditemukan)", "@derr6789ten" in bk and "Usulan Komunitas GRUP NUSA" in bk and "@ambaleon_12" in bk, bk.count("sf2-cr"))
        ctx.close()
        ctx, pg, errs2 = page(b); ev(pg, "Nusa.S.money=2000000;Nusa.S.up.rod=9;Nusa.savePublic&&Nusa.savePublic()"); 
        ev(pg, "Nusa.openPanel('shop')"); time.sleep(0.5)
        rods = ev(pg, "[...document.querySelectorAll('.rod-card')].length"); ok("D1 toko joran menampilkan 20 tingkat", rods == 20, rods)
        names = ev(pg, "[...document.querySelectorAll('.rod-card .nm')].map(x=>x.innerText)"); ok("D2 Lv 11-20 bernama sesuai Owner", all(n in " ".join(names) for n in ["Badai Laut", "Karang Emas", "Hiu Raja", "Palung Hitam", "Kaisar Samudra", "Naga Laut", "Abyss", "Leviathan", "Penguasa Legenda", "Dewa Samudra"]))
        ok("D3 hanya level berikutnya yang bisa dibeli; sisanya terkunci", ev(pg, "document.querySelectorAll('.rod-card button[data-act=buy]').length")==1 and ev(pg, "document.querySelectorAll('.rod-tag.lock').length")==9, ev(pg, "document.querySelectorAll('.rod-tag.lock').length"))
        ok("D4 semua pratinjau joran termuat", ev(pg, "[...document.querySelectorAll('.rod-card img')].every(i=>i.complete&&i.naturalWidth>5)"))
        ev(pg, "document.querySelector('.rod-card.cur').scrollIntoView({block:'start'})"); time.sleep(0.3); pg.screenshot(path=OUT + "3-toko-joran-lv11-20.png")
        ev(pg, "document.querySelector('.rod-card button[data-act=buy]').click()"); time.sleep(1.0)
        ev(pg, "[...document.querySelectorAll('button')].filter(b=>/^(Ya|Beli|OK|Lanjut)/.test(b.textContent.trim())&&b.offsetParent&&!b.dataset.act).forEach(b=>b.click())"); time.sleep(0.8)
        lv = ev(pg, "Nusa.S.up.rod"); ok("D5 beli Lv 11 lewat UI: tingkat naik 9 -> 10 (indeks), tidak ganda", lv == 10, lv)
        ok("D6 tanpa error halaman", not errs and not errs2, (errs + errs2)[:2])
        ctx.close(); b.close()
    passed = sum(1 for x in R if isinstance(x, str) and x.startswith("PASS"))
    failed = [x for x in R if isinstance(x, str) and x.startswith("FAIL")]
    print(f"TOTAL {passed} / {len(R)} (gagal {len(failed)})")
    sys.exit(0 if passed == len(R) == 14 and not failed else 1)
main()
