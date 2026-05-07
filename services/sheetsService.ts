import AsyncStorage from "@react-native-async-storage/async-storage";

// ── Chaves do AsyncStorage ─────────────────────────────────────────────────
const SCRIPT_URL_KEY    = "apps_script_url";
const SPREADSHEET_ID_KEY = "spreadsheet_id";
const CONFIG_KEY        = "cell_config";
const HIST_KEY          = "historico_despesas";

// ── URL do Web App (script autônomo) ──────────────────────────────────────

export async function saveScriptUrl(url: string): Promise<void> {
  await AsyncStorage.setItem(SCRIPT_URL_KEY, url.trim());
}

export async function getScriptUrl(): Promise<string | null> {
  return AsyncStorage.getItem(SCRIPT_URL_KEY);
}

export async function clearScriptUrl(): Promise<void> {
  await AsyncStorage.removeItem(SCRIPT_URL_KEY);
  await AsyncStorage.removeItem(SPREADSHEET_ID_KEY);
}

// ── ID da planilha do usuário ──────────────────────────────────────────────

export async function saveSpreadsheetId(id: string): Promise<void> {
  await AsyncStorage.setItem(SPREADSHEET_ID_KEY, id);
}

export async function getSpreadsheetId(): Promise<string | null> {
  return AsyncStorage.getItem(SPREADSHEET_ID_KEY);
}

/**
 * Extrai o spreadsheetId de uma URL do Google Sheets.
 * Aceita os formatos:
 *   https://docs.google.com/spreadsheets/d/ID/edit
 *   https://docs.google.com/spreadsheets/d/ID/
 */
export function extractSpreadsheetId(sheetsUrl: string): string | null {
  const match = sheetsUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : null;
}

/**
 * Testa a conexão com o Apps Script + a planilha.
 * Retorna o nome da planilha em caso de sucesso.
 */
export async function pingScript(scriptUrl: string, spreadsheetId: string): Promise<string> {
  const url = `${scriptUrl.trim()}?action=ping&spreadsheetId=${encodeURIComponent(spreadsheetId)}`;
  const res = await fetch(url, { redirect: "follow" });
  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    throw new Error(
      "A URL do Web App não respondeu com JSON.\n" +
      "Verifique se o script foi publicado corretamente."
    );
  }
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  if (!data.ok)   throw new Error("O script não respondeu ao ping.");
  return data.title as string;
}

// ── Configuração das células ───────────────────────────────────────────────

export interface CellConfig {
  cellSaldo: string; // ex: "F9"
  cellGasto: string; // ex: "I8"
  cellParcelasStart?: string; // ex: "K5"
}

export async function saveCellConfig(config: CellConfig): Promise<void> {
  await AsyncStorage.setItem(CONFIG_KEY, JSON.stringify(config));
}

export async function getCellConfig(): Promise<CellConfig | null> {
  const raw = await AsyncStorage.getItem(CONFIG_KEY);
  return raw ? JSON.parse(raw) : null;
}

// ── Helper interno ─────────────────────────────────────────────────────────

async function getCredentials(): Promise<{ url: string; spreadsheetId: string }> {
  const url           = await getScriptUrl();
  const spreadsheetId = await getSpreadsheetId();
  if (!url || !spreadsheetId) {
    throw new Error("Planilha não configurada. Volte ao onboarding.");
  }
  return { url, spreadsheetId };
}

async function safeFetch(url: string, options?: RequestInit): Promise<any> {
  const res = await fetch(url, { redirect: "follow", ...options });
  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    throw new Error(
      "O Apps Script não respondeu com JSON.\n" +
      "Verifique se está publicado como 'Qualquer pessoa pode acessar'."
    );
  }
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data;
}

// ── Chamadas ao Apps Script ────────────────────────────────────────────────

export async function getSaldo(cellSaldo: string): Promise<number> {
  const { url, spreadsheetId } = await getCredentials();
  const data = await safeFetch(
    `${url}?action=getSaldo&spreadsheetId=${encodeURIComponent(spreadsheetId)}&cellSaldo=${encodeURIComponent(cellSaldo)}`
  );
  const valor = parseFloat(String(data.saldo).replace(",", "."));
  if (isNaN(valor)) throw new Error(`Valor inválido na célula ${cellSaldo}: "${data.saldo}"`);
  return valor;
}

export async function addExpense(
  nome: string,
  valor: number,
  cellGasto: string,
  cellSaldo: string
): Promise<number> {
  const { url, spreadsheetId } = await getCredentials();
  const data = await safeFetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "addExpense", nome, valor, cellGasto, cellSaldo, spreadsheetId }),
  });
  const novoSaldo = parseFloat(String(data.novoSaldo).replace(",", "."));
  if (isNaN(novoSaldo)) throw new Error(`Saldo inválido recebido: "${data.novoSaldo}"`);
  return novoSaldo;
}

export async function subtractExpense(
  valor: number,
  cellGasto: string,
  cellSaldo: string
): Promise<number> {
  const { url, spreadsheetId } = await getCredentials();
  const data = await safeFetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "subtractExpense", valor, cellGasto, cellSaldo, spreadsheetId }),
  });
  const novoSaldo = parseFloat(String(data.novoSaldo).replace(",", "."));
  if (isNaN(novoSaldo)) throw new Error(`Saldo inválido recebido: "${data.novoSaldo}"`);
  return novoSaldo;
}

// ── Parcelas ───────────────────────────────────────────────────────────────

export interface Installment {
  rowIndex: number;
  restantes: number;
  nome: string;
  valor: number;
}

export async function getInstallments(): Promise<Installment[]> {
  const { url, spreadsheetId } = await getCredentials();
  const config = await getCellConfig();
  if (!config || !config.cellParcelasStart) return [];
  const data = await safeFetch(
    `${url}?action=getInstallments&spreadsheetId=${encodeURIComponent(spreadsheetId)}&cellParcelasStart=${encodeURIComponent(config.cellParcelasStart)}`
  );
  return data.installments || [];
}

export async function addInstallmentToSheet(restantes: number, nome: string, valor: number): Promise<void> {
  const { url, spreadsheetId } = await getCredentials();
  const config = await getCellConfig();
  if (!config || !config.cellParcelasStart) throw new Error("Células de parcelas não configuradas.");
  await safeFetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "addInstallment",
      spreadsheetId,
      cellParcelasStart: config.cellParcelasStart,
      restantes,
      nome,
      valor
    }),
  });
}

export async function payInstallment(rowIndex: number): Promise<number> {
  const { url, spreadsheetId } = await getCredentials();
  const config = await getCellConfig();
  if (!config || !config.cellParcelasStart) throw new Error("Células de parcelas não configuradas.");
  const data = await safeFetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "payInstallment",
      spreadsheetId,
      cellParcelasStart: config.cellParcelasStart,
      rowIndex
    }),
  });
  return data.remaining;
}

export async function payAllInstallments(): Promise<void> {
  const { url, spreadsheetId } = await getCredentials();
  const config = await getCellConfig();
  if (!config || !config.cellParcelasStart) throw new Error("Células de parcelas não configuradas.");
  await safeFetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "payAllInstallments",
      spreadsheetId,
      cellParcelasStart: config.cellParcelasStart
    }),
  });
}

export async function deleteInstallment(rowIndex: number): Promise<void> {
  const { url, spreadsheetId } = await getCredentials();
  const config = await getCellConfig();
  if (!config || !config.cellParcelasStart) throw new Error("Células de parcelas não configuradas.");
  await safeFetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "deleteInstallment",
      spreadsheetId,
      cellParcelasStart: config.cellParcelasStart,
      rowIndex
    }),
  });
}

// ── Histórico local ────────────────────────────────────────────────────────

export interface Despesa {
  id: string;
  nome: string;
  valor: number;
  data: string;
}

export async function addDespesa(despesa: Omit<Despesa, "id">): Promise<Despesa> {
  const raw   = await AsyncStorage.getItem(HIST_KEY);
  const lista: Despesa[] = raw ? JSON.parse(raw) : [];
  const nova: Despesa    = { ...despesa, id: Date.now().toString() };
  lista.unshift(nova);
  await AsyncStorage.setItem(HIST_KEY, JSON.stringify(lista));
  return nova;
}

export async function getDespesas(): Promise<Despesa[]> {
  const raw = await AsyncStorage.getItem(HIST_KEY);
  return raw ? JSON.parse(raw) : [];
}

export async function removeDespesa(id: string): Promise<void> {
  const raw   = await AsyncStorage.getItem(HIST_KEY);
  const lista: Despesa[] = raw ? JSON.parse(raw) : [];
  const nova  = lista.filter((d) => d.id !== id);
  await AsyncStorage.setItem(HIST_KEY, JSON.stringify(nova));
}

export async function clearDespesas(): Promise<void> {
  await AsyncStorage.removeItem(HIST_KEY);
}
