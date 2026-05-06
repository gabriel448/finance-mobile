import flet as ft

class MainUI:
    def __init__(self, on_add_click):
        # Texto do Saldo Centralizado
        self.txt_saldo = ft.Text(
            value="R$ 0,00",
            size=60,
            color=ft.Colors.GREEN_ACCENT_400,
            weight=ft.FontWeight.BOLD
        )
        
        # Inputs do Modal
        self.input_nome = ft.TextField(label="Nome do Custo")
        self.input_valor = ft.TextField(label="Valor", keyboard_type=ft.KeyboardType.NUMBER)
        
        self.btn_confirmar = ft.ElevatedButton("Adicionar", on_click=on_add_click)

        # --- NOVO: Círculo de loading escondido ---
        self.loading_ring = ft.ProgressRing(width=24, height=24, stroke_width=3, visible=False)

        # --- Ícone de Sucesso Animado ---
        self.icone_sucesso = ft.Icon(
            ft.Icons.CHECK_CIRCLE,
            color=ft.Colors.GREEN_ACCENT_400,
            size=60,
            opacity=0, # Começa 100% invisível
            animate_opacity=150 # 150 milissegundos para o fade-in suave
        )

        # O diálogo agora contém o ícone centralizado
        self.dialogo = ft.AlertDialog(
            title=ft.Text("Novo Gasto"),
            content=ft.Column(
                [self.input_nome, self.input_valor, self.icone_sucesso], 
                tight=True,
                horizontal_alignment=ft.CrossAxisAlignment.CENTER # Centraliza o check
            ),

            # Adicionamos o loading_ring aqui nas actions
            actions=[self.loading_ring, self.btn_confirmar],
            actions_alignment=ft.MainAxisAlignment.END # Mantém tudo alinhado à direita
        )

        # Elementos do Diálogo de Detalhes do Histórico
        self.detalhes_nome = ft.Text(size=20, weight=ft.FontWeight.BOLD)
        self.detalhes_data = ft.Text(size=14, color=ft.Colors.GREY_400)
        self.detalhes_valor = ft.Text(size=24, color=ft.Colors.RED_400, weight=ft.FontWeight.BOLD)
        
        # O botão de fechar não tem on_click aqui, injetaremos no main.py ou passamos por parâmetro
        self.btn_fechar_detalhes = ft.ElevatedButton("Voltar")
        
        self.dialogo_detalhes = ft.AlertDialog(
            title=ft.Text("Detalhes do Gasto"),
            content=ft.Column(
                [self.detalhes_nome, self.detalhes_data, self.detalhes_valor],
                tight=True,
                horizontal_alignment=ft.CrossAxisAlignment.CENTER
            ),
            actions=[self.btn_fechar_detalhes],
            actions_alignment=ft.MainAxisAlignment.END
        )

    def build_layout(self):
        return ft.Column(
            [
                ft.Text("Saldo Disponível", color=ft.Colors.GREY_400),
                self.txt_saldo
            ],
            alignment=ft.MainAxisAlignment.CENTER,
            horizontal_alignment=ft.CrossAxisAlignment.CENTER
        )