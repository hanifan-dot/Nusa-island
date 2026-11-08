// Hotfix hemat kuota: saat server gagal (503/offline) klien TIDAK boleh mencoba ulang terus-menerus. Uji murni + pagar statis, tanpa jaringan.
const assert = require("assert"), fs = require("fs"), path = require("path");
let n = 0; const t = (name, f) => { try { f(); n++; console.log("ok  " + name); } catch (e) { console.log("FAIL " + name + "\n   " + e.message); process.exitCode = 1; } };
const src = (f) => fs.readFileSync(path.join(__dirname, "..", f), "utf8");
const pick = (s) => { const m = /const (?:bo|retryGap) = (\(n, base\) => [^;]+);/.exec(s); assert(m, "fungsi jeda tidak ada"); return eval(m[1]); };

t("jeda membesar dua kali lipat dan berhenti di 5 menit (semua modul memakai rumus yang sama)", () => {
  for (const f of ["economy/client.js", "questowner/questowner.js", "streak/streak.js", "sf2/sf2.js", "shop/wallet.js"]) {
    const g = pick(src(f)); assert.strictEqual(g(0, 2500), 2500); assert.strictEqual(g(1, 2500), 5000); assert.strictEqual(g(3, 2500), 20000);
    assert.strictEqual(g(50, 45000), 300000, f); assert(g(2, 4000) > g(1, 4000));
  }
});
t("ekonomi: ensure() 2,5 dtk tidak lagi menembak server selama jeda setelah gagal; berhasil mereset", () => {
  const s = src("economy/client.js");
  assert(/Date\.now\(\) >= ensureAt\) ensure\(\)/.test(s)); assert(/ensureFail\+\+; ensureAt = Date\.now\(\) \+ bo\(ensureFail, 2500\)/.test(s)); assert(/ensureFail = 0; ensureAt = 0;/.test(s));
});
t("Quest Owner (4 dtk) dan Streak (30 dtk): coba-ulang tertahan jeda setelah gagal; berhasil mereset", () => {
  const q = src("questowner/questowner.js"), s = src("streak/streak.js");
  assert(/Date\.now\(\) >= qAt && access\(\)\.ok\) refresh\(\)/.test(q)); assert(/qFail\+\+; qAt = Date\.now\(\) \+ bo\(qFail, 4000\)/.test(q)); assert(/qFail = 0; qAt = 0;/.test(q));
  assert(/Date\.now\(\) >= sAt && access\(\)\.ok\) refresh\(false\)/.test(s)); assert(/sFail\+\+; sAt = Date\.now\(\) \+ bo\(sFail, 30000\)/.test(s)); assert(/sFail = 0; sAt = 0;/.test(s));
});
t("SF2: kegagalan tidak lagi memicu permintaan tiap 700 ms (dulu info=null → refresh tiap tick)", () => {
  const s = src("sf2/sf2.js");
  assert(/active\(\) && !info && Date\.now\(\) >= nextTry\) refresh\(false\)/.test(s)); assert(/fails\+\+; nextTry = Date\.now\(\) \+ retryGap\(fails, 10000\)/.test(s));
});
t("dompet toko 45 dtk: ditahan jeda setelah gagal", () => {
  const s = src("shop/wallet.js");
  assert(/Date\.now\(\) >= wAt\) refresh\(\)/.test(s)); assert(/wFail\+\+; wAt = Date\.now\(\) \+ bo\(wFail, 45000\)/.test(s));
});
t("dompet toko: permintaan ke server paling cepat tiap 3 mnt (dulu 45 dtk) dan kembali ke tab hanya bila >60 dtk; hook mereset penghitung", () => {
  const s = src("shop/wallet.js");
  assert(/WALLET_POLL_MS = 180000/.test(s)); assert(/WALLET_VIS_GAP = 60000/.test(s));
  assert(/Date\.now\(\) - wLast >= WALLET_POLL_MS && Date\.now\(\) >= wAt\) refresh\(\)/.test(s));
  assert(/visibilitychange", \(\) => \{ if \(!document\.hidden && Date\.now\(\) - wLast >= WALLET_VIS_GAP\) refresh\(\)/.test(s));
  assert(/function setFrom\(e\) \{\s*wLast = Date\.now\(\);/.test(s), "setiap pembacaan hak milik (hook) menyegarkan penghitung");
  assert((s.match(/setInterval\(/g) || []).length === 1, "tetap satu setInterval");
});
t("tidak ada polling BARU: tidak ada setInterval tambahan di modul yang diubah", () => {
  const before = { "economy/client.js": 2, "questowner/questowner.js": 1, "streak/streak.js": 1, "sf2/sf2.js": 2, "shop/wallet.js": 1 };
  for (const [f, c] of Object.entries(before)) assert.strictEqual((src(f).match(/setInterval\(/g) || []).length, c, f);
});
console.log(`unit-backoff-kuota: ${n} lulus`);
