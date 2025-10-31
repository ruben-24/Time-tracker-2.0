#!/usr/bin/env node
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import sharp from 'sharp';

const source = resolve('resources/icon-source.png');
const background = { r: 0, g: 0, b: 0, alpha: 1 };

async function ensureDir(filePath) {
  await mkdir(dirname(filePath), { recursive: true });
}

async function createIcon(target, size) {
  await ensureDir(target);
  await sharp(source)
    .resize(size, size, { fit: 'cover', position: 'centre', background })
    .png({ compressionLevel: 9 })
    .toFile(target);
}

async function writeSvg(target, buffer) {
  await ensureDir(target);
  const base64 = buffer.toString('base64');
  await writeFile(
    target,
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
  <image href="data:image/png;base64,${base64}" width="1024" height="1024"/>
</svg>\n`,
    'utf8'
  );
}

async function main() {
  const master = await sharp(source)
    .resize(1024, 1024, { fit: 'cover', position: 'centre', background })
    .png({ compressionLevel: 9 })
    .toBuffer();

  await ensureDir(resolve('resources/icon.png'));
  await sharp(master).toFile(resolve('resources/icon.png'));
  await writeSvg(resolve('resources/icon.svg'), master);

  const webSizes = [48, 72, 96, 128, 192, 256, 512];
  for (const size of webSizes) {
    await createIcon(resolve(`icons/icon-${size}.png`), size);
  }

  await createIcon(resolve('public/icon.png'), 512);
  await createIcon(resolve('public/apple-touch-icon.png'), 180);
  await writeSvg(resolve('public/icon.svg'), master);
}

main().catch((error) => {
  console.error('[generate-icons] Failed to generate icons:', error);
  process.exit(1);
});
