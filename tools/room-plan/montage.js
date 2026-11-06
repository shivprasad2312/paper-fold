const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage } = require('@napi-rs/canvas');
(async () => {
  const dir = '/tmp/arena-coding-uploads';
  const files = fs.readdirSync(dir).filter(f => /^image-\d+\.png$/.test(f))
    .sort((a, b) => Number(a.match(/\d+/)[0]) - Number(b.match(/\d+/)[0]));
  const CW = 300, CH = 240, COLS = 6;
  const PER = 24;
  for (let s = 0; s < Math.ceil(files.length / PER); s++) {
    const batch = files.slice(s * PER, (s + 1) * PER);
    const ROWS = Math.ceil(batch.length / COLS);
    const sheet = createCanvas(CW * COLS, CH * ROWS);
    const ctx = sheet.getContext('2d');
    ctx.fillStyle = '#0f141a'; ctx.fillRect(0, 0, sheet.width, sheet.height);
    for (let i = 0; i < batch.length; i++) {
      const img = await loadImage(path.join(dir, batch[i]));
      const x = (i % COLS) * CW, y = Math.floor(i / COLS) * CH;
      ctx.drawImage(img, 0, 0, img.width, img.height, x, y, CW, CH - 16);
      ctx.fillStyle = '#cfd8e0'; ctx.font = '600 12px sans-serif';
      ctx.fillText(batch[i].replace('image-', 'ref ').replace('.png', ''), x + 5, y + CH - 4);
    }
    const out = '/tmp/refs/refs-' + (s + 1) + '.png';
    fs.writeFileSync(out, sheet.toBuffer('image/png'));
    console.log('wrote', out, batch.length, 'images');
  }
})();
