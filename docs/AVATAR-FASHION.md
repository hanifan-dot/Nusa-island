# Tugas 2.6 — Nusa Avatar, Toko Fashion & Koleksi Sultan

Semua item **kosmetik murni** (tanpa damage/kecepatan/peluang tangkap). Desain orisinal, digambar prosedural di Canvas (tanpa aset jaringan).

## Cara pakai
☰ → **Edit Avatar & Fashion** (juga tombol "👤 EDIT AVATAR" di Profil). Tab: Edit Avatar · Toko Fashion · 👑 Koleksi Sultan · Koleksi Saya. Pratinjau karakter memutar 8 arah (⟲ ⟳ / 🔄 / 🚶). COBA GRATIS tidak memotong koin. SIMPAN PENAMPILAN menyimpan (server bila masuk akun, selalu lokal).

## Katalog (ID tunggal; Hiu Darat, T‑Rex, Naga Petir dipakai bersama daftar Hewan & Sultan)
Sumber kebenaran: `economy/fashion-core.js` (dipakai server DAN klien). Harga persis spesifikasi Owner (27 item).

## Keamanan pembelian
- Server (`economy/core.js` → `ecoFashionState/Buy/Save`): harga & katalog dari server, kepemilikan terikat **UID**, saldo tunggal `spendFrom` (koin main dulu, lalu Top Up NYATA — sistem pembayaran/riwayat Top Up tidak disentuh), idempoten `opId`, tidak bisa beli dua kali, simpan penampilan hanya item gratis/dimiliki UID itu.
- Klien tidak mengirim harga/saldo (diabaikan). Kode penampilan tak sah/belum dimiliki tidak dirender.
- **Batas jujur:** Worker produksi `nusa-api` (kode TIDAK ada di repo) harus memuat `economy/fashion-core.js` dan mendaftarkan `ecoFashion*` (opsi `fashion:` pada `makeEconomyServer`). Sampai itu dilakukan klien mendeteksi "unsupported": **pembelian TERKUNCI** (coba pakai & item gratis tetap jalan). Tamu/offline: hanya item gratis. Tidak ada jalur beli yang bisa dimanipulasi dari browser.

## Multiplayer (tambahan, kompatibel)
Pesan klien `a` (kode ID item, ≤140 karakter, divalidasi & dibatasi laju), siaran `{t:"a",id,o}`, `welcome.ou` untuk pemain yang sudah ada, ikut snapshot hibernasi. Hanya ID — tidak ada gambar lewat jaringan. Kostum tak dikenal → tampilan dasar. Catatan: server ruang tidak tahu kepemilikan; klien termodifikasi bisa MENAMPILKAN kostum apa pun ke pemain lain (murni visual; tidak memberi item/koin).

## Efek visual & performa
Tingkat Mati/Hemat/Penuh (Pengaturan di Edit Avatar; bawaan: Hemat di HP/layar kecil, Mati bila `prefers-reduced-motion`). Pembatas keramaian: maks. 3 karakter berefek per bingkai. Tidak ada kilatan cepat (petir ±0,6 dtk tiap 3,6 dtk). Tombol ✨ LIHAT EFEK per item eksklusif.

## Tes
`node tests/unit-fashion.js`, `node tests/unit-mp.js`, `python tests/browser/test_avatar.py` (35 cek + screenshot asli di `docs/avatar-fashion/`).
