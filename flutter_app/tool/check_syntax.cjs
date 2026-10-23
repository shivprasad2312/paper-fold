// Structural sanity check for Dart sources (no SDK available in this sandbox):
// strips strings/comments and verifies bracket balance + basic declarations.
const fs = require('fs');
const path = require('path');

function walk(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p));
    else if (e.name.endsWith('.dart')) out.push(p);
  }
  return out;
}

function strip(src) {
  let out = '';
  let i = 0;
  const n = src.length;
  while (i < n) {
    const c = src[i];
    const c2 = src[i + 1];
    // line comment
    if (c === '/' && c2 === '/') {
      while (i < n && src[i] !== '\n') i++;
      continue;
    }
    // block comment (nesting is allowed in Dart)
    if (c === '/' && c2 === '*') {
      let depth = 1;
      i += 2;
      while (i < n && depth > 0) {
        if (src[i] === '/' && src[i + 1] === '*') depth++, i += 2;
        else if (src[i] === '*' && src[i + 1] === '/') depth--, i += 2;
        else i++;
      }
      continue;
    }
    // strings: ', ", ''' , """
    if (c === "'" || c === '"') {
      const triple = src.slice(i, i + 3) === c.repeat(3);
      const quote = triple ? c.repeat(3) : c;
      i += quote.length;
      while (i < n) {
        if (src[i] === '\\') { i += 2; continue; }
        if (src.startsWith(quote, i)) { i += quote.length; break; }
        i++;
      }
      out += '""';
      continue;
    }
    // raw strings
    if (c === 'r' && (c2 === "'" || c2 === '"')) {
      const q = c2;
      i += 2;
      while (i < n && src[i] !== q) i++;
      i++;
      out += '""';
      continue;
    }
    out += c;
    i++;
  }
  return out;
}

let failures = 0;
const root = path.join(__dirname, '..', 'lib');
for (const file of [...walk(root), path.join(__dirname, '..', 'test', 'engine_test.dart')]) {
  const src = fs.readFileSync(file, 'utf8');
  const clean = strip(src);
  const pairs = { ')': '(', ']': '[', '}': '{' };
  const stack = [];
  let ok = true;
  for (const ch of clean) {
    if (ch === '(' || ch === '[' || ch === '{') stack.push(ch);
    else if (pairs[ch]) {
      if (stack.pop() !== pairs[ch]) { ok = false; break; }
    }
  }
  const balanced = ok && stack.length === 0;
  const hasMainOrDecl = /(void main\(|class |enum |typedef |extension )/.test(clean) || file.includes('test');
  const status = balanced && hasMainOrDecl ? 'ok' : 'FAIL';
  if (status === 'FAIL') failures++;
  console.log(`${status.padEnd(4)} ${path.relative(root, file).replace('../', '')}  (brackets ${balanced ? 'balanced' : 'UNBALANCED'})`);
}
process.exit(failures ? 1 : 0);
