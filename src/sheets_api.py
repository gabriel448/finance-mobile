import gspread
import asyncio

# Configurações fixas
CREDENTIALS_FILE = "src/assets/fincance-tracker-mobile-1f24d2daaf4a.json"
SHEET_NAME = "Controle-financeiro"

class SheetsService:
    def __init__(self):
        self.gc = gspread.service_account(filename=CREDENTIALS_FILE)
        self.aba = self.gc.open(SHEET_NAME).get_worksheet(0)

    async def atualizar_saldo_nuvem(self, valor_despesa: float):
        # Busca o valor bruto para evitar erros de formatação (ValueRenderOption.unformatted)
        valor_atual = self.aba.acell('I8').value
        if not valor_atual:
            valor_atual = 0.0
        else:
            valor_atual = float(str(valor_atual).replace(',', '.'))
        
        valor_custo = valor_atual + valor_despesa
        self.aba.update_acell('I8', valor_custo)
        
        # Suspensão assíncrona para aguardar o recálculo do Google Sheets
        await asyncio.sleep(1) 
        
        novo_saldo = self.aba.acell('F9').value
        novo_saldo_formatado = float(str(novo_saldo).replace(',', '.'))
        return novo_saldo_formatado

    async def obter_saldo_atual(self):
        # Lê a célula F9 que contém o saldo consolidado
        saldo = self.aba.acell('F9').value
        if not saldo:
            return 0.0
        
        # Formata o texto que vem da nuvem para float
        return float(str(saldo).replace(',', '.'))