import fs from 'fs';
import { execSync } from 'child_process';
import https from 'https';

const BRAND_LOGO_URL = 'https://ukwkseawcdwbpsjnwrut.supabase.co/storage/v1/object/public/genuine_electronics/Genuine%20Electronics%203D%2002.png';

async function downloadLogo() {
  return new Promise((resolve, reject) => {
    https.get(BRAND_LOGO_URL, (res) => {
      if (res.statusCode !== 200) {
        return reject(new Error(`Failed to download logo: HTTP ${res.statusCode}`));
      }
      const file = fs.createWriteStream('public/brand-logo-raw.png');
      res.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', reject);
  });
}

async function generate() {
  console.log('Fetching official brand logo...');
  if (!fs.existsSync('public/brand-logo-raw.png')) {
    await downloadLogo();
  }

  console.log('Generating crisp multi-resolution favicons & app icons from official 3D brand logo...');
  execSync('convert public/brand-logo-raw.png -resize 512x512 -gravity center -background none -extent 512x512 public/icon-512.png');
  execSync('convert public/icon-512.png -resize 192x192 public/icon-192.png');
  execSync('convert public/icon-512.png -resize 180x180 public/apple-touch-icon.png');
  execSync('convert public/icon-512.png -resize 48x48 public/favicon-48x48.png');
  execSync('convert public/icon-512.png -resize 32x32 public/favicon-32x32.png');
  execSync('convert public/icon-512.png -resize 16x16 public/favicon-16x16.png');
  execSync('convert public/favicon-16x16.png public/favicon-32x32.png public/favicon-48x48.png -colors 256 public/favicon.ico');

  const icon512Base64 = fs.readFileSync('public/icon-512.png').toString('base64');
  const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="100%" height="100%">
  <image href="data:image/png;base64,${icon512Base64}" x="0" y="0" width="512" height="512" />
</svg>`;
  fs.writeFileSync('public/favicon.svg', svgContent);

  console.log('All official brand icons & favicons created successfully!');
}

generate().catch(err => {
  console.error('Error generating favicons:', err);
  process.exit(1);
});
