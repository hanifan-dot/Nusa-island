# Kontrak API Podium Juara — `leaderboardTop` (v1)

Status: **klien siap, server BELUM ada.** Selama server belum menjawab, podium menampilkan "Belum ada Juara 1/2/3". Tidak ada peringkat palsu.

## Permintaan
`NW.cloud.call("leaderboardTop", { category: "catch" | "species", limit: 3..10 })` → Worker `/fn/leaderboardTop` (Bearer Firebase ID token, seperti fungsi lain).

## Respons
```json
{ "ok": true, "v": 1, "status": "live", "category": "catch", "updatedAt": 1762500000000,
  "entries": [ { "rank": 1, "name": "Budi_Nelayan", "score": 1840, "title": "Raja Pancing", "outfit": "t:kaos_merah:2|p:celana_biru:1" } ],
  "me": { "rank": 12, "score": 88 } }
```
- `status:"inactive"` = server sengaja belum mengaktifkan papan → klien tampilkan placeholder.
- `entries` urut rank 1,2,3… berurutan; `score` bilangan bulat ≥0, tidak naik ke bawah, ≤1e12.
- `name` = **nama pemain permanen** (lolos `NusaNameCore.validate`). `title` opsional (≤24 karakter); jika tidak ada, klien memakai gelar bawaan `NusaPodiumCore.TITLES` (mudah diubah dari data server).
- `outfit` opsional = kode avatar Tahap 2.6 (`^[tphacsr]:[a-z0-9_]{1,24}:[0-9]{1,2}$`, dipisah `|`, ≤7 bagian, ≤140 karakter). Tanpa outfit → gaya bawaan.
- `me` opsional: peringkat pemanggil.

Klien **menolak seluruh papan** (→ inactive) bila bentuk/versi/kategori salah, rank tidak berurutan, skor tidak valid, nama tidak valid, atau outfit tidak valid.

## Kategori (hanya statistik yang dipegang server)
| id | Arti | Sumber server |
|---|---|---|
| `catch` | total ikan | jumlah `eco.cat` pada `shop/economy/<uid>` |
| `species` | jumlah spesies berbeda | banyak kunci `eco.cat` > 0 |

Batas jujur: server tidak bisa melihat pemain benar-benar memancing; angka dibatasi laju (`catchGapMs`, `catchPerHour`) sehingga manipulasi diperkecil, bukan dihilangkan. Peringkat TIDAK PERNAH dihitung dari `localStorage`/save di browser.

## Pertanyaan terbuka (untuk Worker 02 / Owner)
1. Siapa yang mengimplementasi agregasi server? Usul: dokumen `leaderboard/<category>` yang diperbarui terjadwal (mis. tiap 5–10 menit) dari `shop/economy/*`, agar baca murah (kuota Firestore).
2. Apakah `outfit` dikirim dari server (disalin dari profil avatar Worker 02)? Format harus tetap sama dengan `mp/proto.cleanOutfit`.
3. Nama di `entries[].name` harus nama permanen (Tahap 2.5), bukan nama Google.
