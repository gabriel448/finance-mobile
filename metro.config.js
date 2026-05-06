const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

/**
 * Mantém o campo "react-native" na resolução para compatibilidade geral,
 * mas garante que os node_modules já compilados não sejam re-transformados
 * com plugins Babel que podem não estar disponíveis.
 */

// Usa campos padrão do React Native (react-native > browser > main)
// O problema anterior com gesture-handler foi resolvido instalando todos
// os @babel/plugin-* necessários via @babel/preset-env na raiz.
config.resolver.resolverMainFields = ["react-native", "browser", "main"];

module.exports = config;
