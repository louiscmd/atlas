// Generates the app icons from the ATLAS mark. Run: npm run icons
import sharp from "sharp";
import { mkdirSync } from "node:fs";

const BLUE = "#2563eb", BLUE_DARK = "#1d4ed8";
// The "A" mark on a 32-unit grid (same geometry as src/components/app/Logo.tsx).
const mark = (scale) => `
  <g transform="translate(${256 - 16 * scale} ${256 - 16 * scale}) scale(${scale})">
    <path d="M9.5 23 16 9l6.5 14M12 18h8" stroke="#ffffff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  </g>`;
const bg = (rounded) => `
  <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${BLUE}"/><stop offset="1" stop-color="${BLUE_DARK}"/></linearGradient></defs>
  <rect width="512" height="512" ${rounded ? 'rx="112"' : ""} fill="url(#g)"/>`;
const svg = (rounded, scale) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">${bg(rounded)}${mark(scale)}</svg>`);

const out = [
  // iOS home screen: full-bleed square (iOS applies its own rounded mask)
  ["src/app/apple-icon.png", 180, svg(false, 11)],
  // Browser tab favicon
  ["src/app/icon.png", 64, svg(true, 12)],
  // Android / PWA install icons
  ["public/icons/icon-192.png", 192, svg(true, 11)],
  ["public/icons/icon-512.png", 512, svg(true, 11)],
  // Maskable: mark kept inside the 80% safe zone so any launcher shape works
  ["public/icons/maskable-512.png", 512, svg(false, 9)],
];
mkdirSync("public/icons", { recursive: true });
for (const [file, size, src] of out) {
  await sharp(src).resize(size, size).png({ compressionLevel: 9 }).toFile(file);
  console.log("wrote", file, `${size}×${size}`);
}
