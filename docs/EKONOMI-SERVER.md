# Ekonomi server (satu dompet koin, otoritas server)

Status: **kode selesai & lulus tes lokal; BELUM diuji di Firebase sungguhan** (butuh Blaze + Cloud Shell milik Owner). Tidak ada transaksi uang asli yang sudah terverifikasi.

## Aturan inti
- **Satu dompet.** Layar menampilkan satu angka = koin hasil bermain (`own`) + koin Top Up (`entitlements.wallet.NYATA`). Belanja memakai koin bermain dulu, sisanya Top Up. Tidak ada mata uang kedua.
- **Klien tidak pernah mengirim saldo atau harga.** Klien hanya melapor kejadian; server menghitung nilai dari tabel yang sama dengan game (`economy/tables.js`, dibuat dari `data.js` + `world/home-data.js`; tes gagal bila basi).
- **Idempotent.** Semua operasi punya `opId`; ulang karena jaringan putus tidak menggandakan koin/potongan.

| Aksi | Fungsi | Aturan server |
|---|---|---|
| Aktifkan akun | `ecoInit` | Sekali. Koin lama dibatasi `NUSA_ECO_INIT_CAP` (bawaan 20.000; **set 0 saat rilis**), upgrade dibatasi level maks, minimal koin awal 50. |
| Tangkap ikan | `ecoCatch` | Spesies dikenal, berat dalam rentang resmi, jeda ≥1,5 dtk, ≤400/jam, masuk "kotak ikan" server. Ikan dilindungi → hadiah dihitung server. |
| Jual ikan | `ecoSell` | Hanya ikan yang ada di kotak server; harga = `priceFor`×`priceMult(hari)`; ikan terhapus → tak bisa dijual dua kali. |
| Hadiah cerita/area | `ecoReward` | Tabel kunci→koin, sekali per kunci. |
| Hadiah misi | `ecoMission` | ≤260/klaim, ≤1.800/hari, ≤8 klaim/hari, sekali per id misi. |
| Beli upgrade/rumah/perabot | `ecoBuy` | Harga dari tabel server, level berurutan, saldo cukup; kepemilikan disimpan server. |
| Serahkan ikan ke NPC | `ecoDrop` | Ikan keluar dari kotak tanpa koin. |

`writeSave`/`loadSave` **menimpa** `money`, `up.*`, `home.level` pada simpanan dengan nilai server (jejak `eco-timpa:*` di flags). Mengedit simpanan/DevTools tidak menaikkan koin atau level.

## Batas jujur (tidak disembunyikan)
1. Server **tidak bisa melihat** pemain benar-benar memancing atau menyelesaikan misi. Yang dijamin: tiap ikan ≤ nilai tabel resmi, laju dibatasi, tidak ada koin dari ketiadaan, tidak ada belanja melebihi saldo, tidak ada klaim ganda. Pemain yang memalsukan lapor-tangkap tetap dibatasi laju (≤400 ikan/jam × harga ikan).
2. Hari harga (`S.day`) dikirim klien: pemain bisa memilih hari berharga tertinggi (maks. ×1,45 vs rata-rata ×1,075), tetap dalam rentang harga resmi.
3. Perabot (kosmetik) diberikan klien setelah server menyetujui pembayaran; menambah perabot lewat DevTools tidak memberi koin/kekuatan.
4. Tamu/offline/Owner-sandbox memakai ekonomi lokal lama. Penghasilan offline sebelum akun diaktifkan server tidak diakui (dibatasi `initCap`).
5. Hadiah yang dibayar saat jaringan putus di-antre di memori dan dicoba ulang; bila aplikasi ditutup sebelum terkirim, hadiah itu hilang (klaim berikutnya sudah ditandai di klien).

## File
`economy/core.js` (server), `economy/tables.js` (otomatis: `node economy/make-tables.js`), `economy/client.js` (`NW.eco`), salinan Functions via `node firebase/scripts/sync-economy.js`, callable di `firebase/functions/index.js`, uji: `tests/unit-economy.js` (20), `tests/browser/test_ekonomi.py` (22), Cloud Shell: `scripts/firestore-live-test.mjs` (butir 15–22) dan `scripts/functions-live-test.mjs` (E1–E9) di repo dashboard.

## Cara aktifkan saat rilis (semua butuh persetujuan Owner)
1. Deploy Functions (Blaze) dengan `NUSA_SHOP_LIVE=1` dan `NUSA_ECO_INIT_CAP=0`.
2. Terapkan `firebase/firestore.rules.blaze-functions` (semua `shop_*` tertutup untuk klien).
3. Jalankan uji Cloud Shell (lihat `docs/UJI-FIREBASE-CLOUD-SHELL.md`), lalu satu transaksi uji Rp2.000 pilot.
