import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { createHash } from 'node:crypto';
import { CDP, browser } from './helpers/cdp.mjs';
const root=fileURLToPath(new URL('..', import.meta.url)).replace(/\/$/, '');
const dev='http://127.0.0.1:5173';
const moduleURL=`${dev}/@fs${root}/src/index.js`;
const original=await readFile(`${root}/prototype/starfield.js`,'utf8');
const css=await readFile(`${root}/prototype/style.css`,'utf8');
const instrumentation=`
window.__tracked={window:new Map(),document:new Map(),observers:new Set()};
for(const [name,target] of [['window',window],['document',document]]){
 const add=target.addEventListener.bind(target),remove=target.removeEventListener.bind(target);
 target.addEventListener=(type,callback,options)=>{const set=__tracked[name].get(type)||new Set();set.add(callback);__tracked[name].set(type,set);add(type,callback,options);};
 target.removeEventListener=(type,callback,options)=>{const set=__tracked[name].get(type);if(set){set.delete(callback);if(!set.size)__tracked[name].delete(type);}remove(type,callback,options);};
}
const NativeObserver=window.ResizeObserver;
if(NativeObserver)window.ResizeObserver=class extends NativeObserver{observe(...args){super.observe(...args);__tracked.observers.add(this);}disconnect(){super.disconnect();__tracked.observers.delete(this);}};
window.__resources=()=>({window:Object.fromEntries([...__tracked.window].map(([k,v])=>[k,v.size])),document:Object.fromEntries([...__tracked.document].map(([k,v])=>[k,v.size])),observers:__tracked.observers.size});
`;
const controlled=`
let seed=12345;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);window.__resetRandom=()=>{seed=12345;};
window.__pending=new Map();let nextID=0;
window.requestAnimationFrame=callback=>{const id=nextID++;__pending.set(id,callback);return id;};
window.cancelAnimationFrame=id=>__pending.delete(id);
window.__step=time=>{for(const [id,callback]of [...__pending]){if(!__pending.has(id))continue;__pending.delete(id);callback(time);}};
window.__hidden=false;Object.defineProperty(document,'hidden',{get:()=>__hidden});
window.__visibility=hidden=>{__hidden=hidden;document.dispatchEvent(new Event('visibilitychange'));};
`;
const paritySetup=`
window.ResizeObserver=undefined;window.__resizeHandlers=[];
const addResize=window.addEventListener;window.addEventListener=(type,callback,options)=>{if(type==='resize')__resizeHandlers.push(callback);else addResize(type,callback,options);};
window.__resize=()=>__resizeHandlers.forEach(callback=>callback(new Event('resize')));
`;
const {execFileSync}=await import('node:child_process');
const baseline=Object.fromEntries(['index.js','Starfield.js','Star.js','ShootingStar.js','config.js','defaultConfig.js','presets.js'].map(n=>[n,execFileSync('git',['show','e927d64:src/'+n],{cwd:root,encoding:'utf8'})]));
const server=createServer((req,res)=>{
 const url=new URL(req.url,'http://127.0.0.1:5180');if(url.pathname.startsWith('/baseline/')){res.setHeader('Content-Type','text/javascript');res.end(baseline[url.pathname.split('/').at(-1)]);return;}res.setHeader('Content-Type','text/html');
 if(url.pathname==='/api'){
  res.end(`<!doctype html><html><head><style>body{margin:0;background:#05070d}.box{position:absolute;left:60px;top:100px;width:400px;height:240px}#boxB{left:540px;width:260px;height:180px}canvas{position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:none}</style></head><body><div class="box" id="boxA"><canvas id="a"></canvas></div><div class="box" id="boxB"><canvas id="b"></canvas></div><script type="module">import {Starfield} from '${moduleURL}';window.Starfield=Starfield;window.__ready=true;</script></body></html>`);return;
 }
 const options=JSON.parse(url.searchParams.get('options')||'{}');
 // Only normalize the prototype's zero-timestamp sentinel for the active-time comparison.
 const reference=original.replace('this.lastTime = 0;','this.lastTime = null;').replace('this.lastTime ? (time - this.lastTime)','this.lastTime !== null ? (time - this.lastTime)').replace('new StarField(canvas, ctx);',`for(const[name,values]of Object.entries(${JSON.stringify(options)}))Object.assign(CONFIG[name],values);window.__field=new StarField(canvas,ctx);window.__ready=true;`);
 const source=url.pathname==='/reference'?`<script>${reference}</script>`:`<script type="module">import {Starfield} from '${url.pathname==='/before'?'http://127.0.0.1:5180/baseline/index.js':moduleURL}';window.__field=new Starfield('#starfield',${JSON.stringify(options)});window.__ready=true;</script>`;
 res.end(`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style></head><body><canvas id="starfield"></canvas>${source}</body></html>`);
});
await new Promise(resolve=>server.listen(5180,'127.0.0.1',resolve));
const pages=[];
async function page(url,width=1280,height=720,dpr=1,mode='controlled'){
 const {targetId}=await browser.send('Target.createTarget',{url:'about:blank'});
 const targets=await(await fetch('http://127.0.0.1:9228/json/list')).json();
 const c=await CDP.connect(targets.find(t=>t.id===targetId).webSocketDebuggerUrl);pages.push({targetId,c});
 await c.send('Page.enable');await c.send('Runtime.enable');
 await c.send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:dpr,mobile:false});
 await c.send('Page.addScriptToEvaluateOnNewDocument',{source:instrumentation+(mode==='native'?'':controlled)+(mode==='parity'?paritySetup:'')});
 await c.send('Page.navigate',{url});
 for(let i=0;i<100;i++){
  if(await c.evaluate(url.includes(':5180')?'!!window.__ready':`!!document.querySelector('canvas') && document.querySelector('canvas').width === ${width*dpr}`)){
   await new Promise(r=>setTimeout(r,200));return c;
  }
  await new Promise(r=>setTimeout(r,50));
 }
 throw Error(`Initialization timeout ${url} ${JSON.stringify(c.errors)}`);
}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const empty={window:{},document:{},observers:0};



const results={date:new Date().toISOString(),baseline:'e927d64',parity:0,profiles:[],memory:[],browser:await browser.send('Browser.getVersion')};
async function close(c) { const index=pages.findIndex(p=>p.c===c);const [{targetId}]=pages.splice(index,1);await browser.send('Target.closeTarget',{targetId});c.socket.close(); }
try {
 for(const [width,height,dpr]of [[1280,720,1],[390,844,3]]) {
  const options={repulsion:{enabled:false},connections:{enabled:false}};
  const query='?options='+encodeURIComponent(JSON.stringify(options));
  const a=await page('http://127.0.0.1:5180/before'+query,width,height,dpr,'parity');
  const b=await page('http://127.0.0.1:5180/extracted'+query,width,height,dpr,'parity');
  for(const time of [0,16,32,48,64,80]) {
   for(const c of [a,b])await c.evaluate(`__step(${time})`);
   assert.equal(await a.evaluate('document.querySelector("canvas").toDataURL()'),await b.evaluate('document.querySelector("canvas").toDataURL()'));results.parity++;
  }
  await close(a);await close(b);
  for(const count of [100,250,500,1000])for(const path of ['before','extracted']) {
   const c=await page('http://127.0.0.1:5180/'+path+'?options='+encodeURIComponent(JSON.stringify({stars:{count}})),width,height,dpr);
   const profile=await c.evaluate(`(()=>{for(let i=0;i<30;i++)__step(i*1000/60);const samples=[];for(let i=30;i<90;i++){const start=performance.now();__step(i*1000/60);samples.push(performance.now()-start)}samples.sort((a,b)=>a-b);return {mean:samples.reduce((a,b)=>a+b)/samples.length,p95:samples[57],p99:samples[59]}})()`);
   results.profiles.push({path,count,dpr,...profile});assert.equal(c.errors.length,0);await close(c);
  }
 }
 for(const effect of ['none','twinkle','parallax','repulsion','connections','glow']) {
  const options={};for(const key of ['twinkle','parallax','repulsion','connections','glow'])options[key]={enabled:key===effect};
  const c=await page('http://127.0.0.1:5180/extracted?options='+encodeURIComponent(JSON.stringify(options)));
  results.profiles.push({effect,...await c.evaluate(`(()=>{for(let i=0;i<30;i++)__step(i*1000/60);const s=[];for(let i=30;i<90;i++){const t=performance.now();__step(i*1000/60);s.push(performance.now()-t)}s.sort((a,b)=>a-b);return {mean:s.reduce((a,b)=>a+b)/s.length,p95:s[57],p99:s[59]}})()`)});await close(c);
 }
 const c=await page('http://127.0.0.1:5180/api');
 await c.evaluate(`window.a=new Starfield('#a');window.b=new Starfield('#b',{preset:'deep-space'});window.refs=[];window.before=JSON.stringify(__resources());window.batch=()=>{refs=[];for(let i=0;i<100;i++){refs.push(new WeakRef(a.config),new WeakRef(a.stars));a.updateConfig({preset:['deep-space','milky-way','constellation','default'][i%4]});a.stop().start();__step(i*16);}return {same:before===JSON.stringify(__resources()),frames:__pending.size}};void 0`);
 for(let i=0;i<4;i++) {
  assert.deepEqual(await c.evaluate('batch()'),{same:true,frames:2});await sleep(150);await c.send('HeapProfiler.collectGarbage');
  assert.equal(await c.evaluate('refs.filter(r=>r.deref()).length'),0);await c.evaluate('refs=[]');await c.send('HeapProfiler.collectGarbage');
  results.memory.push({cycles:(i+1)*100,...await c.send('Runtime.getHeapUsage')});
 }
 await c.evaluate('a.destroy();b.destroy();void 0');assert.deepEqual(await c.evaluate('__resources()'),empty);assert.equal(await c.evaluate('__pending.size'),0);
 // Real matchMedia updates through Chrome emulation, keeping deterministic RAF accounting.
 await c.send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
 await c.evaluate("window.a=new Starfield('#a');void 0");assert.equal(await c.evaluate('__pending.size'),0);
 await c.send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'no-preference'}]});await sleep(100);assert.equal(await c.evaluate('__pending.size'),1);
 await c.evaluate('a.stop();void 0');
 await c.send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});await sleep(100);assert.equal(await c.evaluate('__pending.size'),0);
 await c.evaluate('a.destroy();void 0');assert.equal(c.errors.length,0);results.reducedMotion=true;
 // Destroyed instances and canvases must be collectable, including media listeners.
 for(let batch=0;batch<3;batch++) {
  await c.evaluate(`window.refs=[];for(let i=0;i<100;i++){const canvas=document.createElement('canvas');canvas.style.cssText='width:100px;height:100px';document.body.append(canvas);const field=new Starfield(canvas,{stars:{count:4}});refs.push(new WeakRef(field),new WeakRef(canvas));field.destroy();canvas.remove();}void 0`);
  await sleep(150);await c.send('HeapProfiler.collectGarbage');assert.equal(await c.evaluate('refs.filter(r=>r.deref()).length'),0);
  await c.evaluate('refs=[]');assert.deepEqual(await c.evaluate('__resources()'),empty);
 }
 results.destroyCycles=300;
 await writeFile(new URL('../docs/milestone-5-browser-results.json',import.meta.url),JSON.stringify(results,null,2)+'\n');
 console.log(JSON.stringify(results,null,2));
} finally { for(const {targetId,c}of pages){await browser.send('Target.closeTarget',{targetId});c.socket.close();}browser.socket.close();server.closeAllConnections();await new Promise(r=>server.close(r)); }
