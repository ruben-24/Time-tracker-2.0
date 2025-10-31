#!/usr/bin/env node
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { dirname, resolve, join } from 'node:path';
import sharp from 'sharp';

const source = resolve('resources/icon-source.png');
const background = { r: 0, g: 0, b: 0, alpha: 1 };
const iosAssetDir = resolve('ios/App/App/Assets.xcassets/AppIcon.appiconset');

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

async function createIosIcon(filename, size, scale) {
  const pixels = Math.round(size * scale);
  await ensureDir(join(iosAssetDir, filename));
  await sharp(source)
    .resize(pixels, pixels, { fit: 'cover', position: 'centre', background })
    .png({ compressionLevel: 9 })
    .toFile(join(iosAssetDir, filename));
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
    await rm(resolve(`icons/icon-${size}.webp`), { force: true });
  }

  await createIcon(resolve('public/icon.png'), 512);
  await createIcon(resolve('public/apple-touch-icon.png'), 180);
  await writeSvg(resolve('public/icon.svg'), master);

  const iosIconDefinitions = [
    { idiom: 'iphone', size: 20, scale: 2, filename: 'AppIcon-20@2x.png' },
    { idiom: 'iphone', size: 20, scale: 3, filename: 'AppIcon-20@3x.png' },
    { idiom: 'iphone', size: 29, scale: 2, filename: 'AppIcon-29@2x.png' },
    { idiom: 'iphone', size: 29, scale: 3, filename: 'AppIcon-29@3x.png' },
    { idiom: 'iphone', size: 40, scale: 2, filename: 'AppIcon-40@2x.png' },
    { idiom: 'iphone', size: 40, scale: 3, filename: 'AppIcon-40@3x.png' },
    { idiom: 'iphone', size: 60, scale: 2, filename: 'AppIcon-60@2x.png' },
    { idiom: 'iphone', size: 60, scale: 3, filename: 'AppIcon-60@3x.png' },
    { idiom: 'ipad', size: 20, scale: 1, filename: 'AppIcon-20@1x-ipad.png' },
    { idiom: 'ipad', size: 20, scale: 2, filename: 'AppIcon-20@2x-ipad.png' },
    { idiom: 'ipad', size: 29, scale: 1, filename: 'AppIcon-29@1x-ipad.png' },
    { idiom: 'ipad', size: 29, scale: 2, filename: 'AppIcon-29@2x-ipad.png' },
    { idiom: 'ipad', size: 40, scale: 1, filename: 'AppIcon-40@1x-ipad.png' },
    { idiom: 'ipad', size: 40, scale: 2, filename: 'AppIcon-40@2x-ipad.png' },
    { idiom: 'ipad', size: 76, scale: 1, filename: 'AppIcon-76@1x.png' },
    { idiom: 'ipad', size: 76, scale: 2, filename: 'AppIcon-76@2x.png' },
    { idiom: 'ipad', size: 83.5, scale: 2, filename: 'AppIcon-83.5@2x.png' },
    { idiom: 'ios-marketing', size: 1024, scale: 1, filename: 'AppIcon-1024.png' }
  ];

  await ensureDir(iosAssetDir);
  const iosImages = [];
  for (const def of iosIconDefinitions) {
    await createIosIcon(def.filename, def.size, def.scale);
    iosImages.push({
      idiom: def.idiom,
      size: `${def.size}x${def.size}`,
      scale: `${def.scale}x`,
      filename: def.filename
    });
  }

  const contents = {
    images: iosImages,
    info: {
      version: 1,
      author: 'xcode'
    }
  };

  await writeFile(join(iosAssetDir, 'Contents.json'), JSON.stringify(contents, null, 2) + '\n', 'utf8');
}

main().catch((error) => {
  console.error('[generate-icons] Failed to generate icons:', error);
  process.exit(1);
});
