"use strict";
const fs = require("fs");
const assert = require("assert");

const client = fs.readFileSync("kemudi/client.js", "utf8");
const css = fs.readFileSync("kemudi/kemudi.css", "utf8");
const game = fs.readFileSync("game.js", "utf8");
const boat = fs.readFileSync("world/boat.js", "utf8");
const rombongan = fs.readFileSync("rombongan/client.js", "utf8");
const roomCore = fs.readFileSync("mp/room-core.js", "utf8");

assert(client.includes('id="kmWheel"'), "roda kemudi klasik harus ada");
assert(client.includes('id="kmWheelG"'), "grafik roda kemudi klasik harus ada");
assert(client.includes('W.addEventListener("pointermove"'), "roda harus dapat diputar dengan sentuhan");
assert(client.includes("K.wheelDeg"), "sudut roda harus dihitung dari gerak jari");
assert(!client.includes('id="kmLeft"') && !client.includes('id="kmRight"'), "tombol arah baru tidak boleh tersisa");
assert(css.includes("border-radius:50%"), "roda kemudi harus bundar");
assert(css.includes("body.mode-fish #kmRoot"), "UI kemudi harus disembunyikan saat memancing");
assert(game.includes("NW.kemudi.hide(NW.kemudi.host)"), "masuk memancing harus menutup UI kemudi");
assert(boat.includes("Putar setir untuk belok"), "tutorial harus menjelaskan kemudi klasik");
assert(client.includes("nearMoor(true)") && client.includes("startDock(m)"), "kapal pribadi menampilkan Turun di dermaga");
assert(rombongan.includes('"Turun aman ke dermaga"') && rombongan.includes('$("rbLeave").disabled = !mpOn()'), "tombol turun rombongan selalu tersedia saat online");
assert(!roomCore.includes("if (!this.boardable(mine)) return this.bn(conn"), "server tidak boleh menahan pemain di kapal");

new Function(client);
new Function(boat);
console.log("unit-kemudi-mobile-ui: PASS — kemudi bundar klasik aktif, UI memancing tetap bersih");
