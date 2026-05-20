#!/usr/bin/env node
/**
 * sync-code.js
 * Reads apps-script/Code.gs and keeps two consumers up to date:
 *   1. apps-script/codeGsExport.ts  — imported by onboarding.tsx
 *   2. website/index.html           — CODE_GS_RAW template literal + <pre> display
 *
 * Run manually: node scripts/sync-code.js
 * Also wired into postinstall so it runs automatically after npm install.
 */

const fs   = require("fs");
const path = require("path");

const root        = path.join(__dirname, "..");
const codeGsPath  = path.join(root, "apps-script", "Code.gs");
const exportPath  = path.join(root, "apps-script", "codeGsExport.ts");
const htmlPath    = path.join(root, "website", "index.html");

const code = fs.readFileSync(codeGsPath, "utf8");

// ── 1. Generate TypeScript export ──────────────────────────────────────────
const tsContent =
  "// AUTO-GENERATED — do not edit manually. Run: node scripts/sync-code.js\n" +
  "const CODE_GS: string = " + JSON.stringify(code) + ";\n" +
  "export default CODE_GS;\n";

fs.writeFileSync(exportPath, tsContent, "utf8");
console.log("✓ apps-script/codeGsExport.ts updated");

// ── 2. Update website/index.html ───────────────────────────────────────────
let html = fs.readFileSync(htmlPath, "utf8");

// 2a. Escape Code.gs for use inside a JS template literal
const escaped = code
  .replace(/\\/g, "\\\\")   // backslash first
  .replace(/`/g, "\\`")     // backtick
  .replace(/\$\{/g, "\\${"); // template expression opener

// 2b. Replace <pre id="code-block">...</pre> — will be filled by JS at runtime
html = html.replace(
  /<pre id="code-block">[\s\S]*?<\/pre>/,
  '<pre id="code-block"></pre>'
);

// 2c. Replace the entire COPY CODE section (idempotent):
//     /* ── COPY CODE ── */ ... function copyCode
const replacement =
  "/* ── COPY CODE ── */\n" +
  "  const CODE_GS_RAW = `" + escaped + "`;\n" +
  "  document.getElementById('code-block').textContent = CODE_GS_RAW;\n" +
  "\n" +
  "  function copyCode";

html = html.replace(
  /\/\* ── COPY CODE ── \*\/[\s\S]*?function copyCode/,
  replacement
);

fs.writeFileSync(htmlPath, html, "utf8");
console.log("✓ website/index.html updated");
