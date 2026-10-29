# 🏝️ Nusa Island

Game kehidupan pulau dan mancing 2.5D keliling Nusantara, dari kreator **Kota Nusa**. Main langsung di browser, di HP maupun laptop.

## Island Life — Muara Kampung (Tahap 1)
Pemain sekarang mulai di pulau **Muara Kampung** yang bisa dijelajahi dalam tampilan isometrik.
- **Joystick** di kiri bawah (atau WASD/panah di laptop) untuk berjalan 8 arah. Kamera mengikuti pemain.
- **Tombol aksi** kuning muncul di kanan bawah saat dekat sesuatu (atau tekan E/Spasi).
- **Ujung dermaga 🎣**: mulai mancing. Sistem mancing lama berjalan seperti biasa. Tombol *Ke Darat* untuk kembali.
- **Pasar Ikan Bu Sari 🏪**: jual tangkapan. **Toko Pancing Pak Bono 🛠️**: upgrade alat.
- **Kapal ⛵** di samping dermaga: buka peta untuk berlayar ke pulau lain (masih berupa lokasi mancing).
- **NPC**: Pak Darto (nelayan yang bolak-balik ke dermaga), Bu Sari (pedagang di pasar), Dika (anak yang jalan-jalan di kampung). Ajak bicara untuk tips.
- Siang, sore, dan malam dengan lampu jalan dan jendela yang menyala.

Struktur kode dunia pulau ada di folder `world/`:
- `world/map.js`: bentuk pulau, jalan, dermaga, bangunan, objek, dan collision.
- `world/draw.js`: semua gambar isometrik (terrain, air, bangunan, pohon, karakter).
- `world/world.js`: pemain, joystick, kamera, NPC, dialog, dan interaksi.
- `game.js`: sistem mancing lama, pasar, toko, koleksi, simpanan, dan perpindahan mode pulau ↔ mancing.

## Cara mancing
1. **Tahan layar** untuk mengayun joran, **lepas** untuk melempar. Lepas di zona atas meteran untuk *Lemparan Sempurna* (lebih hoki). Ketuk sisi kiri atau kanan layar untuk mengarahkan lemparan.
2. Tunggu sampai pelampung **tenggelam** dan muncul tanda **!**, lalu ketuk secepatnya.
3. **Tarik-ulur**: tahan untuk menggulung, lepas supaya senar kendur. Kalau tegangan terlalu tinggi, senar putus. Kalau terlalu lama kendur, ikannya lepas.
4. Jual tangkapan di **Pasar**. Harga berubah setiap hari, jadi jual saat harga sedang naik.
5. Upgrade **joran, umpan, coolbox, dan kapal** di **Toko**. Kapal baru membuka pulau baru.
6. Lengkapi **Koleksi** 33 ikan dan barang dari 5 lokasi. Beberapa ikan hanya muncul malam atau siang.
7. Tekan **📸 Simpan Kartu** untuk menyimpan kartu tangkapan (1080×1350) yang siap diposting ke Instagram.

## Lokasi
| Lokasi | Kapal | Ikan legenda |
|---|---|---|
| Muara Kampung | Sampan Kayu | Arwana Super Red 🌙 |
| Danau Toba | Perahu Motor | Ikan Dewa ☀️ |
| Selat Sunda | Kapal Nelayan | Kerapu Raksasa 🌙 |
| Raja Ampat | Speedboat | Napoleon (dilindungi) |
| Laut Banda | Kapal Ekspedisi | Marlin Biru, Hiu Paus 🌙 |

Ikan yang dilindungi otomatis dilepas lagi, dan pemain mendapat hadiah konservasi.

## Teknis
- HTML, CSS, dan JavaScript murni dengan Canvas 2D. Tanpa library dan tanpa build.
- Progres disimpan di `localStorage` browser.
- File: `index.html`, `style.css`, `data.js` (ikan, lokasi, upgrade), `game.js` (mesin game).
- Menambah ikan cukup lewat `data.js`.

## Online-kan dengan GitHub Pages
Settings → Pages → Source: **Deploy from a branch** → Branch: `main` / root → Save.
Game akan tersedia di `https://hanifan-dot.github.io/Nusa-island/`.
