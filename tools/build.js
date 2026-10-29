/* ==========================================================================
   tools/build.js — bundles the whole game into ONE self-contained html file.
   No external requests at all (fonts, engine, art are all inlined), so the
   result can be dropped on any static host or opened straight from disk.

   npm run build   ->  dist/happy-glass.html
   ========================================================================== */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const readB64 = (p) => fs.readFileSync(path.join(ROOT, p)).toString('base64');

let html = read('index.html');

// 1. inline the stylesheet (and the fonts it references)
let css = read('css/style.css');
css = css.replace(/url\('\.\.\/fonts\/([^']+)'\)/g, (_, file) => {
  return "url('data:font/woff2;base64," + readB64('fonts/' + file) + "')";
});
html = html.replace('<link rel="stylesheet" href="css/style.css" />', '<style>\n' + css + '\n</style>');

// 2. inline every script, in the order the page asks for
html = html.replace(/<script src="([^"]+)"><\/script>/g, (_, src) => {
  const code = read(src);
  return '<script>\n/* ' + src + ' */\n' + code.replace(/<\/script/gi, '<\\/script') + '\n</script>';
});

// 3. tidy head metadata for the standalone file
html = html.replace('<meta name="theme-color" content="#dfe3d8" />',
  '<meta name="theme-color" content="#dfe3d8" />\n<!-- Happy Glass clone — single file build. Made with Matter.js (MIT). -->');

const outDir = path.join(ROOT, 'dist');
fs.mkdirSync(outDir, { recursive: true });
const outFile = path.join(outDir, 'happy-glass.html');
fs.writeFileSync(outFile, html);

const kb = (Buffer.byteLength(html) / 1024).toFixed(0);
console.log('built ' + path.relative(ROOT, outFile) + '  (' + kb + ' kB, fully self-contained)');
