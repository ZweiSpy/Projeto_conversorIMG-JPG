# Plano de Projeto (Plan.md)
## Zwei PixelCompact | Conversor de Imagens para JPG Compacto Web

---

## 1. Visão Geral e Contexto

O **Zwei PixelCompact** é uma aplicação corporativa e pessoal de alta performance, desenvolvida por **Zwei** para a **Zwei Coorporações LTDA**, focada em máxima velocidade, privacidade absoluta e facilidade de uso. Projetada para converter imagens em múltiplos formatos (`PNG`, `HEIC/HEIF` de smartphones Apple, `BMP`, `WEBP`, `TIFF`, etc.) em arquivos **JPG/JPEG ultra-otimizados e compactos para a web**.

Todo o processamento é executado **100% no dispositivo (Client-Side / Local)**, garantindo que nenhuma imagem seja enviada para servidores de terceiros ou nuvem, eliminando custos de infraestrutura e assegurando total sigilo aos usuários.

---

## 2. Estrutura de Liderança e Papéis

- **Tech Lead, Desenvolvedor Principal & Product Owner (PO):** **Zwei** (Direção técnica, validação de escopo, aprovação de releases e decisões de negócio).
- **Senior Software Engineer / Solutions Architect (Agent Antigravity):** Arquitetura técnica, pipeline de dados de imagem, ciclo de vida de memória, concorrência e conformidade client-side.
- **Senior Frontend Developer (Agent Antigravity):** Implementação semântica, Canvas API, File/Blob APIs, integração de decodificadores e empacotamento ZIP.
- **Senior UI/UX Designer (Agent Antigravity):** Design system corporativo moderno (dark mode glassmorphism com a identidade visual Zwei), micro-interações, acessibilidade e experiência fluida.
- **Senior QA & Security Engineer (Agent Antigravity):** Validação de integridade, testes de formatos de borda, resiliência de memória e prevenção de falhas.

---

## 3. Matriz de Escopo

### 3.1. O que VAMOS Fazer (No Escopo)
- [x] **Formatos de Entrada Suportados:**
  - `PNG` (Portable Network Graphics - com flattening de transparência sobre fundo branco configurável)
  - `HEIC / HEIF` (High Efficiency Image Container do ecossistema iOS/macOS)
  - `BMP` (Bitmap tradicional do Windows)
  - `WEBP` (Formato moderno WebP)
  - `TIFF / TIF` (Tagged Image File Format)
  - `JPG / JPEG` (Para recompressão e otimização para web)
- [x] **Formato de Saída Exclusivo:**
  - `JPG` compacto, otimizado para web com subamostragem cromática e qualidade ajustável (presets: Ultra Compact ~70%, Equilibrado ~82%, Alta Qualidade ~92%).
- [x] **Processamento 100% Client-Side:**
  - Nenhuma imagem trafega pela rede ou servidores.
- [x] **Processamento em Lote (Batch):**
  - Arrastar e soltar múltiplas imagens simultâneas.
  - Fila de conversão controlada para evitar consumo excessivo de memória.
- [x] **Exportação Flexível:**
  - Download individual de cada JPG gerado.
  - Download em lote agrupado em um único arquivo `.ZIP`.
- [x] **Feedback Visual & Métricas:**
  - Comparativo de tamanho antes vs. depois com percentual de economia (ex: `2.8 MB → 410 KB (-85%)`).
  - Pré-visualização lado a lado ou modal interativo.

### 3.2. O que NÃO VAMOS Fazer (Estritamente Fora de Escopo)
- [ ] **Conversão de Vídeos:** Proibida conversão ou suporte a arquivos de vídeo (`.mp4`, `.mov`, `.avi`, `.mkv`, etc.).
- [ ] **Conversão de GIFs Animados:** Não converter GIFs animados (para evitar perda de frames ou comportamento indefinido em JPG estático).
- [ ] **Extensões Inexistentes / Falsas:** Rejeição estrita a extensões forjadas ou não padronizadas. Validação por assinatura de arquivo (Magic Bytes / MIME).
- [ ] **Envio para Servidor / Cloud:** Sem backend em nuvem, sem bancos de dados, sem autenticação/login de usuários.
- [ ] **Edição Complexa de Fotos:** Sem ferramentas manuais de pintura, filtros artísticos instagramáveis ou distorção de imagem.
- [ ] **Conversão de Documentos:** Não converter PDFs, DOCX ou outros formatos textuais.

---

## 4. Fases de Execução e Roadmap Técnico

```mermaid
gantt
    title Roadmap do Projeto: Conversor de Imagens para JPG
    dateFormat  YYYY-MM-DD
    section Fase 1: Arquitetura
    Documentação e Padrões (Plan, Agents, README, SDD) :done, des1, 2026-10-03, 1d
    section Fase 2: UI/UX & Design System
    Estrutura HTML5 Semântica e Tokens CSS              :active, des2, 2026-10-04, 1d
    Dropzone Moderno, Micro-interações e Responsividade :des3, after des2, 1d
    section Fase 3: Motor de Decodificação
    Pipeline Canvas & Decoders Nativos (PNG/BMP/WEBP)   :des4, after des3, 1d
    Decodificador Assíncrono HEIC/HEIF                  :des5, after des4, 1d
    Fila de Processamento Concorrente Limitada          :des6, after des5, 1d
    section Fase 4: Otimização & Exportação
    Algoritmo de Compressão JPEG Web & EXIF Strip       :des7, after des6, 1d
    Exportação Individual e Empacotamento ZIP           :des8, after des7, 1d
    section Fase 5: QA & Validação
    Stress Testing de Memória & Edge Cases              :des9, after des8, 1d
    Aprovação do Tech Lead / PO & Entrega Final         :des10, after des9, 1d
```

### Fase 1: Arquitetura, Governança e Documentação (Status: Concluída)
- Definição do escopo e exclusões.
- Criação dos arquivos mestres: `Plan.md`, `Agents.md`, `readme.md`, `sdd.md`.
- Alinhamento de governança com o Tech Lead & PO.

### Fase 2: Design System e Interface Web (UI/UX)
- Implementação de um layout moderno com tema escuro elegante (Dark Glassmorphism).
- Criação de uma Dropzone interativa com estados dinâmicos (dragover, drop, processing).
- Controles de configuração de saída:
  - Slider de qualidade (60% a 95%).
  - Presets rápidos: "Máxima Economia Web", "Equilibrado (Recomendado)", "Alta Fidelidade".
  - Opção de redimensionamento proporcional de largura máxima (ex: Original, 1920px Full HD, 1280px HD).
- Lista de arquivos em fila com indicador individual de status (Pendente, Convertendo, Concluído, Erro).

### Fase 3: Motor de Processamento & Decodificadores
- Módulo de validação de arquivos por extensão e MIME type com bloqueio imediato de vídeos e GIFs.
- Pipeline de decodificação:
  - Formatos nativos (PNG, BMP, WEBP) via `createImageBitmap` e Canvas 2D.
  - Suporte completo a HEIC/HEIF via integração de biblioteca Wasm (`heic2any`).
- Tratamento de transparência alfa (PNG/WEBP): composição automática sobre fundo branco padrão para evitar fundos pretos no JPG.
- Implementação de fila assíncrona (concorrência máxima de 2 conversões em paralelo para poupar memória do navegador).

### Fase 4: Otimização Web e Exportação
- Conversão para `image/jpeg` utilizando a API nativa de alta eficiência do Canvas.
- Remoção automática de metadados pesados desnecessários para a web (EXIF, miniaturas embutidas, perfis de cor desnecessários).
- Cálculo em tempo real de estatísticas de compressão:
  - Tamanho original vs. Tamanho final.
  - Porcentagem de redução de payload.
- Módulo de download individual com nome limpo (`nome-original.jpg`).
- Integração da biblioteca `JSZip` para download em lote com um único clique (`imagens-otimizadas-jpg.zip`).

### Fase 5: Garantia de Qualidade (QA), Testes e Validação
- Testes com imagens reais de iPhone (.HEIC).
- Testes com imagens pesadas PNG (fotos de 20MB+) e BMPs sem compressão.
- Verificação de vazamento de memória (auditoria de `URL.revokeObjectURL()`).
- Teste de rejeição de arquivos não autorizados (vídeos `.mp4`, GIFs animados `.gif`, executáveis renomeados).
- Revisão e homologação final pelo Tech Lead & PO.

### Fase 6: Expansão Desktop & Executável Autônomo (.exe) (Status: Concluída)
- Implementação do backend desktop via `pywebview` e Microsoft WebView2 (`desktop_app.py`).
- Integração bidirecional com a API do Windows Explorer (`select_folder()` e gravação direta no disco rígido sem passar por ZIP).
- Detecção dinâmica no frontend para exibir botão "Salvar na Pasta do PC".
- Geração e integração do ícone oficial `z-icon.ico` e logo `Z-logo.png`.
- Compilação do executável autônomo `dist/ZweiPixelCompact.exe` via PyInstaller com flag `--noconsole` e suporte standalone.

### Fase 7: Controle de Início Manual & Recompressão em Tempo Real (Status: Concluída)
- Chave seletora "Auto Iniciar" (`#autoConvertToggle`) para permitir adicionar imagens e ajustar parâmetros antes do início.
- Botão "Iniciar Conversão" em lote (`#startBatchBtn`) e play individual nos cards (`btn-single-start`).
- Botão de recompressão em tempo real no header (`#reprocessHeaderBtn`) e na barra de lote (`#reprocessBatchBtn`) com animação neon pulsante (`.pulse`) ao alterar configurações com fotos já carregadas.
- Botão de recompressão individual (`btn-single-reprocess`) em cada card para testes pontuais de fidelidade visual.
- Ciclo de reprocessamento seguro a partir de `item.file` original em memória com revogação limpa de ObjectURLs anteriores para evitar vazamentos de RAM.

### Fase 8: Suíte Completa de 14 Upgrades de Alto Impacto (Status: Concluída)
1. **Multithreading Dinâmico e Adaptativo com Web Workers (`worker_converter.js` e `app.js`):** Detecção automática de núcleos da CPU (`navigator.hardwareConcurrency` e `os.cpu_count()`) com fórmula de *Safe Headroom* para preservar a fluidez do SO (reserva 1 a 2 threads para UI/Windows), modos de desempenho (Automático, Turbo 100%, Econômico 50% e Manual) e redimensionamento dinâmico do pool em tempo real, preparando a base arquitetural para futura conversão de vídeos.
2. **Medidor Científico de Fidelidade Visual (SSIM & Nitidez):** Cálculo local do índice de similaridade estrutural (SSIM) e score percentual de fidelidade (99.8%+) sem depender de serviços externos.
3. **Suporte Híbrido a Saída WebP:** Pílulas de seleção de formato (`JPG`, `WEBP`, `Ambos`) gerando downloads individuais ou pacote ZIP dual.
4. **Modo "Tamanho Alvo Automático" (Target Size):** Algoritmo de busca binária por convergência iterativa de qualidade para caber em `< 100 KB`, `< 200 KB`, `< 500 KB` ou `< 1 MB`.
5. **Recorte Inteligente e Aspect Ratios:** Presets de corte profissional (`1:1 Quadrado`, `16:9 Widescreen`, `4:3 Clássico`, `9:16 Stories/Reels`) com centralização automática.
6. **Renomeador em Lote com Tags e Slugify:** Padrão configurável (`{name}`, `{ext}`, `{date}`, `{idx}`, `{w}x{h}`, `{q}`) com sanitização e normalização de URLs (slugify).
7. **Modo "Antes e Depois" com Cortina Deslizante (Split-Screen Compare):** Modal de comparação pixel-perfect com slider de cortina CSS `clip-path`, zoom interativo de 1x a 3x e visualização lado a lado.
8. **Preservação e Sanitização de Metadados EXIF:** Leitor binário de tags EXIF com correção automática de orientação de câmeras e chave seletora para remover ou manter dados.
9. **Estatísticas Globais Acumuladas (Lifetime Savings):** Persistência em `localStorage` de total de imagens convertidas, megabytes economizados e redução média ao longo da vida útil.
10. **Atalhos de Teclado Profissionais (Power-User Hotkeys):** Navegação rápida via teclado (`Ctrl+O` abrir, `Ctrl+S` salvar/baixar, `Space` converter, `Delete` limpar, `R` recomprimir, `?` atalhos, `Esc` fechar).
11. **Arrastar e Soltar de Pastas Inteiras (Folder Drop):** Leitura recursiva de diretórios via `webkitGetAsEntry` / `FileSystemDirectoryReader` processando árvores de pastas completas com filtro de imagens estáticas.
12. **Gerador de Código HTML Responsivo (`<picture>` & `srcset`):** Modal com geração de snippets prontos para produção web moderna com fallback JPG e WebP otimizado.
13. **Integração com Menu de Contexto do Windows Explorer:** Registro no sistema (`HKCU\Software\Classes\*\shell\ZweiPixelCompact`) permitindo clique direito em qualquer imagem para abrir diretamente no app.
14. **Notificações Nativas e Feedback Sonoro:** Disparo de notificações Toast do Windows (via PowerShell / Web Notifications) e síntese sonora de conclusão de lote.

### Fase 9: Testes Automatizados E2E e Unitários (Status: Concluída - 100% PASS)
- **Suite E2E Frontend (`tests/test_all_14_upgrades.js`):**
  - Execução automatizada via protocolo CDP no Microsoft Edge em modo headless.
  - Cobertura completa dos 14 cenários reais do dia a dia (pool adaptativo de workers, SSIM, WebP, busca binária de KB, renomeador, crop, EXIF, estatísticas, atalhos, split modal, folder drop, etc.).
  - Resultado: **14/14 testes aprovados (100% PASS)**.
- **Suite Backend Windows (`tests/test_desktop_backend.py`):**
  - Testes unitários com `unittest` cobrindo adição/remoção de chaves no Registro do Windows, especificações de hardware (CPU count e plataforma), disparos de notificação PowerShell, decodificação Base64/salvamento em disco e ingestão de argumentos CLI.
  - Resultado: **7/7 testes aprovados (100% PASS)**.
- **Recompilação do Executável Nativo:**
  - Binário standalone `dist/ZweiPixelCompact.exe` reempacotado com PyInstaller incorporando todos os upgrades e motor adaptativo de threads.

---

## 5. Critérios de Aceitação (Definition of Done - DoD)

1. **Compatibilidade Ampla de Formatos:** Converte com sucesso imagens PNG, HEIC, BMP, WEBP e TIFF para JPG e WebP.
2. **Rejeição Rígida de Não-Imagens:** Rejeita explicitamente vídeos, GIFs animados e arquivos forjados com notificação imediata.
3. **Privacidade Absoluta:** 100% de processamento local no dispositivo (Zero Cloud, Zero Network).
4. **Resiliência e Desempenho Multi-Thread:** Suporte a Web Workers com isolamento de threads e sem congelamento da UI.
5. **Precisão de Compressão e Métricas:** Cálculo de SSIM em tempo real e modo de busca binária por tamanho alvo em KB.
6. **Usabilidade & Estética Corporativa:** Interface moderna Dark Glassmorphism com identidade Zwei Coorporações LTDA, logo oficial e ícone de alta resolução.
7. **Suporte Desktop e Sistema Operacional:** Executável `ZweiPixelCompact.exe` independente para Windows, suporte a menu de contexto do Explorer e notificações do SO.
8. **Cobertura de Testes Automatizados:** 100% de aprovação em todos os testes unitários de backend e testes E2E automatizados.
9. **Documentação e Repositório:** Sincronização estrita de `Plan.md`, `sdd.md`, `readme.md`, `walkthrough.md` e repositório Git limpo e versionado.

---

*Desenvolvido por **Zwei** | © 2026 Zwei Coorporações LTDA. Todos os direitos reservados.*

