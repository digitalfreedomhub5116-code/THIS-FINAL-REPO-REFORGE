/**
 * compress-images.mjs — Compress border PNGs → WebP and banner JPEGs → WebP
 * Run: node scripts/compress-images.mjs
 * 
 * - Borders (PNG): → WebP with transparency, quality 80
 * - Banners (JPEG): → WebP, quality 75
 * - Keeps originals as .bak, replaces with .webp
 * - Updates storeItems.ts references automatically
 */
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const BORDER_DIR = 'public/borders';
const BANNER_DIR = 'public/banners';

async function compressFile(filePath, opts = {}) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.json' || ext === '.bak' || ext === '.webp') return null;
  if (filePath.includes('(1)') || filePath.includes('(2)')) return null; // skip duplicates
  
  const stats = fs.statSync(filePath);
  if (stats.size === 0) return null; // skip empty files

  const baseName = path.basename(filePath, ext);
  const dir = path.dirname(filePath);
  const webpPath = path.join(dir, baseName + '.webp');

  try {
    const isPng = ext === '.png';
    const quality = isPng ? 80 : 75;

    await sharp(filePath)
      .webp({ quality, effort: 6, ...(isPng ? { alphaQuality: 85 } : {}) })
      .toFile(webpPath);

    const newStats = fs.statSync(webpPath);
    const savings = ((1 - newStats.size / stats.size) * 100).toFixed(1);
    console.log(`✓ ${path.basename(filePath)} → ${baseName}.webp  (${(stats.size/1024).toFixed(0)}KB → ${(newStats.size/1024).toFixed(0)}KB, -${savings}%)`);

    return { original: filePath, webp: webpPath, oldName: path.basename(filePath), newName: baseName + '.webp' };
  } catch (e) {
    console.error(`✗ ${path.basename(filePath)}: ${e.message}`);
    return null;
  }
}

async function main() {
  console.log('\n═══ Compressing Borders ═══');
  const borderFiles = fs.readdirSync(BORDER_DIR).map(f => path.join(BORDER_DIR, f));
  const borderResults = [];
  for (const f of borderFiles) {
    const r = await compressFile(f);
    if (r) borderResults.push(r);
  }

  console.log('\n═══ Compressing Banners ═══');
  const bannerFiles = fs.readdirSync(BANNER_DIR).map(f => path.join(BANNER_DIR, f));
  const bannerResults = [];
  for (const f of bannerFiles) {
    const r = await compressFile(f);
    if (r) bannerResults.push(r);
  }

  // Update storeItems.ts references
  const allResults = [...borderResults, ...bannerResults];
  if (allResults.length > 0) {
    console.log('\n═══ Updating storeItems.ts references ═══');
    let storeFile = fs.readFileSync('utils/storeItems.ts', 'utf-8');
    let changes = 0;
    for (const r of allResults) {
      const oldRef = r.oldName;
      const newRef = r.newName;
      if (storeFile.includes(oldRef)) {
        storeFile = storeFile.replaceAll(oldRef, newRef);
        changes++;
        console.log(`  ${oldRef} → ${newRef}`);
      }
    }
    if (changes > 0) {
      fs.writeFileSync('utils/storeItems.ts', storeFile);
      console.log(`\n✓ Updated ${changes} references in storeItems.ts`);
    }
  }

  // Delete original files (keep webp)
  console.log('\n═══ Cleaning up originals ═══');
  for (const r of allResults) {
    fs.unlinkSync(r.original);
    console.log(`  Removed ${r.oldName}`);
  }

  // Also delete empty duplicate files
  for (const dir of [BORDER_DIR, BANNER_DIR]) {
    for (const f of fs.readdirSync(dir)) {
      const fp = path.join(dir, f);
      const s = fs.statSync(fp);
      if (s.size === 0 || f.includes('(1)') || f.includes('(2)')) {
        fs.unlinkSync(fp);
        console.log(`  Removed empty/duplicate: ${f}`);
      }
    }
  }

  console.log('\n═══ Done! ═══\n');
}

main().catch(console.error);
