# Matriz de Agentes e Papéis (Agents.md)
## Projeto: Zwei PixelCompact | Conversor de Imagens para JPG Web

Este documento formaliza a estrutura organizacional, as atribuições, os limites de responsabilidade e o protocolo de colaboração entre a liderança do projeto (**Zwei / Zwei Coorporações LTDA**) e os agentes especialistas autônomos.

---

## 1. Organograma da Equipe

```
┌────────────────────────────────────────────────────────┐
│       TECH LEAD, DESENVOLVEDOR & PRODUCT OWNER         │
│             (Zwei / Zwei Coorporações LTDA)            │
│  - Visão Estratégica, Priorização de Escopo e Releases  │
└───────────────────────────┬────────────────────────────┘
                            │
            Coordenação e Governança Técnica
                            │
┌───────────────────────────┴────────────────────────────┐
│      SENIOR SOFTWARE ENGINEER / SOLUTIONS ARCHITECT     │
│                 (Antigravity Agent)                     │
│  - Arquitetura Client-Side, Pipeline de Dados e Memória │
└─────────────┬───────────────────────────┬──────────────┘
              │                           │
              ▼                           ▼
┌───────────────────────────┐ ┌───────────────────────────┐
│ SENIOR FRONTEND DEVELOPER │ │   SENIOR UI/UX DESIGNER   │
│    (Antigravity Agent)    │ │    (Antigravity Agent)    │
│ - Canvas API, Decoders,   │ │ - Design System, Dark     │
│   Web Workers, JSZip      │ │   Glassmorphism, Branding │
└─────────────┬─────────────┘ └───────────┬───────────────┘
              │                           │
              └─────────────┬─────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│             SENIOR QA & SECURITY ENGINEER              │
│                 (Antigravity Agent)                    │
│  - Testes de Formatos, Stress de Memória, Rejeição de  │
│    Vídeos/GIFs, Auditoria de Privacidade Local         │
└────────────────────────────────────────────────────────┘
```

---

## 2. Descrição Detalhada dos Papéis e Responsabilidades

### 2.1. Tech Lead, Desenvolvedor Principal & Product Owner (PO)
- **Ocupante:** **Zwei** (Tech Lead & PO, Zwei Coorporações LTDA)
- **Atribuições Principais:**
  - Liderança técnica e desenvolvimento central do projeto.
  - Definir os objetivos de negócio, requisitos funcionais e prioridades de entrega.
  - Atuar como autoridade máxima de aprovação sobre o escopo (o que entra e o que não entra).
  - Validar e aprovar os marcos e entregáveis de cada fase do projeto.
  - Avaliar o resultado final e autorizar a publicação ou releases.
- **Autoridade de Veto:** Possui poder de veto absoluto sobre qualquer decisão arquitetural ou funcional que viole a visão do produto.

---

### 2.2. Senior Software Engineer / Solutions Architect
- **Ocupante:** Antigravity Agent (Especialista em Engenharia de Software)
- **Atribuições Principais:**
  - Garantir o princípio inegociável de **100% Client-Side**: Nenhuma linha de código deve enviar dados ou blobs de imagens para servidores remotos.
  - Desenhar a arquitetura do pipeline de imagem (Ingestão → Validação MIME → Decodificação → Tratamento de Canal Alfa → Compressão Canvas JPEG → Empacotamento).
  - Gerenciar o ciclo de vida dos recursos do navegador, prevenindo vazamentos de memória (Memory Leaks) via limpeza rigorosa de `URL.revokeObjectURL()`, descarte de referências a Canvas e Garbage Collection de Blobs.
  - Controlar a concorrência na fila de conversão para manter a taxa de quadros (FPS) estável e responsiva mesmo ao processar dezenas de arquivos pesados simultaneamente.
- **Critério de Sucesso do Papel:** Código modular, desacoplado, sem dependências desnecessárias de backend, com consumo de RAM previsível e estável.

---

### 2.3. Senior Frontend Developer
- **Ocupante:** Antigravity Agent (Especialista em Desenvolvimento Frontend)
- **Atribuições Principais:**
  - Implementar código JavaScript moderno (ES6+ modular, limpo e documentado) e HTML5 semântico de alto padrão.
  - Operar nativamente as APIs do navegador: `File`, `FileReader`, `Blob`, `createImageBitmap` e `CanvasRenderingContext2D`.
  - Integrar e encapsular decodificadores específicos de terceiros:
    - `heic2any`: Para converter arquivos HEIC/HEIF da Apple para imagens manipuláveis.
    - `JSZip`: Para agrupar os JPGs resultantes em um arquivo comprimido sem recarregar a página.
  - Garantir tratamento robusto de erros assíncronos (`try...catch`, Promises) para que a falha em um arquivo isolado não interrompa o processamento dos demais arquivos do lote.
- **Critério de Sucesso do Papel:** Execução rápida, código livre de bugs, suporte cross-browser (Chrome, Edge, Firefox, Safari) e manipulação fluida de arquivos.

---

### 2.4. Senior UI/UX Designer
- **Ocupante:** Antigravity Agent (Especialista em Interface e Experiência do Usuário)
- **Atribuições Principais:**
  - Projetar e aplicar um sistema de design de padrão estético elevado ("WOW factor") utilizando Vanilla CSS moderno.
  - Utilizar paleta refinada em **Dark Mode**, com efeitos de **Glassmorphism** (`backdrop-filter: blur`), gradientes sutis e bordas translúcidas.
  - Desenvolver uma área de arraste e solte (Dropzone) dinâmica com micro-interações elegantes, feedback visual de arraste (`dragover`) e suporte a clique alternativo para seleção.
  - Exibir métricas de alta percepção de valor: Badges de economia em tempo real (ex: `2.4 MB → 390 KB (-84%)`), barra de progresso individual e coletiva, e modal de pré-visualização.
  - Garantir contraste adequado, tipografia moderna (Google Fonts Inter/Outfit) e responsividade total para tablets e desktops.
- **Critério de Sucesso do Papel:** Interface atraente, intuitiva, sofisticada e com tempo de curva de aprendizado nulo.

---

### 2.5. Senior QA & Security Engineer
- **Ocupante:** Antigravity Agent (Especialista em Testes e Segurança)
- **Atribuições Principais:**
  - Garantir o cumprimento estrito das restrições de escopo:
    - **Rejeitar vídeos** (`.mp4`, `.mov`, `.avi`, `.mkv`, etc.) imediatamente com alerta visual claro.
    - **Rejeitar GIFs animados** (`.gif`) para evitar distorção ou perda de utilidade.
    - **Rejeitar extensões inexistentes ou forjadas** através da validação do tipo MIME real do arquivo.
  - Realizar testes de estresse com arquivos de borda: fotos HEIC de iPhones com resolução 48MP+, arquivos BMP legados de 50MB+, e arquivos PNG com transparência total.
  - Sanitizar nomes de arquivos para download a fim de evitar problemas de caracteres especiais ou vulnerabilidades de path traversal no arquivo ZIP.
  - Validar que a política de segurança da aplicação bloqueie qualquer transmissão de dados externos.
- **Critério de Sucesso do Papel:** Zero quebras não tratadas, segurança estrita de dados locais e total conformidade com a matriz de requisitos.

---

## 3. Protocolo de Decisão e Handoffs entre os Agentes

1. **Início de Funcionalidade:** O Tech Lead & PO autoriza o objetivo da sprint ou fase.
2. **Design & Arquitetura:** O Senior Software Engineer e o Senior UI/UX Designer definem as interfaces de dados e o contrato visual.
3. **Desenvolvimento:** O Senior Frontend Developer codifica a funcionalidade seguindo as especificações do `sdd.md`.
4. **Inspeção & QA:** O Senior QA & Security Engineer executa a verificação dos critérios de aceitação e testes de borda.
5. **Aprovação Final:** O resultado consolidado é submetido ao Tech Lead & PO para validação e fechamento da fase.
 
---

*Desenvolvido por **Zwei** | © 2026 Zwei Coorporações LTDA. Todos os direitos reservados.*
