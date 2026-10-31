// NUSA ISLAND — Tahap 4: Cloudflare Worker + Durable Object (satu DO = satu instance Muara Kampung).
// Alur: klien membuka WebSocket dengan token Firebase di header Sec-WebSocket-Protocol ("nusa.v1, <token>") →
// Worker memverifikasi token (kunci publik Google) → mencari instance yang masih ada tempat → DO menerima socket.
// Logika instance ada di ../../mp/room-core.js (satu sumber, diuji di Node). Berkas ini hanya pembungkus Cloudflare.
import { DurableObject } from "cloudflare:workers";
import Proto from "../../mp/proto.js";
import RoomMod from "../../mp/room-core.js";
import Jwt from "../../mp/jwt.js";

const { Room } = RoomMod;
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
    // cari instance dengan tempat; lebih dulu yang nomornya kecil supaya pemain berkumpul
    const hint = Math.max(1, Math.min(Proto.MAX_ROOMS, parseInt(url.searchParams.get("from") || "1", 10) || 1));
    for (let k = hint; k <= Proto.MAX_ROOMS; k++) {
      const name = Proto.AREA + "-" + k;
      const stub = env.ROOM.get(env.ROOM.idFromName(name));
      const h = new Headers(request.headers); h.set("Sec-WebSocket-Protocol", Proto.SUBPROTOCOL); h.set("x-nusa-uid", who.uid); h.set("x-nusa-room", name);
      const res = await stub.fetch(new Request(request.url, { headers: h }));
      if (res.status === 101) return res;
      if (res.status !== 409) return json({ error: "room_error" }, 502, cors);
    }
    return json({ error: "full" }, 503, cors);
  },
};

export class MuaraRoom extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.ctx = ctx; this.env = env; this.sockets = new Map(); this.nextConn = 1; this.roomName = "muara-1";
    this.room = new Room({
      id: this.roomName,
      io: {
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
    this.roomName = name; this.room.id = name;
    if (this.room.full() && !this.room.byUid.has(uid)) return new Response("full", { status: 409 });
    const pair = new WebSocketPair(); const [client, server] = Object.values(pair);
    this.ctx.acceptWebSocket(server);
    const conn = this.nextConn++;
    this.sockets.set(conn, server);
    const r = this.room.join(conn, uid, {}, null);
    if (!r.ok) { this.sockets.delete(conn); try { server.close(1013, "full"); } catch (e) {} return new Response("full", { status: 409 }); }
    server.serializeAttachment({ c: conn, room: name, s: this.room.snapshot(conn) });
    await this.schedule(Proto.TIMEOUT_MS / 3);
    return new Response(null, { status: 101, webSocket: client, headers: { "Sec-WebSocket-Protocol": Proto.SUBPROTOCOL } });
  }
  connOf(ws) { const a = ws.deserializeAttachment(); return a ? a.c : null; }
  save(ws, c) { try { ws.serializeAttachment({ c, room: this.roomName, s: this.room.snapshot(c) }); } catch (e) {} }
  async webSocketMessage(ws, msg) {
    const c = this.connOf(ws); if (c == null) return;
    if (!this.sockets.has(c)) this.sockets.set(c, ws);
    this.room.message(c, typeof msg === "string" ? msg : "");
    if (this.room.players.has(c)) this.save(ws, c);
    if (this.room.hasDirty()) await this.schedule(Proto.TICK_MS);
  }
  async webSocketClose(ws) { const c = this.connOf(ws); if (c != null) { this.room.leave(c); this.sockets.delete(c); } try { ws.close(); } catch (e) {} }
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
