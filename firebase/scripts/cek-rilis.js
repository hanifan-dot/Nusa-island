#!/usr/bin/env node
// NUSA ISLAND — pemeriksaan versi rilis (tanpa rahasia, tanpa jaringan kecuali --live). Dipakai tombol GitHub "Deploy Nusa Island" dan rilis.sh.
// Tujuan: pembaruan multiplayer TIDAK boleh menimpa fitur yang sudah live. Gagal bila:
//   1. fitur wajib (firebase/release-manifest.json) kehilangan berkas, tag di index.html, penanda kode, atau folder di build-hosting.sh;
//   2. situs LIVE memuat aset (skrip/css) yang tidak ada di index.html calon rilis (kecuali sengaja ditulis di "retired");
//   3. (--build) hasil build kehilangan folder/aset yang dirujuk index.html, atau konfigurasi produksi (QRIS publik) tidak terpasang;
//   4. kontrak protokol multiplayer (jenis pesan yang sudah dipakai klien live) berubah.
// Pemakaian: node firebase/scripts/cek-rilis.js [--src DIR] [--build firebase/public] [--live https://situs | --live-file index-live.html]
const fs = require("fs"), path = require("path");
const rd = (root) => ({ read: (p) => fs.readFileSync(path.join(root, p), "utf8"), exists: (p) => fs.existsSync(path.join(root, p)) });
const assetsOf = (html) => { const out = new Set(); for (const m of html.matchAll(/<(?:script|link)\b[^>]*?(?:src|href)="([^"#?]+)"/g)) if (!/^(https?:)?\/\//.test(m[1])) out.add(m[1]); return out; };

// src/build: objek {read, exists}; liveHtml: string|null
function check({ src, build, liveHtml }) {
  const errs = [], warns = [], man = JSON.parse(src.read("firebase/release-manifest.json"));
  const index = src.read("index.html"), idx = assetsOf(index), bh = src.exists("firebase/scripts/build-hosting.sh") ? src.read("firebase/scripts/build-hosting.sh") : "";
  const cpLines = bh.split("\n").filter((l) => /^\s*cp\s+-r\s/.test(l)).join(" ");
  for (const f of man.features) {
    for (const p of f.files) if (!src.exists(p)) errs.push(`[${f.id}] ${f.nama}: berkas hilang: ${p}`);
    for (const p of f.index) if (!idx.has(p)) errs.push(`[${f.id}] ${f.nama}: index.html tidak memuat ${p}`);
    for (const [p, s] of f.markers || []) { if (!src.exists(p)) errs.push(`[${f.id}] penanda: berkas ${p} hilang`); else if (!src.read(p).includes(s)) errs.push(`[${f.id}] ${f.nama}: penanda "${s}" tidak ada di ${p}`); }
    for (const d of f.build_dirs || []) if (!new RegExp("(^|\\s)" + d + "(\\s|$)").test(cpLines) && !(d === "mp" && /firebase\/public\/mp/.test(bh))) errs.push(`[${f.id}] ${f.nama}: build-hosting.sh tidak menyalin folder ${d}/`);
  }
  if (liveHtml != null) {
    const retired = new Set(man.retired || []), live = assetsOf(liveHtml);
    if (live.size < 20) warns.push(`index live hanya memuat ${live.size} aset (tampak tidak lengkap): pemeriksaan live dilewati`);
    else for (const a of live) if (!idx.has(a) && !retired.has(a)) errs.push(`LIVE memuat ${a} tetapi calon rilis TIDAK: rilis ini akan menghapus fitur yang sudah live (gabungkan cabang yang memuatnya, atau tulis di "retired" bila disengaja)`);
  }
  if (build) {
    for (const a of idx) if (!build.exists(a)) errs.push(`BUILD: aset ${a} dirujuk index.html tetapi tidak ada di hasil build`);
    for (const f of man.features) for (const [p, s] of f.post_build || []) { if (!build.exists(p)) errs.push(`BUILD [${f.id}]: ${p} tidak ada`); else if (!build.read(p).includes(s)) errs.push(`BUILD [${f.id}] ${f.nama}: konfigurasi produksi "${s}" tidak terpasang di ${p}`); }
    if (build.exists("cloud/config.js") && /apiBase:\s*""/.test(build.read("cloud/config.js"))) errs.push("BUILD: apiBase kosong (Worker ekonomi tidak terpasang)");
  }
  const pc = man.protocol_contract || {}, room = src.exists("mp/room-core.js") ? src.read("mp/room-core.js") : "", client = src.exists("mp/client.js") ? src.read("mp/client.js") : "";
  for (const t of pc.client_to_server || []) if (!new RegExp(`case "${t}"`).test(room)) errs.push(`KONTRAK: server tidak lagi menangani pesan klien "${t}"`);
  for (const t of pc.server_to_client || []) if (!new RegExp(`case "${t}"`).test(client)) errs.push(`KONTRAK: klien tidak lagi menangani pesan server "${t}"`);
  return { errs, warns, features: man.features.length, assets: idx.size };
}

module.exports = { check, assetsOf, rd };
if (require.main === module) {
  const a = process.argv.slice(2), arg = (k) => { const i = a.indexOf(k); return i >= 0 ? a[i + 1] : null; };
  const root = path.resolve(arg("--src") || path.join(__dirname, "../.."));
  (async () => {
    let liveHtml = null;
    if (arg("--live-file")) liveHtml = fs.readFileSync(arg("--live-file"), "utf8");
    else if (arg("--live")) { try { const r = await fetch(arg("--live").replace(/\/+$/, "") + "/index.html", { headers: { "cache-control": "no-cache" } }); if (!r.ok) throw new Error("HTTP " + r.status); liveHtml = await r.text(); } catch (e) { console.error("PERINGATAN: tidak bisa membaca situs live (" + e.message + "): pemeriksaan live dilewati"); } }
    if (a.includes("--require-live") && liveHtml == null) { console.error("GAGAL: --require-live tetapi situs live tidak terbaca; tidak menayangkan tanpa pembanding."); process.exit(1); }
    const r = check({ src: rd(root), build: arg("--build") ? rd(path.resolve(arg("--build"))) : null, liveHtml });
    for (const w of r.warns) console.log("⚠ " + w);
    if (r.errs.length) { console.error(`\nPEMERIKSAAN RILIS GAGAL (${r.errs.length}):`); for (const e of r.errs) console.error("  ✗ " + e); process.exit(1); }
    console.log(`Pemeriksaan rilis OK: ${r.features} fitur wajib lengkap, ${r.assets} aset index${liveHtml != null ? ", tidak ada fitur live yang hilang" : ""}${arg("--build") ? ", build utuh" : ""}.`);
  })();
}
