# Samudra Follower V2 — Pulau Para Legenda (paket untuk persetujuan Owner)

**Status: SIAP DIREVIU. BELUM di-merge, BELUM di-deploy, produksi TIDAK diubah.** Firebase/Cloudflare/pembayaran asli tidak terjangkau dari sandbox → tidak terverifikasi langsung.

## Isi
- **Pulau 2.5D isometrik** (`sf2/area.js`): pantai, 34 pohon kelapa, dermaga utama + kapal, Papan Legenda Komunitas, penjaga dermaga "Pak Jangkar", laut dalam/karang/muara/danau, 4 spot memancing bertabrakan rapi, jembatan sungai. Terdaftar di Peta Nusantara; pulang ke Muara Kampung lewat kapal.
- **Akses**: ≥100 tangkapan sah (dihitung SERVER). Pesan: "Samudra Follower terkunci. Tangkap 100 ikan untuk membuka perjalanan!" + progres n/100; tombol BERLAYAR muncul saat memenuhi syarat.
- **5 kategori** (server): Common 55 / Uncommon 27 / Rare 8 / Epic 5 / Mythic 5 — lalu spesies dipilih berbobot sesuai habitat spot.
- **Pity Mythic 0/100**: +1 per tangkapan sukses non-Mythic; tiap 20 tangkapan tanpa Mythic, Epic & Mythic masing-masing +0,20 poin persentase (diambil dari Common): 0–19 5,00% · 20–39 5,20% · 40–59 5,40% · 60–79 5,60% · 80–98 5,80%; tangkapan ke-100 tanpa Mythic = **Mythic pasti**; Mythic dini (mis. di 73) reset ke 0; gagal/batal/klaim ganda tidak menambah Pity; keluar pulau hanya menyembunyikan HUD.
- **HUD** (hanya di pulau): "SAMUDRA FOLLOWER / Pity Mythic n/100 / Mythic x,xx%", bar emas, animasi ringan, tombol ⓘ peluang lengkap.
- **10 makhluk komunitas** + 26 spesies pelengkap (tiap habitat punya kelima rarity). Gambar 2.5D prosedural ORISINAL (`sf2/draw.js`).
- **Katalog siap 1.000 entri** (ID permanen, versi katalog, aktif/nonaktif, habitat, bobot; spesies nonaktif tidak menghapus koleksi). Buku Koleksi berhalaman; membedakan *tangkapan* vs *spesies ditemukan*; "Katalog komunitas 14/1.000" (10 baru + 4 SF lama).
- **Ekonomi**: nilai jual tetap (Common 10–25, Uncommon 25–50, Rare 60–100, Epic 100–140, Mythic ≤250); bobot besar tidak menambah koin. Orca & Narwhal = koleksi pengamatan (tidak dijual). **PENEMU PERTAMA** per spesies komunitas: dokumen global `sf2/firsts` dibaca & ditulis di transaksi yang sama (atomik).

## Keputusan yang butuh Owner
1. **Migrasi pemain lama (aturan adil)**: hitungan buka = max(total tangkapan terhitung server `lbc`, panjang Coolbox server yang tercatat naik-saja). Tidak bisa turun saat ikan dijual. Opsional kredit warisan lewat `shop_config/main.sf2.legacyCredit` + `legacyBefore` (akun dibuat sebelum tanggal itu). Tanpa konfigurasi = hanya aturan di atas.
2. **El Gran Maja** diganti makhluk orisinal **"Naga Palung Kelabu"** (tanpa izin tidak dipakai karakter berhak cipta). Setujui nama/ide asli atau ganti.
3. **Kredit Instagram TIDAK dikirim/ditampilkan** (`firebase/sf2-credits.pending.json`, `approved:false`). Aktifkan setelah setuju.
4. **4 ikan SF lama** tetap di katalog tetapi TIDAK diundi di pulau (satu sistem undian, tidak bertabrakan).
5. Tangkapan pulau **tidak** menambah Podium (`lbc`) dan punya batas **150/jam** tambahan.
6. Sakelar darurat Owner: `shop_config/main.sf2.off=true` (menutup pulau; data tetap).

## Keamanan
Klien tidak pernah menentukan rarity/spesies/bobot/Pity/jumlah/Penemu Pertama. `ecoSf2Catch` idempoten (`opId`), batas jeda/jam/Coolbox penuh dicek SEBELUM undian, gagal-tertutup jika pengacak server tidak tersedia. Klien mengulang dengan opId yang sama (tak pernah ikan ganda).

## Temuan & perbaikan di jalur backend (penting)
- Rute Worker `/fn/<nama>` menolak nama ber-angka (`ecoSf2*` → 404). Diperbaiki (allowlist tetap menjaga).
- `server/shop/db.js` menolak jalur `sf2/firsts`. Dipetakan ke `shop_sf2/firsts` (Functions: sama).

## Urutan deploy (setelah persetujuan)
1. Worker backend (`ecoSf2*` + vendor) → 2. (jika dipakai) Firebase Functions → 3. Hosting game. Tanpa langkah konfigurasi manual; pulau otomatis aktif untuk akun ≥100 tangkapan. Rollback: `sf2.off=true` atau deploy ulang rilis sebelumnya (data pemain tidak berubah bentuk; `eco.sf2` diabaikan oleh versi lama).

## Pengujian
`tests/unit-sf2.js` (34), `tests/unit-sf2-map.js` (8), `tests/browser/test_sf2.py` (31, viewport 390×844), backend `test/sf2.test.js` (8) + seluruh suite. Gambar: `docs/sf2/`.

## Ikan komunitas baru: Kontolodon (NONAKTIF)
- Desain oleh **@devilbesideme_** (sketsa siluet dipakai sebagai acuan; digambar ulang sebagai ikan kartun 2.5D prosedural orisinal `gendut` di `sf2/draw.js`). Tidak ada foto/sketsa/aset gambar yang masuk repo.
- Data: `sf2_kontolodon` di `economy/sf2-core.js` (Uncommon, muara, 0,8–6 kg) dengan `a:0` → **tidak ikut undian**, jadi peluang semua ikan lain TIDAK berubah (diuji identik). Kredit lewat bidang `design` (`dg`), tampil sebagai "🎨 Desain oleh @devilbesideme_" di kartu koleksi, detail, kartu tangkapan, dan Buku Koleksi pulau.
- Untuk menyalakan (hanya Owner): ubah `a: 0` menjadi aktif pada baris itu (hapus `a:0`), jalankan `node firebase/scripts/sync-economy.js`, lalu deploy sesuai urutan biasa. Mengaktifkan menambah ikan ini ke undian Uncommon muara (peluang ikan Uncommon muara lain ikut terbagi).
- Backend: salinan vendor `sf2-core` di repo Control Center perlu disinkronkan saat deploy; selama nonaktif perilaku server tidak berubah.
- Pratinjau: `docs/sf2/kontolodon-kartu.png`, `docs/sf2/kontolodon-koleksi.png`.
