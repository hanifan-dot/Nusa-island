// Klien WebSocket mentah untuk menguji VALIDASI SERVER tanpa lewat UI game: node tests/dev/raw-ws.js <port> <uid> "<query>" [lamaMs]
// Mencetak JSON {code, msgs[]}: kode penutupan & semua pesan yang diterima (galat dikirim lewat WebSocket).
const [port, uid, query, ms] = process.argv.slice(2);
const out = { code: null, msgs: [], open: false };
const ws = new WebSocket(`ws://127.0.0.1:${port}/ws${query || ""}`, ["nusa.v1", "dev." + uid]);
ws.onopen = () => { out.open = true; if (process.env.HELLO) ws.send(JSON.stringify({ t: "hello", n: uid, r: 0, rd: 0, x: 390, y: 412, d: 2, f: 0 })); if (process.env.SEND) for (const m of JSON.parse(process.env.SEND)) ws.send(typeof m === "string" ? m : JSON.stringify(m)); };
ws.onmessage = (e) => out.msgs.push(JSON.parse(e.data));
ws.onclose = (e) => { out.code = e.code; done(); };
ws.onerror = () => {};
const done = () => { console.log(JSON.stringify(out)); process.exit(0); };
setTimeout(() => { if (out.code === null) { out.code = "open"; done(); } }, +(ms || 1500));
