import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const svgPath = path.resolve('public/logo.svg');
const svgBuffer = fs.readFileSync(svgPath);

// Background color for Swedswood
const bgColor = { r: 28, g: 20, b: 13, alpha: 1 }; // #1c140d

async function generateIcons() {
  console.log('Generating PWA & Android icons...');

  // 1. 192x192 standard icon
  await sharp(svgBuffer)
    .resize(192, 192, { fit: 'contain', background: bgColor })
    .flatten({ background: bgColor })
    .png()
    .toFile('public/pwa-192x192.png');
  console.log('Created public/pwa-192x192.png');

  // 2. 512x512 standard icon
  await sharp(svgBuffer)
    .resize(512, 512, { fit: 'contain', background: bgColor })
    .flatten({ background: bgColor })
    .png()
    .toFile('public/pwa-512x512.png');
  console.log('Created public/pwa-512x512.png');

  // 3. 512x512 maskable icon with 15% safe-zone padding (Android Adaptive Icon standard)
  const innerSize = Math.round(512 * 0.72); // ~368px inside 512px
  const innerBuffer = await sharp(svgBuffer)
    .resize(innerSize, innerSize, { fit: 'contain', background: bgColor })
    .toBuffer();

  await sharp({
    create: {
      width: 512,
      height: 512,
      channels: 4,
      background: bgColor
    }
  })
    .composite([{ input: innerBuffer, gravity: 'center' }])
    .png()
    .toFile('public/pwa-maskable-512x512.png');
  console.log('Created public/pwa-maskable-512x512.png');

  // 4. Apple Touch Icon 180x180
  await sharp(svgBuffer)
    .resize(180, 180, { fit: 'contain', background: bgColor })
    .flatten({ background: bgColor })
    .png()
    .toFile('public/apple-touch-icon.png');
  console.log('Created public/apple-touch-icon.png');

  // 5. Favicon 32x32
  await sharp(svgBuffer)
    .resize(32, 32, { fit: 'contain', background: bgColor })
    .flatten({ background: bgColor })
    .png()
    .toFile('public/favicon-32x32.png');
  console.log('Created public/favicon-32x32.png');

  console.log('All icons generated successfully!');
}

generateIcons().catch(err => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
