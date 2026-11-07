"""Skrip awal untuk menjalankan suite lama DI BAWAH CUACA PAKSAAN (uji regresi Bumbu 2.3).
Pakai:  NUSA_WX=hujan python tests/browser/test_bumbu1.py   (atau deras / kabut / mendung)
Kode ini hanya ada di tes; game tidak membaca variabel lingkungan apa pun."""
import os
KIND = os.environ.get("NUSA_WX", "")
WXI = ("(()=>{const k=%r; const iv=setInterval(()=>{ if(window.NW&&NW.weather&&window.__nusa&&window.__nusa.S){ clearInterval(iv); NW.weather.force(k,{snap:true}); } },300); })();" % KIND) if KIND else ""
def apply(ctx):
    if WXI: ctx.add_init_script(WXI)
