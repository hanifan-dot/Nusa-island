# Ikan lokasi baru (Ide 07B) — tabel otomatis

Dibuat dari `data.js` + `economy/ikanloc-core.js` oleh `scripts/ikan-lokasi-tabel.js`. Peluang = per tangkapan sah, hoki 1,0; kolom Siang/Malam = peluang ikan itu per lemparan di lokasi tsb (bersaing dengan SEMUA ikan lokasi, lama + baru; jumlah per waktu = 100% tanpa SUPER). **Ikan baru TIDAK keluar sampai flag dinyalakan (mati bawaan).**

## Muara Kampung

| Ikan | ID | Kelangkaan | Berat (kg) | Harga dasar | Harga maks* | Siang | Malam |
|---|---|---|---|---|---|---|---|
| Bilis Nipah | `mr_bilis` | Biasa | 0,02–0,09 | 85 | ≈25 | 11,6% | 9,69% |
| Betok Rawa | `mr_betok` | Biasa | 0,05–0,28 | 55 | ≈50 | 11,6% | 9,69% |
| Baung Kali | `mr_baung` | Biasa | 0,30–2,20 | 26 | ≈187 | 11,6% | 9,69% |
| Belida Pisau | `mr_belida` | Langka | 1,50–9,00 | 24 | ≈705 | 4,65% | 4,65% |
| Selais Bakau | `mr_selais` | Langka | 0,50–3,40 | 63 | ≈699 | 4,65% | 4,65% |
| Tapah Lumpur | `mr_tapah` | Langka | 2,00–11,0 | 20 | ≈718 | 4,65% | 4,65% |
| Jelawat Kencana | `mr_jelawat` | Epik | 3,00–16,0 | 54 | ≈2.819 | 2,91% | 2,91% |
| Toman Bara | `mr_toman_bara` | Epik | 4,00–22,0 | 39 | ≈2.799 | 2,91% | 2,91% |
| Patin Keramat | `mr_patin_keramat` | Legenda | 8,00–38,0 | 77 | ≈9.546 | 1,64% | 0,927% |
| Gabus Hantu Bakau | `mr_gabus_hantu` | Mitos | 3,00–14,0 | 285 | ≈13.017 | 0,492% | 0,278% |
| Belida Kembang Bulan | `mr_belida_bulan` | SUPER RARE | 14,0–48,0 | 57 | ≈8.926 | 1 : 4.000 (server) | sama |

## Tepian Toba

| Ikan | ID | Kelangkaan | Berat (kg) | Harga dasar | Harga maks* | Siang | Malam |
|---|---|---|---|---|---|---|---|
| Bilih Danau | `tb_bilih` | Biasa | 0,02–0,08 | 120 | ≈31 | 9,69% | 9,69% |
| Tawes Danau | `tb_tawes` | Biasa | 0,30–1,90 | 24 | ≈149 | 9,69% | 9,69% |
| Gurami Tepian | `tb_gurame` | Biasa | 0,50–3,20 | 22 | ≈230 | 9,69% | 9,69% |
| Sidat Kawah | `tb_sidat` | Langka | 0,80–5,50 | 45 | ≈807 | 5,81% | 5,81% |
| Kelabau Biru | `tb_kelabau` | Langka | 1,20–7,00 | 35 | ≈799 | 5,81% | 5,81% |
| Hampala Bukit | `tb_hampala` | Langka | 1,50–8,00 | 31 | ≈809 | 5,81% | 5,81% |
| Jambal Samosir | `tb_jambal` | Epik | 4,00–20,0 | 52 | ≈3.393 | 2,91% | 2,91% |
| Baung Pusuk | `tb_baung_pusuk` | Epik | 5,00–26,0 | 40 | ≈3.393 | 2,91% | 2,91% |
| Gurami Naga Sibolga | `tb_gurami_naga` | Legenda | 9,00–36,0 | 136 | ≈15.973 | 0,927% | 1,64% |
| Belut Kawah Purba | `tb_belut_kawah` | Mitos | 4,00–18,0 | 324 | ≈19.027 | 0,278% | 0,492% |
| Ihan Kencana Sipiso | `tb_ihan_kencana` | SUPER RARE | 12,0–44,0 | 77 | ≈11.053 | 1 : 5.000 (server) | sama |

## Selat Sunda

| Ikan | ID | Kelangkaan | Berat (kg) | Harga dasar | Harga maks* | Siang | Malam |
|---|---|---|---|---|---|---|---|
| Teri Krakatau | `st_teri` | Biasa | 0,01–0,05 | 160 | ≈26 | 9,69% | 9,69% |
| Bandeng Selat | `st_bandeng` | Biasa | 0,50–3,40 | 22 | ≈244 | 9,69% | 9,69% |
| Lemuru Banten | `st_lemuru` | Biasa | 0,05–0,22 | 70 | ≈50 | 9,69% | 9,69% |
| Layur Perak | `st_layur` | Langka | 0,60–3,80 | 97 | ≈1.203 | 3,88% | 3,88% |
| Bubara Jaring | `st_bubara` | Langka | 1,00–6,50 | 57 | ≈1.209 | 3,88% | 3,88% |
| Kuwe Gerong | `st_gerong` | Langka | 1,50–9,00 | 41 | ≈1.204 | 3,88% | 3,88% |
| Tenggiri Papan | `st_tenggiri_papan` | Epik | 5,00–32,0 | 43 | ≈4.489 | 2,18% | 2,18% |
| Hiu Lanjam | `st_hiu_lanjam` | Epik | 15,0–80,0 | 17 | ≈4.437 | 2,18% | 2,18% |
| Pari Layang Anyer | `st_pari_anyer` | Legenda | 25,0–110 | 55 | ≈18.843 | 1,64% | 0,927% |
| Pelangi Anak Krakatau | `st_pelangi_kawah` | Mitos | 6,00–26,0 | 236 | ≈20.019 | 0,492% | 0,278% |
| Layur Api Krakatau | `st_layur_api` | SUPER RARE | 18,0–62,0 | 62 | ≈12.541 | 1 : 6.500 (server) | sama |

## Raja Ampat

| Ikan | ID | Kelangkaan | Berat (kg) | Harga dasar | Harga maks* | Siang | Malam |
|---|---|---|---|---|---|---|---|
| Kepe-kepe Ekor Merah | `ra_kepe` | Biasa | 0,05–0,22 | 100 | ≈72 | 11,6% | 11,6% |
| Sersan Mayor | `ra_sersan` | Biasa | 0,05–0,25 | 90 | ≈73 | 11,6% | 11,6% |
| Betok Laut Biru | `ra_betok_laut` | Biasa | 0,08–0,45 | 55 | ≈81 | 11,6% | 11,6% |
| Kakap Merah Karang | `ra_kakap_karang` | Langka | 1,00–6,00 | 97 | ≈1.899 | 5,81% | 5,81% |
| Kerapu Bebek | `ra_kerapu_bebek` | Langka | 1,50–9,00 | 65 | ≈1.909 | 5,81% | 5,81% |
| Bibir Tebal Pelangi | `ra_bibir_manis` | Langka | 2,00–12,0 | 49 | ≈1.918 | 5,81% | 5,81% |
| Wobbegong Cenderawasih | `ra_wobbe` | Epik | 12,0–60,0 | 46 | ≈9.005 | 2,91% | 2,91% |
| Pari Bendera Karang | `ra_pari_bendera` | Epik | 10,0–55,0 | 50 | ≈8.972 | 2,91% | 2,91% |
| Hiu Berjalan Halmahera | `ra_hiu_jalan` | Legenda | 8,00–36,0 | 162 | ≈19.027 | 0,927% | 0,927% |
| Pari Cahaya Wayag | `ra_pari_wayag` | Mitos | 22,0–90,0 | 68 | ≈19.967 | 0,278% | 0,278% |
| Cenderawasih Laut | `ra_cenderawasih` | SUPER RARE | 16,0–58,0 | 71 | ≈13.435 | 1 : 8.000 (server) | sama |

## Laut Banda

| Ikan | ID | Kelangkaan | Berat (kg) | Harga dasar | Harga maks* | Siang | Malam |
|---|---|---|---|---|---|---|---|
| Tongkol Abu Banda | `bd_tongkol` | Biasa | 0,60–4,50 | 30 | ≈440 | 11,6% | 11,6% |
| Malalugis Biru | `bd_malalugis` | Biasa | 0,20–1,20 | 55 | ≈215 | 11,6% | 11,6% |
| Layang Banda | `bd_layang_banda` | Biasa | 0,15–0,60 | 70 | ≈137 | 11,6% | 11,6% |
| Lemadang Emas | `bd_lemadang` | Langka | 4,00–22,0 | 84 | ≈6.029 | 5,81% | 5,81% |
| Tenggiri Samudra | `bd_tenggiri_samudra` | Langka | 6,00–36,0 | 51 | ≈5.990 | 5,81% | 5,81% |
| Kuwe Selatan | `bd_kuwe_selatan` | Langka | 5,00–30,0 | 61 | ≈5.970 | 5,81% | 5,81% |
| Hiu Martil Banda | `bd_hiu_martil` | Epik | 40,0–220 | 29 | ≈12.161 | 2,91% | 2,91% |
| Tuna Mata Besar | `bd_tuna_matabesar` | Epik | 25,0–160 | 31 | ≈11.890 | 2,91% | 2,91% |
| Mola Palung Banda | `bd_mola` | Legenda | 60,0–320 | 24 | ≈11.246 | 0,927% | 0,646% |
| Raja Herring Dayung | `bd_dayung` | Mitos | 30,0–140 | 53 | ≈19.578 | 0,278% | 0,194% |
| Raja Laut Purba | `bd_raja_laut` | SUPER RARE | 45,0–190 | 35 | ≈14.083 | 1 : 10.000 (server) | sama |

\* Harga maks = perkiraan nilai jual tertinggi (berat maksimum × pengali varian 1,45) dengan rumus ekonomi yang sama dengan ikan lama; batas atas SUPER RARE ≤ ~14.000, di bawah hadiah Megalodon (16.000).

