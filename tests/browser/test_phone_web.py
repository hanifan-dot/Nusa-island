"""Uji NusaPhone (Ide 07) · TAHAP 3 — NusaWeb + Zentro + bookmark NusaOcean.
SERVER = Worker backend ASLI di balik phone_bridge.mjs (Firestore TIRUAN, data sintetis). BUKAN bukti produksi. Butuh NUSA_BACKEND. Gambar: docs/ide07/"""
import os, sys, time
H = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, H)
import phone_harness as X
import test_phone_ui as U
import test_phone_games as G
from playwright.sync_api import sync_playwright
ev, wait_for, ok = X.ev, X.wait_for, X.ok
def title(pg): return ev(pg, "(document.querySelector('.nw-t')||{}).textContent||''").strip()
def addr(pg): return ev(pg, "document.querySelector('.nw-addr input').value")
def typ(pg, v):
    pg.fill(".nw-addr input", v); pg.press(".nw-addr input", "Enter"); time.sleep(0.4)
def home_names(pg): return ev(pg, "[...document.querySelectorAll('#nphGrid .nph-ic-n')].map(e=>e.textContent)")
def sec_web(b, br):
    br.flag(phone=True, ocean=True)
    ctx, A, errs = X.new_page(b, br, "demo-a", "Budi", vp=(412, 915)); U.phone_ready(A); uid = X.uid(A)
    reqs = []; A.on("request", lambda r: reqs.append(r.url))
    br.post("/__eco", {"uid": uid, "set": {"bal": 5000, "box": []}})
    U.open_phone(A); U.unlock(A); U.settle(A, 0.5)
    ok("W0 home: NusaWeb dan Zentro ada di layar utama (8 ikon, nama benar)", home_names(A) == ["Klippy", "NusaChat", "PlayGame", "NusaWeb", "Zentro", "Dompet Nusa", "Peta", "Pengaturan"], home_names(A))
    ok("W0b modul NusaWeb/Zentro BELUM diunduh sebelum aplikasi dibuka (unduh malas)", not [u for u in reqs if "phone/nusaweb.js" in u or "phone/zentro.js" in u])
    ev(A, "()=>NW.phone.go('open','nusaweb')"); wait_for(A, "!!document.querySelector('.nw-t')", 10); U.settle(A, 0.4)
    ok("W0c modul dimuat tepat saat dibuka", any("phone/nusaweb.js" in u for u in reqs) and not any("phone/zentro.js" in u for u in reqs))
    ok("W1 halaman awal Beranda NusaWeb; bilah alamat menampilkan nusa.home; tombol Kembali nonaktif", title(A).endswith("Beranda NusaWeb") and addr(A) == "nusa.home" and ev(A, "document.querySelector('[data-nw=back]').disabled"))
    U.shot(A, "nw-412x915-beranda")
    typ(A, "kabar.nusa"); ok("W2 ketik alamat kabar.nusa → Kabar Pulau; alamat diperbarui", title(A).endswith("Kabar Pulau") and addr(A) == "kabar.nusa", [title(A), addr(A)])
    A.click("[data-nw=back]"); time.sleep(0.3); ok("W3 tombol Kembali → halaman sebelumnya (Beranda)", title(A).endswith("Beranda NusaWeb"))
    typ(A, "HTTPS://Kabar.NUSA/"); ok("W3b skema nusa/https:// dan huruf besar dinormalkan hanya untuk alamat .nusa yang ada (Kabar Pulau)", title(A).endswith("Kabar Pulau"), title(A))
    typ(A, "resep.nusa"); A.click("[data-nw=home]"); time.sleep(0.3); ok("W4 tombol Beranda kembali ke nusa.home", addr(A) == "nusa.home")
    # internet umum TIDAK dibuka
    n0 = len(reqs)
    for bad in ("https://example.com", "google.com", "javascript:alert(1)", "http://192.168.0.1/admin", "kabar.nusa.evil.com", "file:///etc/passwd", "nusa.xyz"):
        typ(A, bad); t = title(A); ok("W5 alamat luar '%s' → halaman galat, bukan dibuka" % bad, "tidak dapat dibuka" in t and ev(A, "document.querySelectorAll('.nw-pg iframe,.nw-pg a[href]').length") == 0, t)
    ok("W5b halaman galat menjelaskan: hanya halaman Nusa (.nusa)", ".nusa" in ev(A, "document.querySelector('.nw-pg').textContent"))
    ok("W5c tidak ada permintaan jaringan baru ke alamat luar (tidak ada fetch/iframe)", [u for u in reqs[n0:] if "127.0.0.1" not in u and "localhost" not in u] == [], reqs[n0:][:3])
    typ(A, "hilang.nusa"); ok("W5d alamat .nusa yang tidak ada → 'tidak ada di pulau Nusa'", "tidak ada di pulau Nusa" in ev(A, "document.querySelector('.nw-pg').textContent"))
    A.evaluate("window.__x = 0"); typ(A, "<img src=x onerror=window.__x=1>.nusa"); time.sleep(0.4)
    ok("W5e masukan berisi HTML dilepas (escape): tidak ada elemen <img>, skrip tak jalan", ev(A, "document.querySelectorAll('.nw-pg img').length") == 0 and ev(A, "window.__x") == 0)
    # pencarian lewat kata biasa = Zentro (lokal)
    n1 = len(reqs); typ(A, "resep"); time.sleep(0.3)
    ok("W6 kata biasa 'resep' → Zentro menampilkan hasil halaman Nusa (Resep Dapur Nusa)", "zentro.nusa" in addr(A) and "Resep Dapur Nusa" in ev(A, "document.querySelector('.zn-res').textContent"))
    ok("W6b pencarian TIDAK memakai jaringan (nol permintaan baru)", len(reqs) == n1, reqs[n1:][:3])
    U.shot(A, "nw-412x915-zentro-hasil")
    A.click("[data-zo='resep.nusa']"); time.sleep(0.3); ok("W6c ketuk hasil membuka halamannya di NusaWeb", title(A).endswith("Resep Dapur Nusa") and addr(A) == "resep.nusa")
    typ(A, "zzzxx"); ok("W6d tanpa hasil: pesan 'Tidak ada halaman Nusa yang cocok'", "Tidak ada halaman Nusa" in ev(A, "document.querySelector('.zn-res').textContent"))
    # tab
    A.click("[data-nw=tabs]"); time.sleep(0.2); ok("W7 tombol tab membuka daftar tab (1/3)", "Tab (1/3)" in ev(A, "document.querySelector('.nw-t').textContent"))
    A.click("[data-nw=newtab]"); time.sleep(0.2); typ(A, "dongeng.nusa"); A.click("[data-nw=tabs]"); time.sleep(0.2); A.click("[data-nw=newtab]"); time.sleep(0.2); typ(A, "pasar.nusa")
    A.click("[data-nw=tabs]"); time.sleep(0.2); ok("W7b tiga tab terbuka; tombol Tab baru nonaktif (maks 3)", "Tab (3/3)" in ev(A, "document.querySelector('.nw-t').textContent") and ev(A, "document.querySelector('[data-nw=newtab]').disabled"))
    U.shot(A, "nw-412x915-tab")
    A.click("[data-tab='1']"); time.sleep(0.3); ok("W7c pindah ke tab 2: halamannya sendiri (Dongeng Laut) dan riwayatnya sendiri", title(A).endswith("Dongeng Laut"))
    A.click("[data-nw=back]"); time.sleep(0.2); ok("W7d Kembali di tab 2 → Beranda (riwayat per-tab)", addr(A) == "nusa.home")
    A.click("[data-nw=tabs]"); time.sleep(0.2); A.click("[data-closetab='2']"); time.sleep(0.2); ok("W7e tutup tab ke-3 → tersisa 2", "Tab (2/3)" in ev(A, "document.querySelector('.nw-t').textContent"))
    A.click("[data-tab='0']"); time.sleep(0.3)
    # markah
    typ(A, "markah.nusa"); lst = ev(A, "document.querySelector('.nw-pg').textContent")
    ok("W8 markah bawaan memuat NusaOcean (nusaocean.nusa), Kabar, Resep", "NusaOcean" in lst and "Kabar Pulau" in lst and "Resep Dapur Nusa" in lst, lst[:80])
    typ(A, "cuaca.nusa"); ok("W8b ☆ → tambah markah (★)", ev(A, "document.querySelector('[data-nw=star]').getAttribute('aria-pressed')") == "false"); A.click("[data-nw=star]"); time.sleep(0.2)
    ok("W8c bintang menyala setelah ditekan", ev(A, "document.querySelector('[data-nw=star]').getAttribute('aria-pressed')") == "true")
    A.click("#nphBack"); time.sleep(0.4); ev(A, "()=>NW.phone.go('open','nusaweb')"); wait_for(A, "!!document.querySelector('.nw-t')", 10); typ(A, "markah.nusa")
    ok("W8d markah tersimpan di perangkat (tetap ada setelah aplikasi dibuka ulang)", "Cuaca Pulau" in ev(A, "document.querySelector('.nw-pg').textContent"))
    A.click("[data-rm='cuaca.nusa']"); time.sleep(0.2); ok("W8e hapus markah berfungsi", "Cuaca Pulau" not in ev(A, "document.querySelector('.nw-pg').textContent"))
    U.shot(A, "nw-412x915-markah")
    # NusaOcean = Ocean Spin YANG SAMA
    A.click("[data-go='nusaocean.nusa']"); time.sleep(0.8)
    ok("W9 NusaOcean belum dipasang → ajakan pasang lewat PlayGame (tanpa papan spin)", "belum dipasang" in ev(A, "document.querySelector('.nw-pg').textContent") and ev(A, "!document.querySelector('.os-board')"))
    br.fn(uid, "phoneInstall", {"opId": "t-inst-web-0001x", "game": "oceanspin"}); typ(A, "nusaocean.nusa"); wait_for(A, "!!document.querySelector('.os-odds table')", 10); time.sleep(0.4)
    ok("W10 setelah terpasang: NusaOcean membuka Ocean Spin (papan 5×3, tabel peluang, Zeus 0.05%)", ev(A, "document.querySelectorAll('.nw-ocean .os-c').length") == 15 and "0.05%" in ev(A, "document.querySelector('.nw-ocean .os-odds').textContent"))
    ok("W10b modul game SAMA dengan PlayGame (NW.phoneGames.oceanspin tunggal)", ev(A, "typeof NW.phoneGames.oceanspin.mount") == "function" and sum(1 for u in reqs if u.endswith("phone/oceanspin.js")) <= 1, [u for u in reqs if "oceanspin" in u])
    U.shot(A, "nw-412x915-nusaocean")
    e0 = br.read("shop_economy/" + uid)["bal"]; A.click(".nw-ocean [data-r=spin]"); time.sleep(0.6)
    ok("W10c spin dari NusaWeb: server memotong 500 koin (aturan identik dengan PlayGame)", br.read("shop_economy/" + uid)["bal"] == e0 - 500, [e0, br.read("shop_economy/" + uid)["bal"]])
    G.os_wait_done(A, 40)
    ok("W11 tidak ada galat skrip", not [e for e in errs if "PAGEERR" in e], errs[:2]); ctx.close()
def sec_zentro(b, br):
    br.flag(phone=True, ocean=True)
    ctx, A, errs = X.new_page(b, br, "demo-a", "Budi", vp=(412, 915)); U.phone_ready(A); reqs = []; A.on("request", lambda r: reqs.append(r.url))
    G.open_app(A, "zentro"); wait_for(A, "!!document.querySelector('.zn-f input')", 10)
    ok("Z1 aplikasi Zentro: kotak cari + keterangan 'hanya halaman Nusa, tidak membuka internet umum'", "tidak membuka internet umum" in ev(A, "document.querySelector('.zn').textContent"))
    n0 = len(reqs); A.fill(".zn-f input", "ikan"); A.press(".zn-f input", "Enter"); time.sleep(0.4)
    ok("Z2 cari 'ikan' → hasil halaman Nusa; nol permintaan jaringan", ev(A, "document.querySelectorAll('.zn-r').length") >= 1 and len(reqs) == n0, ev(A, "document.querySelector('.zn-res').textContent")[:60])
    U.shot(A, "zn-412x915-hasil")
    A.fill(".zn-f input", "https://example.com"); A.press(".zn-f input", "Enter"); time.sleep(0.3)
    ok("Z3 kueri berupa alamat luar tidak dibuka/diikuti: hanya dicari di indeks Nusa (tanpa hasil luar)", ev(A, "document.querySelectorAll('.nw-pg,iframe,a[href]').length") == 0 and not [u for u in reqs if "example.com" in u])
    A.evaluate("window.__y = 0"); A.fill(".zn-f input", "<img src=x onerror=window.__y=1>"); A.press(".zn-f input", "Enter"); time.sleep(0.3)
    ok("Z4 kueri berisi HTML tidak dieksekusi", ev(A, "window.__y") == 0 and ev(A, "document.querySelectorAll('.zn img').length") == 0)
    A.fill(".zn-f input", "dongeng"); A.press(".zn-f input", "Enter"); time.sleep(0.3); A.click("[data-zo='dongeng.nusa']"); time.sleep(1.0)
    ok("Z5 ketuk hasil → NusaWeb terbuka di halaman itu (Dongeng Laut)", ev(A, "document.getElementById('nphAppT').textContent") == "NusaWeb" and title(A).endswith("Dongeng Laut"), title(A))
    ok("Z6 tidak ada galat skrip", not [e for e in errs if "PAGEERR" in e], errs[:2]); ctx.close()
    ctx, A, errs = X.new_page(b, br, "demo-a", "Budi", vp=(412, 915)); U.phone_ready(A); G.open_app(A, "nusaweb"); wait_for(A, "!!document.querySelector('.nw-t')", 10)
    ctx.set_offline(True); ev(A, "()=>window.dispatchEvent(new Event('offline'))"); time.sleep(1.5)
    ok("Z7 offline: NusaWeb & Zentro terkunci (aplikasi jaringan)", wait_for(A, "/Koneksi terputus/.test(document.getElementById('nphAppB').textContent)", 15)); ctx.set_offline(False); ctx.close()
def main():
    br = U.PB()
    try:
        with sync_playwright() as p:
            b = p.chromium.launch(); only = os.environ.get("PW_ONLY", "")
            for name, fn in (("web", sec_web), ("zentro", sec_zentro)):
                if not only or only == name: fn(b, br)
            b.close()
    finally: br.close()
    f = [r for r in X.R if r.startswith("FAIL")]
    print("\nRINGKAS: %d PASS / %d FAIL" % (len(X.R) - len(f), len(f)))
    sys.exit(1 if f else 0)
if __name__ == "__main__": main()
