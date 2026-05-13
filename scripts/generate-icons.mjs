// Generates icon_app.png (1024x1024) and splash-icon.png (512x512)
// from the Hero brand mark design.

import { Resvg } from '@resvg/resvg-js';
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const ASSETS = join(__dir, '..', 'assets');

// ── SVG builder ────────────────────────────────────────────────────────────────
// All coordinates are in a 100×100 viewBox (the original HeroGlyph spec).
// We scale them at render time by setting width/height on the root SVG.

function heroMarkSVG(size) {
  const radius = Math.round(size * 0.225);

  // Glyph: 62% of size, centered
  const glyphSize = size * 0.62;
  const off = (size - glyphSize) / 2;
  const sc  = glyphSize / 100;           // scale from 100×100 viewBox

  // Helper to scale a 100-unit coordinate + apply offset
  const x = (v) => (v * sc + off).toFixed(2);
  const y = (v) => (v * sc + off).toFixed(2);
  const s = (v) => (v * sc).toFixed(2);  // scale only (no offset, for radii/widths)

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#161b22"/>
      <stop offset="100%" stop-color="#0d1117"/>
    </linearGradient>
    <radialGradient id="hl" cx="50%" cy="0%" r="80%">
      <stop offset="0%" stop-color="#58a6ff" stop-opacity="0.18"/>
      <stop offset="60%" stop-color="#58a6ff" stop-opacity="0"/>
    </radialGradient>
    <filter id="glow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="${s(1.8)}" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>

  <!-- squircle background -->
  <rect width="${size}" height="${size}" rx="${radius}" ry="${radius}" fill="url(#bg)"/>
  <!-- subtle top highlight -->
  <rect width="${size}" height="${size}" rx="${radius}" ry="${radius}" fill="url(#hl)"/>
  <!-- thin inner border -->
  <rect x="1" y="1" width="${size - 2}" height="${size - 2}"
        rx="${radius - 1}" ry="${radius - 1}"
        fill="none" stroke="#30363d" stroke-width="${s(0.5)}" opacity="0.6"/>

  <!-- glyph group (scaled from 100×100 viewBox) -->
  <g filter="url(#glow)">
    <!-- horizontal grid rules — spreadsheet reference -->
    <g stroke="#58a6ff" stroke-width="${s(3)}" stroke-linecap="round" opacity="0.22">
      <line x1="${x(18)}" y1="${y(32)}" x2="${x(82)}" y2="${y(32)}"/>
      <line x1="${x(18)}" y1="${y(50)}" x2="${x(82)}" y2="${y(50)}"/>
      <line x1="${x(18)}" y1="${y(68)}" x2="${x(82)}" y2="${y(68)}"/>
    </g>
    <!-- dollar sign S-curve -->
    <path
      d="M ${x(64)} ${y(28)}
         C ${x(64)} ${y(21)}, ${x(54)} ${y(19)}, ${x(47)} ${y(19)}
         C ${x(38)} ${y(19)}, ${x(32)} ${y(23)}, ${x(32)} ${y(30)}
         C ${x(32)} ${y(37)}, ${x(38)} ${y(39)}, ${x(47)} ${y(41)}
         C ${x(56)} ${y(43)}, ${x(64)} ${y(45)}, ${x(64)} ${y(53)}
         C ${x(64)} ${y(60)}, ${x(56)} ${y(64)}, ${x(47)} ${y(64)}
         C ${x(38)} ${y(64)}, ${x(30)} ${y(60)}, ${x(30)} ${y(53)}"
      fill="none" stroke="#58a6ff"
      stroke-width="${s(7.5)}" stroke-linecap="round" stroke-linejoin="round"/>
    <!-- vertical bar -->
    <line x1="${x(47)}" y1="${y(13)}" x2="${x(47)}" y2="${y(70)}"
          stroke="#58a6ff" stroke-width="${s(6)}" stroke-linecap="round"/>
    <!-- green accent dot — live data -->
    <circle cx="${x(76)}" cy="${y(24)}" r="${s(3.2)}" fill="#3fb950"/>
  </g>
</svg>`;
}

// ── Render & save ──────────────────────────────────────────────────────────────
function renderPNG(svg, outPath, label) {
  const resvg = new Resvg(svg, { fitTo: { mode: 'original' } });
  const data  = resvg.render();
  const png   = data.asPng();
  writeFileSync(outPath, png);
  console.log(`✓  ${label}  →  ${outPath}`);
}

// App icon: 1024×1024
renderPNG(
  heroMarkSVG(1024),
  join(ASSETS, 'icon_app.png'),
  'icon_app.png        (1024×1024)'
);

// Splash icon: 512×512 — Expo centers it on #0d1117 background
renderPNG(
  heroMarkSVG(512),
  join(ASSETS, 'splash-icon.png'),
  'splash-icon.png     (512×512)'
);

// Favicon: 64×64 (for the website)
renderPNG(
  heroMarkSVG(64),
  join(ASSETS, 'favicon.png'),
  'favicon.png         (64×64)'
);

// Adaptive icon foreground: 1024×1024, glyph only, transparent background.
// Android clips this to its own shape (circle, squircle, etc.) with #0d1117 bg.
function adaptiveIconSVG(size) {
  // Safe zone: 66% of size, centered
  const glyphSize = size * 0.50;
  const off = (size - glyphSize) / 2;
  const sc  = glyphSize / 100;

  const x = (v) => (v * sc + off).toFixed(2);
  const y = (v) => (v * sc + off).toFixed(2);
  const s = (v) => (v * sc).toFixed(2);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <filter id="glow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="${s(1.8)}" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <g filter="url(#glow)">
    <g stroke="#58a6ff" stroke-width="${s(3)}" stroke-linecap="round" opacity="0.30">
      <line x1="${x(18)}" y1="${y(32)}" x2="${x(82)}" y2="${y(32)}"/>
      <line x1="${x(18)}" y1="${y(50)}" x2="${x(82)}" y2="${y(50)}"/>
      <line x1="${x(18)}" y1="${y(68)}" x2="${x(82)}" y2="${y(68)}"/>
    </g>
    <path
      d="M ${x(64)} ${y(28)}
         C ${x(64)} ${y(21)}, ${x(54)} ${y(19)}, ${x(47)} ${y(19)}
         C ${x(38)} ${y(19)}, ${x(32)} ${y(23)}, ${x(32)} ${y(30)}
         C ${x(32)} ${y(37)}, ${x(38)} ${y(39)}, ${x(47)} ${y(41)}
         C ${x(56)} ${y(43)}, ${x(64)} ${y(45)}, ${x(64)} ${y(53)}
         C ${x(64)} ${y(60)}, ${x(56)} ${y(64)}, ${x(47)} ${y(64)}
         C ${x(38)} ${y(64)}, ${x(30)} ${y(60)}, ${x(30)} ${y(53)}"
      fill="none" stroke="#58a6ff"
      stroke-width="${s(7.5)}" stroke-linecap="round" stroke-linejoin="round"/>
    <line x1="${x(47)}" y1="${y(13)}" x2="${x(47)}" y2="${y(70)}"
          stroke="#58a6ff" stroke-width="${s(6)}" stroke-linecap="round"/>
    <circle cx="${x(76)}" cy="${y(24)}" r="${s(3.2)}" fill="#3fb950"/>
  </g>
</svg>`;
}

renderPNG(
  adaptiveIconSVG(1024),
  join(ASSETS, 'adaptive-icon.png'),
  'adaptive-icon.png   (1024×1024, glyph only)'
);

console.log('\nDone. Icons updated in assets/');
