"""
Script de Compilação: Gera o executável autônomo PixelCompact.exe via PyInstaller
"""

import subprocess
import sys
import os

def build():
    print("Iniciando compilação do executável ZweiPixelCompact.exe...")

    cmd = [
        sys.executable, "-m", "PyInstaller",
        "--noconsole",
        "--onefile",
        "--clean",
        "--name=ZweiPixelCompact",
        "--icon=z-icon.ico",
        "--add-data=index.html;.",
        "--add-data=style.css;.",
        "--add-data=app.js;.",
        "--add-data=worker_converter.js;.",
        "--add-data=vendor;vendor",
        "--add-data=Z-logo.png;.",
        "--add-data=z-icon.ico;.",
        "desktop_app.py"
    ]

    print("Executando comando:", " ".join(cmd))
    result = subprocess.run(cmd)

    if result.returncode == 0:
        exe_path = os.path.abspath(os.path.join("dist", "ZweiPixelCompact.exe"))
        print("\n" + "=" * 60)
        print("COMPILAÇÃO CONCLUÍDA COM SUCESSO!")
        print(f"Executável gerado em: {exe_path}")
        if os.path.exists(exe_path):
            size_mb = os.path.getsize(exe_path) / (1024 * 1024)
            print(f"Tamanho do arquivo: {size_mb:.2f} MB")
        print("=" * 60)
    else:
        print("Falha na compilação do executável. Código:", result.returncode)
        sys.exit(result.returncode)

if __name__ == "__main__":
    build()
