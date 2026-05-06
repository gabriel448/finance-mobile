const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzMsAsMFjc_7XXbQzspffBnEwK9ISg04dGUtF5JI_0PtfWABRZLXkiw9e5-QYyz7ipb/exec";

async function safeFetch(url: string, options?: RequestInit): Promise<any> {
  const response = await fetch(url, { redirect: "follow", ...options });

  const contentType = response.headers.get("content-type") || "";

  if (!contentType.includes("application/json")) {
    // Provavelmente redirecionou para a página de login do Google
    throw new Error(
      "O Apps Script não está acessível publicamente.\n\n" +
      "Acesse script.google.com → Implantar → Gerenciar implantações\n" +
      "→ Editar → 'Quem pode acessar': Qualquer pessoa → Reimplantar."
    );
  }

  if (!response.ok) throw new Error(`Erro HTTP ${response.status}`);

  return response.json();
}

export async function getSaldo(): Promise<number> {
  const data = await safeFetch(`${APPS_SCRIPT_URL}?action=getSaldo`);
  if (data.error) throw new Error(data.error);
  const valor = parseFloat(data.saldo);
  if (isNaN(valor)) throw new Error(`Valor inválido recebido: "${data.saldo}"`);
  return valor;
}

export async function addExpense(nome: string, valor: number): Promise<number> {
  const data = await safeFetch(APPS_SCRIPT_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "addExpense", nome, valor }),
  });
  if (data.error) throw new Error(data.error);
  const novoSaldo = parseFloat(data.novoSaldo);
  if (isNaN(novoSaldo)) throw new Error(`Saldo inválido recebido: "${data.novoSaldo}"`);
  return novoSaldo;
}
