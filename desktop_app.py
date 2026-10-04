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
                if not clean_name.lower().endswith(".jpg"):
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
