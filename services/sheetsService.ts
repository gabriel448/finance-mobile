import AsyncStorage from "@react-native-async-storage/async-storage";

const APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbzaC0okJtVO3idhGHdPEE0hP4-zIjqtLq6uAH5aMyLpTY_oUx1EOwP6BgUbOB_tsv9r/exec";

// ── Configuração das células ───────────────────────────────────────────────

export interface CellConfig {
  cellSaldo: string; // ex: "F9"
  cellGasto: string; // ex: "I8"
}

const CONFIG_KEY = "cell_config";

export async function saveCellConfig(config: CellConfig) {
  await AsyncStorage.setItem(CONFIG_KEY, JSON.stringify(config));
}

export async function getCellConfig(): Promise<CellConfig | null> {
  const raw = await AsyncStorage.getItem(CONFIG_KEY);
  return raw ? JSON.parse(raw) : null;
}

// ── Chamadas ao Apps Script ────────────────────────────────────────────────

async function safeFetch(url: string, options?: RequestInit): Promise<any> {
  const res = await fetch(url, { redirect: "follow", ...options });
  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    throw new Error(
      "O Apps Script não respondeu com JSON.\n" +
      "Verifique se está implantado como 'Qualquer pessoa pode acessar'."
    );
  }
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data;
}

export async function getSaldo(cellSaldo: string): Promise<number> {
  const data = await safeFetch(
    `${APPS_SCRIPT_URL}?action=getSaldo&cellSaldo=${encodeURIComponent(cellSaldo)}`
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
  const data = await safeFetch(APPS_SCRIPT_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "addExpense", nome, valor, cellGasto, cellSaldo }),
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
  const data = await safeFetch(APPS_SCRIPT_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "subtractExpense", valor, cellGasto, cellSaldo }),
  });
  const novoSaldo = parseFloat(String(data.novoSaldo).replace(",", "."));
  if (isNaN(novoSaldo)) throw new Error(`Saldo inválido recebido: "${data.novoSaldo}"`);
  return novoSaldo;
}

// ── Histórico local ────────────────────────────────────────────────────────

export interface Despesa {
  id: string;
  nome: string;
  valor: number;
  data: string;
}

const HIST_KEY = "historico_despesas";

export async function addDespesa(despesa: Omit<Despesa, "id">): Promise<Despesa> {
  const raw = await AsyncStorage.getItem(HIST_KEY);
  const lista: Despesa[] = raw ? JSON.parse(raw) : [];
  const nova: Despesa = { ...despesa, id: Date.now().toString() };
  lista.unshift(nova);
  await AsyncStorage.setItem(HIST_KEY, JSON.stringify(lista));
  return nova;
}

export async function getDespesas(): Promise<Despesa[]> {
  const raw = await AsyncStorage.getItem(HIST_KEY);
  return raw ? JSON.parse(raw) : [];
}

export async function removeDespesa(id: string): Promise<void> {
  const raw = await AsyncStorage.getItem(HIST_KEY);
  const lista: Despesa[] = raw ? JSON.parse(raw) : [];
  const nova = lista.filter((d) => d.id !== id);
  await AsyncStorage.setItem(HIST_KEY, JSON.stringify(nova));
}

export async function clearDespesas(): Promise<void> {
  await AsyncStorage.removeItem(HIST_KEY);
}
