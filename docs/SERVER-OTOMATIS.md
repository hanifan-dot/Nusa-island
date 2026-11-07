# Server Otomatis Muara 12 → 64 (tanpa mengubah event)

- **Saat ini rencana kapasitas**: 16 pemain per server, 12 server awal (=192 slot), hingga 64 server (=1.024 slot secara matematis).
- Nomor **1–12** selalu ada. Nomor **13** masuk daftar dan dipilih otomatis ketika semua server 1–12 penuh. Lalu 14 saat 1–13 penuh, dan seterusnya.
- Server di atas 12 yang masih berisi pemain tetap terlihat meskipun server sebelumnya sudah longgar; setelah kosong, server tambahan boleh disembunyikan.
- Pemain tetap bisa mengetik ID 1–64 langsung untuk bertemu teman. Koneksi login Google, pembatasan laju dan limit 16/ruang tetap di server.
- **Tidak ada 64 Megalodon**: seluruh pemain memakai waktu dan eventId dari `nusa-api`, log duel diperiksa server, dan juara ditetapkan global. Dunia Bersama Muara tidak sama dengan area monster; belum ada arena sosial multiplayer berkapasitas masif di lokasi monster.
- Ruang Durable Object hanya dibuat saat benar-benar digunakan (lazy). Angka 1.024 adalah **slot rancangan, bukan jaminan** beban atau biaya Cloudflare. Sebelum pemain ramai, uji beban dan kuota.
- Ruang sudah dibuka atau belum dapat berubah ketika lobby restart, tetapi ID server eksplisit 1–64 tetap diterima untuk memungkinkan reconnect.

## Rilis

Gunakan branch `fitur/server-otomatis-64`, **bukan** branch 4.2 lama atau `main`. Script `firebase/scripts/rilis-server-otomatis.sh` menjalankan tes unit terkait, memastikan Dashboard, Kunjungi Rumah dan Event masih tersedia di Worker `nusa-api`, lalu meneruskan ke skrip rilis 4.2 yang mengubah **hanya** Worker `nusa-multiplayer` dan Firebase Hosting. Script akan berhenti bila prasyarat gagal atau pengguna tidak mengetik `ya`.

Setelah rilis, uji dua akun di Server #3, menu server baru saat simulasi penuh, kunjungan rumah privat, Event Megalodon, Dashboard Owner, QRIS, dan Cloud Save. Skrip tidak men-deploy `nusa-api` atau mengubah rules Firestore.
