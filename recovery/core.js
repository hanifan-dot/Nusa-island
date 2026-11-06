// NUSA ISLAND — Pulihkan Data: INTI (murni, tanpa DOM, tanpa jaringan). Dipakai klien (recovery/client.js) dan tes Node.
// Prinsip: HANYA MEMBACA. Fungsi di sini tidak pernah menulis/menghapus localStorage dan tidak pernah memanggil server.
//   • Cadangan di browser = BUKTI LEMAH (isinya bisa diedit pemain) → tidak pernah dimasukkan ke akun otomatis.
//   • Cloud Save milik akun yang sedang login (identitas diverifikasi server) = satu-satunya yang boleh dipulihkan langsung.
(function (root, factory) {
  const Cloud = root.NusaCloudCore || (typeof require === "function" ? require("../cloud/core.js") : null);
  const api = factory(Cloud);
  if (typeof module === "object" && module.exports) module.exports = api; else root.NusaRecoveryCore = api;
})(typeof self !== "undefined" ? self : this, function (Cloud) {
  "use strict";
  const KEY_RE = /^nusa-island-v1(?:$|-(?:bak|backup)-)/;        // sama persis dengan halaman ajukan-pemulihan.html / selamatkan-data.html
  const MAX_BYTES = 450000, MIN_LEN = 10;
  const CURRENT_KEY = "nusa-island-v1";
  const SENT_KEY = "nusa-recovery-v1";                           // catatan "permohonan sudah dikirim" (bukan simpanan game)
  const own = (o) => o && typeof o === "object" && !Array.isArray(o);
  const num = (v) => (Number.isFinite(v) && v >= 0 ? Math.floor(v) : 0);
  const sizeOf = (s) => { try { return new TextEncoder().encode(s).length; } catch (e) { return String(s).length; } };

  const REASONS = [
    [/^tamu-sebelum-unggah/, "Progres Tamu (sebelum dipindah ke Google)"], [/^sebelum-cloud/, "Perangkat ini, sebelum memuat Cloud"],
    [/^sebelum-timpa-cloud/, "Perangkat ini, sebelum menimpa Cloud"], [/^akun-/, "Akun lain di perangkat ini"], [/^logout-/, "Sebelum keluar akun"],
    [/^sebelum-pulihkan/, "Sebelum pemulihan terakhir"],
  ];
  function labelOf(key) {
    if (key === CURRENT_KEY) return "Simpanan di perangkat ini";
    const m = key.match(/^nusa-island-v1-(?:bak|backup)-(.*?)(?:-\d{13})?$/), r = m ? m[1] : "";
    for (const [re, t] of REASONS) if (re.test(r)) return t;
    return "Cadangan di perangkat ini";
  }

  // ringkasan yang ditampilkan ke pemain; semua angka dari data yang SAMA yang akan diproses (bukan karangan)
  function describe(save) {
    const s = own(save) ? save : {}, st = own(s.stats) ? s.stats : {}, up = own(s.up) ? s.up : {}, home = own(s.home) ? s.home : {};
    return {
      name: String((own(s.profile) && s.profile.name) || "Pemancing").slice(0, 14), money: num(s.money), caught: num(st.caught),
      rod: num(up.rod) + 1, boat: num(up.boat) + 1, homeLevel: num(home.level) || 1, day: num(s.day) || 1,
      species: Cloud ? Cloud.summarize(s).species : 0, fishInBox: Array.isArray(s.cooler) ? s.cooler.length : 0,
    };
  }

  // satu entri penyimpanan → kandidat valid, atau null. TIDAK mengubah apa pun.
  function parseEntry(key, raw) {
    if (!KEY_RE.test(String(key)) || typeof raw !== "string" || raw.length < MIN_LEN || sizeOf(raw) > MAX_BYTES) return null;
    let j; try { j = JSON.parse(raw); } catch (e) { return null; }
    if (!own(j) || !own(j.stats) || !own(j.up)) return null;
    if (Cloud) { const v = Cloud.validateSave(j); if (!v || !v.ok || !Cloud.hasProgress(j)) return null; }
    const m = key.match(/-(\d{13})$/);
    return { kind: "local", key, current: key === CURRENT_KEY, ts: m ? Number(m[1]) : 0, label: labelOf(key), hash: Cloud ? Cloud.hashText(raw) : String(raw.length), raw, size: sizeOf(raw), summary: describe(j) };
  }

  // baca semua kunci yang relevan (hanya getItem/key/length). storage = window.localStorage atau tiruan.
  function scanLocal(storage) {
    const out = { entries: [], rejected: 0, blocked: false };
    try {
      for (let i = 0; i < storage.length; i++) {
        const k = storage.key(i); if (!k || !KEY_RE.test(k)) continue;
        const raw = storage.getItem(k); if (!raw) continue;
        const c = parseEntry(k, raw); if (c) out.entries.push(c); else out.rejected++;
      }
    } catch (e) { out.blocked = true; }
    return out;
  }

  // buang yang sama persis dengan simpanan aktif, hapus duplikat, urut: terbaru dulu
  function candidates(entries, currentRaw) {
    const curHash = currentRaw && Cloud ? Cloud.hashText(currentRaw) : null, seen = new Set(), list = [];
    for (const c of entries.slice().sort((a, b) => b.ts - a.ts)) {
      if (c.hash === curHash || seen.has(c.hash)) continue;
      seen.add(c.hash); list.push(c);
    }
    return list;
  }

  // Cloud Save akun yang sedang login. C = jawaban loadSave (server). null bila tak ada progres / identik dengan perangkat.
  // Game menulis ulang simpanan saat dimuat (urutan kunci/migrasi) sehingga hash teks bisa beda padahal progres identik → bandingkan progres intinya.
  function sameProgress(currentRaw, cloudObj) {
    try {
      const a = describe(JSON.parse(currentRaw)), b = describe(cloudObj);
      return ["money", "caught", "rod", "boat", "homeLevel", "day", "species", "fishInBox"].every((k) => a[k] === b[k]);
    } catch (e) { return false; }
  }
  function cloudCandidate(C, currentRaw) {
    if (!C || !C.exists || typeof C.data !== "string") return null;
    let j; try { j = JSON.parse(C.data); } catch (e) { return null; }
    if (!own(j) || (Cloud && !Cloud.hasProgress(j))) return null;
    const hash = Cloud ? Cloud.hashText(C.data) : String(C.data.length);
    return { kind: "cloud", key: "cloud", label: "Cloud Save akunmu", ts: Number(C.savedAtMs) || (C.savedAt ? Date.parse(C.savedAt) : 0) || 0, rev: C.rev | 0, hash, same: currentRaw === C.data || (!!currentRaw && !!Cloud && Cloud.hashText(currentRaw) === hash) || sameProgress(currentRaw, j), summary: describe(j) };
  }

  const fmtDate = (ts) => { if (!ts) return "waktu tidak tercatat"; try { return new Date(ts).toLocaleString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }); } catch (e) { return "—"; } };
  const sentRead = (storage) => { try { const o = JSON.parse(storage.getItem(SENT_KEY) || "null"); return own(o) && typeof o.hash === "string" ? o : null; } catch (e) { return null; } };

  return { KEY_RE, MAX_BYTES, CURRENT_KEY, SENT_KEY, labelOf, describe, parseEntry, scanLocal, candidates, cloudCandidate, fmtDate, sentRead };
});
