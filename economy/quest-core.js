// NUSA ISLAND — Quest Owner: inti (logika murni; UMD). Kode yang SAMA dipakai Worker, Cloud Functions, game, dan uji.
// Dua quest sosial. Follow Instagram / join grup WhatsApp TIDAK bisa diverifikasi dari game web, jadi alurnya sengaja realistis:
//   1) "open"  : pemain menekan tombol → klien membuka tautan → SERVER mencatat waktu buka (jam server).
//   2) "claim" : baru boleh setelah >= MIN_AWAY_MS sejak buka (pemain benar-benar pergi lalu kembali; klik beruntun tak langsung cair).
//   3) hadiah SEKALI per akun: dicatat di buku server (eco.quest) + opId idempotent; refresh/logout/login/banyak tab/perangkat lain tidak menggandakan.
// Buku: { ig:{o:waktuBuka, c:waktuKlaim}, wa:{o,c} }  (o/c = ms epoch server; c ada = sudah diklaim, TIDAK pernah dihapus).
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.NusaQuestCore = factory();
})(typeof self !== "undefined" ? self : this, function () {
  const MIN_AWAY_MS = 12000;
  const QUESTS = {
    ig: { id: "ig", name: "Follow Instagram Nusa Island", short: "Instagram", icon: "📸", btn: "Buka Instagram",
      url: "https://www.instagram.com/nusa_islandd?dlrf=MWF2Z2E2N3dubHI5bg==", reward: { coin: 25000 },
      rewardText: "25.000 koin gratis ke dompet utama", desc: "Follow akun Instagram resmi Nusa Island, lalu kembali ke game untuk klaim." },
    wa: { id: "wa", name: "Join Grup WhatsApp Nusa Island", short: "WhatsApp", icon: "💬", btn: "Buka WhatsApp",
      url: "https://chat.whatsapp.com/FtZDVA66ogELWSYACMy45F?s=cl&p=a&iam=2", reward: { rod: "wa" },
      rewardText: "Joran WhatsApp (milik permanen, angkat sampai 100 kg, partikel hijau)", desc: "Gabung grup WhatsApp resmi Nusa Island, lalu kembali ke game untuk klaim." },
  };
  const IDS = Object.keys(QUESTS);
  const isQuest = (id) => typeof id === "string" && Object.prototype.hasOwnProperty.call(QUESTS, id);   // '__proto__' / 'constructor' bukan quest
  const ROD = { id: "wa", name: "Joran WhatsApp", capKg: 100 };
  const entry = (doc, id) => { const e = doc && typeof doc === "object" ? doc[id] : null; return e && typeof e === "object" ? { o: Number.isFinite(e.o) ? e.o : 0, c: Number.isFinite(e.c) ? e.c : 0 } : { o: 0, c: 0 }; };
  /** → "belum" | "proses" | "selesai" | "klaim"  (selesai = siap diklaim; klaim = hadiah sudah diklaim) */
  function status(doc, id, now) {
    const e = entry(doc, id); if (e.c) return "klaim"; if (!e.o) return "belum";
    return now - e.o >= MIN_AWAY_MS ? "selesai" : "proses";
  }
  const claimedCount = (doc) => IDS.filter((id) => entry(doc, id).c).length;
  const allDone = (doc) => claimedCount(doc) === IDS.length;
  /** Buka tautan: dicatat sekali (pembukaan ulang sebelum klaim tidak mengundurkan waktu, supaya tak bisa diulur/dipercepat). */
  function planOpen(doc, id, now) {
    if (!isQuest(id)) return { error: "quest_unknown" };
    const e = entry(doc, id); if (e.c) return { already: true, doc };
    const next = Object.assign({}, doc || {}); next[id] = { o: e.o || now, c: 0 };
    return { ok: true, doc: next, firstOpen: !e.o };
  }
  /** Klaim: hanya bila sudah dibuka dan sudah lewat MIN_AWAY. → {already}|{wait:ms}|{notOpened}|{ok,doc,reward} */
  function planClaim(doc, id, now) {
    if (!isQuest(id)) return { error: "quest_unknown" };
    const e = entry(doc, id); if (e.c) return { already: true, doc };
    if (!e.o) return { notOpened: true };
    const left = MIN_AWAY_MS - (now - e.o); if (left > 0) return { wait: left };
    const next = Object.assign({}, doc || {}); next[id] = { o: e.o, c: now };
    return { ok: true, doc: next, reward: QUESTS[id].reward };
  }
  /** Ringkasan kecil untuk view() server: tidak berisi apa pun selain status & waktu. */
  function view(doc) { const o = {}; for (const id of IDS) { const e = entry(doc, id); o[id] = { o: e.o, c: e.c }; } return o; }
  return { MIN_AWAY_MS, QUESTS, IDS, isQuest, ROD, entry, status, claimedCount, allDone, planOpen, planClaim, view };
});
