import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { iconMarkup } from '../../src/shell-ui.js';
const read=p=>readFileSync(new URL(`../../${p}`,import.meta.url),'utf8');
test('shell assets are bundled locally, never fetched from a CDN',()=>{
 const html=read('index.html'),ui=read('src/shell-ui.js'),css=read('src/shell.css');
 assert.doesNotMatch(html,/(?:src|href)=["']https?:/);
 assert.doesNotMatch(ui,/\b(?:fetch|XMLHttpRequest)\s*\(/);
 assert.doesNotMatch(css,/url\(["']?https?:/);
 assert.match(ui,/from 'lucide'/);
});
test('shell dialogs have names and modal semantics',()=>{
 const html=read('index.html');
 for(const id of ['settings','help','pause','win']) {
  const open=html.match(new RegExp(`<div id="${id}"[^>]+>`))?.[0];
  assert.match(open,/role="dialog"/); assert.match(open,/aria-modal="true"/); assert.match(open,/aria-labelledby=/);
 }
});
test('shell stylesheet does not target gameplay chrome or overwrite game tokens',()=>{
 const css=read('src/shell.css');
 assert.doesNotMatch(css,/#(?:hud|scene|minimap|pad|hint|vignette)\b/);
 assert.doesNotMatch(css,/--(?:bg|ink|cyan|panel|line|font)\s*:/);
 assert.match(css,/--ui-accent:/);
});
test('shell uses native buttons and permits browser zoom',()=>{
 const html=read('index.html');
 assert.doesNotMatch(html,/user-scalable=no|maximum-scale=1/);
 assert.doesNotMatch(html,/onclick=/);
 assert.match(html,/<button[^>]+id="btn-play"/);
});
test('icon registry rejects unregistered names rather than injecting markup',()=>{
 assert.throws(()=>iconMarkup('<script>'),/Unknown shell icon/);
});
test('sound preference reaches the audio engine on boot, not only its label',()=>{
 const main=read('src/main.js');
 assert.match(main,/let save = loadSave\(\);\s*audio\.setEnabled\(save\.sound\)/);
});
