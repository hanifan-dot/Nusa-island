// NUSA ISLAND — Tahap 4: Cloudflare Worker + Durable Object (satu DO = satu instance Muara Kampung).
// Alur: klien membuka WebSocket dengan token Firebase di header Sec-WebSocket-Protocol ("nusa.v1, <token>") →
// Worker memverifikasi token (kunci publik Google) → mencari instance yang masih ada tempat → DO menerima socket.
// Logika instance ada di ../../mp/room-core.js (satu sumber, diuji di Node). Berkas ini hanya pembungkus Cloudflare.
import { DurableObject } from "cloudflare:workers";
import Proto from "../../mp/proto.js";
import RoomMod from "../../mp/room-core.js";
import Jwt from "../../mp/jwt.js";
import LobbyMod from "../../mp/lobby-core.js";

const { Room } = RoomMod;
const { Lobby: LobbyCore } = LobbyMod;
const json = (o, status = 200, extra = {}) => new Response(JSON.stringify(o), { status, headers: { "content-type": "application/json", "cache-control": "no-store", ...extra } });

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin") || "";
    const allowed = String(env.ALLOWED_ORIGINS || "").split(",").map((s) => s.trim()).filter(Boolean);
    const cors = allowed.includes(origin) ? { "access-control-allow-origin": origin, vary: "Origin" } : {};
    if (url.pathname === "/health") return json({ ok: true, v: Proto.VERSION, enabled: env.MP_ENABLED !== "0", rooms: Proto.MAX_ROOMS, cap: Proto.ROOM_CAP }, 200, cors);
    if (url.pathname !== "/ws") return json({ error: "not_found" }, 404);
    if (env.MP_ENABLED === "0") return json({ error: "disabled" }, 503, cors);
    if ((request.headers.get("Upgrade") || "").toLowerCase() !== "websocket") return json({ error: "upgrade_required" }, 426);
    if (!allowed.includes(origin)) return json({ error: "origin" }, 403);
    const offered = (request.headers.get("Sec-WebSocket-Protocol") || "").split(",").map((s) => s.trim());
    if (offered[0] !== Proto.SUBPROTOCOL || !offered[1]) return json({ error: "token_missing" }, 401);
    let who;
    try { who = await Jwt.verifyFirebaseToken(offered[1], { projectId: env.FIREBASE_PROJECT_ID }); }
    catch (e) { return json({ error: "unauthorized" }, 401); }
    if (String(env.MP_BLOCKED_UIDS || "").split(",").map((x) => x.trim()).includes(who.uid)) return json({ error: "blocked" }, 403, cors);   // saklar darurat per akun (variabel Cloudflare)
    // pintu masuk: pilih instance + batasi laju masuk per akun/IP/global (melindungi kuota gratis harian)
    const lobby = env.LOBBY.get(env.LOBBY.idFromName("lobby")), ip = request.headers.get("CF-Connecting-IP") || "";
    if (url.searchParams.has("h")) return houseDoor(request, env, lobby, ip, who, offered[1], url.searchParams.get("h"), cors);   // Kunjungi Rumah Teman
    const exclude = [];
    for (let i = 0; i < Proto.MAX_ROOMS; i++) {
      const r = await lobby.assign(who.uid, ip, exclude);
      if (r.error === "rate") return json({ error: "rate" }, 429, { ...cors, "retry-after": "30" });
      if (r.error) return json({ error: r.error }, 503, cors);
      const name = Proto.AREA + "-" + r.room;
      const stub = env.ROOM.get(env.ROOM.idFromName(name));
      const h = new Headers(request.headers); h.set("Sec-WebSocket-Protocol", Proto.SUBPROTOCOL); h.set("x-nusa-uid", who.uid); h.set("x-nusa-room", name);
      const res = await stub.fetch(new Request(request.url, { headers: h }));
      if (res.status === 101) return res;
      if (res.status !== 409) return json({ error: "room_error" }, 502, cors);
      exclude.push(r.room);
    }
    return json({ error: "full" }, 503, cors);
  },
};

// ---- Kunjungi Rumah Teman: pintu masuk ruang rumah ----
// Izin masuk BUKAN keputusan Worker ini maupun browser: ditanyakan ke nusa-api (service binding API) dengan token milik pengguna sendiri.
// nusa-api memeriksa privasi/izin/larangan di data server dan menetapkan peran (pemilik/tamu), id publik, dan nama ruang. Browser hanya mengirim id publik pendek.
async function houseDoor(request, env, lobby, ip, who, token, pidRaw, cors) {
  if (env.HOUSE_ENABLED === "0") return json({ error: "disabled" }, 503, cors);
  const pid = String(pidRaw || "").toUpperCase();
  if (!/^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{8}$/.test(pid)) return json({ error: "bad_house" }, 400, cors);
  if (!env.API || typeof env.API.fetch !== "function") return json({ error: "house_unavailable" }, 503, cors);
  const g = await lobby.gate(who.uid, ip);
  if (g.error) return json({ error: g.error }, 429, { ...cors, "retry-after": "20" });
  let res;
  try { res = await env.API.fetch(new Request("https://nusa-api.internal/fn/homeAccess", { method: "POST", headers: { authorization: "Bearer " + token, "content-type": "application/json" }, body: JSON.stringify({ data: { pid } }) })); }
  catch (e) { return json({ error: "house_unavailable" }, 503, cors); }
  if (res.status === 404) return json({ error: "not_found" }, 404, cors);
  if (res.status === 403) return json({ error: "denied" }, 403, cors);
  if (res.status === 429) return json({ error: "rate" }, 429, { ...cors, "retry-after": "20" });
  if (!res.ok) return json({ error: "house_unavailable" }, 502, cors);
  let a; try { a = (await res.json()).result; } catch (e) { a = null; }
  if (!a || !a.ok || (a.role !== "owner" && a.role !== "visitor") || a.room !== "rumah-" + pid && a.role === "visitor" || !/^rumah-[A-Z2-9]{8}$/.test(a.room || "") || !/^[A-Z2-9]{8}$/.test(a.me || "")) return json({ error: "denied" }, 403, cors);
  const stub = env.HOUSE.get(env.HOUSE.idFromName(a.room));
  const h = new Headers(request.headers); h.set("Sec-WebSocket-Protocol", Proto.SUBPROTOCOL); h.set("x-nusa-uid", who.uid); h.set("x-nusa-room", a.room); h.set("x-nusa-role", a.role); h.set("x-nusa-hid", a.me);
  const r = await stub.fetch(new Request(request.url, { headers: h }));
  if (r.status === 101) return r;
  if (r.status === 403) return json({ error: "denied" }, 403, cors);
  if (r.status === 409) return json({ error: "full" }, 503, cors);
  return json({ error: "room_error" }, 502, cors);
}

export class Lobby extends DurableObject {
  constructor(ctx, env) { super(ctx, env); this.core = new LobbyCore(); this.env = env; }
  async assign(uid, ip, exclude) {
    const r = this.core.assign(uid, ip, exclude);
    if (r.kick) { try { await this.env.ROOM.get(this.env.ROOM.idFromName(Proto.AREA + "-" + r.kick)).kickUid(uid); } catch (e) {} this.core.left(r.kick, uid); }   // tutup sesi lama di instance lain
    return { room: r.room, error: r.error };
  }
  async gate(uid, ip) { return this.core.gate(uid, ip); }                       // pembatas laju masuk rumah (terpisah dari Muara)
  async joined(k, uid) { this.core.joined(k, uid); }
  async left(k, uid) { this.core.left(k, uid); }
  async sync(k, uids) { this.core.sync(k, uids); }
}

export class MuaraRoom extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.ctx = ctx; this.env = env; this.sockets = new Map(); this.nextConn = 1; this.roomName = "muara-1";
    this.room = new Room({
      id: this.roomName, ...this.roomOpts(),
      io: {
        onEject: (q) => this.onEject(q),
        now: () => Date.now(),
        send: (c, o) => { const ws = this.sockets.get(c); if (ws) ws.send(JSON.stringify(o)); },
        close: (c, code, reason) => { const ws = this.sockets.get(c); if (ws) { try { ws.close(code, String(reason || "").slice(0, 100)); } catch (e) {} } this.sockets.delete(c); },
      },
    });
    // bangun ulang dari lampiran socket setelah hibernasi (WebSocket Hibernation API)
    for (const ws of ctx.getWebSockets()) {
      const a = ws.deserializeAttachment();
      if (!a || !a.s) continue;
      this.sockets.set(a.c, ws); this.nextConn = Math.max(this.nextConn, a.c + 1); if (a.room) this.roomName = a.room;
      this.room.id = this.roomName; this.room.restore(a.c, a.s);
    }
  }
  async fetch(request) {
    const uid = request.headers.get("x-nusa-uid"), name = request.headers.get("x-nusa-room");
    if (!uid || !name || (request.headers.get("Upgrade") || "").toLowerCase() !== "websocket") return new Response("bad", { status: 400 });
    const denied = await this.admit(request, uid); if (denied) return denied;
    this.roomName = name; this.room.id = name;
    if (this.room.full() && !this.room.byUid.has(uid)) { this.lobbyCall("sync", this.k(), [...this.room.byUid.keys()]); return new Response("full", { status: 409 }); }
    const pair = new WebSocketPair(); const [client, server] = Object.values(pair);
    this.ctx.acceptWebSocket(server);
    const conn = this.nextConn++;
    this.sockets.set(conn, server);
    const r = this.room.join(conn, uid, {}, null, this.joinExtra(request));
    if (!r.ok) { this.sockets.delete(conn); try { server.close(1013, "full"); } catch (e) {} return new Response("full", { status: 409 }); }
    server.serializeAttachment({ c: conn, room: name, s: this.room.snapshot(conn) });
    this.lobbyCall("joined", this.k(), uid);
    await this.schedule(Proto.TIMEOUT_MS / 3);
    return new Response(null, { status: 101, webSocket: client, headers: { "Sec-WebSocket-Protocol": Proto.SUBPROTOCOL } });
  }
  roomOpts() { return {}; }                       // Muara: bawaan Room
  onEject() {}
  async admit() { return null; }
  joinExtra() { return undefined; }
  k() { return parseInt(String(this.roomName).split("-")[1], 10) || 1; }
  lobbyCall(fn, ...args) { try { const l = this.env.LOBBY.get(this.env.LOBBY.idFromName("lobby")); this.ctx.waitUntil(l[fn](...args).catch(() => {})); } catch (e) {} }
  kickUid(uid) { const c = this.room.byUid.get(uid); if (c != null) this.room.kick(c, 4002, "Akunmu masuk dari perangkat lain."); }
  connOf(ws) { const a = ws.deserializeAttachment(); return a ? a.c : null; }
  save(ws, c) { try { ws.serializeAttachment({ c, room: this.roomName, s: this.room.snapshot(c) }); } catch (e) {} }
  async webSocketMessage(ws, msg) {
    const c = this.connOf(ws); if (c == null) return;
    if (!this.sockets.has(c)) this.sockets.set(c, ws);
    this.room.message(c, typeof msg === "string" ? msg : "");
    if (this.room.players.has(c)) this.save(ws, c);
    if (this.room.hasDirty()) await this.schedule(Proto.TICK_MS);
  }
  async webSocketClose(ws) { const c = this.connOf(ws); if (c != null) { const p = this.room.players.get(c); if (p) this.lobbyCall("left", this.k(), p.uid); this.room.leave(c); this.sockets.delete(c); } try { ws.close(); } catch (e) {} }
  async webSocketError(ws) { return this.webSocketClose(ws); }
  async alarm() {
    this.room.sweep();
    const more = this.room.tick();
    for (const [c, ws] of this.sockets) if (this.room.players.has(c)) this.save(ws, c);
    if (more || this.room.hasDirty()) await this.schedule(Proto.TICK_MS);
    else if (this.room.size() > 0) await this.schedule(Proto.TIMEOUT_MS / 3);   // sapu timeout tiap ±15 dtk selama ada pemain
  }
  async schedule(ms) {
    const t = Date.now() + ms, cur = await this.ctx.storage.getAlarm();
    if (cur == null || cur > t) await this.ctx.storage.setAlarm(t);
  }
}

// Satu DO = satu rumah ("rumah-<id publik>"). Hanya bisa dicapai lewat houseDoor() di atas (peran & id publik ditetapkan di sana, bukan oleh klien).
export class HouseRoom extends MuaraRoom {
  constructor(ctx, env) {
    super(ctx, env);
    this.bans = new Map();
    ctx.blockConcurrencyWhile(async () => { const b = await ctx.storage.get("bans"); if (b) this.bans = new Map(Object.entries(b)); });
  }
  roomOpts() { return { kind: "house", cap: Proto.HOUSE.CAP }; }
  lobbyCall() {}                                    // rumah tidak memakai lobi Muara
  // Larangan di sisi ruang: berlaku seketika saat pemilik mengeluarkan tamu (lapisan kedua; lapisan pertama = homeKick/homeAccess di nusa-api)
  onEject(q) {
    if (!q.hid) return;
    const now = Date.now(); for (const [k, t] of this.bans) if (t <= now) this.bans.delete(k);
    this.bans.set(q.hid, now + Proto.HOUSE.KICK_MS);
    this.ctx.waitUntil(this.ctx.storage.put("bans", Object.fromEntries(this.bans)).catch(() => {}));
  }
  async admit(request) {
    const role = request.headers.get("x-nusa-role"), hid = request.headers.get("x-nusa-hid");
    if (role !== "owner" && role !== "visitor") return new Response("bad", { status: 400 });
    if (role === "visitor" && (this.bans.get(hid) || 0) > Date.now()) return new Response("denied", { status: 403 });
    return null;
  }
  joinExtra(request) { return { role: request.headers.get("x-nusa-role"), hid: request.headers.get("x-nusa-hid") }; }
}
