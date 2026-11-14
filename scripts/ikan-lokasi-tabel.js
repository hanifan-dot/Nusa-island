// Cetak tabel 55 ikan lokasi baru DARI DATA NYATA (data.js + economy/ikanloc-core.js): node scripts/ikan-lokasi-tabel.js > docs/IKAN-LOKASI-TABEL.md
const fs = require("fs"), path = require("path"), vm = require("vm"), IK = require("../economy/ikanloc-core.js");
const ctx = vm.createContext({}); vm.runInContext(fs.readFileSync(path.join(__dirname, "../data.js"), "utf8") + ";globalThis.D={FISH,LOCATIONS,RARITY}", ctx);
const { FISH, LOCATIONS, RARITY } = ctx.D, FM = require("../fishmath.js");
const NAME = { muara: "Muara Kampung", toba: "Tepian Toba", selat: "Selat Sunda", ampat: "Raja Ampat", banda: "Laut Banda" };
const pct = (x) => ((x * 100 >= 10 ? (x * 100).toFixed(1) : x * 100 >= 1 ? (x * 100).toFixed(2) : (x * 100).toFixed(3)).replace(".", ",")) + "%";
const kg = (x) => (x >= 100 ? Math.round(x) : x >= 10 ? x.toFixed(1) : x.toFixed(2)).toString().replace(".", ",");
const out = ["# Ikan lokasi baru (Ide 07B) — tabel otomatis", "", "Dibuat dari `data.js` + `economy/ikanloc-core.js` oleh `scripts/ikan-lokasi-tabel.js`. Peluang = per tangkapan sah, hoki 1,0; kolom Siang/Malam = peluang ikan itu per lemparan di lokasi tsb (bersaing dengan SEMUA ikan lokasi, lama + baru; jumlah per waktu = 100% tanpa SUPER). **Ikan baru TIDAK keluar sampai flag dinyalakan (mati bawaan).**", ""];
for (const l of Object.keys(NAME)) {
  const mp = (a) => Object.fromEntries(a.map((x) => [x.id, x.p])), o = { d: mp(IK.odds(FISH, RARITY, l, false)), n: mp(IK.odds(FISH, RARITY, l, true)) };
  out.push(`## ${NAME[l]}`, "", "| Ikan | ID | Kelangkaan | Berat (kg) | Harga dasar | Harga maks* | Siang | Malam |", "|---|---|---|---|---|---|---|---|");
  for (const f of FISH.filter((x) => x.x && x.loc === l)) {
    const tag = f.sup ? "SUPER RARE" : f.mitos ? "Mitos" : f.rarity[0].toUpperCase() + f.rarity.slice(1);
    const mx = Math.round(2.25 * f.price * FM.effectiveKg(f.wMax) * 1.45);
    const pd = f.sup ? `1 : ${IK.ONE_IN[l].toLocaleString("id-ID")} (server)` : pct(o.d[f.id] || 0), pn = f.sup ? "sama" : pct(o.n[f.id] || 0);
    out.push(`| ${f.name} | \`${f.id}\` | ${tag} | ${kg(f.wMin)}–${kg(f.wMax)} | ${f.price} | ≈${mx.toLocaleString("id-ID")} | ${pd} | ${pn} |`);
  }
  out.push("");
}
out.push("\\* Harga maks = perkiraan nilai jual tertinggi (berat maksimum × pengali varian 1,45) dengan rumus ekonomi yang sama dengan ikan lama; batas atas SUPER RARE ≤ ~14.000, di bawah hadiah Megalodon (16.000).", "");
console.log(out.join("\n"));
