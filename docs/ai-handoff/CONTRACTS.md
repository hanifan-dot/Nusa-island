# Kontrak klien ↔ server
Format: ✅ dipakai (kontrak Worker 01 ada) · 🧪 adapter uji (flag, tes saja) · ⏳ belum ada.
| Fitur | Kontrak | Status |
|---|---|---|
| Pengiriman Segar | `submit({v:1, opId, boxes:[[uid×3],[uid×3]]})` → hasil server. Hanya uid ITEM ikan + opId; tanpa uid pemain/harga/koin. Hasil/hadiah = tanggapan server. | ⏳ kontrak Worker 01 belum ada; `NW.delivery.adapter()` bawaan `null`; adapter uji hanya via `window.NUSA_DELIVERY_TEST_ADAPTER` (tes) |
| Kapal Rombongan | sinkron posisi kapal/kursi lewat multiplayer | ⏳ |
| NusaPhone/Klippy/NusaChat | state server (teman, posting) | ⏳ |
| Harga Kedai Bu Indah | harga dari server | ⏳ |
| Intro sekali per akun | penanda server per akun | ⏳ |
Kontrak lama yang tetap dipakai tanpa perubahan: ekonomi server (`NW.eco`), Cloud Save, Podium, SF.
