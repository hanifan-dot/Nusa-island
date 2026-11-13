// node tests/unit-server-presence.js — jumlah akun unik per server, lintas area dan rumah.
const assert = require("node:assert/strict");
const { Lobby } = require("../mp/lobby-core.js");
const { Room } = require("../mp/room-core.js");

let time = 1000;
const lobby = new Lobby({ now: () => time, cap: 2, max: 64 });
lobby.sync(1, ["andi", "budi"]);
assert.equal(lobby.size(1), 2);
assert.equal(lobby.parent("andi"), 1);

// Masuk rumah memutus socket Muara, tetapi tetap satu akun di server asal.
lobby.sync(1, ["budi"]);
lobby.houseSync("rumah-ABCDEFGH", [{ uid: "andi", room: 1 }]);
assert.equal(lobby.size(1), 2);
assert.equal(lobby.list("ip").rooms[0][1], 2);
assert.equal(lobby.assign("cici", "ip", [], { room: 1 }).error, "full");

// Koneksi dunia dan rumah yang tumpang tindih tidak menggandakan akun.
lobby.sync(1, ["andi", "budi"]);
assert.equal(lobby.size(1), 2);
lobby.sync(1, ["budi"]);
lobby.houseSync("rumah-ABCDEFGH", [{ uid: "andi", room: 1 }]);
time += 15000;
lobby.houseSync("rumah-ABCDEFGH", [{ uid: "andi", room: 1 }]);
assert.equal(lobby.size(1), 2);

// Akun yang berpindah server tidak dihitung lagi pada server lama.
lobby.sync(2, ["andi"]);
assert.equal(lobby.size(1), 1);
assert.equal(lobby.size(2), 1);
lobby.sync(2, []);
lobby.houseSync("rumah-ABCDEFGH", []);
assert.equal(lobby.size(1), 1);
assert.equal(lobby.size(2), 0);

// Socket rumah putus tanpa sempat mengirim leave: catatan kedaluwarsa.
lobby.houseSync("rumah-ABCDEFGH", [{ uid: "andi", room: 1 }]);
time += 46000;
assert.equal(lobby.size(1), 1);
lobby.houseSync("rumah-ABCDEFGH", [{ uid: "andi", room: 1 }]);
assert.equal(lobby.size(1), 2);
lobby.houseSync("rumah-ABCDEFGH", [{ uid: "andi", room: 999 }]);
assert.equal(lobby.size(1), 1);
lobby.houseSync("invalid", [{ uid: "andi", room: 1 }]);
assert.equal(lobby.size(1), 1);

// Sesi di kapal/pulau bisa tersembunyi secara visual, tetapi socket tetap ada.
const room = new Room({ id: "muara-1", io: { send() {}, close() {}, now: () => time } });
room.join(1, "kapten", {}, null, {});
room.join(2, "awak", {}, null, {});
assert.equal(room.size(), 2);
assert.equal(room.count(), 0);
lobby.sync(1, room.uids());
assert.equal(lobby.size(1), 2);

// Metadata server asal rumah bertahan setelah pemulihan WebSocket DO.
const house = new Room({ id: "rumah-ABCDEFGH", kind: "house", io: { send() {}, close() {}, now: () => time } });
house.join(10, "andi", {}, null, { role: "visitor", hid: "ABCDEFGH", parentRoom: "3" });
const snapshot = house.snapshot(10);
assert.equal(snapshot.sr, 3);
const restored = new Room({ id: "rumah-ABCDEFGH", kind: "house", io: { send() {}, close() {}, now: () => time } });
restored.restore(10, snapshot);
assert.equal(restored.players.get(10).sr, 3);
console.log("Server presence: lulus");
