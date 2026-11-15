"use strict";
const assert = require("assert");
const P = require("../mp/proto.js");
const fs = require("fs"), path = require("path");
const src = fs.readFileSync(path.resolve(__dirname, "../rombongan/client.js"), "utf8");
let n = 0; const T = (name, fn) => { fn(); n++; console.log("ok -", name); };
T("slot rombongan tidak memakai tambatan kapal pribadi", () => {
  const personal = [37.2, 23.4];
  for (const s of P.BOAT.SLOTS) assert(Math.hypot(s[0]-personal[0],s[1]-personal[1]) >= 3.5, "slot terlalu dekat: "+s);
});
T("slot rombongan tidak saling bertumpuk", () => {
  for (let i=0;i<P.BOAT.SLOTS.length;i++) for (let j=i+1;j<P.BOAT.SLOTS.length;j++)
    assert(Math.hypot(P.BOAT.SLOTS[i][0]-P.BOAT.SLOTS[j][0],P.BOAT.SLOTS[i][1]-P.BOAT.SLOTS[j][1]) >= 2.8);
});
T("room lama digeser visualnya dan kapal pribadi menang interaksi", () => {
  assert(src.includes("function displayPose(b)"));
  assert(src.includes("dp = displayPose(b)"));
  assert(src.includes("NW.boat.boardable(player)) return out"));
});
console.log("unit-boat-dock-layout OK:", n);
