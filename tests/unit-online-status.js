// Indikator HUD: Single bukan offline; angka hanya multiplayer nyata; koneksi putus mengunci input.
const fs = require("fs"), vm = require("vm"), assert = require("assert");
const code = fs.readFileSync(__dirname + "/../mp/ui.js", "utf8");
const ctx = { window: { NW: { mp: {} }, Nusa: {} }, document: { getElementById: () => null }, console };
ctx.window.window = ctx.window; ctx.NW = ctx.window.NW; vm.runInNewContext(code, ctx);
const state = ctx.window.NW.mpUI._dockState;
let pass = 0;
function t(name, fn) { fn(); pass++; console.log("PASS", name); }
const v = (extra) => Object.assign({ online: false, n: 0, state: "off", why: "", prefs: { on: true } }, extra || {});
t("Singleplayer online tampil Single", () => assert.deepStrictEqual({ ...state(v({ prefs: { on: false } }), true, false) }, { text: "Single", kind: "single", blocked: false, label: "Singleplayer · online" }));
t("Singleplayer tanpa internet tetap terkunci", () => { const s = state(v({ prefs: { on: false } }), false, false); assert.strictEqual(s.text, "!"); assert.strictEqual(s.blocked, true); });
t("multiplayer satu pemain tampil 1", () => assert.strictEqual(state(v({ online: true, n: 1, serverCount: 1, state: "online" }), true, true).text, "1"));
t("multiplayer tiga pemain tampil 3", () => assert.strictEqual(state(v({ online: true, n: 3, serverCount: 3, state: "online" }), true, true).text, "3"));
t("angka server belum diterima tampil elipsis, bukan angka ruang lokal", () => { const s = state(v({ online: true, n: 5, state: "online" }), true, true); assert.strictEqual(s.text, "…"); assert.strictEqual(s.kind, "waiting"); });
t("sedang menyambung tampil elipsis dan belum dikunci", () => { const s = state(v({ state: "connecting" }), true, false); assert.strictEqual(s.text, "…"); assert.strictEqual(s.blocked, false); });
t("reconnect setelah putus mengunci permainan", () => { const s = state(v({ state: "reconnecting", why: "putus" }), true, true); assert.strictEqual(s.text, "!"); assert.strictEqual(s.blocked, true); });
t("server tidak tersedia tidak disebut Single", () => { const s = state(v({ state: "off", why: "no-endpoint" }), true, false); assert.strictEqual(s.text, "!"); assert.notStrictEqual(s.text, "Single"); });
t("tidak ada status normal memakai tanda dash", () => { for (const s of [state(v({ prefs: { on: false } }), true, false), state(v({ state: "connecting" }), true, false), state(v({ online: true, n: 2, serverCount: 2, state: "online" }), true, true)]) assert.ok(s.text !== "–" && s.text !== "-"); });
console.log(`unit-online-status: ${pass} lulus, 0 gagal`);
