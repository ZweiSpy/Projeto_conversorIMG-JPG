"""
Testes Automatizados do Backend Desktop - Zwei PixelCompact
Zwei Coorporações LTDA | Desenvolvido por Zwei (Tech Lead & PO)
Valida todas as funções desktop: Registro do Windows, Notificações, Gravação de Arquivos e Argumentos CLI.
"""

import os
import sys
import tempfile
import base64
import unittest

# Adiciona diretório raiz ao path
ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, ROOT_DIR)

from desktop_app import DesktopAPI


class TestDesktopBackend(unittest.TestCase):
    def setUp(self):
        self.api = DesktopAPI()
        self.temp_dir = tempfile.mkdtemp(prefix="zwei_test_")

    def tearDown(self):
        import shutil
        if os.path.exists(self.temp_dir):
            shutil.rmtree(self.temp_dir, ignore_errors=True)

    def test_01_is_desktop(self):
        """Verifica se a flag is_desktop retorna True"""
        self.assertTrue(self.api.is_desktop())

    def test_02_context_menu_toggle(self):
        """Testa ativação e desativação do menu de contexto do Windows Explorer via winreg"""
        # Ativação
        res_enable = self.api.toggle_context_menu(True)
        self.assertTrue(res_enable.get("success"), f"Falha ao ativar: {res_enable}")
        self.assertTrue(self.api.is_context_menu_enabled(), "Menu deveria estar ativado no registro HKCU")

        # Desativação
        res_disable = self.api.toggle_context_menu(False)
        self.assertTrue(res_disable.get("success"), f"Falha ao desativar: {res_disable}")
        self.assertFalse(self.api.is_context_menu_enabled(), "Menu deveria ter sido removido do registro HKCU")

    def test_03_save_all_files_jpg_and_webp(self):
        """Testa gravação direta de imagens JPG e WebP na pasta local do Windows"""
        # Gera pixels fictícios
        fake_jpg_bytes = b"\xff\xd8\xff\xe0" + b"\x00" * 100 + b"\xff\xd9"
        fake_webp_bytes = b"RIFF" + b"\x00" * 20 + b"WEBPVP8 "

        b64_jpg = base64.b64encode(fake_jpg_bytes).decode("utf-8")
        b64_webp = base64.b64encode(fake_webp_bytes).decode("utf-8")

        payload = [
            {"filename": "foto_ferias_compact.jpg", "base64": b64_jpg},
            {"filename": "foto_ferias_compact.webp", "base64": b64_webp}
        ]

        res = self.api.save_all_files(payload, self.temp_dir)
        self.assertTrue(res.get("success"), f"Erro ao salvar: {res}")
        self.assertEqual(res.get("count"), 2)

        file_jpg = os.path.join(self.temp_dir, "foto_ferias_compact.jpg")
        file_webp = os.path.join(self.temp_dir, "foto_ferias_compact.webp")

        self.assertTrue(os.path.exists(file_jpg), "Arquivo JPG deve existir no disco")
        self.assertTrue(os.path.exists(file_webp), "Arquivo WEBP deve existir no disco")
        self.assertEqual(os.path.getsize(file_jpg), len(fake_jpg_bytes))
        self.assertEqual(os.path.getsize(file_webp), len(fake_webp_bytes))

    def test_04_save_all_files_invalid_dir(self):
        """Testa comportamento seguro contra diretório inválido"""
        res = self.api.save_all_files([], "C:\\Diretorio_Inexistente_Zwei_9999")
        self.assertFalse(res.get("success"))
        self.assertIn("inválida", res.get("error").lower())

    def test_05_send_native_notification(self):
        """Testa disparo assíncrono de notificação nativa do Windows sem lançar exceções"""
        res = self.api.send_native_notification("Zwei PixelCompact Teste", "Lote de fotos concluído com sucesso!")
        self.assertTrue(res.get("success"))

    def test_06_get_initial_files(self):
        """Testa captura de arquivos passados por argumento CLI"""
        test_file = os.path.join(self.temp_dir, "teste_cli.jpg")
        with open(test_file, "wb") as f:
            f.write(b"SAMPLE DATA")

        orig_argv = sys.argv[:]
        try:
            sys.argv = ["desktop_app.py", test_file]
            files = self.api.get_initial_files()
            self.assertEqual(len(files), 1)
            self.assertEqual(files[0]["name"], "teste_cli.jpg")
            decoded = base64.b64decode(files[0]["base64"])
            self.assertEqual(decoded, b"SAMPLE DATA")
        finally:
            sys.argv = orig_argv

    def test_07_get_system_info(self):
        """Testa retorno das especificações de hardware (CPU count e plataforma)"""
        info = self.api.get_system_info()
        self.assertIsInstance(info, dict)
        self.assertIn("cpu_count", info)
        self.assertGreaterEqual(info["cpu_count"], 1)
        self.assertIn("platform", info)


if __name__ == "__main__":
    unittest.main()
