# Tas Pemain, NUSA STYLE & Ekspansi Peta (+40%)

## Fitur
- **Tas** (tombol SVG kanan atas, tetap terlihat di luar menu ☰): tab Gamepass, Perlengkapan, Fashion. "Pakai"/"Lepaskan" + penanda "Dipakai". Melepas tidak pernah menghapus kepemilikan.
- **Aurora**: bonus Langka dihitung server hanya jika dimiliki (NYATA) DAN terpasang. Default terpasang; Lepaskan lewat fungsi baru `ecoEquip` (wajib pemilik, idempoten). PENDING/TOLAK tidak pernah memberi bonus.
- **Peta**: Muara Kampung +40,4% area jalan (764 vs 544 tile), area baru Tanjung Lampu di selatan. Koordinat rumah/NPC/dermaga/pasar/papan misi/portal TIDAK berubah (dijaga tes fixture). MAP_H 40→52.
- **NUSA STYLE**: butik isometrik, masuk dengan Interaksi, studio avatar di dalam, tombol "Keluar Toko", kembali ke posisi sebelum masuk.

## Deploy (butuh persetujuan Owner)
1. Backend PR #30 (allowlist `ecoEquip`) → deploy Worker.
2. Game PR ini → hosting.
3. Redeploy `nusa-multiplayer` agar MAP_H=52 (tanpa ini posisi y>40 dijepit, tidak ditolak).

## Rollback
Revert PR game; `ecoEquip` tambahan tidak berbahaya bila dibiarkan. Data pemain tidak dimigrasi/diubah.

## Risiko tersisa
Firebase/Cloudflare/pembayaran asli belum diuji; Android fisik belum diuji; identitas tombol bulat "1" asli belum terkonfirmasi (tombol hitung 👥 dibiarkan); pembelian lama Aurora dianggap terpasang (default) kecuali dilepas.
