// Google Apps Script — Finance Tracker Backend
// =============================================
// ⚠️  PREENCHA o ID da sua planilha abaixo!
// O ID está na URL da planilha:
// https://docs.google.com/spreadsheets/d/<<ID_AQUI>>/edit
//
// Publicar como Web App:
//   1. Cole este código em Code.gs no script.google.com
//   2. Clique em "Implantar" > "Nova implantação"
//   3. Tipo: "App da Web"
//   4. Executar como: "Eu" (sua conta Google)
//   5. Quem pode acessar: "Qualquer pessoa"
//   6. Copie a URL e cole em services/sheetsService.ts

const SPREADSHEET_ID = "SEU_ID_AQUI"; // ← cole o ID da sua planilha
const SHEET_NAME    = "Controle-financeiro";
const CELL_GASTO    = "I8";   // célula onde se escreve o total de gastos
const CELL_SALDO    = "F9";   // célula que retorna o saldo disponível

function getSheet() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  if (!ss) throw new Error("Planilha não encontrada. Verifique o SPREADSHEET_ID.");
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) throw new Error("Aba '" + SHEET_NAME + "' não encontrada na planilha.");
  return sheet;
}

function doGet(e) {
  try {
    var action = e && e.parameter && e.parameter.action;
    if (action === "getSaldo") {
      var sheet = getSheet();
      var saldo = sheet.getRange(CELL_SALDO).getValue();
      return ContentService
        .createTextOutput(JSON.stringify({ saldo: saldo }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    return ContentService
      .createTextOutput(JSON.stringify({ error: "Ação não reconhecida: " + action }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    if (body.action === "addExpense") {
      var sheet = getSheet();
      var valor = parseFloat(body.valor);
      var gastoAtual = parseFloat(sheet.getRange(CELL_GASTO).getValue()) || 0;
      sheet.getRange(CELL_GASTO).setValue(gastoAtual + valor);
      SpreadsheetApp.flush();
      Utilities.sleep(1500);
      var novoSaldo = sheet.getRange(CELL_SALDO).getValue();
      return ContentService
        .createTextOutput(JSON.stringify({ novoSaldo: novoSaldo }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    return ContentService
      .createTextOutput(JSON.stringify({ error: "Ação não reconhecida" }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
