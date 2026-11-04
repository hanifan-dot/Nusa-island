// Pemulihan akun adalah pintu masuk terpisah: tidak boleh memuat game, localStorage
// overwrite, atau melakukan pembayaran. Ini hanya tes statis; tes browser diperlukan.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const html=fs.readFileSync('ajukan-pemulihan.html','utf8');
const js=(html.match(/<script>([\s\S]*?)<\/script>/)||[])[1];
assert.ok(js,'skrip pemulihan ada');
new vm.Script(js);
assert.match(html,/type="file"/);
assert.match(html,/Saya setuju data progres/);
assert.match(js,/auth\.signInWithPopup/);
assert.match(js,/current\.getIdToken\(\)/);
assert.match(js,/\/fn\/recoveryRequest/);
assert.match(js,/selected=raw/);
assert.match(js,/showLocalBackups\(\)/);
assert.match(js,/localStorage\.getItem/);
assert.match(js,/chooseCandidate\(row\.raw,label\)/);
assert.match(js,/container\.appendChild\(b\)/);
assert.match(html,/tanpa perlu download/);
assert.match(html,/Cadangan nomor/);
assert.match(js,/\$\('consent'\)\.checked/);
assert.doesNotMatch(js,/localStorage\.setItem|localStorage\.removeItem|\/fn\/writeSave|\/fn\/ecoInit|\/api\/orders/);
assert.doesNotMatch(html,/<script[^>]+src="\/game\.js"/);
const build=fs.readFileSync('firebase/scripts/build-hosting.sh','utf8');
assert.match(build,/selamatkan-data\.html ajukan-pemulihan\.html/);
console.log('PASS: recovery portal requires consent + Google token and never writes Cloud Save directly; local backup selection is read-only.');
