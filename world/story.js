// =========================================================
//  NUSA ISLAND — Bumbu 1 "Jiwa Kampung & Keahlian Nelayan"
//  - Cerita 4 bab: Pak Darto & Joran Warisan
//  - 3 keahlian nelayan (dipakai oleh mekanik mancing di game.js)
//  - Dialog NPC bersyarat + ingatan (tidak mengulang kalimat yang sama)
//  - Sudut Nelayan di dermaga: lapisan visual PRIBADI (mengikuti progres
//    pemain ini saja; data dunia publik & collision tidak berubah)
//  - Petunjuk pemain baru yang muncul sekali
//  Semua progres di S.story / S.skills / S.onboard / S.npcMem (berversi).
// =========================================================
(() => {
"use strict";
const N = () => window.Nusa, W = () => NW.world, P = NW.P;
const $ = (id) => document.getElementById(id);
const S = () => N().S;
const E = NW.SHORE_E;

// ---------- Data default (berversi) ----------
const STORY_V = 1, SKILLS_V = 1, ONBOARD_V = 1;
function defaults(isNewPlayer) {
  const s = S();
  if (!s.story || s.story.v !== STORY_V) s.story = Object.assign({ v: STORY_V, ch: 1, step: 0, prog: {}, mats: { benang: false, bambu: false, damar: false }, rewarded: {}, title: null, corner: 0, doneAt: {} }, s.story || {}, { v: STORY_V });
  if (!s.skills || s.skills.v !== SKILLS_V) s.skills = Object.assign({ v: SKILLS_V, presisi: false, membaca: false, kendali: false, stats: { hot: 0, reads: 0, tired: 0 } }, s.skills || {}, { v: SKILLS_V });
  if (!s.onboard || s.onboard.v !== ONBOARD_V) {
    // pemain lama tidak dipaksa mengulang petunjuk
    const old = !isNewPlayer;
    s.onboard = Object.assign({ v: ONBOARD_V, walk: old, talk: old, fish: old, sell: old, home: old }, s.onboard || {}, { v: ONBOARD_V });
  }
  s.npcMem = s.npcMem || { darto: { seen: [] }, sari: { seen: [] }, dika: { seen: [] } };
}
const st = () => S().story, sk = () => S().skills;
const at = (ch, step) => st().ch === ch && st().step === step;
const has = (k) => !!sk()[k];

// ---------- Sudut Nelayan (lapisan pribadi) ----------
// tapak tetap sama di semua tahap → collision peta umum tidak berubah oleh cerita
const CORNER = { x0: E - 5.25, y0: 16.25, x1: E - 4.05, y1: 16.85 }; // lahan kosong di tepi dermaga, tidak tertutup papan nama
NW.solids.push({ ...CORNER });
const GROVE = { x: 12.0, y: 12.55 }; // dekat rumpun bambu di samping gapura Rumahku

// ---------- Bab & langkah ----------
// kind: talk (bicara dengan Pak Darto) | task (dikerjakan di dunia)
const CH = {
  1: { name: "Nelayan Baru", steps: [
    { kind: "talk", goal: "Ajak bicara Pak Darto" },
    { kind: "task", goal: "Tangkap 2 ikan di dermaga Muara", need: 2, key: "c1" },
    { kind: "talk", goal: "Ceritakan tangkapanmu ke Pak Darto" },
    { kind: "task", goal: "Lempar tepat ke riak ikan (gelembung di air)", need: 1, key: "hot1" },
    { kind: "talk", goal: "Kembali ke Pak Darto" },
  ] },
  2: { name: "Joran Lama", steps: [
    { kind: "talk", goal: "Dengarkan cerita Pak Darto" },
    { kind: "mats", goal: "Kumpulkan benang, ruas bambu, dan getah damar" },
    { kind: "talk", goal: "Bawa bahan ke Pak Darto" },
  ] },
  3: { name: "Pelajaran Nelayan", steps: [
    { kind: "talk", goal: "Belajar dari Pak Darto" },
    { kind: "task", goal: "Kendurkan senar tepat saat ikan menyentak", need: 3, key: "reads" },
    { kind: "talk", goal: "Kembali ke Pak Darto" },
    { kind: "task", goal: "Gulung saat ikan lelah", need: 4, key: "tired" },
    { kind: "talk", goal: "Kembali ke Pak Darto" },
  ] },
  4: { name: "Warisan Muara", steps: [
    { kind: "talk", goal: "Terima tantangan terakhir" },
    { kind: "task", goal: "Ujian dermaga: Lemparan Sempurna → baca 2 sentakan → gulung 2× saat lelah → daratkan", key: "final" },
    { kind: "talk", goal: "Temui Pak Darto" },
  ] },
};
const curStep = () => (CH[st().ch] ? CH[st().ch].steps[st().step] : null);
const awaitsDarto = () => { const s = curStep(); return !!s && (s.kind === "talk" || (s.kind === "mats" && allMats())); };
const allMats = () => { const m = st().mats; return m.benang && m.bambu && m.damar; };
function advance() {
  const s = st(); s.step++;
  if (!CH[s.ch] || s.step >= CH[s.ch].steps.length) { s.doneAt[s.ch] = Date.now(); s.ch++; s.step = 0; }
  N().save(); N().refreshHUD(); refreshUI();
  const c = curStep();
  if (c && c.kind !== "talk") N().toast(`📖 ${c.goal}`, "good");
  else if (c) N().toast("📖 Cerita berlanjut: temui Pak Darto ❗");
}
function taskTick(key, amount = 1) {
  const c = curStep(); if (!c || c.kind !== "task" || c.key !== key) return;
  const p = st().prog; p[key] = Math.min(c.need, (p[key] || 0) + amount);
  N().save(); refreshUI();
  if (p[key] >= c.need) { N().tone(784, 0.12, "triangle", 0.1); N().tone(1047, 0.2, "triangle", 0.1, null, 0.12); advance(); }
  else N().toast(`📖 ${c.goal}: ${p[key]}/${c.need}`);
}
// hadiah hanya sekali per bab (dicek lewat st().rewarded)
function reward(key, fn) { const r = st().rewarded; if (r[key]) return false; r[key] = Date.now(); fn(); N().save(); N().refreshHUD(); return true; }
function learn(skill, label) { if (sk()[skill]) return; sk()[skill] = true; N().save(); N().toast(`✨ Keahlian baru: ${label}. Lihat 🎯 Keahlian`, "good"); N().tone(659, 0.15, "triangle", 0.1); N().tone(988, 0.25, "triangle", 0.1, null, 0.15); }

// ---------- Dialog cerita Pak Darto ----------
const callName = () => st().title ? st().title : "Nak";
function dartoStory(open, npc, role) {
  const s = st(), c = curStep(), D = (lines, options) => open({ name: "Pak Darto", avatar: "🧓", role, npc, lines, options });
  if (!c) return false;
  if (s.ch === 1) {
    if (s.step === 0) return D(["Eh, wajah baru! Kamu yang tinggal di balik gapura bambu itu, ya?", "Aku Darto. Sudah empat puluh tahun aku mancing di muara ini.", "Dulu, waktu aku seumuranmu, perahu kayu berjajar sampai ujung dermaga. Tiap subuh kampung ini wangi ikan bakar.", "Sekarang tinggal sedikit yang mau jadi nelayan. Coba tangkap dua ikan dari dermaga, lalu ceritakan padaku."], [{ label: "🎣 Siap, Pak!", act: advance }]);
    if (s.step === 1) return D([`Dua ikan dari dermaga Muara, ${callName()}. Pelan-pelan saja. Sudah ${s.prog.c1 || 0}/2.`]);
    if (s.step === 2) return D(["Wah, sudah dapat! Tanganmu mulai kenal joran.", "Dengar rahasia kecil: ikan suka berkumpul di air yang beriak, karena di situ ada makanan.", "Sebelum melempar, cari gelembung di permukaan air. Lepas meteran tepat di garis kuning supaya pelampung jatuh di riaknya."], [{ label: "🎯 Akan kucoba", act: () => { learn("presisi", "Lemparan Presisi"); advance(); } }]);
    if (s.step === 3) return D(["Cari gelembung di air, lalu lepas meteran pas di garis kuning. Arahkan lemparan dengan posisi jarimu di layar."]);
    if (s.step === 4) return D(["Tepat di riaknya! Ayahku dulu bilang, nelayan yang baik itu sabar dan teliti.", "Ini upah pertama dari Pak Darto. Besok-besok mampir lagi, ya. Aku punya cerita lain."], [{ label: "🙏 Terima kasih, Pak", act: () => { reward("ch1", () => { S().money += 150; N().toast("📖 Bab 1 selesai! +🪙150", "good"); }); advance(); } }]);
  }
  if (s.ch === 2) {
    if (s.step === 0) return D(["Kamu tahu? Di kolong rumahku ada joran tua, warisan ayahku.", "Joran bambu itu pernah menarik ikan toman sebesar paha orang dewasa. Tapi senarnya putus dan gagangnya retak.", "Kalau kamu mau, kita perbaiki bersama. Aku butuh benang senar yang kuat dari toko Pak Bono, ruas bambu tua yang lurus, dan getah damar.", "Bu Sari biasanya menyimpan damar. Soal bambu, tanya Dika, dia hafal setiap sudut kampung."], [{ label: "🤝 Aku bantu, Pak", act: advance }]);
    if (s.step === 1 && !allMats()) { const m = s.mats; return D([`Bahan joran: benang ${m.benang ? "✔" : "✗"} · bambu ${m.bambu ? "✔" : "✗"} · damar ${m.damar ? "✔" : "✗"}.`, !m.bambu ? "Bambu yang bagus tumbuh di samping gapura Rumahku." : !m.damar ? "Getah damar ada di Bu Sari. Biasanya dia minta ditukar lauk." : "Benang senar dijual Pak Bono di toko pancing."]); }
    if (s.step === 1 || s.step === 2) return D(["Benang, bambu, damar… lengkap semua!", "Sini, kita kerjakan di sudut dermaga."], [{ label: "🔧 Perbaiki joran", act: () => repairRod(open, npc, role) }]);
  }
  if (s.ch === 3) {
    if (s.step === 0) return D(["Joran warisan itu punya cerita, tapi nelayan hebat punya kepekaan.", "Ikan kuat tidak menarik terus-menerus. Sebelum menyentak, senar bergetar dan air beriak. Itu tandanya.", "Saat ikan menyentak, kendurkan senar. Kalau dilawan, senarmu bisa putus."], [{ label: "👀 Aku perhatikan", act: () => { learn("membaca", "Membaca Tarikan"); advance(); } }]);
    if (s.step === 1) return D([`Kendurkan senar tepat saat ikan menyentak, ${callName()}. Lepas jarimu begitu muncul aba-aba "Ikan bersiap menyentak". Sudah ${s.prog.reads || 0}/3.`]);
    if (s.step === 2) return D(["Kamu sudah bisa membaca tarikan!", "Pelajaran berikutnya: setelah menyentak, ikan kelelahan sebentar. Itu saatnya menggulung kuat-kuat.", "Jaga tegangan senar di zona hijau. Jangan terlalu kendur, jangan terlalu tegang."], [{ label: "💪 Siap menggulung", act: () => { learn("kendali", "Kendali Senar"); advance(); } }]);
    if (s.step === 3) return D([`Tahan untuk menggulung saat muncul "Ikan lelah — gulung!". Sudah ${s.prog.tired || 0}/4.`]);
    if (s.step === 4) return D(["Gulunganmu mantap!", "Sekarang kamu bukan pemula lagi. Mulai hari ini, orang kampung memanggilmu Nelayan Muda."], [{ label: "🌟 Terima gelar", act: () => { reward("ch3", () => { S().money += 250; st().title = "Nelayan Muda"; N().toast("📖 Bab 3 selesai! Gelar: Nelayan Muda · +🪙250", "good"); }); advance(); } }]);
  }
  if (s.ch === 4) {
    if (s.step === 0) return D(["Ada satu tantangan terakhir. Dulu ayahku memberikannya padaku.", "Di ujung dermaga, lakukan Lemparan Sempurna. Ikan uji yang kuat akan menyambar.", "Baca sentakannya dua kali, gulung saat ia lelah dua kali, lalu daratkan. Gagal tidak apa-apa, ulangi sesukamu."], [{ label: "🔥 Terima tantangan", act: advance }]);
    if (s.step === 1) { const b = s.prog.best || { reads: 0, tired: 0 }; return D([`Lemparan Sempurna di ujung dermaga, lalu baca 2 sentakan dan gulung 2× saat ikan lelah. Percobaan terbaikmu: baca ${b.reads}/2, gulung ${b.tired}/2.`]); }
    if (s.step === 2) return D(["Aku melihatnya dari sini. Semua kau lakukan dengan benar.", "Joran warisan ini… sudah waktunya pindah ke tangan yang tepat. Gantunglah di rumahmu.", "Mulai sekarang kau Penerus Muara. Sudut dermaga itu juga kita rapikan bersama."], [{ label: "🎋 Terima joran warisan", act: () => { reward("ch4", () => { const s2 = S(); s2.money += 300; st().title = "Penerus Muara"; st().corner = 2; if (!s2.home.decorations.includes("joranWarisan")) s2.home.decorations.push("joranWarisan"); NW.life.addFriend("darto", 1); N().toast("📖 Cerita selesai! Gelar: Penerus Muara · Joran Warisan dipajang di Rumahku · +🪙300", "good"); }); advance(); } }]);
  }
  return false;
}
function repairRod(open, npc, role) {
  const f = $("fade"); f.classList.add("on");
  setTimeout(() => {
    reward("ch2", () => { S().money += 200; st().corner = Math.max(st().corner, 1); NW.life.addFriend("darto", 1); });
    if (st().ch === 2) { st().step = 2; advance(); }
    setTimeout(() => f.classList.remove("on"), 60);
    open({ name: "Pak Darto", avatar: "🧓", role, npc, lines: ["Pak Darto mengikat senar baru, menambal retakan dengan damar hangat, lalu menyambung ruas bambu.", "Lihat! Joran ini hidup lagi. Ayahku pasti senang.", "Sudut dermaga juga sudah kubereskan sedikit. Terima kasih, ya. (+🪙200)"] });
  }, 380);
}

// ---------- Dialog harian (bersyarat + tidak mengulang) ----------
const ch = () => st().ch;
const fr = (id) => S().friends[id] || 0;
const lastRare = () => { const d = S().dex; return FISH.filter((f) => d[f.id] && (f.rarity === "legenda" || f.rarity === "epik")).map((f) => f.name); };
const hot = () => { const t = N().marketTip ? N().marketTip() : ""; return t; };
const LINES = {
  darto: [
    { id: "d1", c: () => ch() <= 2, t: () => ["Ikan nila paling suka pagi hari. Siang bolong mereka malas makan."] },
    { id: "d2", t: () => ["Waktu muda, aku pernah terbawa arus sampai Selat Sunda. Untung ada nelayan Banten yang menolong.", "Sejak itu aku selalu bawa pelampung cadangan."] },
    { id: "d3", t: () => ["Lele itu cerdik. Mereka keluar setelah jam tujuh malam, waktu muara gelap."] },
    { id: "d4", t: () => ["Pak Bono di toko itu dulu muridku juga. Sekarang dia lebih jago menjual joran daripada memakainya, hahaha."] },
    { id: "d5", c: () => fr("darto") >= 2, t: () => ["Istriku dulu paling pintar memasak arsik ikan mas. Kalau ke Danau Toba, coba cari ikan mas yang besar."] },
    { id: "d6", c: () => ch() >= 3, t: () => ["Ingat, kendurkan saat ikan menyentak. Joran bagus pun bisa patah kalau dilawan."] },
    { id: "d7", c: () => ch() >= 4, t: () => ["Ikan yang lelah tidak akan menunggu lama. Gulung cepat, tapi jangan sampai senar berbunyi."] },
    { id: "d8", c: () => ch() >= 5, t: () => [`Joran warisan itu cocok di dinding rumahmu, ${callName()}. Kadang aku rindu memegangnya, tapi aku tenang dia ada di tangan yang tepat.`] },
    { id: "d9", c: () => ch() >= 5, t: () => ["Sudut dermaga sekarang rapi sekali. Anak-anak kampung jadi suka duduk di sana dengar cerita."] },
    { id: "d10", c: () => lastRare().length > 0, t: () => [`Aku dengar kamu pernah dapat ${lastRare()[0]}. Di kampung ini, cerita seperti itu bisa diceritakan sampai tiga generasi!`] },
    { id: "d11", c: () => S().up.boat >= 1, t: () => ["Sudah punya perahu motor? Danau Toba itu dingin. Ikannya lebih kuat karena airnya dalam."] },
    { id: "d12", t: () => ["Angin dari laut terasa asin? Itu tanda ikan kembung sedang dekat pantai."] },
  ],
  sari: [
    { id: "s1", t: () => [hot() || "Harga hari ini biasa saja, Nak."] },
    { id: "s2", t: () => ["Dulu pasar ini cuma satu meja kayu. Sekarang tendanya sudah belang merah-putih, cantik, kan?"] },
    { id: "s3", t: () => ["Ibu bangun jam empat setiap hari. Ikan segar itu harus sampai di meja sebelum matahari tinggi."] },
    { id: "s4", c: () => S().stats.caught >= 10, t: () => [`Kamu sudah menangkap ${S().stats.caught} ekor, ya? Langganan setia Ibu!`] },
    { id: "s5", c: () => S().home && S().home.level >= 3, t: () => [`Rumahmu sudah jadi ${NW.HD.LEVELS[S().home.level].name}! Ibu lihat dari jalan, kebunnya rapi.`] },
    { id: "s6", t: () => ["Ikan patin enak dimasak asam pedas. Kalau dapat yang besar, Ibu beli dengan harga baik."] },
    { id: "s7", c: () => fr("sari") >= 2, t: () => ["Dika itu sebenarnya anak tetangga Ibu. Pintar, tapi kalau disuruh ambil air suka mampir main layangan dulu."] },
    { id: "s8", c: () => ch() >= 3, t: () => ["Pak Darto kelihatan lebih ceria sejak kamu bantu memperbaiki jorannya."] },
    { id: "s9", c: () => ch() >= 5, t: () => [`Penerus Muara! Ibu bangga, kampung kita punya nelayan baru.`] },
    { id: "s10", t: () => ["Jangan jual semua tangkapanmu sekaligus kalau harganya lagi turun. Tunggu panah hijau!"] },
  ],
  dika: [
    { id: "k1", t: () => ["Kak, rumpun bambu di samping gapura Rumahku itu paling tua di kampung! Aku sering main petak umpet di situ."] },
    { id: "k2", t: () => ["Di pantai selatan banyak kerang. Kalau sore, angin di sana paling pas buat layangan!"] },
    { id: "k3", t: () => ["Kata nenekku, sumur di taman tidak pernah kering, bahkan waktu kemarau panjang."] },
    { id: "k4", t: () => ["Aku pernah lihat perahu nelayan lewat jauh di timur. Layarnya merah-putih!"] },
    { id: "k5", c: () => S().up.boat === 0, t: () => ["Kak, kalau sudah punya perahu motor, ajak aku ke Danau Toba ya! Katanya ada ikan dewa!"] },
    { id: "k6", c: () => ch() >= 2, t: () => ["Pak Darto cerita joran warisannya ke Kakak? Aku juga mau dengar cerita ikan toman raksasa itu!"] },
    { id: "k7", c: () => ch() >= 4, t: () => ["Kak, ajari aku Lemparan Presisi dong! Aku selalu meleset dari gelembungnya."] },
    { id: "k8", c: () => ch() >= 5, t: () => ["Sekarang aku suka duduk di sudut dermaga baca papan kenangan Kakak. Keren!"] },
    { id: "k9", c: () => fr("dika") >= 2, t: () => ["Rahasia, ya: kupu-kupu kuning itu paling suka bunga di petak dekat bangku taman."] },
    { id: "k10", t: () => ["Kemarin aku menemukan sandal jepit di pantai. Kayaknya pasangannya yang Kakak pancing, hahaha!"] },
  ],
};
// pilih kalimat berikutnya yang belum didengar (ingatan disimpan lokal)
function chatLines(n, activityLines) {
  const mem = S().npcMem[n.id] = S().npcMem[n.id] || { seen: [] };
  const pool = (LINES[n.id] || []).filter((l) => !l.c || l.c()).map((l) => ({ id: l.id, t: l.t }));
  (activityLines || []).forEach((ls, i) => pool.push({ id: `${n.id}-a-${n.cur && n.cur.act}-${i}`, t: () => ls }));
  let next = pool.find((l) => !mem.seen.includes(l.id));
  if (!next) { mem.seen = mem.seen.slice(-2); next = pool.find((l) => !mem.seen.includes(l.id)) || pool[0]; }
  mem.seen.push(next.id); if (mem.seen.length > 40) mem.seen.shift();
  return next.t();
}
// cerita yang melibatkan NPC selain Pak Darto
function storyLineFor(n) {
  if (at(2, 1) && n.id === "dika" && !st().mats.bambu) return ["Kak cari bambu buat joran Pak Darto? Ambil di rumpun bambu samping gapura Rumahku! Cari yang ruasnya lurus dan kering."];
  return null;
}
function handleTalk(n, open, role) {
  if (n.id === "darto" && awaitsDarto()) { dartoStory(open, n, role); return true; }
  return false; // saat tugas sedang dikerjakan, Pak Darto mengobrol biasa + pengingat (lihat reminder)
}
// pengingat singkat tugas cerita yang sedang berjalan (ditambahkan setelah obrolan biasa)
function reminder(n) {
  const c = curStep(); if (n.id !== "darto" || !c || awaitsDarto()) return null;
  const s = st();
  if (c.kind === "mats") { const m = s.mats; return `Oh ya, bahan joran: benang ${m.benang ? "✔" : "✗"} · bambu ${m.bambu ? "✔" : "✗"} · damar ${m.damar ? "✔" : "✗"}.`; }
  if (c.key === "final") { const b = s.prog.best || { reads: 0, tired: 0 }; return `Ujianmu masih menunggu di ujung dermaga. Percobaan terbaikmu: baca ${b.reads}/2, gulung ${b.tired}/2.`; }
  return `Oh ya: ${c.goal.toLowerCase()} (${s.prog[c.key] || 0}/${c.need}).`;
}

// ---------- Opsi cerita di toko & pasar ----------
function tokoOption(open) {
  if (!at(2, 1) || st().mats.benang) return null;
  return { label: "🧵 Benang untuk joran Pak Darto", act: () => open({ name: "Pak Bono", avatar: "👨‍🔧", role: "Pemilik toko", lines: ["Benang sutra pancing, paling kuat di toko ini. Harganya 🪙120.", "Untuk joran warisan Pak Darto? Wah, aku ingat joran itu!"], options: [{ label: S().money >= 120 ? "🪙 Beli 120 koin" : "Koin belum cukup", act: () => { if (S().money < 120) return N().toast("Koinmu belum cukup untuk benang (🪙120)", "bad"); S().money -= 120; st().mats.benang = true; N().sfx("coin"); N().save(); N().refreshHUD(); N().toast("🧵 Dapat benang senar", "good"); matsCheck(); } }] }) };
}
function sariOption(open, n, role) {
  if (!at(2, 1) || st().mats.damar) return null;
  const it = S().cooler.filter((x) => (x.id === "nila" || x.id === "mujair") && !x.lock).sort((a, b) => a.w - b.w)[0]; // ikan terkunci tidak dipakai
  if (!it) return { label: "🫙 Tanya getah damar", act: () => open({ name: "Bu Sari", avatar: "👩", role, npc: n, lines: ["Getah damar? Ada, Nak. Tapi Ibu lagi butuh lauk untuk makan malam.", "Bawakan seekor nila atau mujair, nanti Ibu tukar dengan damar."] }) };
  const f = N().FISH_BY_ID[it.id];
  return { label: `🫙 Tukar ${f.name} ${N().fmtW(it.w)} dengan damar`, act: () => {
    const i = S().cooler.findIndex((x) => x.uid === it.uid); if (i < 0) return; // item yang ditunjuk saja yang diambil
    S().cooler.splice(i, 1); st().mats.damar = true; N().save(); N().refreshHUD(); N().toast(`🫙 ${f.name} ditukar dengan getah damar`, "good");
    open({ name: "Bu Sari", avatar: "👩", role, npc: n, lines: ["Terima kasih, Nak! Ini getah damarnya, masih hangat dari pohon di belakang rumah Ibu.", "Salam untuk Pak Darto, ya."] }); matsCheck();
  } };
}
// ikan yang sedang dibutuhkan cerita (dipakai pasar untuk memperingatkan sebelum menjual)
function fishNeeds() { return at(2, 1) && !st().mats.damar ? [{ ids: ["nila", "mujair"], n: 1, why: "Cerita Pak Darto: Bu Sari butuh 1 nila/mujair untuk getah damar" }] : []; }
function matsCheck() { refreshUI(); if (allMats()) N().toast("📖 Bahan lengkap! Bawa ke Pak Darto ❗", "good"); }

// ---------- Titik interaksi tambahan ----------
function points() {
  const L = [{ id: "story:corner", x: (CORNER.x0 + CORNER.x1) / 2, y: CORNER.y1 + 0.55, r: 0.8, icon: st().corner >= 2 ? "🪧" : "🧺", label: st().corner >= 2 ? "Papan Kenangan" : "Sudut Nelayan", story: true }];
  if (at(2, 1) && !st().mats.bambu) L.push({ id: "story:bamboo", x: GROVE.x, y: GROVE.y, r: 0.9, icon: "🎋", label: "Ruas bambu", story: true });
  return L;
}
function interact(t, open) {
  if (t.id === "story:bamboo") return open({ name: "Rumpun Bambu", avatar: "🎋", lines: ["Kamu memilih ruas bambu tua yang lurus dan kering, sesuai pesan Pak Darto."], options: [{ label: "✂️ Ambil ruas bambu", act: () => { st().mats.bambu = true; N().save(); N().sfx("click"); N().toast("🎋 Dapat ruas bambu", "good"); matsCheck(); } }] });
  if (t.id === "story:corner") {
    const c = st().corner;
    if (c === 0) return open({ name: "Sudut Nelayan", avatar: "🧺", lines: ["Perahu kecil terbalik, jaring kusut, dan peti pecah. Dulu ini tempat nelayan berkumpul sebelum melaut.", "Mungkin Pak Darto tahu ceritanya."] });
    if (c === 1) return open({ name: "Sudut Nelayan", avatar: "🧺", lines: ["Jaring sudah dijemur rapi di rak baru dan peti-peti ditumpuk lagi.", "Perahu tuanya masih menunggu dicat ulang."] });
    const d = st().doneAt[4] ? new Date(st().doneAt[4]) : null;
    return open({ name: "Papan Kenangan", avatar: "🪧", lines: [`"Sudut Nelayan Muara — dirawat oleh ${st().title || "nelayan muda"} bersama Pak Darto${d ? `, ${d.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}` : ""}."`, "Di bawahnya terukir kecil: \"Sabar dan teliti, seperti air muara.\""] });
  }
}

// ---------- Gambar lapisan pribadi ----------
function drawCorner(c, t) {
  const stage = st().corner, LIFT = NW.LIFT, r = CORNER, cx = (r.x0 + r.x1) / 2, cy = (r.y0 + r.y1) / 2;
  const poly = (pts) => { c.beginPath(); c.moveTo(pts[0].x, pts[0].y); for (const p of pts.slice(1)) c.lineTo(p.x, p.y); c.closePath(); };
  c.fillStyle = "rgba(20,40,30,.16)"; poly([P(r.x0, r.y0, LIFT), P(r.x1 + 0.4, r.y0 + 0.1, LIFT), P(r.x1 + 0.4, r.y1 + 0.1, LIFT), P(r.x0, r.y1, LIFT)]); c.fill();
  // perahu kecil (terbalik & kusam → dicat ulang & tegak di penyangga)
  const bp = P(r.x0 + 0.45, cy, LIFT);
  c.save(); c.translate(bp.x, bp.y); c.rotate(0.46);
  if (stage < 2) { c.fillStyle = "#7d6a55"; c.beginPath(); c.ellipse(0, -6, 22, 8, 0, Math.PI, 0); c.fill(); c.strokeStyle = "#5c4c3a"; c.lineWidth = 1; for (let i = -2; i <= 2; i++) { c.beginPath(); c.moveTo(i * 7, -6); c.lineTo(i * 6, -12); c.stroke(); } }
  else { c.fillStyle = "#6b4527"; c.fillRect(-14, -4, 3, 6); c.fillRect(11, -4, 3, 6); c.fillStyle = "#2f7a8c"; c.beginPath(); c.moveTo(-24, -10); c.quadraticCurveTo(0, 4, 24, -10); c.lineTo(-24, -10); c.fill(); c.fillStyle = "#e0b84c"; c.fillRect(-23, -12, 46, 2.5); }
  c.restore();
  if (stage === 0) {
    // jaring kusut, peti pecah, ember karatan, rumput liar
    const n = P(cx + 0.15, cy + 0.1, LIFT); c.fillStyle = "rgba(90,110,100,.85)"; c.beginPath(); c.ellipse(n.x, n.y - 4, 14, 6, 0.3, 0, 7); c.fill();
    c.strokeStyle = "rgba(50,70,60,.8)"; c.lineWidth = 0.7; for (let i = 0; i < 6; i++) { c.beginPath(); c.moveTo(n.x - 12 + i * 4, n.y - 8); c.lineTo(n.x - 10 + i * 4, n.y); c.stroke(); }
    const k = P(r.x1 - 0.25, r.y0 + 0.2, LIFT); c.save(); c.translate(k.x, k.y); c.rotate(-0.3); c.fillStyle = "#8a6a45"; c.fillRect(-7, -12, 14, 12); c.strokeStyle = "#5a3a20"; c.beginPath(); c.moveTo(-7, -12); c.lineTo(5, -2); c.stroke(); c.restore();
    const b = P(r.x1 - 0.15, r.y1 - 0.1, LIFT); c.fillStyle = "#8b5e3c"; c.fillRect(b.x - 4, b.y - 7, 8, 7); c.fillStyle = "#6e4a30"; c.beginPath(); c.ellipse(b.x, b.y - 7, 4, 1.5, 0, 0, 7); c.fill();
    c.strokeStyle = "#6f8a3c"; c.lineWidth = 1.2; for (let i = 0; i < 5; i++) { const w = P(r.x0 + 0.2 + i * 0.25, r.y1 + 0.05, LIFT); c.beginPath(); c.moveTo(w.x, w.y); c.lineTo(w.x - 1 + Math.sin(t + i), w.y - 6); c.stroke(); }
  } else {
    // rak jemur jaring yang rapi
    const a = P(cx - 0.05, r.y0 + 0.15, LIFT), b = P(r.x1 - 0.1, r.y0 + 0.15, LIFT);
    c.fillStyle = "#6b4527"; c.fillRect(a.x - 1.5, a.y - 30, 3, 30); c.fillRect(b.x - 1.5, b.y - 30, 3, 30);
    c.strokeStyle = "#8a5a32"; c.lineWidth = 2; c.beginPath(); c.moveTo(a.x, a.y - 28); c.lineTo(b.x, b.y - 28); c.stroke();
    c.strokeStyle = "rgba(60,90,80,.85)"; c.lineWidth = 0.8;
    for (let i = 0; i <= 8; i++) { const k2 = i / 8, x = a.x + (b.x - a.x) * k2, y = a.y + (b.y - a.y) * k2; c.beginPath(); c.moveTo(x, y - 27); c.lineTo(x, y - 10 + Math.sin(t * 2 + i) * 1.2); c.stroke(); }
    for (let j = 0; j < 4; j++) { c.beginPath(); c.moveTo(a.x, a.y - 26 + j * 4); c.lineTo(b.x, b.y - 26 + j * 4); c.stroke(); }
    c.fillStyle = "#e2574c"; for (let i = 0; i < 3; i++) { const k2 = (i + 0.5) / 3; c.beginPath(); c.arc(a.x + (b.x - a.x) * k2, a.y + (b.y - a.y) * k2 - 10, 2.2, 0, 7); c.fill(); }
    // peti tertumpuk rapi
    const k = P(r.x1 - 0.2, r.y1 - 0.15, LIFT); c.fillStyle = "#b8864a"; c.fillRect(k.x - 7, k.y - 10, 14, 10); c.fillStyle = "#a8743f"; c.fillRect(k.x - 6, k.y - 19, 12, 9);
  }
  if (stage >= 2) {
    // pot bunga, lentera, papan kenangan
    const fpp = P(r.x0 + 0.1, r.y1 - 0.05, LIFT); c.fillStyle = "#b5562f"; c.fillRect(fpp.x - 4, fpp.y - 7, 8, 7); c.fillStyle = "#4f9a46"; c.beginPath(); c.arc(fpp.x, fpp.y - 10, 5, 0, 7); c.fill(); c.fillStyle = "#f15f74"; c.beginPath(); c.arc(fpp.x - 2, fpp.y - 12, 1.8, 0, 7); c.arc(fpp.x + 2, fpp.y - 10, 1.8, 0, 7); c.fill();
    const l = P(r.x1 + 0.05, r.y0 + 0.1, LIFT); c.fillStyle = "#3a2a1a"; c.fillRect(l.x - 1, l.y - 36, 2, 36); c.fillStyle = "#c2603b"; c.beginPath(); c.ellipse(l.x, l.y - 38, 4, 5.5, 0, 0, 7); c.fill(); c.fillStyle = "#ffe29a"; c.beginPath(); c.ellipse(l.x, l.y - 38, 2, 3, 0, 0, 7); c.fill();
    const pl = P(cx, r.y1 + 0.15, LIFT); c.fillStyle = "#5a3a20"; c.fillRect(pl.x - 1.5, pl.y - 16, 3, 16); c.fillStyle = "#3a2410"; c.fillRect(pl.x - 15, pl.y - 26, 30, 12); c.strokeStyle = "#f0c75a"; c.lineWidth = 1; c.strokeRect(pl.x - 14, pl.y - 25, 28, 10);
    c.fillStyle = "#f0c75a"; c.font = "800 5px system-ui"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText("KENANGAN", pl.x, pl.y - 20);
  }
}
function layerObjects(t) {
  const L = [{ d: (CORNER.x0 + CORNER.x1) / 2 + (CORNER.y0 + CORNER.y1) / 2, draw: (c) => drawCorner(c, t) }];
  return L;
}
// tanda ❗ di atas Pak Darto/NPC/tempat yang ditunggu cerita
function markerFor(n) {
  if (n.id === "darto") return awaitsDarto();
  if (n.id === "dika") return at(2, 1) && !st().mats.bambu;
  if (n.id === "sari") return at(2, 1) && !st().mats.damar;
  return false;
}
function placeMarkers() { // titik tetap yang ditunggu cerita (toko, rumpun bambu)
  const M = [];
  if (at(2, 1) && !st().mats.benang) { const t = NW.points.find((p) => p.id === "toko"); M.push({ x: t.x, y: t.y, z: 60 }); }
  if (at(2, 1) && !st().mats.bambu) M.push({ x: GROVE.x - 0.5, y: GROVE.y - 0.5, z: 80 });
  return M;
}

// ---------- Petunjuk pemain baru (satu per satu, tidak mengulang) ----------
function mark(k) { const o = S().onboard; if (o && !o[k]) { o[k] = Date.now(); N().save(); if (W()) W().updateHint(); } }
function hint() {
  const o = S().onboard, s = st();
  if (!o.walk) return "Geser joystick di kiri bawah (atau WASD) untuk berjalan";
  if (s.ch === 1 && s.step === 0) return "Pak Darto punya cerita untukmu. Cari tanda ❗ lalu tekan 💬";
  if (!o.fish) return "Ke ujung dermaga di timur, lalu tekan 🎣 Mancing";
  if (!o.sell && S().cooler.length) return "Jual tangkapan di Pasar Bu Sari 🏪 (barat dermaga)";
  if (o.sell && !o.home) return "Rumahmu menunggu! Masuk lewat gapura 🏡 di barat laut kampung";
  return "";
}

// ---------- Keahlian dalam memancing (dibaca game.js) ----------
const SKILL_INFO = {
  presisi: { name: "Lemparan Presisi", icon: "🎯", from: "Bab 1", what: "Riak ikan (gelembung) terlihat di air dan meteran lempar menampilkan garis kuning untuk jaraknya.", how: "Lepas meteran di garis kuning dan arahkan lemparan ke riak. Kena: ikan menggigit lebih cepat dan sedikit lebih hoki." },
  membaca: { name: "Membaca Tarikan", icon: "👀", from: "Bab 3", what: "Muncul aba-aba \"Ikan bersiap menyentak\" sesaat sebelum ikan menarik kuat, dan senar bergetar.", how: "Lepas jarimu saat aba-aba muncul agar senar tidak putus. Keahlian ini memberi informasi, bukan kekuatan tambahan." },
  kendali: { name: "Kendali Senar", icon: "💪", from: "Bab 3", what: "Setelah menyentak, ikan lelah sebentar. Zona tegangan ideal (hijau) ditampilkan di bar.", how: "Tahan untuk menggulung saat \"Ikan lelah\": gulungan lebih cepat dan senar lebih awet di momen itu saja." },
};

// ---------- Menu Keahlian & Cerita ----------
function panelHTML() {
  const s = st(), k = sk(), title = s.title || "Pendatang";
  let h = NW.look.panelSection();
  h += `<div class="row"><div class="grow">📖 Penghargaan cerita</div><b>${title}</b></div>`;
  h += `<h3 class="sub-h">Keahlian Nelayan</h3><div class="list">`;
  for (const [id, I] of Object.entries(SKILL_INFO)) {
    const ok = k[id], stat = id === "presisi" ? `Tepat di riak: ${k.stats.hot}×` : id === "membaca" ? `Sentakan terbaca: ${k.stats.reads}×` : `Gulungan saat ikan lelah: ${k.stats.tired}×`;
    h += `<div class="skill ${ok ? "" : "locked"}"><div class="m-ic">${ok ? I.icon : "🔒"}</div><div class="grow"><div class="nm">${I.name}</div>
      <div class="sub">${ok ? I.what : `Dipelajari dari Pak Darto (${I.from}).`}</div>${ok ? `<div class="sub"><b>Cara pakai:</b> ${I.how}</div><div class="sub">${stat}</div>` : ""}</div></div>`;
  }
  h += `</div><h3 class="sub-h">📖 Pak Darto & Joran Warisan</h3><div class="list">`;
  for (let i = 1; i <= 4; i++) {
    const done = s.ch > i, cur = s.ch === i, step = cur ? CH[i].steps[s.step] : null;
    let goal = "";
    if (cur && step) {
      goal = step.goal;
      if (step.kind === "task" && step.need) goal += ` (${s.prog[step.key] || 0}/${step.need})`;
      if (step.kind === "mats") goal += ` — benang ${s.mats.benang ? "✔" : "✗"}, bambu ${s.mats.bambu ? "✔" : "✗"}, damar ${s.mats.damar ? "✔" : "✗"}`;
      if (step.key === "final") { const b = s.prog.best || { reads: 0, tired: 0 }; goal += ` (terbaik: baca ${b.reads}/2, gulung ${b.tired}/2)`; }
    }
    h += `<div class="mission ${done ? "claimed" : cur ? "done" : ""}"><div class="m-ic">${done ? "✔" : cur ? "📖" : "🔒"}</div><div class="grow"><div class="nm">Bab ${i} — ${CH[i].name}</div>
      <div class="sub">${done ? "Selesai" : cur ? goal : "Belum terbuka"}</div></div></div>`;
  }
  if (s.ch > 4) h += `<p class="muted">Cerita selesai. Joran Warisan terpajang di Rumahku dan papan kenangan berdiri di sudut dermaga.</p>`;
  h += `</div><p class="muted">Cerita bisa dilanjutkan kapan saja, tidak ada batas waktu. Progres tersimpan otomatis.</p>
    <div class="row"><div class="grow">🔊 Suara</div><button class="btn small" data-act="mute">${S().muted ? "Nyalakan" : "Matikan"}</button></div>`;
  return h;
}
function panelAct(a, arg, el) { if (NW.look.act(a, arg, el)) return; if (a === "mute") { S().muted = !S().muted; N().save(); N().refreshHUD(); N().renderPanel(); } }

// ---------- Event dari mancing ----------
function hook(isNewPlayer) {
  defaults(isNewPlayer);
  const g = N();
  g.on("catch", ({ fish, loc }) => { if (fish.rarity !== "sampah" && loc === "muara") taskTick("c1"); });
  g.on("cast", ({ hit }) => { if (hit) { sk().stats.hot++; taskTick("hot1"); } });
  g.on("read", () => { sk().stats.reads++; taskTick("reads"); });
  g.on("tired", () => { sk().stats.tired++; taskTick("tired"); });
  g.on("fight", (r) => {
    if (!at(4, 1) || !r.challenge) return;
    const b = st().prog.best || { reads: 0, tired: 0 };
    st().prog.best = { reads: Math.max(b.reads, Math.min(2, r.reads)), tired: Math.max(b.tired, Math.min(2, r.tired)) };
    if (r.result === "caught" && r.reads >= 2 && r.tired >= 2) { N().toast("🏆 Ujian dermaga berhasil! Temui Pak Darto", "good"); advance(); }
    else if (r.result === "caught") N().toast(`Ikan uji didaratkan, tapi baca ${r.reads}/2 · gulung ${r.tired}/2. Coba lagi!`);
    else N().toast("Ikan uji lepas. Tidak apa-apa, coba lagi dengan Lemparan Sempurna");
    N().save();
  });
  g.on("sell", () => mark("sell"));
  g.registerPanel("skills", { title: () => "🎯 Keahlian & Cerita", render: panelHTML, act: panelAct });
  $("skillBtn").addEventListener("click", () => { N().sfx("click"); N().openPanel("skills"); });
  refreshUI();
}
function refreshUI() { const b = $("skillBadge"); if (b) b.classList.toggle("hidden", !awaitsDarto()); if (W() && N().mode && N().mode() === "world") W().updateHint(); }
// ikan uji Bab 4: muncul bila Lemparan Sempurna di dermaga Muara
function challengeFish(perfect, loc) { return at(4, 1) && perfect && loc === "muara" ? { fish: N().FISH_BY_ID.gabus, w: 2.8, wr: 0.6, challenge: true } : null; }

NW.story = {
  fishNeeds, reminder, hook, handleTalk, chatLines, storyLineFor, tokoOption, sariOption, points, interact, layerObjects, markerFor, placeMarkers,
  hint, mark, has, challengeFish, SKILL_INFO, CH, CORNER, awaitsDarto, defaults, get state() { return st(); },
};
})();
