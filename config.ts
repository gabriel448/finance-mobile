// ─────────────────────────────────────────────────────────────────────────────
// config.ts — Credenciais Google OAuth
// ─────────────────────────────────────────────────────────────────────────────
//
// Para obter o CLIENT_ID:
//  1. Acesse console.cloud.google.com → seu projeto
//  2. APIs e Serviços → Credenciais → Criar → ID do cliente OAuth 2.0
//  3. Tipo: Aplicativo Web
//  4. Origens JS autorizadas: https://auth.expo.io
//  5. URIs de redirecionamento: https://auth.expo.io/@SEU_USERNAME/finance-mobile-1
//  6. Cole o "ID do cliente" abaixo (termina em .apps.googleusercontent.com)
//
// ⚠️  Também ative a Google Sheets API no projeto:
//     APIs e Serviços → Biblioteca → "Google Sheets API" → Ativar

export const GOOGLE_WEB_CLIENT_ID =
  "518441950013-h9i5krmbo1dnr3bdklcrl8hmk0crkaif.apps.googleusercontent.com"; // ← cole aqui

export const SHEETS_SCOPE =
  "https://www.googleapis.com/auth/spreadsheets";
