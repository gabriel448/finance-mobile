// Google Apps Script — Hero Backend (Standalone / Universal)
//
// COMO PUBLICAR:
//  1. Acesse script.google.com e crie um novo projeto
//  2. Apague tudo e cole este código
//  3. Clique em "Implantar" → "Nova implantação"
//  4. Tipo: "App da Web"
//     • Executar como: Eu (seu e-mail)
//     • Quem tem acesso: Qualquer pessoa
//  5. Clique em "Implantar" e autorize as permissões
//  6. Copie a URL gerada e cole no app
//
// O script funciona como um proxy autônomo:
// o spreadsheetId é enviado pelo app a cada requisição.

function getSheet(spreadsheetId) {
  var ss = SpreadsheetApp.openById(spreadsheetId);
  if (!ss) throw new Error("Planilha não encontrada. Verifique o link informado.");
  var sheet = ss.getSheets()[0];
  if (!sheet) throw new Error("Nenhuma aba encontrada na planilha.");
  return sheet;
}

function doGet(e) {
  try {
    var action          = (e && e.parameter && e.parameter.action)          || "";
    var spreadsheetId   = (e && e.parameter && e.parameter.spreadsheetId)   || "";
    var cellSaldo       = (e && e.parameter && e.parameter.cellSaldo)       || "F9";

    if (action === "ping") {
      if (!spreadsheetId) throw new Error("spreadsheetId não informado.");
      var ss = SpreadsheetApp.openById(spreadsheetId);
      return ContentService
        .createTextOutput(JSON.stringify({ ok: true, title: ss.getName() }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (action === "getSaldo") {
      if (!spreadsheetId) throw new Error("spreadsheetId não informado.");
      var sheet = getSheet(spreadsheetId);
      var saldo = sheet.getRange(cellSaldo).getValue();
      return ContentService
        .createTextOutput(JSON.stringify({ saldo: saldo }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (action === "getInstallments") {
      var cellParcelasStart = (e && e.parameter && e.parameter.cellParcelasStart) || "";
      if (!spreadsheetId) throw new Error("spreadsheetId não informado.");
      if (!cellParcelasStart) throw new Error("Célula inicial de parcelas não configurada.");
      
      var sheet = getSheet(spreadsheetId);
      var startRange = sheet.getRange(cellParcelasStart);
      var startRow = startRange.getRow();
      var startCol = startRange.getColumn();
      
      var data = sheet.getRange(startRow, startCol, 100, 3).getValues();
      var installments = [];
      for (var i = 0; i < data.length; i++) {
        var row = data[i];
        if (row[0] !== "" || row[1] !== "" || row[2] !== "") {
          installments.push({
            rowIndex: startRow + i,
            restantes: parseInt(row[0]) || 0,
            nome: row[1],
            valor: parseFloat(String(row[2]).replace(',', '.')) || 0
          });
        }
      }
      return ContentService
        .createTextOutput(JSON.stringify({ installments: installments }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (action === "getGanhosHistorico") {
      if (!spreadsheetId) throw new Error("spreadsheetId não informado.");
      var ss = SpreadsheetApp.openById(spreadsheetId);
      var sheet = ss.getSheetByName("GanhosHistorico");
      if (!sheet || sheet.getLastRow() < 2) {
        return ContentService
          .createTextOutput(JSON.stringify({ historico: [] }))
          .setMimeType(ContentService.MimeType.JSON);
      }
      var rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, 4).getValues();
      var historico = rows
        .filter(function(r) {
          var id    = String(r[0]);
          var nome  = String(r[1]);
          var valor = Number(r[2]);
          return /^\d{10,}$/.test(id) && nome.trim() !== "" && !isNaN(valor);
        })
        .map(function(r) {
          return { id: String(r[0]), nome: String(r[1]), valor: Number(r[2]), data: String(r[3]) };
        });
      return ContentService
        .createTextOutput(JSON.stringify({ historico: historico }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (action === "getHistorico") {
      if (!spreadsheetId) throw new Error("spreadsheetId não informado.");
      var ss = SpreadsheetApp.openById(spreadsheetId);
      var sheet = ss.getSheetByName("Historico");
      if (!sheet || sheet.getLastRow() < 2) {
        return ContentService
          .createTextOutput(JSON.stringify({ historico: [] }))
          .setMimeType(ContentService.MimeType.JSON);
      }
      var rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, 4).getValues();
      var historico = rows
        .filter(function(r) {
          var id    = String(r[0]);
          var nome  = String(r[1]);
          var valor = Number(r[2]);
          // id deve ser timestamp numérico (≥10 dígitos), nome não-vazio, valor numérico
          return /^\d{10,}$/.test(id) && nome.trim() !== "" && !isNaN(valor);
        })
        .map(function(r) {
          return { id: String(r[0]), nome: String(r[1]), valor: Number(r[2]), data: String(r[3]) };
        });
      return ContentService
        .createTextOutput(JSON.stringify({ historico: historico }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (action === "getProximasParcelas") {
      if (!spreadsheetId) throw new Error("spreadsheetId não informado.");
      var ss = SpreadsheetApp.openById(spreadsheetId);
      var sheet = ss.getSheetByName("ProximasParcelas");
      if (!sheet || sheet.getLastRow() < 2) {
        return ContentService
          .createTextOutput(JSON.stringify({ proximas: [] }))
          .setMimeType(ContentService.MimeType.JSON);
      }
      var rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, 5).getValues();
      var proximas = rows
        .filter(function(r) {
          return String(r[0]).trim() !== "" && String(r[1]).trim() !== "";
        })
        .map(function(r) {
          return {
            id: String(r[0]),
            nome: String(r[1]),
            valor: Number(r[2]),
            restantes: parseInt(r[3]) || 0,
            dataAdicionado: String(r[4])
          };
        });
      return ContentService
        .createTextOutput(JSON.stringify({ proximas: proximas }))
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
    var body            = JSON.parse(e.postData.contents);
    var spreadsheetId   = body.spreadsheetId || "";
    var cellGasto       = body.cellGasto      || "I8";
    var cellSaldo       = body.cellSaldo      || "F9";

    if (!spreadsheetId) throw new Error("spreadsheetId não informado.");

    if (body.action === "addExpense") {
      var sheet      = getSheet(spreadsheetId);
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

    if (body.action === "subtractExpense") {
      var sheet      = getSheet(spreadsheetId);
      var valor      = parseFloat(body.valor);
      var gastoAtual = parseFloat(sheet.getRange(cellGasto).getValue()) || 0;
      var novoGasto  = Math.max(0, gastoAtual - valor);

      sheet.getRange(cellGasto).setValue(novoGasto);
      SpreadsheetApp.flush();
      Utilities.sleep(1500);

      var novoSaldo = sheet.getRange(cellSaldo).getValue();
      return ContentService
        .createTextOutput(JSON.stringify({ novoSaldo: novoSaldo }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (body.action === "addInstallment") {
      var sheet = getSheet(spreadsheetId);
      var cellParcelasStart = body.cellParcelasStart;
      var startRange = sheet.getRange(cellParcelasStart);
      var startRow = startRange.getRow();
      var startCol = startRange.getColumn();
      
      var data = sheet.getRange(startRow, startCol, 100, 3).getValues();
      var targetRowIndex = startRow + 99;
      for (var i = 0; i < data.length; i++) {
        if (data[i][0] === "" && data[i][1] === "" && data[i][2] === "") {
          targetRowIndex = startRow + i;
          break;
        }
      }
      
      sheet.getRange(targetRowIndex, startCol, 1, 3).setValues([[
        body.restantes,
        body.nome,
        body.valor
      ]]);
      
      return ContentService
        .createTextOutput(JSON.stringify({ ok: true }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (body.action === "deleteInstallment") {
      var sheet = getSheet(spreadsheetId);
      var cellParcelasStart = body.cellParcelasStart;
      var rowIndex = parseInt(body.rowIndex);
      var startCol = sheet.getRange(cellParcelasStart).getColumn();
      
      sheet.getRange(rowIndex, startCol, 1, 3).clearContent();
      
      return ContentService
        .createTextOutput(JSON.stringify({ ok: true }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (body.action === "payInstallment") {
      var sheet = getSheet(spreadsheetId);
      var cellParcelasStart = body.cellParcelasStart;
      var rowIndex = parseInt(body.rowIndex);
      var startCol = sheet.getRange(cellParcelasStart).getColumn();
      
      var remainingCell = sheet.getRange(rowIndex, startCol);
      var currentRemaining = parseInt(remainingCell.getValue()) || 0;
      var remaining = Math.max(0, currentRemaining - 1);
      
      if (remaining === 0) {
        sheet.getRange(rowIndex, startCol, 1, 3).clearContent();
      } else {
        remainingCell.setValue(remaining);
      }
      
      return ContentService
        .createTextOutput(JSON.stringify({ remaining: remaining }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (body.action === "payAllInstallments") {
      var sheet = getSheet(spreadsheetId);
      var cellParcelasStart = body.cellParcelasStart;
      var startRange = sheet.getRange(cellParcelasStart);
      var startRow = startRange.getRow();
      var startCol = startRange.getColumn();
      
      var dataRange = sheet.getRange(startRow, startCol, 100, 3);
      var data = dataRange.getValues();
      
      for (var i = 0; i < data.length; i++) {
        var row = data[i];
        if (row[0] !== "" || row[1] !== "" || row[2] !== "") {
          var remaining = (parseInt(row[0]) || 0) - 1;
          if (remaining <= 0) {
            data[i] = ["", "", ""];
          } else {
            data[i][0] = remaining;
          }
        }
      }
      
      dataRange.setValues(data);
      
      return ContentService
        .createTextOutput(JSON.stringify({ ok: true }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (body.action === "addGanho") {
      var sheet = getSheet(spreadsheetId);
      var valor = parseFloat(body.valor);
      var cellGanhosVariaveis = body.cellGanhosVariaveis || "";
      if (!cellGanhosVariaveis) throw new Error("cellGanhosVariaveis não informada.");
      var ganhoAtual = parseFloat(sheet.getRange(cellGanhosVariaveis).getValue()) || 0;
      sheet.getRange(cellGanhosVariaveis).setValue(ganhoAtual + valor);
      SpreadsheetApp.flush();
      Utilities.sleep(1500);
      var novoSaldo = sheet.getRange(cellSaldo).getValue();
      return ContentService
        .createTextOutput(JSON.stringify({ novoSaldo: novoSaldo }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (body.action === "zeroCellGanhos") {
      var sheet = getSheet(spreadsheetId);
      var cellGanhosVariaveis = body.cellGanhosVariaveis || "";
      if (!cellGanhosVariaveis) throw new Error("cellGanhosVariaveis não informada.");
      sheet.getRange(cellGanhosVariaveis).setValue(0);
      SpreadsheetApp.flush();
      Utilities.sleep(1500);
      var novoSaldo = sheet.getRange(cellSaldo).getValue();
      return ContentService
        .createTextOutput(JSON.stringify({ novoSaldo: novoSaldo }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (body.action === "syncGanhosHistorico") {
      var ss = SpreadsheetApp.openById(spreadsheetId);
      var sheet = ss.getSheetByName("GanhosHistorico");
      if (!sheet) sheet = ss.insertSheet("GanhosHistorico");
      sheet.clearContents();
      sheet.appendRow(["id", "nome", "valor", "data"]);
      var historico = body.historico || [];
      if (historico.length > 0) {
        var rows = historico.map(function(d) { return [d.id, d.nome, d.valor, d.data]; });
        sheet.getRange(2, 1, rows.length, 4).setValues(rows);
      }
      return ContentService
        .createTextOutput(JSON.stringify({ ok: true }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (body.action === "syncProximasParcelas") {
      var ss = SpreadsheetApp.openById(spreadsheetId);
      var sheet = ss.getSheetByName("ProximasParcelas");
      if (!sheet) sheet = ss.insertSheet("ProximasParcelas");
      sheet.clearContents();
      sheet.appendRow(["id", "nome", "valor", "restantes", "dataAdicionado"]);
      var proximas = body.proximas || [];
      if (proximas.length > 0) {
        var rows = proximas.map(function(p) { return [p.id, p.nome, p.valor, p.restantes, p.dataAdicionado]; });
        sheet.getRange(2, 1, rows.length, 5).setValues(rows);
      }
      return ContentService
        .createTextOutput(JSON.stringify({ ok: true }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (body.action === "resetMonthly") {
      var sheet = getSheet(spreadsheetId);
      var cellGanhos = body.cellGanhosVariaveis || "";
      if (cellGanhos) sheet.getRange(cellGanhos).setValue(0);
      sheet.getRange(cellGasto).setValue(0);
      SpreadsheetApp.flush();
      Utilities.sleep(1500);
      var novoSaldo = sheet.getRange(cellSaldo).getValue();
      return ContentService
        .createTextOutput(JSON.stringify({ novoSaldo: novoSaldo }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (body.action === "zeroCellGasto") {
      var sheet = getSheet(spreadsheetId);
      sheet.getRange(cellGasto).setValue(0);
      SpreadsheetApp.flush();
      Utilities.sleep(1500);
      var novoSaldo = sheet.getRange(cellSaldo).getValue();
      return ContentService
        .createTextOutput(JSON.stringify({ novoSaldo: novoSaldo }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (body.action === "syncHistorico") {
      var ss = SpreadsheetApp.openById(spreadsheetId);
      var sheet = ss.getSheetByName("Historico");
      if (!sheet) sheet = ss.insertSheet("Historico");
      sheet.clearContents();
      sheet.appendRow(["id", "nome", "valor", "data"]);
      var historico = body.historico || [];
      if (historico.length > 0) {
        var rows = historico.map(function(d) { return [d.id, d.nome, d.valor, d.data]; });
        sheet.getRange(2, 1, rows.length, 4).setValues(rows);
      }
      return ContentService
        .createTextOutput(JSON.stringify({ ok: true }))
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
