# Podium Sultan Samudra — klien (Desain 4: Mercusuar Emas)
Simbol penghargaan koleksi. TIDAK memberi kekuatan, bonus memancing, atau keuntungan permainan. Terpisah dari Podium Pemancing.

Pasang (setelah backend aktif dan Owner menyalakan `NUSA_SULTAN=ya`):
```html
<link rel="stylesheet" href="podium-sultan/podium-sultan.css"><script src="podium-sultan/podium-sultan.js"></script>
```
```js
PodiumSultan.mount(elemen, { enabled: true, call: (nama, data) => /* pemanggil fungsi pemain yang sudah ada, mis. callFn(nama, data) */ });
```
- Bawaan `enabled=false`: tidak memanggil server, tidak menggambar apa pun. Server `inactive` → elemen dikosongkan.
- Fungsi server: `sultanTop`, `sultanMe`, `sultanPrefs {anon:boolean}`. Hanya {rank,name,points,title} yang dipakai; selebihnya dibuang.
- Tanpa polling; muat ulang manual dibatasi 5 menit (server juga cache 5 menit).
- Klien hidup (Premium Shop / Podium Pemancing) tidak ada di repo ini, jadi modul BELUM dipasang ke game.js. Pratinjau: `podium-sultan/preview.html` (data fiktif).
