#!/usr/bin/env node
/**
 * postinstall.js
 * Verifica se os plugins Babel necessários estão instalados.
 * (react-native-reanimated@3 — sem necessidade de worklets-core)
 */

const path = require("path");
const { execSync } = require("child_process");

const criticalModules = [
  "@babel/plugin-proposal-optional-chaining",
  "@babel/plugin-proposal-nullish-coalescing-operator",
  "@babel/plugin-proposal-class-properties",
  "@babel/plugin-proposal-logical-assignment-operators",
  "@babel/plugin-proposal-numeric-separator",
  "@babel/plugin-proposal-private-methods",
  "@babel/plugin-proposal-export-namespace-from",
  "@babel/plugin-transform-template-literals",
  "@babel/plugin-transform-arrow-functions",
  "@babel/plugin-transform-block-scoping",
  "@babel/plugin-transform-classes",
  "@babel/plugin-transform-destructuring",
  "@babel/plugin-transform-for-of",
  "@babel/plugin-transform-parameters",
  "@babel/plugin-transform-spread",
  "@babel/plugin-transform-object-rest-spread",
  "@babel/preset-env",
];

const missing = criticalModules.filter((mod) => {
  try {
    require.resolve(path.join(__dirname, "..", "node_modules", mod));
    return false;
  } catch {
    return true;
  }
});

if (missing.length > 0) {
  console.log("⚠️  Instalando módulos Babel faltantes:", missing.join(", "));
  execSync(`npm install --save-dev ${missing.join(" ")} --legacy-peer-deps`, {
    stdio: "inherit",
    cwd: path.join(__dirname, ".."),
  });
  console.log("✅ Módulos instalados.");
} else {
  console.log("✅ Todos os módulos Babel presentes.");
}
