import sys

import flet as ft
from ui_components import MainUI
from sheets_api import SheetsService
from local_storage import LocalStorage
import asyncio
from datetime import datetime





async def main(page: ft.Page):
    page.theme_mode = ft.ThemeMode.DARK
    page.horizontal_alignment = ft.CrossAxisAlignment.CENTER
    page.vertical_alignment = ft.MainAxisAlignment.CENTER

    # Inicializa serviços
    sheets = SheetsService()
    storage = LocalStorage()

    async def processar_novo_gasto(e):
        ui.btn_confirmar.visible = False
        ui.loading_ring.visible = True
        ui.input_nome.disabled = True
        ui.input_valor.disabled = True
        page.update()

        nome = ui.input_nome.value
        valor = float(ui.input_valor.value.replace(',', '.'))
        
        # 1. Salva local primeiro (Tolerância a falhas)
        
        
        # 2. Sincroniza nuvem
        novo_saldo = await sheets.atualizar_saldo_nuvem(valor)

        if novo_saldo:
            storage.salvar_despesa(nome, valor)

        ui.icone_sucesso.opacity = 1
        
        page.update()

        await asyncio.sleep(1)
        # 3. Atualiza UI
        ui.txt_saldo.value = f"R$ {novo_saldo:.2f}"
        ui.icone_sucesso.opacity = 0 # Reseta o ícone de volta para invisível
        
        ui.btn_confirmar.visible = True
        ui.loading_ring.visible = False
        ui.input_nome.disabled = False
        ui.input_valor.disabled = False

        ui.dialogo.open = False
        page.snack_bar = ft.SnackBar(ft.Text("Sincronizado!"))
        page.snack_bar.open = True
        page.update()
        page.update()


    # Injeta a função de processamento na UI
    ui = MainUI(on_add_click=processar_novo_gasto)

    def abrir_modal(e):
        # Limpa os campos de texto antes de exibir a janela na tela
        ui.input_nome.value = ""
        ui.input_valor.value = ""

        ui.icone_sucesso.opacity = 0

        page.dialog = ui.dialogo
        ui.dialogo.open = True
        page.update()

    # --- Lógica do Histórico ---
    def fechar_detalhes(e):
        ui.dialogo_detalhes.open = False
        page.update()

    ui.btn_fechar_detalhes.on_click = fechar_detalhes

    def abrir_detalhes(item):
        ui.detalhes_nome.value = item.get("expense_name", "Desconhecido")
        
        raw_date = item.get("timestamp_iso", "")
        formatted_date = ""
        if raw_date:
            try:
                dt = datetime.fromisoformat(raw_date)
                formatted_date = dt.strftime("%d/%m/%y")
            except:
                pass
        
        ui.detalhes_data.value = formatted_date
        ui.detalhes_valor.value = f"R$ {item.get('amount', 0.0):.2f}"
        
        page.dialog = ui.dialogo_detalhes
        ui.dialogo_detalhes.open = True
        page.update()

    def criar_linha_historico(item):
        raw_date = item.get("timestamp_iso", "")
        formatted_date = ""
        if raw_date:
            try:
                dt = datetime.fromisoformat(raw_date)
                formatted_date = dt.strftime("%d/%m/%y")
            except:
                pass

        return ft.Container(
            content=ft.Row(
                [
                    ft.Text(formatted_date, width=80),
                    ft.Text(item.get("expense_name", ""), expand=1, text_align=ft.TextAlign.CENTER),
                    ft.Text(f"R$ {item.get('amount', 0.0):.2f}", color=ft.Colors.RED_400, width=80, text_align=ft.TextAlign.RIGHT)
                ],
                alignment=ft.MainAxisAlignment.SPACE_BETWEEN
            ),
            padding=15,
            ink=True,
            on_click=lambda e, i=item: abrir_detalhes(i)
        )

    coluna_historico = ft.Column(scroll=ft.ScrollMode.AUTO, expand=True)

    drawer = ft.NavigationDrawer(
        controls=[
            ft.Container(height=20),
            ft.Text("Histórico de Gastos", size=20, weight=ft.FontWeight.BOLD, text_align=ft.TextAlign.CENTER),
            ft.Divider(thickness=2),
            coluna_historico
        ]
    )
    page.drawer = drawer

    async def abrir_drawer(e):
        # Recarrega a lista toda vez que o menu abre
        itens = storage.obter_historico()
        coluna_historico.controls.clear()
        for i in itens:
            coluna_historico.controls.append(criar_linha_historico(i))
        await page.show_drawer()
        page.update()

    page.appbar = ft.AppBar(
        leading=ft.IconButton(ft.Icons.MENU, on_click=abrir_drawer),
        title=ft.Text("Finanças"),
        center_title=True,
        bgcolor=ft.Colors.SURFACE_CONTAINER_HIGHEST
    )
    # --------------------------

    async def atualizar_saldo(e=None):
        page.update()
        
        try:
            # 3. Vai até a nuvem buscar o saldo real
            saldo = await sheets.obter_saldo_atual()
            
            # 4. Atualiza os dados
            ui.txt_saldo.value = f"R$ {saldo:.2f}"
            ui.txt_saldo.color = ft.Colors.GREEN_ACCENT_400
            ui.txt_saldo.size = 60
            
        except Exception as ex:
            ui.txt_saldo.value = "Offline"
            ui.txt_saldo.color = ft.Colors.RED_400
            ui.txt_saldo.size = 50
            page.snack_bar = ft.SnackBar(ft.Text("Sem conexão. Mostrando último estado local."))
            page.snack_bar.open = True
            
        page.update()
    
    botoes_acao = ft.Row(
        controls=[
            ft.FloatingActionButton(
                icon=ft.Icons.REFRESH, 
                on_click=atualizar_saldo, # Aciona a requisição manualmente
                bgcolor=ft.Colors.BLUE_700
            ),
            ft.FloatingActionButton(
                icon=ft.Icons.ADD, 
                on_click=abrir_modal, 
                bgcolor=ft.Colors.GREEN_700
            )
        ],
        alignment=ft.MainAxisAlignment.CENTER, # Deixa os botões no meio da tela
        spacing=30 # Dá um respiro de espaço entre eles
    )

    page.add(
        ui.build_layout(),
        botoes_acao
    )
    page.update()
    page.overlay.append(ui.dialogo)
    page.update()
    # Executa a função assíncrona em segundo plano sem travar a UI
    page.run_task(atualizar_saldo)
if __name__ == "__main__":
    ft.run(main, assets_dir="assets")