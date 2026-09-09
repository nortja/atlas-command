const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
test('restore layout clamps collapsed panels with their visible footprint',()=>{assert.match(read('app/src/app.js'),/Math\.min\(s\.y,h-\(s\.collapsed\?47:ph\)-35\)/);});
test('queue changes notify the live instruments and scene heading keeps word spacing',()=>{const src=read('app/src/app.js');assert.ok(src.includes("$('#planBtn').onclick=planDialog;window.dispatchEvent(new Event('atlas:catalog-changed'));"));assert.ok(src.includes('The world is still full <br>of questions.'));});
