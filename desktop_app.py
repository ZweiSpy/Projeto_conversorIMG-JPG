"""
Zwei PixelCompact - Aplicativo Executável Desktop
Zwei Coorporações LTDA | Desenvolvido por Zwei
Executado em janela nativa do Windows via Microsoft WebView2 / PyWebView
Permite salvar as imagens diretamente em qualquer pasta do computador.
"""

import os
import sys
import base64
import threading
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
import webview

# Diretório base (compatível com PyInstaller e execução normal)
if getattr(sys, 'frozen', False):
    BASE_DIR = sys._MEIPASS
else:
    BASE_DIR = os.path.abspath(os.path.dirname(__file__))


class CustomHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=BASE_DIR, **kwargs)

    def log_message(self, format, *args):
        # Silencia logs de requisição no console
        pass


class DesktopAPI:
    """API bidirecional exposta para o JavaScript no frontend."""

    def __init__(self):
        self._window = None

    def set_window(self, window):
        self._window = window

    def is_desktop(self):
        return True

    def select_folder(self):
        """Abre a janela nativa do Windows Explorer para o usuário escolher uma pasta de destino."""
        if not self._window:
            return None
        folder_tuple = self._window.create_file_dialog(webview.FOLDER_DIALOG)
        if folder_tuple and len(folder_tuple) > 0:
            return folder_tuple[0]
        return None

    def is_context_menu_enabled(self):
        """Verifica se a integração com o menu de contexto do Windows Explorer está ativa."""
        try:
            import winreg
            key = winreg.OpenKey(winreg.HKEY_CURRENT_USER, r"Software\Classes\*\shell\ZweiPixelCompact")
            winreg.CloseKey(key)
            return True
        except Exception:
            return False

    def toggle_context_menu(self, enable=True):
        """Adiciona ou remove o Zwei PixelCompact do menu do botão direito do Windows Explorer."""
        try:
            import winreg
            key_path = r"Software\Classes\*\shell\ZweiPixelCompact"
            if enable:
                exe_target = sys.executable if getattr(sys, 'frozen', False) else f'"{sys.executable}" "{os.path.abspath(__file__)}"'
                
                # Cria chave do menu
                with winreg.CreateKey(winreg.HKEY_CURRENT_USER, key_path) as key:
                    winreg.SetValueEx(key, "", 0, winreg.REG_SZ, "Otimizar com Zwei PixelCompact")
                    icon_file = os.path.join(BASE_DIR, "z-icon.ico")
                    if os.path.exists(icon_file):
                        winreg.SetValueEx(key, "Icon", 0, winreg.REG_SZ, icon_file)

                # Cria comando
                with winreg.CreateKey(winreg.HKEY_CURRENT_USER, key_path + r"\command") as cmd_key:
                    if getattr(sys, 'frozen', False):
                        winreg.SetValueEx(cmd_key, "", 0, winreg.REG_SZ, f'"{sys.executable}" "%1"')
                    else:
                        winreg.SetValueEx(cmd_key, "", 0, winreg.REG_SZ, f'"{sys.executable}" "{os.path.abspath(__file__)}" "%1"')

                return {"success": True, "enabled": True}
            else:
                # Remove chaves
                try:
                    winreg.DeleteKey(winreg.HKEY_CURRENT_USER, key_path + r"\command")
                except Exception:
                    pass
                try:
                    winreg.DeleteKey(winreg.HKEY_CURRENT_USER, key_path)
                except Exception:
                    pass
                return {"success": True, "enabled": False}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def send_native_notification(self, title, message):
        """Envia uma notificação nativa do Windows via PowerShell Toast."""
        def _notify():
            try:
                ps_script = f"""
                [Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] > $null
                $template = [Windows.UI.Notifications.ToastNotificationManager]::GetTemplateContent([Windows.UI.Notifications.ToastTemplateType]::ToastText02)
                $textNodes = $template.GetElementsByTagName("text")
                $textNodes.Item(0).AppendChild($template.CreateTextNode("{title}")) > $null
                $textNodes.Item(1).AppendChild($template.CreateTextNode("{message}")) > $null
                $toast = [Windows.UI.Notifications.ToastNotification]::new($template)
                [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier("Zwei PixelCompact").Show($toast)
                """
                import subprocess
                subprocess.run(["powershell", "-NoProfile", "-WindowStyle", "Hidden", "-Command", ps_script], 
                               stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=4)
            except Exception:
                pass
        threading.Thread(target=_notify, daemon=True).start()
        return {"success": True}

    def get_initial_files(self):
        """Retorna arquivos passados por linha de comando (ex: via menu de contexto)."""
        files = []
        for arg in sys.argv[1:]:
            if os.path.isfile(arg):
                try:
                    with open(arg, "rb") as f:
                        b64 = base64.b64encode(f.read()).decode("utf-8")
                        files.append({
                            "name": os.path.basename(arg),
                            "base64": b64
                        })
                except Exception:
                    pass
        return files

    def save_all_files(self, files_payload, target_dir):
        """Salva a lista de imagens convertidas diretamente na pasta escolhida no computador."""
        if not target_dir or not os.path.exists(target_dir):
            return {"success": False, "error": "A pasta selecionada não existe ou é inválida."}

        saved_count = 0
        try:
            for item in files_payload:
                filename = item.get("filename")
                b64_data = item.get("base64")
                if not filename or not b64_data:
                    continue

                # Higienização de nome de arquivo
                clean_name = "".join(c for c in filename if c.isalnum() or c in "._- ()[]")
                if not ("." in clean_name and len(clean_name.split(".")[-1]) in [3, 4]):
                    clean_name += ".jpg"

                filepath = os.path.join(target_dir, clean_name)
                file_bytes = base64.b64decode(b64_data)

                with open(filepath, "wb") as f:
                    f.write(file_bytes)
                saved_count += 1

            # Abre a pasta automaticamente no Windows Explorer para conveniência do usuário
            try:
                os.startfile(target_dir)
            except Exception:
                pass

            return {"success": True, "count": saved_count, "path": target_dir}

        except Exception as e:
            return {"success": False, "error": str(e)}


def start_server():
    server = ThreadingHTTPServer(("127.0.0.1", 0), CustomHandler)
    port = server.server_address[1]
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    return port, server


def main():
    port, server = start_server()
    api = DesktopAPI()

    icon_path = os.path.join(BASE_DIR, "z-icon.ico")
    if not os.path.exists(icon_path):
        icon_path = os.path.join(BASE_DIR, "icon.ico")
    if not os.path.exists(icon_path):
        icon_path = None

    window = webview.create_window(
        title="Zwei PixelCompact | Conversor de Imagens para JPG Web",
        url=f"http://127.0.0.1:{port}",
        js_api=api,
        width=1240,
        height=860,
        min_size=(920, 680),
        background_color="#07090e"
    )

    api.set_window(window)
    webview.start(debug=False)


if __name__ == "__main__":
    main()
