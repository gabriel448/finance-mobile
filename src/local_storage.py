import json
import os
import uuid
from datetime import datetime

class LocalStorage:
    def __init__(self):
        # Utiliza o sandboxing seguro do Android/iOS
        self.caminho = os.getenv("FLET_APP_STORAGE_DATA", "historico_despesas.json")
        if not self.caminho.endswith(".json"):
            self.caminho = os.path.join(self.caminho, "historico_despesas.json")

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