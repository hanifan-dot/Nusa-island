// Ikan komunitas "Kontolodon" (desain @devilbesideme_): NONAKTIF, peluang ikan lain TIDAK berubah, kredit desain, tanpa aset gambar/foto baru.
const assert = require("assert"), fs = require("fs"), path = require("path"), cp = require("child_process");
const SF2 = require("../economy/sf2-core.js");
let pass = 0, fail = 0; const t = (n, f) => { try { f(); pass++; } catch (e) { fail++; console.log("GAGAL:", n, "\n   ", e.message); } };
const K = SF2.BY_ID.sf2_kontolodon;
t("terdaftar, id permanen, nama sesuai permintaan, rarity/habitat sah", () => { assert.ok(K && K.kind === "sf2" && K.name === "Kontolodon"); assert.ok(SF2.RARITIES.includes(K.rarity)); assert.ok(K.hab.every((h) => SF2.HABITATS.includes(h))); assert.ok(K.wMin > 0 && K.wMax > K.wMin); });
t("NONAKTIF: tidak ada di indeks undian satu habitat/rarity pun", () => { assert.strictEqual(K.active, false); SF2.reset(); for (const h of SF2.HABITATS) for (const r of SF2.RARITIES) assert.ok(!SF2.pickSpecies(h, r, 0.5) || SF2.pickSpecies(h, r, 0.5).id !== "sf2_kontolodon"); let hit = 0; for (const h of SF2.HABITATS) for (const r of SF2.RARITIES) for (let i = 0; i < 200; i++) { const s = SF2.pickSpecies(h, r, i / 200); if (s && s.id === "sf2_kontolodon") hit++; } assert.strictEqual(hit, 0); });
t("peluang ikan lain TIDAK berubah: tabel rarity & daftar undian tiap habitat identik dengan tanpa Kontolodon", () => {
  const withK = {}; SF2.reset(); for (const h of SF2.HABITATS) for (const r of SF2.RARITIES) { const l = []; for (let i = 0; i < 400; i++) { const s = SF2.pickSpecies(h, r, i / 400); l.push(s ? s.id : null); } withK[h + r] = l.join(); }
  const idx = SF2.SPECIES.findIndex((s) => s.id === "sf2_kontolodon"), [rm] = SF2.SPECIES.splice(idx, 1); SF2.reset();
  for (const h of SF2.HABITATS) for (const r of SF2.RARITIES) { const l = []; for (let i = 0; i < 400; i++) { const s = SF2.pickSpecies(h, r, i / 400); l.push(s ? s.id : null); } assert.strictEqual(l.join(), withK[h + r], h + r); }
  SF2.SPECIES.splice(idx, 0, rm); SF2.reset();
  const o = SF2.odds(0); assert.deepStrictEqual([o.common, o.uncommon, o.rare, o.epic, o.mythic], [5675, 2785, 825, 515, 200]); assert.strictEqual(o.common + o.uncommon + o.rare + o.epic + o.mythic, 10000);
});
t("kredit desain @devilbesideme_ ada di data; kredit ide/IG lain tidak tercampur", () => { assert.deepStrictEqual(K.design, ["@devilbesideme_"]); assert.deepStrictEqual(K.credit, []); for (const s of SF2.SPECIES) if (s.id !== K.id) assert.deepStrictEqual(s.design, []); });
t("deskripsi bersih (tanpa detail anatomi/eksplisit)", () => { assert.ok(!/(sex|seks|porno|telanjang|alat vital|kelamin)/i.test(K.desc)); assert.ok(K.desc.length < 160); });
t("bentuk 'gendut' ada di gambar dan tidak memakai gambar eksternal", () => { const d = fs.readFileSync(path.join(__dirname, "../sf2/draw.js"), "utf8"); assert.ok(/\bgendut\(c, s, t, pal\)/.test(d)); assert.strictEqual(K.shape, "gendut"); assert.ok(!/new Image|\.png|\.jpg|\.jpeg/.test(d.slice(d.indexOf("gendut(c"), d.indexOf("  ikan(c, s, t, pal)")))); });
t("tidak ada berkas gambar/foto baru di diff (sketsa & foto orang tidak ikut repo)", () => { let out = ""; try { out = cp.execSync("git diff --name-only 71290dd -- . ; git ls-files --others --exclude-standard", { cwd: path.join(__dirname, ".."), encoding: "utf8" }); } catch (e) {} assert.ok(!/\.(png|jpe?g|webp|gif|heic)$/im.test(out), out); });
t("salinan Functions sama dengan sumber", () => { assert.strictEqual(fs.readFileSync(path.join(__dirname, "../firebase/functions/lib/sf2-core.js"), "utf8").split("\n").slice(1).join("\n"), fs.readFileSync(path.join(__dirname, "../economy/sf2-core.js"), "utf8")); });
console.log(`unit-kontolodon: ${pass} lolos, ${fail} gagal`); process.exit(fail ? 1 : 0);
