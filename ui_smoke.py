"""Renderer smoke tests in an isolated, no-navigation browser fixture.
Requires Playwright + Chromium for developers. Not required to run the Windows app.
Storage is an injected adapter; native Windows hosting and OS integration remain untested.
"""
from pathlib import Path
import json,sys,io,zipfile,base64,os
from playwright.sync_api import sync_playwright
from browser_harness import mount,ROOT
OUT=Path(sys.argv[1]) if len(sys.argv)>1 else ROOT/'test-results'
OUT.mkdir(parents=True,exist_ok=True)
checks=[]
def passed(name): checks.append(name);print('PASS',name)
with sync_playwright() as p:
    b=p.chromium.launch(executable_path=os.environ.get('ATLAS_TEST_CHROMIUM','/usr/bin/chromium'),headless=True,args=['--no-sandbox'])
    context=b.new_context(viewport={'width':1600,'height':1000})
    page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    mount(page);page.wait_for_timeout(350)
    assert page.locator('#boot').count()==0
    assert page.locator('.site-item').count()==26
    assert page.evaluate('AtlasTest.globe.hits.length')>0
    page.screenshot(path=str(OUT/'desktop.png'))
    passed('Initial render: 26 starter records, projected globe points and no startup exception')

    page.locator('#search').fill('Gobekli')
    # ASCII spelling also finds the accented display name.
    assert page.locator('.site-item').count()==1
    page.locator('.site-item').click()
    assert 'mission-mode' in page.locator('body').get_attribute('class')
    assert page.locator('.site-heading').inner_text()=='Göbekli Tepe'
    passed('Search and site selection enter Mission mode')

    page.locator('#search').fill('')
    page.locator('[data-cat="lidar"]').click()
    assert page.locator('.site-item').count()==4
    page.locator('[data-cat="all"]').click()
    page.locator('#exactYear').fill('-5000');page.locator('#exactYear').press('Tab')
    page.locator('#filterTime').check()
    assert page.evaluate('AtlasTest.getVisible().length')<26
    assert page.evaluate('AtlasTest.getVisible().filter(s=>s.category==="lidar").length')==4
    page.locator('#filterTime').uncheck();page.locator('#presentBtn').click()
    passed('LiDAR category and archaeological timeline filters preserve all-era exceptions')

    page.locator('#addBtn').click()
    page.locator('#siteForm [name="name"]').fill('QA private site <angle>')
    page.locator('#siteForm [name="lat"]').fill('0')
    page.locator('#siteForm [name="lon"]').fill('0')
    page.locator('#siteForm [name="category"]').select_option('personal')
    page.locator('#siteForm [name="country"]').fill('QA region')
    page.locator('#siteForm [name="summary"]').fill('Test-only record, not an expedition destination.')
    page.locator('#siteForm [name="notes"]').fill('Private note retained')
    page.locator('#siteForm button[type="submit"]').click()
    assert not page.locator('#dialog').evaluate('(e)=>e.open')
    assert page.evaluate('AtlasTest.state.sites.length')==27
    assert page.locator('.site-heading').inner_text()=='QA private site <angle>'
    page.locator('[data-tab="notes"]').click();page.locator('#siteNotes').fill('Updated private notebook');page.locator('#saveNotes').click()
    page.evaluate('AtlasTest.flush()')
    assert page.evaluate('JSON.parse(localStorage.getItem("atlas-command-state")).sites.at(-1).notes')=='Updated private notebook'
    passed('Site creation at zero coordinates, escaped text and notebook serialization')

    page.locator('[data-tab="media"]').click()
    # An intentionally tiny fixture image is never part of the starter dataset.
    from PIL import Image
    image=io.BytesIO();Image.new('RGB',(4,4)).save(image,format='PNG')
    page.locator('#mediaImport').set_input_files({'name':'qa-only.png','mimeType':'image/png','buffer':image.getvalue()})
    page.wait_for_function('document.querySelector("#mediaGrid img")?.naturalWidth===4')
    assert page.evaluate('AtlasTest.state.sites.at(-1).media.length')==1
    passed('Local image attachment and blob preview through the fixture media adapter')

    page.locator('[data-tab="overview"]').click();page.locator('#queueBtn').click();page.locator('#planBtn').click()
    page.locator('#planForm [name="transport"]').fill('240')
    page.locator('#planForm [name="lodging"]').fill('160')
    page.locator('#planForm [name="permits"]').fill('20')
    assert page.locator('#budgetPreview').inner_text()=='$420'
    page.locator('#planForm button.primary').click()
    assert page.evaluate('AtlasTest.state.plan.transport')==240
    assert page.evaluate('AtlasTest.state.queue.length')==1
    passed('Private mission queue and manual cost arithmetic, with booking disabled')

    page.locator('[data-tab="research"]').click();page.locator('#alignmentBtn').click()
    for name,value in [('axis','359'),('declination','1'),('year','-3000'),('model','QA manual input — not Earth data'),('source','https://example.org/qa')]:
        page.locator('#alignmentForm [name="'+name+'"]').fill(value)
    page.locator('#alignmentForm button.primary').click()
    assert '2.00' in page.locator('#alignmentResult').inner_text() or '2.0' in page.locator('#alignmentResult').inner_text()
    page.locator('#closeDialog').click()
    passed('Manual axial-angle comparison handles the north crossing without creating a prediction')

    csv='name,latitude,longitude,age,mystery_rating,mainstream_summary\n"Imported, quoted site",10,20,"500 BCE",2,"A quoted, local record"\n'
    page.locator('#fileImport').set_input_files({'name':'qa-import.csv','mimeType':'text/csv','buffer':csv.encode()})
    page.locator('#confirmImport').click()
    assert page.evaluate('AtlasTest.state.sites.length')==28
    page.locator('#fileImport').set_input_files({'name':'qa-import.csv','mimeType':'text/csv','buffer':csv.encode()})
    page.wait_for_function('document.querySelector("#dialog").open && document.querySelector("#confirmImport")?.disabled')
    assert page.locator('#confirmImport').is_disabled()
    page.locator('#cancelImport').click()
    passed('CSV import review, confirmation and duplicate prevention')

    kml=page.evaluate('AtlasTest.exportKML(AtlasTest.state.sites)')
    count=page.evaluate('(text)=>AtlasTest.parseKML(text).length',kml)
    assert count==28 and '&lt;angle&gt;' in kml
    kmz=io.BytesIO()
    with zipfile.ZipFile(kmz,'w',zipfile.ZIP_DEFLATED) as z:z.writestr('doc.kml',kml)
    encoded=base64.b64encode(kmz.getvalue()).decode()
    count=page.evaluate('''async (b64)=>{const bytes=Uint8Array.from(atob(b64),c=>c.charCodeAt(0));const text=await AtlasTest.unzipKML(new File([bytes],'qa.kmz'));return AtlasTest.parseKML(text).length;}''',encoded)
    assert count==28
    passed('Google Earth KML roundtrip and bounded KMZ deflate decompression')

    handle=page.locator('#catalogPanel .panel-handle');r=handle.bounding_box()
    page.mouse.move(r['x']+90,r['y']+20);page.mouse.down();page.mouse.move(r['x']+160,r['y']+45,steps=8);page.mouse.up()
    page.evaluate('AtlasTest.flush()')
    layout=page.evaluate('AtlasTest.state.layout.desktop')
    assert len(layout)>0
    page.locator('#settingsBtn').click();page.locator('#updateCadence').select_option('daily')
    assert 'No feed service or scheduled task is installed' in page.locator('#dialog').inner_text()
    page.locator('#closeDialog').click();page.evaluate('AtlasTest.flush()')
    snapshot=page.evaluate('({...window.__testStorage})')
    second=context.new_page();mount(second,snapshot)
    assert second.evaluate('AtlasTest.state.sites.length')==28
    assert second.evaluate('AtlasTest.state.settings.updateCadence')=='daily'
    assert second.evaluate('AtlasTest.state.layout.desktop')==layout
    assert second.evaluate('AtlasTest.state.sites.find(s=>s.name.includes("QA private")).notes')=='Updated private notebook'
    passed('Panel coordinates, notes, sites and preferences restore from a serialized workspace')

    second.close();page.close()
    # Screenshots of pristine build, without test records, at real target viewport sizes.
    for name,width,height in [('laptop',1366,768),('ultrawide',2560,1080),('compact',820,1180)]:
        pg=context.new_page()
        pg.set_viewport_size({'width':width,'height':height});mount(pg);pg.wait_for_timeout(220)
        assert pg.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
        assert pg.locator('#addBtn').is_visible()
        pg.screenshot(path=str(OUT/(name+'.png')),full_page=(name=='compact'))
        pg.close()
    passed('Laptop, ultrawide and compact layouts render without horizontal page overflow')

    corrupt=context.new_page();mount(corrupt,{'atlas-command-state':'{broken JSON'})
    assert corrupt.locator('#boot').count()==1
    assert 'not overwritten' in corrupt.locator('#boot').inner_text()
    assert corrupt.evaluate('localStorage.getItem("atlas-command-state")')=='{broken JSON'
    passed('Corrupt stored JSON stops startup without overwriting original bytes')
    assert not errors,errors
    passed('No uncaught renderer errors during smoke workflow')
    (OUT/'ui-results.json').write_text(json.dumps({'passed':checks,'failed':[],'environment':'Chromium about:blank offline fixture; test storage adapter, not native hosting'},indent=2))
    b.close()
