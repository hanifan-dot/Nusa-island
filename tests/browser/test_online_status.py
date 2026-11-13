"""Uji ringan indikator kiri atas dan pengunci online-only tanpa server produksi."""
from pathlib import Path
import shutil
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
UI = (ROOT / "mp/ui.js").read_text()
CSS = (ROOT / "mp/mp.css").read_text()

with sync_playwright() as p:
    chrome = shutil.which("chromium") or shutil.which("chromium-browser") or shutil.which("google-chrome")
    browser = p.chromium.launch(headless=True, executable_path=chrome) if chrome else p.chromium.launch(headless=True)
    ctx = browser.new_context(viewport={"width": 360, "height": 740})
    page = ctx.new_page()
    page.set_content(f"<style>{CSS}</style><div class='hud-right'></div>")
    page.add_script_tag(content="""
      window.NW = {
        cloud:{enabled:true,user:{uid:'uji'}},
        mp:{EMOTES:['ok'], _R:{rooms:null}, typing:false,
          state:{online:false,n:0,state:'off',why:'',prefs:{on:false,consent:true},players:[],log:[]},
          view(){return this.state}, onChange(fn){this.changed=fn}, fetchRooms(){return Promise.resolve()},
          setPref(){}, sendChat(){}, sendEmote(){}
        }
      };
      window.Nusa = {isStarted:()=>true,isPanelOpen:()=>false,currentPanel:()=>'',registerPanel(){},sfx(){},openPanel(){},renderPanel(){},toast(){}};
    """)
    page.add_script_tag(content=UI)
    page.evaluate("NW.mpUI.mount()")

    assert page.locator("#mpN").inner_text() == "Single"
    assert "single" in page.locator("#mpCount").get_attribute("class")

    page.evaluate("NW.mp.state={online:true,n:3,state:'online',why:'',prefs:{on:true,consent:true},players:[],log:[]};NW.mpUI.refresh()")
    assert page.locator("#mpN").inner_text() == "3"
    assert "on" in page.locator("#mpCount").get_attribute("class")

    ctx.set_offline(True)
    page.evaluate("dispatchEvent(new Event('offline'));NW.mpUI.refresh()")
    assert page.locator("#mpN").inner_text() == "!"
    assert page.locator("#netRequired").is_visible()
    assert page.evaluate("NW.mpUI.isNetworkBlocked()") is True
    page.evaluate("window.__inputReached=false;document.addEventListener('pointerdown',()=>window.__inputReached=true)")
    page.locator("#netRequired").dispatch_event("pointerdown")
    assert page.evaluate("window.__inputReached") is False

    ctx.set_offline(False)
    page.evaluate("dispatchEvent(new Event('online'));NW.mp.state={online:true,n:2,state:'online',why:'',prefs:{on:true,consent:true},players:[],log:[]};NW.mpUI.refresh()")
    assert page.locator("#mpN").inner_text() == "2"
    assert page.locator("#netRequired").is_hidden()
    assert page.evaluate("NW.mpUI.isNetworkBlocked()") is False
    assert page.evaluate("document.documentElement.scrollWidth <= innerWidth")

    browser.close()
print("test_online_status: 11 lulus, 0 gagal")
