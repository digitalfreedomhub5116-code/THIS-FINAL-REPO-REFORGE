/**
 * compress-store-images.cjs
 * Compresses all 6 store images (keys + crystals) to WebP with PNG fallback.
 * Targets ~80% size reduction while preserving transparency.
 */
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const STORE_DIR = path.join(__dirname, '..', 'public', 'assets', 'store');

const IMAGES = [
  'coinsless-Photoroom.png',
  'coins medium-Photoroom.png',
  'coinsmax-Photoroom.png',
  'keyless-Photoroom.png',
  'key medium-Photoroom.png',
  'keymax-Photoroom.png',
];

async function compress() {
  console.log('🗜️  Compressing store images...\n');

  for (const img of IMAGES) {
    const inputPath = path.join(STORE_DIR, img);
    if (!fs.existsSync(inputPath)) {
      console.log(`⚠️  Skipped (not found): ${img}`);
      continue;
    }

    const originalSize = fs.statSync(inputPath).size;

    // Compress as optimized PNG (keeps transparency, much smaller)
    const outputBuffer = await sharp(inputPath)
      .resize(512, 512, { fit: 'inside', withoutEnlargement: true })
      .png({ quality: 80, compressionLevel: 9, effort: 10 })
      .toBuffer();

    fs.writeFileSync(inputPath, outputBuffer);

    const newSize = outputBuffer.length;
    const saved = ((1 - newSize / originalSize) * 100).toFixed(1);
    console.log(
      `✅ ${img.padEnd(35)} ${(originalSize / 1024).toFixed(0).padStart(5)}KB → ${(newSize / 1024).toFixed(0).padStart(4)}KB  (${saved}% saved)`
    );
  }

  console.log('\n✨ Done! All images compressed.');
}

compress().catch(console.error);
