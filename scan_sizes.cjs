const fs = require('fs');
const path = require('path');

const rootDir = process.cwd();

// Exclude these directories from detailed scanning if needed, but we'll scan them to get accurate sizes.
// We'll group media extensions.
const mediaExtensions = new Set([
  '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg', '.ico', '.tiff',
  '.mp4', '.webm', '.mov', '.avi', '.mkv',
  '.mp3', '.wav', '.ogg', '.m4a', '.flac'
]);

let totalMediaSize = 0;
let mediaFilesList = [];

function getDirSize(dirPath) {
  let size = 0;
  let fileSizes = [];
  let dirSizes = [];

  try {
    const files = fs.readdirSync(dirPath);
    for (const file of files) {
      const fullPath = path.join(dirPath, file);
      try {
        const stats = fs.statSync(fullPath);
        if (stats.isDirectory()) {
          const subDirData = getDirSize(fullPath);
          size += subDirData.size;
          dirSizes.push({ name: file, size: subDirData.size });
        } else {
          size += stats.size;
          fileSizes.push({ name: file, size: stats.size });
          
          const ext = path.extname(file).toLowerCase();
          if (mediaExtensions.has(ext)) {
            totalMediaSize += stats.size;
            mediaFilesList.push({ name: fullPath.replace(rootDir, ''), size: stats.size });
          }
        }
      } catch (err) {
        // Skip errors
      }
    }
  } catch (err) {
    // Skip errors
  }
  return { size, fileSizes, dirSizes };
}

console.log('Scanning directory...');
const rootData = getDirSize(rootDir);

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

console.log('\n--- TOP LEVEL FOLDERS & FILES ---');
const items = [
  ...rootData.dirSizes.map(d => ({ ...d, type: 'Folder' })),
  ...rootData.fileSizes.map(f => ({ ...f, type: 'File' }))
].sort((a, b) => b.size - a.size);

for (const item of items) {
  console.log(`${item.type.padEnd(8)} | ${formatBytes(item.size).padStart(10)} | ${item.name}`);
}

console.log('\n--- MEDIA FILES USAGE ---');
console.log(`Total Media Space: ${formatBytes(totalMediaSize)}`);
if (totalMediaSize > 0) {
    console.log(`\nTop 10 Largest Media Files:`);
    mediaFilesList.sort((a, b) => b.size - a.size).slice(0, 10).forEach(m => {
        console.log(`${formatBytes(m.size).padStart(10)} | ${m.name}`);
    });
}
