'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const C=require('../app/src/core.js');
const data=path.join(__dirname,'../app/data');
const files=['seed.js','site-expansion.js','site-expansion-r5.js','site-expansion-r6.js','site-expansion-r7.js','site-expansion-r8.js'];
function catalog(){const context={window:{}};vm.createContext(context);for(const file of files)new vm.Script(fs.readFileSync(path.join(data,file),'utf8'),{filename:file}).runInContext(context,{timeout:1000});return context.window;}
test('every bundled catalog script parses and R8 has its complete 25-record batch',()=>{const w=catalog();assert.equal(w.ATLAS_SITE_EXPANSION_R8.length,25);const records=Object.values(w).flat();assert(records.length>=150);assert.equal(new Set(records.map(r=>r.id)).size,records.length);});
test('all surviving R8 curated bytes remain unchanged',()=>{const source=fs.readFileSync(path.join(data,'site-expansion-r8.js'),'utf8').replace(/\r\n/g,'\n');const bytes=Buffer.from(source).subarray(0,15504);assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),'9dd8f4337e781d06d28d13286fbfcd1d7ec2e6265d67b9be18a564615e894722');});
test('R8 records retain valid chronology coordinates evidence and meaningful source fields',()=>{for(const r of catalog().ATLAS_SITE_EXPANSION_R8){const n=C.normalizeSite(r,'catalog');assert.equal(n.id,r.id);assert.equal(n.name,r.name);assert.equal(n.source,r.source);assert.equal(new URL(r.source).protocol,'https:');for(const field of ['summary','question','evidence','precision','review'])assert(r[field].length>=20,r.id+': '+field);assert.equal(n.yearStart,r.yearStart);assert.equal(n.yearEnd,r.yearEnd);}});
