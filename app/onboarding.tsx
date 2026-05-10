import React, { useState, useRef } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Animated, Easing,
  KeyboardAvoidingView, Platform, Linking, Share, Clipboard,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  saveScriptUrl, saveSpreadsheetId,
  extractSpreadsheetId, pingScript,
} from "../services/sheetsService";

// ─── Código do Apps Script embutido no app ───────────────────────────────────
const CODE_GS = `// Google Apps Script — Finance Tracker Backend (Standalone / Universal)
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
      var historico = rows.map(function(r) {
        return { id: String(r[0]), nome: String(r[1]), valor: Number(r[2]), data: String(r[3]) };
      });
      return ContentService
        .createTextOutput(JSON.stringify({ historico: historico }))
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
`;

// ─── Passos do guia ──────────────────────────────────────────────────────────
const STEPS: Array<{
  icon: React.ComponentProps<typeof Ionicons>["name"];
  title: string;
  body: string;
  hasCopy?: boolean;
}> = [
  {
    icon: "browsers-outline",
    title: "Acesse o Google Apps Script",
    body: 'No seu navegador, abra:\n\nscript.google.com\n\nEntre com a mesma conta Google da sua planilha.\n\nSe não tiver conta Google, crie uma em google.com.',
  },
  {
    icon: "add-circle-outline",
    title: "Crie um novo projeto",
    body: 'Clique em "+ Novo projeto" (botão no canto superior esquerdo).\n\nUma nova aba abrirá com um editor de código e uma função vazia.',
  },
  {
    icon: "clipboard-outline",
    title: "Cole o código no editor",
    body: 'Selecione TODO o conteúdo do editor (Ctrl+A ou Cmd+A) e apague.\n\nDepois cole o código abaixo usando o botão "Copiar código".\n\nClique no ícone de disquete 💾 ou pressione Ctrl+S para salvar.',
    hasCopy: true,
  },
  {
    icon: "cloud-upload-outline",
    title: "Publique como Web App",
    body: 'No topo da página clique em:\n"Implantar" → "Nova implantação"\n\nNa janela que abrir:\n①  Clique no ícone de engrenagem ⚙ em "Tipo" e selecione "App da Web"\n②  Executar como: Eu (seu e-mail)\n③  Quem tem acesso: Qualquer pessoa\n\nClique em "Implantar".\n\nSe aparecer uma tela de permissões, clique em "Autorizar acesso", escolha sua conta Google e clique em "Permitir".',
  },
  {
    icon: "link-outline",
    title: "Copie a URL do Web App",
    body: 'Após implantar, o Google exibe uma caixa com a URL do Web App:\n\nhttps://script.google.com/macros/s/XXXX.../exec\n\nCopie essa URL completa (incluindo o /exec no final) e cole no campo "URL do Web App" abaixo.',
  },
  {
    icon: "document-text-outline",
    title: "Cole o link da sua planilha",
    body: 'Abra sua planilha no Google Sheets e copie o endereço da barra do navegador.\n\nExemplo:\nhttps://docs.google.com/spreadsheets/d/1AbC.../edit\n\nCole esse link no campo "Link da planilha" abaixo.',
  },
];

export default function OnboardingScreen() {
  const router = useRouter();

  const [sheetsUrl,  setSheetsUrl]  = useState("");
  const [scriptUrl,  setScriptUrl]  = useState("");
  const [loading,    setLoading]    = useState(false);
  const [erro,       setErro]       = useState("");
  const [sheetName,  setSheetName]  = useState("");
  const [guideOpen,  setGuideOpen]  = useState(false);
  const [activeStep, setActiveStep] = useState<number | null>(null);
  const [copied,     setCopied]     = useState(false);

  const guideOpacity = useRef(new Animated.Value(0)).current;
  const pulseAnim    = useRef(new Animated.Value(1)).current;

  function toggleGuide() {
    const toValue = guideOpen ? 0 : 1;
    Animated.timing(guideOpacity, { toValue, duration: 280, useNativeDriver: false }).start();
    setGuideOpen((prev) => !prev);
    if (!guideOpen) setActiveStep(null);
  }

  function pulse() {
    Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 0.94, duration: 80,  useNativeDriver: true, easing: Easing.out(Easing.ease) }),
      Animated.timing(pulseAnim, { toValue: 1,    duration: 120, useNativeDriver: true, easing: Easing.out(Easing.ease) }),
    ]).start();
  }

  async function handleCopiarCodigo() {
    // Tenta copiar primeiro; se falhar, abre o Share sheet nativo
    try {
      Clipboard.setString(CODE_GS);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      try {
        await Share.share({ message: CODE_GS, title: "Code.gs — Finance Tracker" });
      } catch { /* ignora */ }
    }
  }

  async function handleConectar() {
    const sheets = sheetsUrl.trim();
    const script = scriptUrl.trim();

    setErro("");
    setSheetName("");

    if (!sheets) { setErro("Cole o link da sua planilha do Google Sheets."); return; }
    if (!script)  { setErro("Cole a URL do Web App gerada no Apps Script."); return; }

    const spreadsheetId = extractSpreadsheetId(sheets);
    if (!spreadsheetId) {
      setErro(
        'Link inválido. Ele deve conter "/spreadsheets/d/"\n' +
        "Exemplo: https://docs.google.com/spreadsheets/d/..."
      );
      return;
    }

    if (!script.startsWith("https://script.google.com/macros/s/")) {
      setErro('URL inválida. Deve começar com\n"https://script.google.com/macros/s/"');
      return;
    }

    pulse();
    setLoading(true);
    try {
      const title = await pingScript(script, spreadsheetId);
      setSheetName(title);
      await saveScriptUrl(script);
      await saveSpreadsheetId(spreadsheetId);
      setTimeout(() => router.replace("/setup"), 1500);
    } catch (e: any) {
      setErro(e.message ?? "Não foi possível conectar. Verifique os dados e tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#0d1117" }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">

        {/* ── Header ── */}
        <View style={styles.iconBg}>
          <Ionicons name="stats-chart" size={34} color="#58a6ff" />
        </View>
        <Text style={styles.title}>Conectar planilha</Text>
        <Text style={styles.subtitle}>
          Configure o app com sua planilha do Google Sheets.{"\n"}
          Você só faz isso uma vez.
        </Text>

        {/* ── Campos ── */}
        <View style={styles.inputCard}>
          <View style={styles.fieldRow}>
            <Ionicons name="document-text-outline" size={16} color="#58a6ff" />
            <Text style={styles.fieldLabel}>Link da sua planilha</Text>
          </View>
          <TextInput
            style={styles.input}
            value={sheetsUrl}
            onChangeText={(v) => { setSheetsUrl(v); setErro(""); }}
            placeholder="https://docs.google.com/spreadsheets/d/..."
            placeholderTextColor="#484f58"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            multiline
          />

          <View style={styles.fieldDivider} />

          <View style={styles.fieldRow}>
            <Ionicons name="code-slash-outline" size={16} color="#58a6ff" />
            <Text style={styles.fieldLabel}>URL do Web App (Apps Script)</Text>
          </View>
          <TextInput
            style={styles.input}
            value={scriptUrl}
            onChangeText={(v) => { setScriptUrl(v); setErro(""); }}
            placeholder="https://script.google.com/macros/s/..."
            placeholderTextColor="#484f58"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            multiline
          />

          {!!erro && (
            <View style={styles.erroRow}>
              <Ionicons name="alert-circle-outline" size={15} color="#f85149" />
              <Text style={styles.erroText}>{erro}</Text>
            </View>
          )}
          {!!sheetName && (
            <View style={styles.successRow}>
              <Ionicons name="checkmark-circle" size={15} color="#3fb950" />
              <Text style={styles.successText}>Conectado: {sheetName}</Text>
            </View>
          )}
        </View>

        {/* ── Botão Conectar ── */}
        <Animated.View style={{ width: "100%", transform: [{ scale: pulseAnim }] }}>
          <TouchableOpacity
            style={[styles.btnConectar, loading && { opacity: 0.65 }]}
            onPress={handleConectar}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator color="#fff" size="small" />
              : <>
                  <Ionicons name="flash-outline" size={18} color="#fff" />
                  <Text style={styles.btnConectarText}>Testar e conectar</Text>
                </>
            }
          </TouchableOpacity>
        </Animated.View>

        {/* ── Divisor ── */}
        <View style={styles.dividerRow}>
          <View style={styles.divider} />
          <Text style={styles.dividerLabel}>PRECISA DE AJUDA?</Text>
          <View style={styles.divider} />
        </View>

        {/* ── Botão do guia ── */}
        <TouchableOpacity style={styles.btnGuide} onPress={toggleGuide} activeOpacity={0.75}>
          <Ionicons name="book-outline" size={18} color="#58a6ff" />
          <Text style={styles.btnGuideText}>
            {guideOpen ? "Fechar guia passo a passo" : "Não sabe o que fazer? Veja o passo a passo"}
          </Text>
          <Ionicons name={guideOpen ? "chevron-up-outline" : "chevron-down-outline"} size={16} color="#58a6ff" />
        </TouchableOpacity>

        {/* ── Guia expansível ── */}
        <Animated.View style={[styles.guideWrap, { opacity: guideOpacity }]}>
          {guideOpen && (
            <>
              {STEPS.map((step, i) => (
                <TouchableOpacity
                  key={i}
                  style={[styles.stepCard, activeStep === i && styles.stepCardActive]}
                  onPress={() => setActiveStep(activeStep === i ? null : i)}
                  activeOpacity={0.8}
                >
                  {/* Cabeçalho do passo */}
                  <View style={styles.stepHeader}>
                    <View style={styles.stepBadge}>
                      <Text style={styles.stepBadgeText}>{i + 1}</Text>
                    </View>
                    <Ionicons name={step.icon} size={17} color={activeStep === i ? "#58a6ff" : "#8b949e"} />
                    <Text style={[styles.stepTitle, activeStep === i && { color: "#58a6ff" }]}>
                      {step.title}
                    </Text>
                    <Ionicons
                      name={activeStep === i ? "chevron-up-outline" : "chevron-down-outline"}
                      size={14}
                      color="#484f58"
                      style={{ marginLeft: "auto" }}
                    />
                  </View>

                  {/* Corpo expansível */}
                  {activeStep === i && (
                    <View style={styles.stepBodyWrap}>
                      <Text style={styles.stepBody}>{step.body}</Text>

                      {/* Botão de copiar código (apenas no passo 3) */}
                      {step.hasCopy && (
                        <TouchableOpacity
                          style={[styles.btnCopy, copied && styles.btnCopied]}
                          onPress={(e) => { e.stopPropagation?.(); handleCopiarCodigo(); }}
                          activeOpacity={0.8}
                        >
                          <Ionicons
                            name={copied ? "checkmark-outline" : "copy-outline"}
                            size={16}
                            color={copied ? "#3fb950" : "#fff"}
                          />
                          <Text style={[styles.btnCopyText, copied && { color: "#3fb950" }]}>
                            {copied ? "Código copiado!" : "Copiar código"}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                </TouchableOpacity>
              ))}

              <TouchableOpacity
                style={styles.btnExternal}
                onPress={() => Linking.openURL("https://script.google.com")}
                activeOpacity={0.8}
              >
                <Ionicons name="open-outline" size={15} color="#58a6ff" />
                <Text style={styles.btnExternalText}>Abrir Google Apps Script ↗</Text>
              </TouchableOpacity>
            </>
          )}
        </Animated.View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, paddingTop: 56, alignItems: "center" },

  iconBg: {
    width: 76, height: 76, borderRadius: 22,
    backgroundColor: "#161b22", borderWidth: 1, borderColor: "#21262d",
    alignItems: "center", justifyContent: "center", marginBottom: 20,
    shadowColor: "#58a6ff", shadowOpacity: 0.14, shadowRadius: 16, elevation: 6,
  },
  title:    { color: "#e6edf3", fontSize: 26, fontWeight: "800", marginBottom: 8, textAlign: "center" },
  subtitle: { color: "#8b949e", fontSize: 14, textAlign: "center", lineHeight: 20, marginBottom: 28 },

  inputCard: {
    width: "100%", backgroundColor: "#161b22",
    borderRadius: 16, borderWidth: 1, borderColor: "#21262d", padding: 18, marginBottom: 16,
  },
  fieldRow:     { flexDirection: "row", alignItems: "center", gap: 7, marginBottom: 8 },
  fieldLabel:   { color: "#8b949e", fontSize: 12, textTransform: "uppercase", letterSpacing: 0.7, fontWeight: "600" },
  fieldDivider: { height: 1, backgroundColor: "#21262d", marginVertical: 18 },
  input: {
    backgroundColor: "#0d1117", color: "#e6edf3",
    borderWidth: 1, borderColor: "#30363d", borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 11,
    fontSize: 12, lineHeight: 18, minHeight: 48,
  },
  erroRow:    { flexDirection: "row", alignItems: "flex-start", gap: 6, marginTop: 12 },
  erroText:   { color: "#f85149", fontSize: 12, flex: 1, lineHeight: 18 },
  successRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 12 },
  successText:{ color: "#3fb950", fontSize: 13, fontWeight: "600" },

  btnConectar: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: "#1f6feb", borderRadius: 12, paddingVertical: 16,
    width: "100%", marginBottom: 28,
    shadowColor: "#1f6feb", shadowOpacity: 0.25, shadowRadius: 12, elevation: 5,
  },
  btnConectarText: { color: "#fff", fontSize: 16, fontWeight: "700" },

  dividerRow:  { flexDirection: "row", alignItems: "center", width: "100%", marginBottom: 16, gap: 10 },
  divider:     { flex: 1, height: 1, backgroundColor: "#21262d" },
  dividerLabel:{ color: "#484f58", fontSize: 10, letterSpacing: 1 },

  btnGuide: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingVertical: 13, paddingHorizontal: 16,
    backgroundColor: "#161b22", borderRadius: 12,
    borderWidth: 1, borderColor: "#21262d", width: "100%", marginBottom: 16,
  },
  btnGuideText: { color: "#58a6ff", fontSize: 13, fontWeight: "600", flex: 1 },

  guideWrap: { width: "100%" },

  stepCard: {
    backgroundColor: "#161b22", borderRadius: 12,
    borderWidth: 1, borderColor: "#21262d",
    marginBottom: 10, padding: 14,
  },
  stepCardActive: { borderColor: "#1f6feb" },
  stepHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  stepBadge: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: "#0d1117", borderWidth: 1, borderColor: "#30363d",
    alignItems: "center", justifyContent: "center",
  },
  stepBadgeText: { color: "#58a6ff", fontSize: 11, fontWeight: "700" },
  stepTitle: { color: "#e6edf3", fontSize: 14, fontWeight: "600", flex: 1 },

  stepBodyWrap: {
    marginTop: 12, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: "#21262d",
  },
  stepBody: { color: "#8b949e", fontSize: 13, lineHeight: 20 },

  btnCopy: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: "#1f6feb", borderRadius: 10,
    paddingVertical: 12, marginTop: 14,
  },
  btnCopied: { backgroundColor: "#1a3a2a", borderWidth: 1, borderColor: "#238636" },
  btnCopyText: { color: "#fff", fontSize: 14, fontWeight: "700" },

  btnExternal: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    paddingVertical: 12, marginTop: 4, marginBottom: 12,
  },
  btnExternalText: { color: "#58a6ff", fontSize: 13 },
});
