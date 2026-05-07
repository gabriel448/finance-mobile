import AsyncStorage from "@react-native-async-storage/async-storage";

const KEYS = {
  ACCESS_TOKEN:  "gauth_access_token",
  EXPIRES_AT:    "gauth_expires_at",
  USER_NAME:     "gauth_user_name",
  USER_EMAIL:    "gauth_user_email",
  USER_PHOTO:    "gauth_user_photo",
  SHEET_CONFIG:  "sheet_config",
};

// ── Token ──────────────────────────────────────────────────────────────────

export async function saveAuthData(
  accessToken: string,
  expiresIn: number,
  userInfo?: { name?: string; email?: string; picture?: string }
) {
  const expiresAt = Date.now() + expiresIn * 1000;
  const pairs: [string, string][] = [
    [KEYS.ACCESS_TOKEN, accessToken],
    [KEYS.EXPIRES_AT,   String(expiresAt)],
  ];
  if (userInfo?.name)    pairs.push([KEYS.USER_NAME,  userInfo.name]);
  if (userInfo?.email)   pairs.push([KEYS.USER_EMAIL, userInfo.email]);
  if (userInfo?.picture) pairs.push([KEYS.USER_PHOTO, userInfo.picture]);
  await AsyncStorage.multiSet(pairs);
}

export async function getValidToken(): Promise<string | null> {
  const [[, token], [, expiresAt]] = await AsyncStorage.multiGet([
    KEYS.ACCESS_TOKEN,
    KEYS.EXPIRES_AT,
  ]);
  if (!token || !expiresAt) return null;
  if (Date.now() > parseInt(expiresAt) - 60_000) return null; // 1 min de margem
  return token;
}

export async function getUserInfo() {
  const [[, name], [, email], [, photo]] = await AsyncStorage.multiGet([
    KEYS.USER_NAME,
    KEYS.USER_EMAIL,
    KEYS.USER_PHOTO,
  ]);
  return { name, email, photo };
}

// ── Configuração da planilha ────────────────────────────────────────────────

export interface SheetConfig {
  spreadsheetId: string;
  spreadsheetName: string;
  cellSaldo: string;   // ex: "F9"
  cellGasto: string;   // ex: "I8"
}

export async function saveSheetConfig(config: SheetConfig) {
  await AsyncStorage.setItem(KEYS.SHEET_CONFIG, JSON.stringify(config));
}

export async function getSheetConfig(): Promise<SheetConfig | null> {
  const raw = await AsyncStorage.getItem(KEYS.SHEET_CONFIG);
  if (!raw) return null;
  return JSON.parse(raw) as SheetConfig;
}

// ── Sign out ───────────────────────────────────────────────────────────────

export async function signOut() {
  await AsyncStorage.multiRemove(Object.values(KEYS));
}

// ── Histórico de despesas ──────────────────────────────────────────────────

export interface Despesa {
  id: string;
  nome: string;
  valor: number;
  data: string; // ISO
}

const HIST_KEY = "historico_despesas";

export async function addDespesa(despesa: Omit<Despesa, "id">) {
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

export async function clearDespesas() {
  await AsyncStorage.removeItem(HIST_KEY);
}

// ── Datas de Parcelas ──────────────────────────────────────────────────────

export interface InstallmentMetadata {
  nome: string;
  data: string; // ISO
}

const HIST_PARCELAS_KEY = "historico_parcelas";

export async function addInstallmentMetadata(nome: string, data: string) {
  const raw = await AsyncStorage.getItem(HIST_PARCELAS_KEY);
  const lista: InstallmentMetadata[] = raw ? JSON.parse(raw) : [];
  // Remove o existente se houver para não duplicar, atualizando a data
  const filtrada = lista.filter(d => d.nome !== nome);
  filtrada.push({ nome, data });
  await AsyncStorage.setItem(HIST_PARCELAS_KEY, JSON.stringify(filtrada));
}

export async function getInstallmentMetadata(nome: string): Promise<string | null> {
  const raw = await AsyncStorage.getItem(HIST_PARCELAS_KEY);
  if (!raw) return null;
  const lista: InstallmentMetadata[] = JSON.parse(raw);
  const found = lista.find(d => d.nome === nome);
  return found ? found.data : null;
}
