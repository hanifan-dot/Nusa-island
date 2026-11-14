"use strict";
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const src = fs.readFileSync(path.resolve(__dirname, "../rombongan/client.js"), "utf8");
let n = 0;
const T = (name, fn) => { fn(); n++; console.log("ok -", name); };
T("bekas kapal kosong hanya tampil lima detik", () => {
  assert(src.includes("const EMPTY_HIDE_SEC = 5"));
  assert(src.includes("if (!boatShown(b)) continue"));
  assert(src.includes("now() - at < EMPTY_HIDE_SEC"));
});
T("kapal berawak tidak ikut disembunyikan", () => {
  assert(src.includes("if (!boatEmpty(b)) { st.emptyAt.delete(b.id); return true; }"));
});
T("kapal kosong orang lain tidak menumpuk kandidat naik", () => {
  assert(src.includes("!boatEmpty(b) || b.id === st.lastBoat"));
  assert(src.includes("st.lastBoat = m.id"));
});
console.log("unit-rombongan-empty-boat OK:", n);
