// One-off generator: rasterizes /public/parkslo-icon.svg into the PWA
// icon set + favicon, and builds the Open Graph image. Re-run after
// editing the source SVG: `node scripts/generate-icons.mjs`.
import sharp from "sharp";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, "..", "public");
const iconSvg = readFileSync(path.join(publicDir, "parkslo-icon.svg"));

async function makePng(size, outName) {
  await sharp(iconSvg, { density: 384 })
    .resize(size, size)
    .png()
    .toFile(path.join(publicDir, outName));
  console.log(`wrote ${outName} (${size}x${size})`);
}

async function makeOgImage() {
  const svg = `
<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
  <rect width="1200" height="630" fill="#EEF1F7"/>
  <g transform="translate(420, 205)">
    <rect width="96" height="96" rx="21" fill="#0B1B3B"/>
    <path d="M30 24c-7.5 0-13.5 5.7-13.5 14 0 10.5 13.5 23.5 13.5 23.5s13.5-13 13.5-23.5C43.5 29.7 37.5 24 30 24z" fill="#FFFFFF"/>
    <circle cx="30" cy="38" r="5.1" fill="#0B1B3B"/>
    <path d="M36 51 C 51 60, 57 63, 69 69" stroke="#5B8DEF" stroke-width="4.5" stroke-linecap="round" stroke-dasharray="1.5 9"/>
    <circle cx="70.5" cy="70.5" r="9" fill="#2EE6A6"/>
  </g>
  <text x="600" y="370" font-family="Arial, sans-serif" font-weight="800" font-size="64" letter-spacing="-1" fill="#0B1B3B" text-anchor="middle">parkslo</text>
  <text x="600" y="412" font-family="Arial, sans-serif" font-weight="700" font-size="18" letter-spacing="3" fill="#4B5875" text-anchor="middle">FIND PARKING. SKIP THE CIRCLING.</text>
</svg>`;
  await sharp(Buffer.from(svg)).png().toFile(path.join(publicDir, "og-image.png"));
  console.log("wrote og-image.png (1200x630)");
}

async function main() {
  await makePng(192, "icon-192.png");
  await makePng(512, "icon-512.png");
  await makePng(180, "apple-touch-icon.png");
  await makePng(32, "favicon-32.png");
  await makePng(16, "favicon-16.png");
  await makeOgImage();
}

main();
