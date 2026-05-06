// Google Sheets API v4 — chamadas diretas com access_token OAuth

const BASE = "https://sheets.googleapis.com/v4/spreadsheets";

async function sheetsRequest(
  token: string,
  path: string,
  options?: RequestInit
): Promise<any> {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(options?.headers ?? {}),
    },
  });
  const data = await res.json();
  if (!res.ok) {
    const msg = data?.error?.message ?? `Erro HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

// ── Lê o valor de uma célula ───────────────────────────────────────────────

export async function readCell(
  token: string,
  spreadsheetId: string,
  cell: string // ex: "F9" ou "Sheet1!F9"
): Promise<string> {
  const data = await sheetsRequest(
    token,
    `/${spreadsheetId}/values/${encodeURIComponent(cell)}`
  );
  return data.values?.[0]?.[0] ?? "0";
}

// ── Sobrescreve o valor de uma célula ─────────────────────────────────────

export async function writeCell(
  token: string,
  spreadsheetId: string,
  cell: string,
  value: number
): Promise<void> {
  await sheetsRequest(
    token,
    `/${spreadsheetId}/values/${encodeURIComponent(cell)}?valueInputOption=USER_ENTERED`,
    {
      method: "PUT",
      body: JSON.stringify({ values: [[value]] }),
    }
  );
}

// ── getSaldo ───────────────────────────────────────────────────────────────

export async function getSaldo(
  token: string,
  spreadsheetId: string,
  cellSaldo: string
): Promise<number> {
  const raw = await readCell(token, spreadsheetId, cellSaldo);
  const valor = parseFloat(String(raw).replace(",", "."));
  if (isNaN(valor)) throw new Error(`Valor inválido na célula ${cellSaldo}: "${raw}"`);
  return valor;
}

// ── addExpense ─────────────────────────────────────────────────────────────
// Lê o gasto atual, soma o novo valor, escreve de volta,
// depois lê o saldo atualizado (calculado pela fórmula da planilha).

export async function addExpense(
  token: string,
  spreadsheetId: string,
  cellGasto: string,
  cellSaldo: string,
  novoGasto: number
): Promise<number> {
  // 1. Lê gasto atual
  const rawGasto = await readCell(token, spreadsheetId, cellGasto);
  const gastoAtual = parseFloat(String(rawGasto).replace(",", ".")) || 0;

  // 2. Escreve novo total de gastos
  await writeCell(token, spreadsheetId, cellGasto, gastoAtual + novoGasto);

  // 3. Aguarda recálculo e lê saldo
  await new Promise((r) => setTimeout(r, 1200));
  return await getSaldo(token, spreadsheetId, cellSaldo);
}

// ── Busca nome da planilha pelo ID ─────────────────────────────────────────

export async function getSpreadsheetName(
  token: string,
  spreadsheetId: string
): Promise<string> {
  const data = await sheetsRequest(token, `/${spreadsheetId}?fields=properties.title`);
  return data.properties?.title ?? spreadsheetId;
}

// ── Extrai spreadsheetId de uma URL do Google Sheets ──────────────────────

export function extractSpreadsheetId(urlOrId: string): string | null {
  // URL completa: https://docs.google.com/spreadsheets/d/ID/edit
  const match = urlOrId.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  if (match) return match[1];
  // Pode ser já o ID direto (44 chars alfanum)
  if (/^[a-zA-Z0-9_-]{20,}$/.test(urlOrId.trim())) return urlOrId.trim();
  return null;
}
