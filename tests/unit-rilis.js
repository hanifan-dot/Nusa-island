// Tes pemeriksaan versi rilis (firebase/scripts/cek-rilis.js): kasus lolos & gagal memakai pohon berkas tiruan di memori.
const fs = require("fs"), path = require("path"), { check, rd } = require("../firebase/scripts/cek-rilis.js");
let pass = 0, fail = 0; const ok = (c, m) => { if (c) pass++; else { fail++; console.log("GAGAL:", m); } };
const real = rd(path.join(__dirname, ".."));
const mem = (over = {}, drop = []) => ({ read: (p) => (p in over ? over[p] : real.read(p)), exists: (p) => !drop.includes(p) && (p in over || real.exists(p)) });
const idx = real.read("index.html");
const has = (r, s) => r.errs.some((e) => e.includes(s));

let r = check({ src: real, build: null, liveHtml: null }); ok(r.errs.length === 0, "pohon asli lolos: " + r.errs.join("|"));
r = check({ src: real, build: null, liveHtml: idx }); ok(r.errs.length === 0, "live = calon rilis lolos");
// fitur hilang
r = check({ src: mem({}, ["event/ui.js"]), build: null, liveHtml: null }); ok(has(r, "Event Megalodon") && has(r, "event/ui.js"), "berkas Event hilang → gagal");
r = check({ src: mem({ "index.html": idx.replace(/<script[^>]*event\/ui\.js[^>]*><\/script>/, "") }), build: null, liveHtml: null }); ok(has(r, "index.html tidak memuat event/ui.js"), "tag event dihapus dari index → gagal");
r = check({ src: mem({ "event/ui.js": real.read("event/ui.js").replace("PILL_MS = 5000", "PILL_MS = 2000") }), build: null, liveHtml: null }); ok(has(r, "PILL_MS = 5000"), "banner bukan 5 detik → gagal");
r = check({ src: mem({ "game.js": real.read("game.js").replace("NW.hudMenu.hook()", "") }), build: null, liveHtml: null }); ok(has(r, "HUD 4.1"), "HUD 4.1 tak terpasang di game.js → gagal");
r = check({ src: mem({ "economy/core.js": real.read("economy/core.js").replace(/ecoStreakClaim/g, "x") }), build: null, liveHtml: null }); ok(has(r, "Ekonomi"), "Login 7 Hari versi server hilang → gagal");
r = check({ src: mem({ "firebase/scripts/build-hosting.sh": real.read("firebase/scripts/build-hosting.sh").replace(" event ", " ") }), build: null, liveHtml: null }); ok(has(r, "folder event/"), "build tak menyalin event/ → gagal");
// situs live punya aset yang calon rilis tidak punya
r = check({ src: real, build: null, liveHtml: idx.replace("</body>", '<script src="fitur/baru-live.js"></script></body>') }); ok(has(r, "fitur/baru-live.js"), "live punya aset yang hilang di calon → gagal");
r = check({ src: mem({ "firebase/release-manifest.json": JSON.stringify({ ...JSON.parse(real.read("firebase/release-manifest.json")), retired: ["fitur/baru-live.js"] }) }), build: null, liveHtml: idx.replace("</body>", '<script src="fitur/baru-live.js"></script></body>') }); ok(r.errs.length === 0, "aset di 'retired' diizinkan");
r = check({ src: real, build: null, liveHtml: "<html></html>" }); ok(r.errs.length === 0 && r.warns.length === 1, "index live tak lengkap → peringatan, bukan lolos palsu");
// build
const good = { "cloud/config.js": 'apiBase: "https://nusa-api.x.workers.dev"', "shop/config.js": 'backend: "cloud", release: "publik"' };
const bAll = (o = {}, drop = []) => ({ read: (p) => o[p] ?? good[p], exists: (p) => !drop.includes(p) && (p in o || p in good || !/^(cloud|shop)\/config\.js$/.test(p)) });
r = check({ src: real, build: bAll(), liveHtml: null }); ok(r.errs.length === 0, "build utuh lolos: " + r.errs.join("|"));
r = check({ src: real, build: bAll({ "shop/config.js": 'backend: "sim", release: "uji"' }), liveHtml: null }); ok(has(r, "konfigurasi produksi"), "build dengan toko mode uji → gagal");
r = check({ src: real, build: bAll({ "cloud/config.js": 'apiBase: ""' }), liveHtml: null }); ok(has(r, "apiBase kosong"), "build tanpa nusa-api → gagal");
r = check({ src: real, build: bAll({}, ["event/ui.js"]), liveHtml: null }); ok(has(r, "BUILD: aset event/ui.js"), "build kehilangan aset → gagal");
// kontrak protokol
r = check({ src: mem({ "mp/room-core.js": real.read("mp/room-core.js").replace('case "f"', 'case "zz"') }), build: null, liveHtml: null }); ok(has(r, "KONTRAK"), "pesan klien dihapus dari server → gagal");
// statis: skrip & workflow memanggil pemeriksaan
const sh = real.read("firebase/scripts/rilis.sh"), wf = real.read(".github/workflows/deploy-nusa-island.yml");
ok(/cek-rilis\.js --build firebase\/public --live/.test(sh), "rilis.sh: cek build + live sebelum tayang");
ok(/cek-rilis\.js --live .* --require-live/.test(wf), "workflow: cek live wajib (--require-live) di job cek");
ok(/github\.actor/.test(wf) && /repository_owner/.test(wf), "workflow: hanya pemilik repo");
ok(/id-token:\s*write/.test(wf) && /google-github-actions\/auth/.test(wf) && /GCP_WIF_PROVIDER/.test(wf), "workflow: OIDC tanpa kunci tersedia");
ok(!/\n\s+(push|pull_request|schedule|pull_request_target):/.test(wf), "workflow tetap manual");
console.log(`unit-rilis: ${pass} lolos, ${fail} gagal`); process.exit(fail ? 1 : 0);
