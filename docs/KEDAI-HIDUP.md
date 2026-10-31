# Bumbu 3.2 — Kehidupan Kedai Atuk Bahar

Jadwal NPC mengikuti jam game (`S.hour`; 1 jam game = 20 detik nyata):

| Jam | Atuk | Dua anak | Meja | Lampu rumah |
|---|---|---|---|---|
| 06.00 | keluar rumah membawa meja kayu, menaruhnya di halaman, menyiapkan permainan | di dalam | dibawa → diturunkan | mati |
| 07.00–17.00 | duduk melayani pemain | keluar; duduk di bangku, menonton, bermain bola, jalan-jalan | di halaman (ber-collision) | mati |
| 17.00 | pamit, berdiri, mengangkat meja, masuk rumah | melambai "Dadah, Tuk!", berjalan pulang (masuk rumah) | diangkat → hilang | menyala perlahan |
| 18.00–06.00 | di dalam | di dalam | tidak ada di halaman (solid dilepas) | menyala |

- Gerak = jalur A* di atas fungsi `walkable` peta yang sama dengan pemain → tidak menembus bangunan/meja/bangku, tidak ada teleport (diuji ≤ 0.08 petak/frame).
- Masuk/keluar rumah lewat pintu timur dengan fade singkat.
- Keadaan dihitung dari jam: muat ulang / datang terlambat / tidur (lompatan waktu) langsung menaruh NPC & meja pada keadaan benar. Satu pengarah (`NW.kedai.life`), satu bangunan, satu titik interaksi → tidak ada duplikasi.
- Malam hari titik interaksi pindah ke pintu ("Ketuk pintu Atuk"); dialog menawarkan "Ayo main!" sehingga koleksi permainan tetap bisa dimainkan.
- Asumsi: kedua anak adalah cucu Atuk yang tinggal di rumah itu, jadi "pulang" = masuk rumah Kedai.
- Batas: NPC tidak menghindari tubuh pemain (hanya bangunan/objek).

Berkas: `world/kedai/hidup.js` (logika murni), `world/kedai/kedai.js` (integrasi & gambar).
Uji: `node tests/unit-kedai-hidup.js` (20) · `python tests/browser/test_kedai_hidup.py` (16).
