# Tahap 3.6 — Pembayaran Nyata (belum aktif)

Status: **kode siap, TIDAK aktif di produksi.** Default tetap `backend: "sim"` (SIMULASI).

## Alur produksi
1. Pemain pilih produk → server membuat pesanan (ID `NI-YYMMDD-XXXXXX`, harga dari katalog server + kode unik Rp1–99).
2. Pemain bayar ke QRIS resmi Owner (gambar `shop/qris.png`, TIDAK di-commit).
3. Pemain tekan "Konfirmasi via WhatsApp" (+62 896-7234-4059) → hanya mencatat klaim, tidak memberi apa pun.
4. Owner cek uang masuk di akun merchant QRIS.
5. Owner buka Payment Center (repo `nusa-island-control-center`) → cari ID/nickname → SETUJUI / TOLAK.
6. Backend memproses persetujuan SATU kali (ledger `L-<orderId>` idempoten) → Gamepass/koin ke UID pemain.
7. Koin dikirim dua tahap (server → `deliver()` di klien → `ackDelivery`), tepat satu kali, tahan re-login.

## Keamanan
- Kepemilikan premium & dompet NYATA hanya di server (Firestore tertutup untuk klien; akses via Callable Functions).
- Owner = custom claim `role: owner` (`firebase/scripts/set-owner.js <UID>`).
- `simulatePayment` tidak di-export di Cloud Functions.
- NYATA hanya jika env `NUSA_SHOP_LIVE=1` DAN Owner set mode "nyata".
- Batas jujur: `S.money` di klien tetap bisa diubah pemain; yang terlindungi server adalah entitlement premium dan pengiriman koin tepat-sekali.

## Kebutuhan biaya
Firebase **Spark tidak mendukung Cloud Functions** → perlu paket **Blaze** (bayar sesuai pemakaian; ada kuota gratis, untuk skala kecil biasanya sangat kecil, tetapi cek harga terbaru). Pasang budget alert. Kode Functions belum diuji pada Firebase/emulator sungguhan.

## Checklist aktivasi (butuh izin Owner)
1. Aktifkan Blaze + budget alert.
2. Deploy functions dengan `NUSA_SHOP_LIVE=1`; deploy rules `firestore.rules.blaze-functions` dan indexes.
3. Jalankan `set-owner.js` dengan UID Owner.
4. Tambah `shop/qris.png` (file QRIS Owner).
5. Ubah `shop/config.js`: `backend: "cloud"`, `release: "publik"`.
6. Di Payment Center: atur tanggal rilis & mode "nyata".
7. Uji bayar kecil sungguhan.
8. **Pastikan ke bank/penyedia QRIS bahwa merchant (terdaftar "Kotanusa, Pakaian") boleh menjual produk digital.** Siapkan kebijakan refund/S&K.

## Uji
`node tests/unit-shop.js` (18) · `python tests/browser/test_tahap36.py` (32) · Payment Center: 16 (repo control-center).
