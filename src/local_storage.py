import json
import os
import uuid
from datetime import datetime

class LocalStorage:
    def __init__(self):
        # Procura o arquivo subindo os diretórios (útil caso o Flet mude o CWD)
        diretorio_atual = os.path.abspath(os.path.dirname(__file__))
        caminho_encontrado = None
        
        # Sobe até 3 níveis procurando o arquivo
        for _ in range(3):
            tentativa = os.path.join(diretorio_atual, "historico_despesas.json")
            if os.path.exists(tentativa):
                caminho_encontrado = tentativa
                break
            diretorio_atual = os.path.dirname(diretorio_atual)
            
        if caminho_encontrado:
            # Modo de desenvolvimento local
            self.caminho = caminho_encontrado
        else:
            # Em produção/mobile, utiliza o sandboxing do sistema operacional
            pasta_dados = os.getenv("FLET_APP_STORAGE_DATA", "")
            if pasta_dados:
                self.caminho = os.path.join(pasta_dados, "historico_despesas.json")
                os.makedirs(pasta_dados, exist_ok=True)
            else:
                self.caminho = "historico_despesas.json"

    def salvar_despesa(self, nome: str, valor: float):
        nova_despesa = {
            "transaction_id": str(uuid.uuid4()),
            "expense_name": nome,
            "amount": valor,
            "timestamp_iso": datetime.now().isoformat(),
            "cloud_synced": False
        }
        
        dados = []
        if os.path.exists(self.caminho):
            with open(self.caminho, 'r', encoding='utf-8') as f:
                try:
                    dados = json.load(f)
                except:
                    dados = []

        dados.append(nova_despesa)
        
        with open(self.caminho, 'w', encoding='utf-8') as f:
            json.dump(dados, f, indent=4)
            
        return nova_despesa

    def obter_historico(self):
        if not os.path.exists(self.caminho):
            return []
        
        try:
            with open(self.caminho, 'r', encoding='utf-8') as f:
                dados = json.load(f)
                # Ordena os dados da data mais recente para a mais antiga
                dados.sort(key=lambda x: x.get("timestamp_iso", ""), reverse=True)
                return dados
        except:
            return []