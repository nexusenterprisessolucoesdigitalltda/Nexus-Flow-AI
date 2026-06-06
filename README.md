<p align="center">
  <img src="https://img.shields.io/badge/status-active-success" alt="Status">
  <img src="https://img.shields.io/badge/node-%3E%3D18-blue" alt="Node">
  <img src="https://img.shields.io/badge/license-MIT-purple" alt="License">
  <img src="https://img.shields.io/badge/platform-Telegram%20%7C%20Discord-5865F2" alt="Platform">
</p>

<h1 align="center">Nexus Flow</h1>
<p align="center"><strong>Multi-Platform Personal AI Agent</strong><br>Telegram · Discord · Gemini · DeepSeek · OpenAI</p>

---

## Visão Geral

Nexus Flow é um agente de inteligência artificial pessoal que opera 100% sob seu controle. Conecta-se ao Telegram e/ou Discord para processar texto, documentos, imagens e áudio utilizando múltiplos provedores de LLM com fallback automático.

## Funcionalidades

| Categoria | Recursos |
|---|---|
| **Plataformas** | Telegram Bot · Discord Bot |
| **LLMs** | Google Gemini · DeepSeek · OpenAI · Fallback automático |
| **Texto** | Histórico persistente (SQLite) · Comandos · Contexto |
| **Documentos** | PDF · DOCX · XLSX · CSV · JSON · Markdown · TXT |
| **Imagens** | JPG · PNG · GIF · WebP — análise visual via LLM |
| **Áudio** | MP3 · WAV · OGG · M4A · FLAC — transcrição Whisper |
| **Skills** | Sistema de plugins com hot-reload |
| **Segurança** | Autenticação por ID · Rate limiting · Sanitização |
| **Infraestrutura** | Docker · Logs estruturados · Graceful shutdown |

## Stack Tecnológica

| Camada | Tecnologia |
|---|---|
| Runtime | Node.js 18+ · TypeScript 5 |
| Telegram | Telegraf 4 |
| Discord | discord.js 14 |
| Banco de Dados | SQLite (better-sqlite3) |
| LLMs | Google Generative AI · OpenAI SDK |
| Transcrição | Whisper (API OpenAI / local) |
| Logging | Winston |
| Hot-reload | Chokidar |

---

## Estrutura do Projeto

```
nexus-flow/
├── scripts/
│   ├── setup.bat/ps1/sh      # Configuração inicial
│   ├── run.bat/ps1/sh        # Execução do agente
│   ├── dev.bat/ps1/sh        # Desenvolvimento com hot-reload
│   ├── build.bat/ps1/sh      # Compilação para produção
│   ├── clean.bat/ps1/sh      # Limpeza de artefatos
│   ├── docker.bat/ps1/sh     # Gerenciamento Docker
│   └── status.bat/ps1/sh     # Diagnóstico do ambiente
├── src/
│   ├── index.ts              # Entry point
│   ├── config.ts             # Validação de configuração
│   ├── platform/             # Abstração multi-plataforma
│   ├── telegram/             # Implementação Telegram
│   ├── discord/              # Implementação Discord
│   ├── agent/                # Pipeline de processamento
│   ├── llm/                  # Provedores de linguagem
│   ├── skills/               # Loader + Registry de skills
│   ├── database/             # SQLite + migrations
│   └── utils/                # Logger, errors, retry, rate-limit
├── agents/
│   └── skills/               # Skills do usuário (hot-reload)
├── specs/                    # Especificações técnicas
├── .env.example              # Template de variáveis
├── Dockerfile                # Multi-stage build
├── docker-compose.yml        # Orquestração
└── README.md
```

---

## Quick Start

### Pré-requisitos

- **Node.js** 18 ou superior
- **npm** (ou yarn/pnpm)
- Conta de bot no [Telegram](https://t.me/botfather) e/ou [Discord](https://discord.com/developers/applications)
- Chave de API de pelo menos um LLM: Gemini, DeepSeek ou OpenAI

### 1. Setup

```bash
cd nexus-flow

# Windows (CMD)
scripts\setup.bat

# PowerShell
.\scripts\setup.ps1

# Linux / macOS
bash scripts/setup.sh
```

O script de setup verifica as dependências, cria o arquivo `.env` a partir do template e instala os pacotes npm.

### 2. Configuração

Edite o arquivo `.env` com suas credenciais:

```env
# Plataformas (pelo menos uma)
TELEGRAM_BOT_TOKEN=seu_token_aqui
DISCORD_BOT_TOKEN=seu_token_aqui

# Autenticação
ALLOWED_USER_IDS=123456789,987654321

# Provedor LLM (pelo menos um)
GEMINI_API_KEY=sua_chave_gemini
```

### 3. Executar

```bash
# Desenvolvimento com hot-reload
scripts\dev.bat                    # Windows
.\scripts\dev.ps1                  # PowerShell
bash scripts/dev.sh                # Linux

# Produção
.\scripts\build.ps1                # Compilar
.\scripts\run.ps1 -Prod            # Executar

# Docker
.\scripts\docker.ps1 up            # Iniciar container
```

---

## Comandos

### Telegram

| Comando | Descrição |
|---|---|
| `/start` | Inicializa o assistente |
| `/help` | Exibe todos os comandos disponíveis |
| `/clear` | Limpa o histórico da conversa |
| `/stats` | Exibe estatísticas da conversa |
| `/reload` | Recarrega skills (hot-reload) |

### Discord

| Comando | Descrição |
|---|---|
| `!start` | Inicializa o assistente |
| `!help` | Exibe todos os comandos disponíveis |
| `!clear` | Limpa o histórico da conversa |
| `!stats` | Exibe estatísticas da conversa |
| `!reload` | Recarrega skills (hot-reload) |

> O prefixo do Discord é configurável via `DISCORD_COMMAND_PREFIX` (padrão: `!`)

---

## Sistema de Skills

Skills são plugins que estendem as capacidades do agente. Basta adicionar arquivos na pasta `agents/skills/` e o sistema os carrega automaticamente com **hot-reload** — sem necessidade de reiniciar o processo.

### Skill em JSON

```json
{
  "name": "calculator",
  "description": "Realiza cálculos matemáticos simples",
  "version": "1.0.0",
  "pattern": "calcule|calcula|quanto (?:é|dá) (.+)",
  "handler": "llm"
}
```

### Skill em JavaScript

```javascript
module.exports = {
  name: 'weather',
  description: 'Obtém a previsão do tempo para uma cidade',
  version: '1.0.0',
  pattern: /clima (?:de|em|para)?\s*(?<city>.+)/i,
  async execute(context) {
    const { city } = context.matchedParams;
    const response = await fetch(`https://api.weather.com/${city}`);
    const data = await response.json();
    return `Previsão para ${city}: ${data.temperature}°C, ${data.condition}`;
  }
};
```

---

## Docker

```bash
# Construir imagem
.\scripts\docker.ps1 build

# Iniciar container (background)
.\scripts\docker.ps1 up

# Visualizar logs
.\scripts\docker.ps1 logs

# Acessar shell do container
.\scripts\docker.ps1 shell

# Parar container
.\scripts\docker.ps1 down

# Status dos containers
.\scripts\docker.ps1 status
```

---

## Variáveis de Ambiente

| Variável | Obrigatório | Padrão | Descrição |
|---|---|---|---|
| `TELEGRAM_BOT_TOKEN` | ✗ | — | Token de autenticação do bot Telegram |
| `DISCORD_BOT_TOKEN` | ✗ | — | Token de autenticação do bot Discord |
| `ALLOWED_USER_IDS` | ✓ | — | IDs de usuário autorizados (separados por vírgula) |
| `DISCORD_ALLOWED_USER_IDS` | ✗ | `ALLOWED_USER_IDS` | IDs específicos para Discord |
| `DISCORD_COMMAND_PREFIX` | ✗ | `!` | Prefixo para comandos no Discord |
| `GEMINI_API_KEY` | △ | — | Chave da API Google Gemini |
| `DEEPSEEK_API_KEY` | ✗ | — | Chave da API DeepSeek |
| `DEEPSEEK_API_BASE` | ✗ | `https://api.deepseek.com/v1` | URL base da API DeepSeek |
| `OPENAI_API_KEY` | ✗ | — | Chave da API OpenAI |
| `ACTIVE_LLM` | ✗ | `gemini` | Provedor LLM ativo |
| `TRANSCRIPTION_MODE` | ✗ | `openai` | Modo de transcrição: `openai` ou `local` |
| `LOG_LEVEL` | ✗ | `info` | Nível de log: `error`, `warn`, `info`, `debug` |
| `AGENT_MAX_HISTORY` | ✗ | `20` | Número máximo de mensagens no histórico |
| `AGENT_MAX_TOKENS` | ✗ | `2048` | Tokens máximos por resposta |
| `AGENT_TEMPERATURE` | ✗ | `0.7` | Temperatura do modelo (0.0 — 1.0) |
| `RATE_LIMIT_MAX` | ✗ | `30` | Máximo de requisições por janela |
| `RATE_LIMIT_WINDOW_MS` | ✗ | `60000` | Janela de rate limit em milissegundos |
| `MAX_FILE_SIZE` | ✗ | `10485760` | Tamanho máximo de arquivo em bytes (10MB) |

> △ Pelo menos **um** provedor LLM é obrigatório.

---

## Arquitetura

```
Telegram/Discord
      │
      ▼
  ┌─────────────┐
  │  Listener    │  Auth → Rate Limit → Sanitize
  └──────┬──────┘
         │
         ▼
  ┌─────────────┐
  │   Handler    │  Text · Document · Image · Audio
  └──────┬──────┘
         │
         ▼
  ┌─────────────┐
  │   Pipeline   │  Context → History → Skill Match → LLM → Response
  └──────┬──────┘
         │
    ┌────┴────┐
    ▼         ▼
┌────────┐ ┌────────┐
│ Skills │ │  LLM   │  Com fallback automático
│ Hot-   │ │ Gemini │
│ reload │ │DeepSeek│
│        │ │ OpenAI │
└────────┘ └────────┘
```

---

## Licença

Distribuído sob licença **MIT**. Consulte o arquivo `LICENSE` para mais informações.

---

## Créditos

Desenvolvido por [Nexus Enterprise Soluções Digitais Ltda](https://github.com/nexusenterprisessolucoesdigitalltda)

<p align="center">
  <a href="https://github.com/nexusenterprisessolucoesdigitalltda">
    <img src="https://img.shields.io/badge/GitHub-Nexus%20Enterprise-181717?style=for-the-badge&logo=github" alt="GitHub">
  </a>
</p>