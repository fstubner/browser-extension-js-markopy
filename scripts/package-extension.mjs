import archiver from 'archiver';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(__dirname, '..', 'dist');
const artifactsDir = path.join(__dirname, '..', 'artifacts');

if (!fs.existsSync(artifactsDir)) {
  fs.mkdirSync(artifactsDir, { recursive: true });
}

const output = fs.createWriteStream(path.join(artifactsDir, 'markopy-extension.zip'));
const archive = archiver('zip', { zlib: { level: 9 } });

archive.on('error', (err) => {
  throw err;
});

output.on('close', () => {
  console.log(`Extension packaged: ${archive.pointer()} total bytes`);
});

archive.pipe(output);
archive.directory(distDir, 'dist');
archive.finalize();
