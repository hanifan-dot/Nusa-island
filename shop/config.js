// NUSA ISLAND — konfigurasi Premium Shop (dibaca klien). BUKAN rahasia & tidak memberi hak apa pun: harga/kepemilikan/status ditentukan SERVER.
//  backend: "sim"   = backend simulasi di browser (tanpa uang; situs uji)
//           "cloud" = Cloud Functions shop_* (butuh paket Blaze; pembayaran nyata hanya jika server dinyalakan Owner)
//  release: "uji"   = tombol simulasi tampil (hanya untuk situs uji)
//           "publik"= build untuk pemain umum: tanpa tombol simulasi / alat uji; toko menampilkan "Segera hadir" selama server belum NYATA
window.NUSA_SHOP = { backend: "sim", release: "uji", whatsapp: "628967234059", qrisImage: "shop/qris.png" };
