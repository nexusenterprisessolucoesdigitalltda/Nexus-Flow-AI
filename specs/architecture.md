# Arquitetura do Sistema

## Stack Tecnológica
- Ambiente: Node.js com TypeScript
- Banco de Dados: SQLite (better-sqlite3 para persistência local leve)
- Interface de Chat: Telegram Bot API (telegraf)

## Componentes do Sistema
1. **Telegram Listener**: Gerencia conexões e polling com o Telegram.
2. **Database Manager**: Cria tabelas para histórico de conversas e estado dos agentes.
3. **LLM Router**: Coordena as chaves de API e faz as chamadas para os provedores externos de forma unificada.
4. **Agent Loop**: Pipeline de processamento de mensagens.
5. **Skill Loader**: Carrega skills dinamicamente da pasta `agents/skills/`.
6. **Media Handlers**: Processam PDFs, áudios, imagens e planilhas.

## Fluxo de Dados
Telegram -> Listener -> Auth Check -> Media Handler (se aplicável) -> Skill Match -> LLM Call -> Response -> Telegram
