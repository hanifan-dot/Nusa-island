"use strict";
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "..");
const client = fs.readFileSync(path.join(root, "kemudi/client.js"), "utf8");
const css = fs.readFileSync(path.join(root, "kemudi/kemudi.css"), "utf8");
const game = fs.readFileSync(path.join(root, "game.js"), "utf8");
let n = 0;
const T = (name, fn) => { fn(); n++; console.log("ok -", name); };
T("kontrol HP memakai tiga tombol arah", () => {
  for (const id of ["kmLeft", "kmStraight", "kmRight"]) assert(client.includes(`id="${id}"`), id);
  assert(client.includes('steerHold("kmLeft", -K.MAX_DEG)'));
  assert(client.includes('steerHold("kmRight", K.MAX_DEG)'));
});
T("tombol kemudi memakai tahan lalu kembali lurus", () => {
  assert(client.includes('b.addEventListener("pointerdown", down)'));
  assert(client.includes('b.addEventListener("pointerup", up)'));
  assert(client.includes("st.deg = 0; paintWheel()"));
});
T("target sentuh arah dan gas cukup besar", () => {
  assert(/\.km-wheel button\{[^}]*height:62px/.test(css));
  assert(/\.km-lever button\{[^}]*height:52px/.test(css));
});
T("UI kemudi disembunyikan saat memancing dari laut", () => {
  assert(css.includes("body.mode-fish #kmRoot"));
  assert(game.includes('from === "sea" && NW.kemudi && NW.kemudi.on'));
  assert(game.includes("NW.kemudi.hide(NW.kemudi.host)"));
});
console.log("unit-kemudi-mobile-ui OK:", n);
