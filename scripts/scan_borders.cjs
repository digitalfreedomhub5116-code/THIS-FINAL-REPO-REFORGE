const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..', 'public', 'borders');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.webp') || f.endsWith('.png') || f.endsWith('.gif'));

// Use image-size package (pure JS, no native deps)
let sizeOf;
try {
  sizeOf = require('image-size');
} catch {
  // Fallback: read webp header manually
  sizeOf = null;
}

if (sizeOf) {
  console.log('Border Image Dimensions Report');
  console.log('='.repeat(60));
  for (const f of files) {
    try {
      const dims = sizeOf(path.join(dir, f));
      console.log(`${f.padEnd(35)} ${dims.width} x ${dims.height}`);
    } catch (e) {
      console.log(`${f.padEnd(35)} ERROR: ${e.message}`);
    }
  }
} else {
  // Manual webp parsing
  console.log('Border Image Dimensions Report (manual parse)');
  console.log('='.repeat(60));
  for (const f of files) {
    const fp = path.join(dir, f);
    const buf = fs.readFileSync(fp);
    let w = '?', h = '?';
    
    if (f.endsWith('.webp')) {
      // VP8 lossy
      if (buf.slice(12, 16).toString() === 'VP8 ') {
        w = buf.readUInt16LE(26) & 0x3FFF;
        h = buf.readUInt16LE(28) & 0x3FFF;
      }
      // VP8L lossless
      else if (buf.slice(12, 16).toString() === 'VP8L') {
        const bits = buf.readUInt32LE(21);
        w = (bits & 0x3FFF) + 1;
        h = ((bits >> 14) & 0x3FFF) + 1;
      }
      // VP8X extended
      else if (buf.slice(12, 16).toString() === 'VP8X') {
        w = (buf[24] | (buf[25] << 8) | (buf[26] << 16)) + 1;
        h = (buf[27] | (buf[28] << 8) | (buf[29] << 16)) + 1;
      }
    } else if (f.endsWith('.gif')) {
      w = buf.readUInt16LE(6);
      h = buf.readUInt16LE(8);
    }
    
    console.log(`${f.padEnd(35)} ${w} x ${h}`);
  }
}
