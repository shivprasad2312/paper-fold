// Prepare a disposable DEV copy to test seven normal mangoes + one bomb shot.
// Run from the repository root; the real game and its seven-shot rule are not changed.
import {mkdtemp,cp,readFile,writeFile,symlink} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import assert from 'node:assert/strict';
const root=process.cwd(),dir=await mkdtemp(join(tmpdir(),'mango-eight-shot-'));
for(const p of ['src','index.html','vite.config.js','package.json'])await cp(join(root,p),join(dir,p),{recursive:true});
for(const p of ['node_modules','public'])await symlink(resolve(root,p),join(dir,p));
const file=join(dir,'src/main.js');let s=await readFile(file,'utf8');
const replaceOnce=(before,after)=>{assert.ok(s.includes(before),`Expected original source: ${before}`);s=s.replace(before,after);};
replaceOnce('JUNGLE_SHOTS=7','JUNGLE_SHOTS=8');
await writeFile(file,s);
console.log(`Test copy: ${dir}\nStart: cd ${dir} && npm run dev -- --port 5174 --strictPort\nThen, from ${root}: CHROME_PATH=/path/to/chromium GAME_URL=http://localhost:5174/ node tests/jungle-eight-shot-experiment.mjs`);
