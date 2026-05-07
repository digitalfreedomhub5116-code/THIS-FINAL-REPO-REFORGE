/**
 * Compress rank badge PNGs → WebP using Sharp.
 * Outputs to same directory with .webp extension.
 */
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, '..', 'public', 'images', 'ranks');

async function compress() {
  const files = fs.readdirSync(DIR).filter(f => f.endsWith('.png') && f.includes('-rank-'));
  console.log(`Found ${files.length} rank badges to compress:\n`);

  let totalBefore = 0, totalAfter = 0;

  for (const file of files) {
    const inputPath = path.join(DIR, file);
    const outputFile = file.replace('.png', '.webp');
    const outputPath = path.join(DIR, outputFile);
    
    const beforeSize = fs.statSync(inputPath).size;
    totalBefore += beforeSize;

    await sharp(inputPath)
      .webp({ quality: 80, effort: 6 })
      .toFile(outputPath);

    const afterSize = fs.statSync(outputPath).size;
    totalAfter += afterSize;

    const reduction = ((1 - afterSize / beforeSize) * 100).toFixed(1);
    console.log(`  ${file} → ${outputFile}`);
    console.log(`    ${(beforeSize/1024).toFixed(1)}KB → ${(afterSize/1024).toFixed(1)}KB (${reduction}% smaller)\n`);
  }

  console.log(`\n═══ TOTAL ═══`);
  console.log(`  Before: ${(totalBefore/1024).toFixed(1)}KB`);
  console.log(`  After:  ${(totalAfter/1024).toFixed(1)}KB`);
  console.log(`  Saved:  ${((1 - totalAfter/totalBefore) * 100).toFixed(1)}%`);
}

compress().catch(console.error);
