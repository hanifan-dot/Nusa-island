// Tes halaman rescue: hanya membaca data di browser lokal, tidak menjalankan game/login.
// data tiruan, tidak menyentuh Firebase/Nusa Island produksi.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const html = fs.readFileSync("selamatkan-data.html","utf8");
const code = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert.ok(code, "inline script wajib ada");
assert.match(html, /connect-src 'none'/);
assert.doesNotMatch(html, /src="https?:|<iframe|<form/i, "no external dependencies");
const records = {
  "nusa-island-v1": JSON.stringify({v:11,money:50,up:{rod:0},stats:{caught:0},cooler:[]}),
  "nusa-island-v1-bak-tamu-sebelum-unggah-1793660000000": JSON.stringify({
    v:11,money:13400,up:{rod:4,boat:2},stats:{caught:25},cooler:[{id:"tuna",uid:"1",w:12}]
  }),
  "nusa-auth-v1": JSON.stringify({mode:"google",uid:"sensitive"}),
};
let reads=0, writes=0;
const localStorage = {
  get length(){return Object.keys(records).length},
  key(i){return Object.keys(records)[i]||null},
  getItem(k){reads++;return Object.hasOwn(records,k)?records[k]:null},
  setItem(){writes++;throw Error("write prohibited")},
  removeItem(){writes++;throw Error("delete prohibited")},
};
function el(tag){
  return {tag, children:[], appendChild(node){this.children.push(node)}, 
    set textContent(s){this._text=String(s)},get textContent(){return this._text},
    addEventListener(){},remove(){},click(){}};
}
const status=el("p"), results=el("div");
const document={
  getElementById(id){return id==="status"?status:id==="results"?results:null},
  createElement:el
};
vm.runInNewContext(code,{document,localStorage,console,Date,Number,Blob,setTimeout,URL});
assert.ok(reads>0);
assert.equal(writes,0);
assert.equal(results.children.length,2,"current plus one guest backup");
assert.match(status.textContent,/2 simpanan/);
const allText=(e)=>[e.textContent||"",...(e.children||[]).map(allText)].join(" ");
assert.match(allText(results),/13\.400 koin/);
assert.match(allText(results),/Joran level 5/);
assert.doesNotMatch(allText(results),/sensitive/,"tidak boleh menampilkan auth UID");
console.log("PASS: recovery page can inspect guest backups without writes, network, or auth.");
