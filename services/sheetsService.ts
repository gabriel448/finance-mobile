import AsyncStorage from "@react-native-async-storage/async-storage";
import { ProximaParcela } from "./localStorage";

// ── Chaves do AsyncStorage ─────────────────────────────────────────────────
const SCRIPT_URL_KEY    = "apps_script_url";
const SPREADSHEET_ID_KEY = "spreadsheet_id";
const CONFIG_KEY        = "cell_config";
const HIST_KEY          = "historico_despesas";
const GANHOS_KEY        = "historico_ganhos";
const GANHOS_MONTH_KEY  = "ganhos_zero_month";
const PROXIMAS_KEY      = "proximas_parcelas";

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
  cellSaldo: string;
  cellGasto: string;
  cellParcelasStart?: string;
  cellCustoFixo?: string;
  cellSalario?: string;
  salarioManual?: number;
  diaFechamento?: number;
  cellGanhosVariaveis?: string; // ex: "H8" — ganhos variáveis acumulados do mês
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

// Lê qualquer célula numérica da planilha reutilizando a action getSaldo
export async function readCellAsNumber(cell: string): Promise<number> {
  return getSaldo(cell);
}

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

export async function zeroCellGasto(cellGasto: string, cellSaldo: string): Promise<number> {
  const { url, spreadsheetId } = await getCredentials();
  const data = await safeFetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "zeroCellGasto", cellGasto, cellSaldo, spreadsheetId }),
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

// ── Histórico (local + backup na planilha) ─────────────────────────────────

export interface Despesa {
  id: string;
  nome: string;
  valor: number;
  data: string;
}

async function syncHistoricoToSheet(lista: Despesa[]): Promise<void> {
  try {
    const { url, spreadsheetId } = await getCredentials();
    await safeFetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "syncHistorico", spreadsheetId, historico: lista }),
    });
  } catch {
    // silencioso — local é o primário, planilha é o backup
  }
}

async function fetchHistoricoFromSheet(): Promise<Despesa[]> {
  try {
    const { url, spreadsheetId } = await getCredentials();
    const data = await safeFetch(
      `${url}?action=getHistorico&spreadsheetId=${encodeURIComponent(spreadsheetId)}`
    );
    return data.historico ?? [];
  } catch {
    return [];
  }
}

export async function addDespesa(despesa: Omit<Despesa, "id">): Promise<Despesa> {
  const raw   = await AsyncStorage.getItem(HIST_KEY);
  const lista: Despesa[] = raw ? JSON.parse(raw) : [];
  const nova: Despesa    = { ...despesa, id: Date.now().toString() };
  lista.unshift(nova);
  await AsyncStorage.setItem(HIST_KEY, JSON.stringify(lista));
  await syncHistoricoToSheet(lista);
  return nova;
}

export async function getDespesas(): Promise<Despesa[]> {
  const raw = await AsyncStorage.getItem(HIST_KEY);
  if (raw) return JSON.parse(raw);

  // Local vazio (ex: após reinstalação) — restaura do backup na planilha
  const fromSheet = await fetchHistoricoFromSheet();
  if (fromSheet.length > 0) {
    await AsyncStorage.setItem(HIST_KEY, JSON.stringify(fromSheet));
  }
  return fromSheet;
}

export async function removeDespesa(id: string): Promise<void> {
  const raw   = await AsyncStorage.getItem(HIST_KEY);
  const lista: Despesa[] = raw ? JSON.parse(raw) : [];
  const nova  = lista.filter((d) => d.id !== id);
  await AsyncStorage.setItem(HIST_KEY, JSON.stringify(nova));
  syncHistoricoToSheet(nova);
}

export async function clearDespesas(): Promise<void> {
  await AsyncStorage.removeItem(HIST_KEY);
  syncHistoricoToSheet([]);
}

// ── Ganhos Variáveis (local + backup na planilha) ──────────────────────────

export interface GanhoVariavel {
  id: string;
  nome: string;
  valor: number;
  data: string; // ISO
}

const BONUS_ID_PREFIX = "bonus_planilha_";

async function syncGanhosToSheet(lista: GanhoVariavel[]): Promise<void> {
  try {
    const { url, spreadsheetId } = await getCredentials();
    // Não sincroniza entradas de bônus — são derivadas da célula, não do histórico manual
    const toSync = lista.filter((g) => !g.id.startsWith(BONUS_ID_PREFIX));
    await safeFetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "syncGanhosHistorico", spreadsheetId, historico: toSync }),
    });
  } catch {
    // silencioso — local é o primário
  }
}

async function fetchGanhosFromSheet(): Promise<GanhoVariavel[]> {
  try {
    const { url, spreadsheetId } = await getCredentials();
    const data = await safeFetch(
      `${url}?action=getGanhosHistorico&spreadsheetId=${encodeURIComponent(spreadsheetId)}`
    );
    return data.historico ?? [];
  } catch {
    return [];
  }
}

export async function addGanhoVariavel(nome: string, valor: number): Promise<GanhoVariavel> {
  const { url, spreadsheetId } = await getCredentials();
  const config = await getCellConfig();
  if (!config?.cellGanhosVariaveis) throw new Error("Célula de ganhos variáveis não configurada.");

  await safeFetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "addGanho",
      spreadsheetId,
      valor,
      cellGanhosVariaveis: config.cellGanhosVariaveis,
      cellSaldo: config.cellSaldo,
    }),
  });

  const raw = await AsyncStorage.getItem(GANHOS_KEY);
  const lista: GanhoVariavel[] = raw ? JSON.parse(raw) : [];
  const novo: GanhoVariavel = { id: Date.now().toString(), nome, valor, data: new Date().toISOString() };
  lista.unshift(novo);
  await AsyncStorage.setItem(GANHOS_KEY, JSON.stringify(lista));
  syncGanhosToSheet(lista);
  return novo;
}

export async function getGanhosVariaveis(): Promise<GanhoVariavel[]> {
  const raw = await AsyncStorage.getItem(GANHOS_KEY);
  if (raw) return JSON.parse(raw);

  const fromSheet = await fetchGanhosFromSheet();
  if (fromSheet.length > 0) {
    await AsyncStorage.setItem(GANHOS_KEY, JSON.stringify(fromSheet));
  }
  return fromSheet;
}

export async function removeGanhoVariavel(id: string): Promise<void> {
  const raw = await AsyncStorage.getItem(GANHOS_KEY);
  const lista: GanhoVariavel[] = raw ? JSON.parse(raw) : [];
  const nova = lista.filter((g) => g.id !== id);
  await AsyncStorage.setItem(GANHOS_KEY, JSON.stringify(nova));
  syncGanhosToSheet(nova);
}

export async function clearGanhosVariaveis(): Promise<void> {
  await AsyncStorage.removeItem(GANHOS_KEY);
  syncGanhosToSheet([]);
}

export async function reconcileGanhosBonus(): Promise<GanhoVariavel[]> {
  const raw = await AsyncStorage.getItem(GANHOS_KEY);
  const lista: GanhoVariavel[] = raw ? JSON.parse(raw) : [];

  let cellValue = 0;
  try {
    const config = await getCellConfig();
    if (!config?.cellGanhosVariaveis) return lista;
    cellValue = await readCellAsNumber(config.cellGanhosVariaveis);
  } catch {
    return lista; // offline — retorna sem alterar
  }

  const now = new Date();
  const bonusId = `${BONUS_ID_PREFIX}${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  // Soma das entradas manuais do mês atual (exclui entradas de bônus)
  const manualSum = lista
    .filter((g) => {
      const d = new Date(g.data);
      return d.getFullYear() === now.getFullYear()
        && d.getMonth() === now.getMonth()
        && !g.id.startsWith(BONUS_ID_PREFIX);
    })
    .reduce((acc, g) => acc + g.valor, 0);

  const bonus = Math.round((cellValue - manualSum) * 100) / 100;

  const existingIdx = lista.findIndex((g) => g.id === bonusId);

  if (bonus <= 0.01) {
    if (existingIdx >= 0) {
      lista.splice(existingIdx, 1);
      await AsyncStorage.setItem(GANHOS_KEY, JSON.stringify(lista));
      syncGanhosToSheet(lista);
    }
    return lista;
  }

  // Já existe e valor não mudou — não faz nada
  if (existingIdx >= 0 && Math.abs(lista[existingIdx].valor - bonus) < 0.01) {
    return lista;
  }

  // Remove entrada antiga do bônus (se existir) e insere atualizada no topo
  if (existingIdx >= 0) lista.splice(existingIdx, 1);
  lista.unshift({
    id: bonusId,
    nome: "Bônus adicionado pela planilha",
    valor: bonus,
    data: new Date().toISOString(),
  });

  await AsyncStorage.setItem(GANHOS_KEY, JSON.stringify(lista));
  syncGanhosToSheet(lista);
  return lista;
}

export async function resetMonthlyCells(): Promise<void> {
  const { url, spreadsheetId } = await getCredentials();
  const config = await getCellConfig();
  if (!config?.cellGasto) throw new Error("Célula de gastos não configurada.");
  await safeFetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "resetMonthly",
      spreadsheetId,
      cellGasto: config.cellGasto,
      cellSaldo: config.cellSaldo,
      cellGanhosVariaveis: config.cellGanhosVariaveis ?? "",
    }),
  });
}

export async function zeroCellGanhosIfNewMonth(): Promise<void> {
  const stored = await AsyncStorage.getItem(GANHOS_MONTH_KEY);
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  if (stored === currentMonth) return;

  await AsyncStorage.setItem(GANHOS_MONTH_KEY, currentMonth);

  try {
    const { url, spreadsheetId } = await getCredentials();
    const config = await getCellConfig();
    if (!config?.cellGanhosVariaveis) return;
    await safeFetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "zeroCellGanhos",
        spreadsheetId,
        cellGanhosVariaveis: config.cellGanhosVariaveis,
        cellSaldo: config.cellSaldo,
      }),
    });
  } catch {
    // silencioso — tenta novamente na próxima abertura
  }
}

export async function revogarGanhoVariavel(id: string, valor: number): Promise<void> {
  const { url, spreadsheetId } = await getCredentials();
  const config = await getCellConfig();
  if (!config?.cellGanhosVariaveis) throw new Error("Célula de ganhos variáveis não configurada.");

  await safeFetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "addGanho",
      spreadsheetId,
      valor: -valor,
      cellGanhosVariaveis: config.cellGanhosVariaveis,
      cellSaldo: config.cellSaldo,
    }),
  });

  const raw = await AsyncStorage.getItem(GANHOS_KEY);
  const lista: GanhoVariavel[] = raw ? JSON.parse(raw) : [];
  const nova = lista.filter((g) => g.id !== id);
  await AsyncStorage.setItem(GANHOS_KEY, JSON.stringify(nova));
  syncGanhosToSheet(nova);
}

export async function alterarGanhoVariavel(
  id: string,
  valorAntigo: number,
  novoValor: number
): Promise<GanhoVariavel[]> {
  const { url, spreadsheetId } = await getCredentials();
  const config = await getCellConfig();
  if (!config?.cellGanhosVariaveis) throw new Error("Célula de ganhos variáveis não configurada.");

  const delta = novoValor - valorAntigo;
  await safeFetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "addGanho",
      spreadsheetId,
      valor: delta,
      cellGanhosVariaveis: config.cellGanhosVariaveis,
      cellSaldo: config.cellSaldo,
    }),
  });

  const raw = await AsyncStorage.getItem(GANHOS_KEY);
  const lista: GanhoVariavel[] = raw ? JSON.parse(raw) : [];
  const nova = lista.map((g) => (g.id === id ? { ...g, valor: novoValor } : g));
  await AsyncStorage.setItem(GANHOS_KEY, JSON.stringify(nova));
  syncGanhosToSheet(nova);
  return nova;
}

// ── Próximas Parcelas (local + backup na planilha) ─────────────────────────

async function syncProximasParcelasToSheet(lista: ProximaParcela[]): Promise<void> {
  try {
    const { url, spreadsheetId } = await getCredentials();
    await safeFetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "syncProximasParcelas", spreadsheetId, proximas: lista }),
    });
  } catch {
    // silencioso — tenta novamente na próxima operação
  }
}

async function fetchProximasParcelasFromSheet(): Promise<ProximaParcela[]> {
  try {
    const { url, spreadsheetId } = await getCredentials();
    const data = await safeFetch(
      `${url}?action=getProximasParcelas&spreadsheetId=${encodeURIComponent(spreadsheetId)}`
    );
    return Array.isArray(data.proximas) ? data.proximas : [];
  } catch {
    return [];
  }
}

export async function getProximasParcelasComFallback(): Promise<ProximaParcela[]> {
  const raw = await AsyncStorage.getItem(PROXIMAS_KEY);
  if (raw) return JSON.parse(raw);

  const fromSheet = await fetchProximasParcelasFromSheet();
  if (fromSheet.length > 0) {
    await AsyncStorage.setItem(PROXIMAS_KEY, JSON.stringify(fromSheet));
  }
  return fromSheet;
}

export async function addProximaParcelaAndSync(
  p: Omit<ProximaParcela, "id">
): Promise<ProximaParcela> {
  const raw = await AsyncStorage.getItem(PROXIMAS_KEY);
  const lista: ProximaParcela[] = raw ? JSON.parse(raw) : [];
  const nova: ProximaParcela = { ...p, id: Date.now().toString() };
  lista.unshift(nova);
  await AsyncStorage.setItem(PROXIMAS_KEY, JSON.stringify(lista));
  syncProximasParcelasToSheet(lista);
  return nova;
}

export async function removeProximaParcelaAndSync(nome: string): Promise<void> {
  const raw = await AsyncStorage.getItem(PROXIMAS_KEY);
  const lista: ProximaParcela[] = raw ? JSON.parse(raw) : [];
  const nova = lista.filter((p) => p.nome !== nome);
  await AsyncStorage.setItem(PROXIMAS_KEY, JSON.stringify(nova));
  syncProximasParcelasToSheet(nova);
}
