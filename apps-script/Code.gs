// Google Apps Script — Finance Tracker Backend
// Planilha: 1ZiU0YLvLnYbnIaphf1cI_6gb0IITG94JkrVTWG8VtKY
// Publicado como Web App → Qualquer pessoa pode acessar

var SPREADSHEET_ID = "1ZiU0YLvLnYbnIaphf1cI_6gb0IITG94JkrVTWG8VtKY";
var SHEET_NAME     = "Página1";

function getSheet() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  if (!ss) throw new Error("Planilha não encontrada. Verifique o SPREADSHEET_ID.");

  // Usa a primeira aba da planilha (independente do nome)
  var sheet = ss.getSheets()[0];
  if (!sheet) throw new Error("Nenhuma aba encontrada na planilha.");
  return sheet;
}

function doGet(e) {
  try {
    var action    = (e && e.parameter && e.parameter.action)    || "";
    var cellSaldo = (e && e.parameter && e.parameter.cellSaldo) || "F9";

    if (action === "getSaldo") {
      var sheet = getSheet();
      var saldo = sheet.getRange(cellSaldo).getValue();
      return ContentService
        .createTextOutput(JSON.stringify({ saldo: saldo }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService
      .createTextOutput(JSON.stringify({ error: "Ação desconhecida: " + action }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    var body      = JSON.parse(e.postData.contents);
    var cellGasto = body.cellGasto || "I8";
    var cellSaldo = body.cellSaldo || "F9";

    if (body.action === "addExpense") {
      var sheet      = getSheet();
      var valor      = parseFloat(body.valor);
      var gastoAtual = parseFloat(sheet.getRange(cellGasto).getValue()) || 0;

      sheet.getRange(cellGasto).setValue(gastoAtual + valor);
      SpreadsheetApp.flush();
      Utilities.sleep(1500);

      var novoSaldo = sheet.getRange(cellSaldo).getValue();
      return ContentService
        .createTextOutput(JSON.stringify({ novoSaldo: novoSaldo }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService
      .createTextOutput(JSON.stringify({ error: "Ação desconhecida" }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
