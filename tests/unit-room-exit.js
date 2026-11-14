// Hotfix Ide 08 — keluar Kedai/Dapur harus selalu selesai, aman tanpa argumen, dan idempoten saat diketuk berulang.
const assert = require("assert");
const timers = [];
global.setTimeout = (fn) => { timers.push(fn); return timers.length; };
global.clearTimeout = () => {};
const classes = new Set();
const classList = { add: (...xs) => xs.forEach((x) => classes.add(x)), remove: (...xs) => xs.forEach((x) => classes.delete(x)), toggle: (x, on) => on ? classes.add(x) : classes.delete(x), contains: (x) => classes.has(x) };
global.document = { body: { classList }, getElementById: (id) => id === "fade" ? { classList } : id === "banner" ? { classList, textContent: "" } : null };
global.window = global;
const player = { x: 9, y: 8, dir: 1, moving: true };
let snaps = 0, hints = 0;
window.NW = { P: (x, y) => ({ x: (x - y) * 32, y: (x + y) * 16 }), world: { player, snapCamera: () => snaps++, updateHint: () => hints++ } };
window.NusaDapurCore = { walk: () => true };
require("../dapur/room.js");

const flush = () => { const fn = timers.shift(); assert.ok(fn, "timer tersedia"); fn(); };
NW.room.register({ id: "kedai", layout: { w: 9, d: 7, spawn: { x: 1, y: 5 } }, drawShell() {}, candidates: () => [], onExit() { throw new Error("pembersihan UI tiruan"); } });
assert.strictEqual(NW.room.enter("kedai", player), true);
flush(); flush(); flush(); // transisi masuk + timer banner + pelepas fade
assert.strictEqual(NW.room.active, true);
assert.deepStrictEqual([player.x, player.y], [1, 5]);

const oldError = console.error; console.error = () => {};
assert.strictEqual(NW.room.exit(), true, "pemanggil lama tanpa argumen diterima");
assert.strictEqual(NW.room.exit(), false, "ketukan kedua saat transisi diabaikan");
flush();
assert.strictEqual(NW.room.active, false, "galat onExit tidak menahan pemain di Kedai");
assert.deepStrictEqual([player.x, player.y, player.dir], [9, 8, 1]);
assert.strictEqual(player.moving, false);
flush();
assert.strictEqual(classList.contains("on"), false, "fade selalu dilepas");
assert.strictEqual(snaps, 2);
assert.strictEqual(hints, 1);
console.error = oldError;
console.log("unit-room-exit: 10 lulus, 0 gagal");
