// Uji logika Rumahku & inventaris ikan (tanpa browser): node tests/unit-home.js
const HD = require(require('path').join(__dirname, '../world/home-data.js'));
global.window = undefined;
const fs = require('fs'); eval(fs.readFileSync(require('path').join(__dirname, '../data.js'),'utf8').replace(/^const /gm,'global.').replace(/^global\.RARITY_ORDER/m,'global.RARITY_ORDER'));
const FISH_BY_ID = Object.fromEntries(FISH.map(f=>[f.id,f]));
let pass=0, fail=0; const ok=(n,c,x='')=>{ if(c){pass++;} else {fail++; console.log('FAIL',n,x);} };
// 1. rumah baru valid di semua level & relayout tidak menghilangkan barang
for (let lv=1; lv<=10; lv++){
  const S={seq:0,cooler:[]}; const h=HD.newHome(S,lv); S.home=h;
  ok(`L${lv} perabot dasar terpasang`, h.furniture.length===3 && h.stored.length===0, JSON.stringify(h.stored));
  for (const f of h.furniture) ok(`L${lv} ${f.type} valid`, HD.canPlace(h,f).ok, HD.canPlace(h,f).why);
}
// 2. upgrade 1→10 dengan semua perabot
{
  const S={seq:0,cooler:[]}; const h=HD.newHome(S,1); S.home=h;
  for (const t of ['karpet','tanaman','radio','trofi','akuariumBesar','akuariumKecil']) HD.addFurniture(h,S,t);
  const count=()=>h.furniture.length+h.stored.length;
  const total=count();
  for (let lv=2; lv<=10; lv++){ h.level=lv; HD.relayout(h); ok(`upgrade ke L${lv} tidak hilang barang`, count()===total, count()); for (const f of h.furniture) ok(`L${lv} ${f.type} valid setelah relayout`, HD.canPlace(h,f).ok, HD.canPlace(h,f).why); }
  ok('L10 semua perabot muat (gudang kosong)', h.stored.length===0, h.stored.map(f=>f.type));
}
// 3. migrasi 2A
{
  const S={seq:0,cooler:[{id:'nila',w:.5},{id:'patin',w:3},{id:'nila',w:.5}],home:{items:['karpet','tanaman','lampu','lukisan','radio','trofi','kucing','akuarium'],cat:null}};
  const r=HD.migrateHome(S); const fixed=HD.ensureFishUids(S);
  ok('migrasi 2A → level 4', r.from==='2A' && S.home.level===4);
  ok('migrasi 2A: semua perabot & dekorasi ada', S.home.furniture.length+S.home.stored.length===8 && S.home.decorations.length===3, S.home.furniture.map(f=>f.type)+'|'+S.home.stored.map(f=>f.type));
  ok('ikan lama mendapat uid tanpa duplikasi (3 ikan tetap 3)', S.cooler.length===3 && new Set(S.cooler.map(x=>x.uid)).size===3, fixed);
}
// 4. inventaris
{
  const S={seq:0,cooler:[]}; S.home=HD.newHome(S,1);
  const aq=S.home.furniture.find(f=>f.type==='akuariumKecil');
  const add=(id,w)=>{const it={uid:HD.newUid(S),id,w,t:1}; S.cooler.push(it); return it;};
  const a=add('nila',.6), b=add('mujair',.4), c=add('lele',1.1), d=add('patin',4), e=add('kakap',2), f=add('tuna',30), g=add('sandal',.2), h2=add('mas',1);
  ok('masuk: nila', HD.putFish(S,a.uid,aq.uid,FISH_BY_ID).ok);
  ok('nila pindah (bukan salin)', !S.cooler.includes(a) && S.home.placedFish.includes(a));
  ok('tolak: patin 4kg terlalu besar untuk akuarium kecil', !HD.putFish(S,d.uid,aq.uid,FISH_BY_ID).ok);
  ok('tolak: kakap (laut) di akuarium tawar', HD.putFish(S,e.uid,aq.uid,FISH_BY_ID).why.includes('tawar'));
  ok('tolak: tuna perenang samudra', !HD.putFish(S,f.uid,aq.uid,FISH_BY_ID).ok);
  ok('tolak: sandal bukan ikan', !HD.putFish(S,g.uid,aq.uid,FISH_BY_ID).ok);
  ok('masuk: mujair', HD.putFish(S,b.uid,aq.uid,FISH_BY_ID).ok);
  ok('masuk: lele', HD.putFish(S,c.uid,aq.uid,FISH_BY_ID).ok);
  ok('akuarium penuh 3/3 → tolak ikan ke-4', HD.putFish(S,h2.uid,aq.uid,FISH_BY_ID).why==='full');
  ok('ikan yang dipajang tidak ada di coolbox (tidak bisa dijual)', !S.cooler.some(x=>[a,b,c].includes(x)));
  const before=HD.inventoryReport(S);
  ok('tukar mas ↔ nila', HD.swapFish(S,h2.uid,a.uid,FISH_BY_ID).ok && S.cooler.includes(a) && S.home.placedFish.includes(h2));
  const after=HD.inventoryReport(S);
  ok('total ikan tetap & unik setelah tukar', before.total===after.total && after.unique===after.total);
  ok('ambil ditolak saat coolbox penuh', !HD.takeFish(S,b.uid,S.cooler.length).ok && S.home.placedFish.includes(b));
  const r=HD.takeFish(S,b.uid,99); ok('ambil mujair kembali utuh (uid & berat sama)', r.ok && r.item===b && b.w===.4 && b.uid && !('aq' in b));
  ok('tidak bisa ambil dua kali', !HD.takeFish(S,b.uid,99).ok);
  // kosongkan → air reset
  HD.takeFish(S,c.uid,99); HD.takeFish(S,h2.uid,99);
  ok('akuarium kosong → jenis air bebas lagi', aq.water===null);
  // duplikat dibersihkan
  S.home.placedFish.push({...S.cooler[0], aq: aq.uid});
  HD.ensureFishUids(S); const rep=HD.inventoryReport(S);
  ok('salinan ganda dibersihkan', rep.total===rep.unique, rep);
}
// 5. penempatan
{
  const S={seq:0,cooler:[]}; const h=HD.newHome(S,3); S.home=h;
  const aq=h.furniture.find(f=>f.type==='akuariumKecil'), door=HD.doorOf(3);
  ok('tolak: akuarium di depan pintu', !HD.canPlace(h,{...aq,x:0.05,y:door.y0}).ok);
  ok('tolak: keluar ruangan', !HD.canPlace(h,{...aq,x:4.6,y:1}).ok);
  const bed=h.furniture.find(f=>f.type==='kasur');
  ok('tolak: menabrak kasur', !HD.canPlace(h,{...aq,x:bed.x,y:bed.y}).ok);
  ok('tolak: menabrak rak bawaan', !HD.canPlace(h,{...aq,x:0.4,y:0.05}).ok);
  const spot=HD.findSpot(h,{...aq,rot:1},3,4);
  ok('ada posisi valid untuk akuarium diputar', !!spot && HD.canPlace(h,spot).ok);
  ok('izin pengunjung ditolak di tahap lokal', !HD.visitorCan(h,'takeFish','teman') && !HD.visitorCan(h,'decorate','teman'));
}
console.log(`unit: ${pass} lulus, ${fail} gagal`);

if (fail) process.exit(1);
