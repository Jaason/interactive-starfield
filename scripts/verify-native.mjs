import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { CDP, browser } from './helpers/cdp.mjs';
const pages=[]; const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function page(url){const {targetId}=await browser.send('Target.createTarget',{url});const list=await(await fetch('http://127.0.0.1:9228/json/list')).json();const c=await CDP.connect(list.find(p=>p.id===targetId).webSocketDebuggerUrl);pages.push({targetId,c});await c.send('Runtime.enable');await c.send('Page.enable');return c;}
try{
 const c=await page('http://127.0.0.1:5174');await wait(1500);await c.send('Page.bringToFront');
 assert.equal(await c.evaluate('!!window.starfieldBenchmark'),true);
 await wait(2000);const initial=await c.evaluate('starfieldBenchmark.snapshot()');assert.ok(initial.frame.count>10);assert.equal(initial.errors,0);
 await c.evaluate(`const form=document.querySelector('form');form.elements.count.value='100';form.elements.instances.value='2';form.elements.dpr.value='1';form.requestSubmit();void 0`);
 await wait(1500);let report=await c.evaluate('starfieldBenchmark.snapshot()');assert.equal(report.instances,2);assert.equal(report.config.stars.count,100);assert.equal(report.canvasSizes[0].buffer[0],report.canvasSizes[0].css[0]);
 await c.evaluate("document.querySelector('#cycles').click()");assert.equal(await c.evaluate('starfieldBenchmark.snapshot().errors'),0);
 await c.evaluate("document.querySelector('#start').click()");await wait(200);
 const other=await page('about:blank');await other.send('Page.bringToFront');await wait(200);assert.equal(await c.evaluate('document.hidden'),true);const paused=await c.evaluate('starfieldBenchmark.snapshot().activeMs');await wait(300);assert.equal(await c.evaluate('starfieldBenchmark.snapshot().activeMs'),paused);
 await c.send('Page.bringToFront');await wait(300);assert.ok(await c.evaluate('starfieldBenchmark.snapshot().activeMs')>paused);
 await c.send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:3,mobile:true});await wait(500);await c.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:150,y:650}]});await c.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:180,y:660}]});await c.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 report=await c.evaluate('starfieldBenchmark.snapshot()');assert.equal(report.errors,0);assert.equal(c.errors.length,0);
 
 await c.evaluate("document.querySelector('#destroy').click()");assert.equal(await c.evaluate('starfieldBenchmark.snapshot().instances'),0);
 await writeFile(new URL('../docs/milestone-5-native-results.json',import.meta.url),JSON.stringify({initial,after:report},null,2)+'\n');console.log('Native RAF, visibility, two instances, resize, touch, cleanup: passed.');
}finally{for(const {targetId,c}of pages){await browser.send('Target.closeTarget',{targetId});c.socket.close();}browser.socket.close();}
