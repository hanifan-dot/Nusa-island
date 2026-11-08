# Joran Level 11–20 & spesies baru — USULAN untuk persetujuan Owner

Status: kandidat ini memuat data + UI, tetapi **peluang tangkap spesies baru TIDAK diaktifkan** dan statistik joran di bawah adalah **usulan**. Ekonomi produksi tidak berubah sebelum Owner menyetujui. Level 1–10 tidak diubah.

## Joran (nama & harga sesuai daftar Owner; beli berurutan, divalidasi server `ecoBuy`)
| Lv | Nama | Harga | Kapasitas (kg) | Kekuatan | Tarik |
|---|---|---|---|---|---|
| 10 (lama) | Joran Penakluk Samudra | 110.000 | 500 | 4,20 | 3,20 |
| 11 | Joran Badai Laut | 140.000 | 525 | 4,32 | 3,28 |
| 12 | Joran Karang Emas | 175.000 | 550 | 4,44 | 3,36 |
| 13 | Joran Hiu Raja | 220.000 | 575 | 4,56 | 3,44 |
| 14 | Joran Palung Hitam | 275.000 | 600 | 4,68 | 3,52 |
| 15 | Joran Kaisar Samudra | 350.000 | 625 | 4,80 | 3,60 |
| 16 | Joran Naga Laut | 450.000 | 650 | 4,92 | 3,68 |
| 17 | Joran Abyss | 575.000 | 675 | 5,04 | 3,76 |
| 18 | Joran Leviathan | 700.000 | 700 | 5,16 | 3,84 |
| 19 | Joran Penguasa Legenda | 850.000 | 725 | 5,28 | 3,92 |
| 20 | Joran Dewa Samudra | 1.000.000 | 750 | 5,40 | 4,00 |

Kenaikan per level lebih kecil daripada Lv 6–10 (±3% vs ±10%); Lv 20 ≤ 1,3× Lv 10. Kapasitas ≤ 4.900 kg (batas bobot Cloud Save). Cermin server `quest-core.ROD_CAP` dijaga sama dengan `data.js` oleh tes. Joran khusus WhatsApp/Aurora tidak disentuh.

## Spesies baru (nonaktif — belum diundi)
| Spesies | Rarity usulan | Habitat | Bobot | Kredit |
|---|---|---|---|---|
| El Gran Maja | Mythic | Laut Dalam | 3.600–4.900 kg | @derr6789ten |
| Udang Jala | Uncommon | Muara | 0,03–0,35 kg | Usulan Komunitas GRUP NUSA |

Keduanya tampil di Koleksi Ikan → Samudra Follower dan Buku Koleksi SF2 (redup bila belum ditemukan, kredit tetap terlihat). Mengaktifkannya = mengubah isi kolam rarity → Owner perlu memutuskan: aktifkan (flag `a:0` dihapus; Pity dan tabel bp tidak berubah, hanya daftar spesies dalam kolam yang bertambah) atau tetap tampil-saja. Harga jual mengikuti pita rarity yang ada.
