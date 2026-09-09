"""Offline UI fixture. Does not change managed Chromium policy or visit any URL.
Loads the actual shipped renderer into about:blank; a test storage adapter replaces
origin-dependent localStorage/IndexedDB. Native C# hosting is NOT tested here.
"""
from pathlib import Path
import re

ROOT=Path(__file__).resolve().parents[1]/'app'
STORAGE_ADAPTER=r'''
(()=>{
const data=window.__initialStorage||{};
Object.defineProperty(window,'localStorage',{value:{getItem:k=>data[k]??null,setItem:(k,v)=>{data[k]=String(v);},removeItem:k=>delete data[k],clear:()=>Object.keys(data).forEach(k=>delete data[k])}});
window.__testStorage=data;
window.__testMedia=new Map();
Object.defineProperty(window,'indexedDB',{value:{open(){const req={};setTimeout(()=>{req.result={createObjectStore(){},transaction(){const tr={};tr.objectStore=()=>({put(blob,key){window.__testMedia.set(key,blob);setTimeout(()=>tr.oncomplete?.(),0);},get(key){const r={};setTimeout(()=>{r.result=window.__testMedia.get(key);r.onsuccess?.();},0);return r;}});return tr;}};req.onsuccess?.();},0);return req;}}});
if(!crypto.randomUUID)crypto.randomUUID=()=> '00000000-0000-4000-8000-'+Array.from(crypto.getRandomValues(new Uint8Array(6)),x=>x.toString(16).padStart(2,'0')).join('');
})();'''

def mount(page, initial=None):
    html=(ROOT/'index.html').read_text()
    html=re.sub(r'<meta http-equiv="Content-Security-Policy"[^>]*>', '', html)
    html=re.sub(r'<script[^>]*src="[^"]+"[^>]*></script>', '', html)
    html=re.sub(r'<link[^>]*href="src/styles.css"[^>]*>', '', html)
    html=re.sub(r'<link[^>]*href="assets/icon.svg"[^>]*>', '', html)
    page.set_content(html)
    page.add_style_tag(content=(ROOT/'src/styles.css').read_text())
    page.evaluate('(data)=>{window.__initialStorage=data}', initial or {})
    page.add_script_tag(content=STORAGE_ADAPTER)
    for file in ['assets/world.js','data/seed.js','src/core.js','src/globe.js','src/app.js']:
        page.add_script_tag(content=(ROOT/file).read_text())
    page.wait_for_function('!!window.AtlasTest || document.querySelector("#boot")?.textContent.includes("Saved data could not")')
