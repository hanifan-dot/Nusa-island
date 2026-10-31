// =========================================================
//  NUSA ISLAND — Tahap 3.5: integrasi PREMIUM SHOP ke Muara Kampung + ikon mahkota + pemakaian kosmetik.
//  Kosmetik hanya mengubah TAMPILAN. Hak milik berasal dari server (NW.shopApi); S.shop hanya menyimpan pilihan "sedang dipakai".
// =========================================================
(function () {
"use strict";
window.NW = window.NW || {};
const N = () => window.Nusa;
const area = NW.areas.get("muara"), M = area.map;
const B = { id: "premium", kind: "house", x0: 26.5, y0: 12.6, x1: 30.5, y1: 15.2, h: 54, stilts: 6, door: "y", roof: "#7a2d1c", wall: "#8a5a32", name: "Nusa Premium" };
const SPOT = { x: 28.5, y: 16.35 }, KEEP = { x: 28.5, y: 15.75 };

// ---------- 1) bangunan di peta ----------
(function mount() {
  const near = (o) => o.x > B.x0 - 1.2 && o.x < B.x1 + 1.2 && o.y > B.y0 - 1.2 && o.y < SPOT.y + 1.2;
  for (let i = M.objects.length - 1; i >= 0; i--) if (near(M.objects[i])) M.objects.splice(i, 1);
  for (let i = M.solids.length - 1; i >= 0; i--) { const s = M.solids[i]; if (s.r !== undefined && near(s)) M.solids.splice(i, 1); }
  const T = NW.T; for (let y = 16; y <= 17; y++) for (let x = 27; x <= 30; x++) if (x >= 0 && y >= 0 && NW.isLandT(M.tiles[y * M.MW + x])) M.tiles[y * M.MW + x] = T.PATH;
  M.buildings.push(Object.assign({}, B, { draw: (c, b, t, night) => NW.shopArt.building(c, b, t, night) }));
  M.solids.push({ x0: B.x0 + 0.02, y0: B.y0 + 0.02, x1: B.x1 - 0.02, y1: B.y1 - 0.02 }, { x: KEEP.x - 1.3, y: KEEP.y + 0.3, r: 0.3 });
  M.points.push({ id: "premium", x: SPOT.x, y: SPOT.y, r: 1.5, icon: "👑", label: "Buka Toko" });
  M.lights.push({ x: SPOT.x, y: SPOT.y - 0.6, z: 30, r: 60, col: "#ffb347", k: 1.0 });
})();
const keeper = { t: 0, wave: 0 };
const H = area.hooks, o = { interact: H.interact, layer: H.layer, update: H.update };
H.layer = (t) => (o.layer ? o.layer(t) : []).concat([{ d: KEEP.x + KEEP.y + 0.3, draw: (c) => { const p = NW.P(KEEP.x, KEEP.y, NW.LIFT); NW.shopArt.keeper(c, p.x, p.y, performance.now() / 1000, keeper.wave > 0 ? "wave" : "idle"); } }]);
H.update = (dt, api) => { if (o.update) o.update(dt, api); if (keeper.wave > 0) keeper.wave -= dt; else { const p = api && api.player; if (p && Math.hypot(p.x - KEEP.x, p.y - KEEP.y) < 3.5 && Math.random() < dt * 0.4) keeper.wave = 1.6; } };
H.interact = (t, api) => {
  if (t.id !== "premium") return o.interact ? o.interact(t, api) : undefined;
  keeper.wave = 2;
  api.openDialog({ name: "Bu Laksmi", avatar: "👩", role: "Penjaga Nusa Premium", lines: ["Selamat datang di Nusa Premium! Semua barang di sini hanya untuk gaya — tidak membuatmu lebih kuat.", "Lihat-lihat dulu saja, ya."], options: [{ label: "👑 Buka Toko", act: () => NW.shopUI.open() }] });
};

// ---------- 2) ikon mahkota di menu atas ----------
(function crown() {
  const hr = document.querySelector(".hud-right"); if (!hr || document.getElementById("crownBtn")) return;
  const b = document.createElement("button"); b.className = "chip icon-btn crown"; b.id = "crownBtn"; b.setAttribute("aria-label", "Nusa Premium"); b.textContent = "👑";
  b.addEventListener("click", () => { try { N().sfx("click"); } catch (e) {} NW.shopUI.open(); });
  hr.insertBefore(b, document.getElementById("skillBtn") || hr.firstChild);
})();

// ---------- 3) pilihan "sedang dipakai" (kosmetik) ----------
const EQ = {
  gamepass_sultan: { kostum: "kostum_sultan", nama: "nama_emas", gelar: "gelar_sultan", dekor: "dekor_sultan", lencana: "lencana_sultan" },
  kostum_nelayan: { kostum: "kostum_nelayan" }, efek_nama: { nama: "nama_gelombang" }, skin_kapal_nusantara: { kapal: "skin_kapal_nusantara" }, dekor_rumah: { dekor: "dekor_lampion" },
};
let owned = {};                                            // item kosmetik yang dimiliki (dari server)
const eqS = () => { const S = N().S; if (!S.shop || typeof S.shop !== "object") S.shop = { v: 1, equip: {} }; if (!S.shop.equip) S.shop.equip = {}; return S.shop.equip; };
const has = (slot, item) => !!owned[item] && eqS()[slot] === item;  // dipakai SAH hanya bila dimiliki
function isEquipped(pid) { const m = EQ[pid]; return !!m && Object.entries(m).every(([s, i]) => eqS()[s] === i); }
async function toggleEquip(pid) {
  const m = EQ[pid]; if (!m) return; const e = eqS(), on = isEquipped(pid);
  for (const [s, i] of Object.entries(m)) { if (on) { if (e[s] === i) delete e[s]; } else if (owned[i]) e[s] = i; }
  applyLook(); N().save();
}
function setOwned(ent) { owned = Object.assign({}, ent && ent.owned ? Object.fromEntries(Object.keys(ent.owned).map((k) => [k, 1])) : {}); applyLook(); }
const BASE = { shirt: "#579b8b", pants: "#2b3a44", collar: "#fff9ec", hatCol: undefined };
const COST = { kostum_sultan: { shirt: "#7a2d1c", collar: "#e8c25a", hatCol: "#e8c25a" }, kostum_nelayan: { shirt: "#1b6c8c", collar: "#e8f6ff", hatCol: "#e3be7a" } };
function applyLook() {
  const st = NW.world && NW.world.player && NW.world.player.style; if (!st) return;
  const k = eqS().kostum, c = k && owned[k] ? COST[k] : null;
  Object.assign(st, BASE, c || {}); if (!c) delete st.hatCol;
}
// gelar & efek nama
(function hookLabel() {
  const L = NW.look; if (!L || L._shopHooked) return; L._shopHooked = true;
  const cur = L.currentTitle, draw = L.drawPlayerLabel;
  L.currentTitle = () => (has("gelar", "gelar_sultan") ? "Sultan Samudra" : cur());
  L.drawPlayerLabel = (c, b, scale, lift) => {
    const e = has("nama", "nama_emas") ? "gold" : has("nama", "nama_gelombang") ? "wave" : null; if (!e) return draw(c, b, scale, lift);
    const name = L.playerName(), title = L.currentTitle(), s = scale || 1, W = 100 * s;
    c.save(); c.font = `800 ${12 * s}px system-ui, sans-serif`; c.textAlign = "center"; c.textBaseline = "middle"; const y = b.y - 58 - (lift || 0) - 8 * s;
    const w = c.measureText(name).width + 14 * s; c.fillStyle = "rgba(14,34,44,.62)"; NW.shopArt.rr(c, b.x - w / 2, y - 10 * s, w, 20 * s + (title ? 12 * s : 0), 7 * s); c.fill();
    c.shadowColor = e === "gold" ? "#e8c25a" : "#22d3ee"; c.shadowBlur = 5 * s; c.fillStyle = e === "gold" ? "#f6d878" : "#8ff0d4"; c.fillText((e === "gold" ? "👑 " : "") + name, b.x, y);
    if (title) { c.shadowBlur = 0; c.font = `600 ${10 * s}px system-ui, sans-serif`; c.fillStyle = "#ffe9a8"; c.fillText(title, b.x, y + 12 * s); } c.restore();
  };
})();
// kapal (tertambat) & dekorasi rumah: tambahan gambar kecil di atas aslinya
(function hookWorld() {
  const db = NW.drawBoat;
  if (db && !NW._shopBoat) { NW._shopBoat = true; NW.drawBoat = function (c, ob, t) { db.apply(this, arguments); if (!has("kapal", "skin_kapal_nusantara")) return;
    const bob = Math.sin(t * 1.5) * 1.5, p = NW.P(ob.x, ob.y); c.save(); c.translate(p.x, p.y + bob); c.rotate(Math.sin(t * 1.1) * 0.03); if (ob.flip) c.scale(-1, 1); c.rotate(0.46);
    c.fillStyle = "#c8312b"; c.fillRect(-50, -12, 108, 3); c.fillStyle = "#e8c25a"; c.fillRect(-50, -9, 108, 2); c.fillStyle = "#a8261f"; c.beginPath(); c.moveTo(19, -60); c.quadraticCurveTo(46 + Math.sin(t * 3) * 2, -44, 42, -14); c.lineTo(19, -14); c.closePath(); c.fill(); c.strokeStyle = "#e8c25a"; c.lineWidth = 1.2; for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(21, -52 + i * 12); c.lineTo(38, -48 + i * 11); c.stroke(); } c.restore(); }; }
  const HS = NW.HOUSE;
  if (HS && !NW._shopHome) { NW._shopHome = true; const po = HS.plotObjects; HS.plotObjects = function (lv, t, night) { const r = po.apply(this, arguments); const dk = eqS().dekor;
    if (dk && owned[dk]) { const gold = dk === "dekor_sultan"; for (const [x, y] of [[1.2, 1.2], [3.6, 1.2]]) r.list.push({ d: x + y + 3, draw: (c) => { const p = NW.P(x, y, 0), sw = Math.sin(t * 2 + x) * 2; c.strokeStyle = "#2a1a10"; c.beginPath(); c.moveTo(p.x, p.y - 62); c.lineTo(p.x + sw * .3, p.y - 48); c.stroke(); c.fillStyle = gold ? "#e8c25a" : "#d8452f"; c.beginPath(); c.ellipse(p.x + sw, p.y - 40, 6, 8, 0, 0, 7); c.fill(); c.fillStyle = gold ? "#b8902f" : "#e8c25a"; c.fillRect(p.x + sw - 4, p.y - 49, 8, 2); if (night > 0.3) { c.fillStyle = "rgba(255,190,90,.25)"; c.beginPath(); c.arc(p.x + sw, p.y - 40, 16, 0, 7); c.fill(); } } }); } return r; }; }
})();

// ---------- 4) pengiriman koin top up NYATA (dompet server → S.money), dua langkah: terapkan + simpan, baru 'ack' ke server ----------
let delivering = false;
async function deliver() {
  const A = NW.shopApi; if (delivering || !A || A.sim || A.isGuest()) return; delivering = true;
  try {
    const d = (await A.redeemCoins()).delivery; if (!d) return;
    const S = N().S; if (!S.shop || typeof S.shop !== "object") S.shop = { v: 1, equip: {} }; const ap = S.shop.applied || (S.shop.applied = []);
    if (!ap.includes(d.opId)) {            // opId sama = pengiriman yang sama → tidak pernah menambah dua kali (mis. app tertutup sebelum 'ack')
      S.money = Math.max(0, Math.floor(S.money || 0)) + d.amount; ap.push(d.opId); if (ap.length > 30) ap.shift();
      N().save(); try { N().refreshHUD(); N().toast("🪙 +" + d.amount.toLocaleString("id-ID") + " koin dari Top Up masuk ke dompetmu!", "good"); N().sfx("kedai_menang"); } catch (e) {}
    }
    await A.ackDelivery({ opId: d.opId });
  } catch (e) { /* coba lagi saat toko dibuka / game dimulai berikutnya; server menyimpan pengiriman yang tertunda */ } finally { delivering = false; }
}
NW.shop = { deliver, setOwned, toggleEquip, isEquipped, has, applyLook, B, SPOT, KEEP, EQ, owned: () => owned };
// muat hak milik di latar belakang (setelah game siap) agar kosmetik terpakai tanpa membuka toko
setTimeout(() => { try { NW.shopApi.getEntitlements().then((e) => { setOwned(e); deliver(); }).catch(() => {}); } catch (e) {} }, 600);
if (NW.cloud && NW.cloud.onChange) try { NW.cloud.onChange(() => setTimeout(() => NW.shopApi.getEntitlements().then((e) => { setOwned(e); deliver(); }).catch(() => {}), 800)); } catch (e) {}
})();
