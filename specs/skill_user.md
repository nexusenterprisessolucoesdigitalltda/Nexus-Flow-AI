# Especificação: Carregamento de Skills

## Comportamento Esperado
1. O sistema deve monitorar a pasta `agents/skills/`.
2. Habilidades (skills) adicionadas nesta pasta em formato JSON ou arquivos de script (.js/.ts) devem ser carregadas dinamicamente em tempo de execução (Hot-reload), sem a necessidade de reiniciar o processo Node principal.
3. Quando o usuário enviar um comando ou arquivo no Telegram, o agente deve avaliar se alguma das habilidades carregadas é adequada para resolver a solicitação antes de enviar o prompt puro para a LLM.
4. Skills em JSON seguem o formato: `{ "name": string, "description": string, "pattern": string, "handler": string }`.
5. Skills em JS exportam um objeto com `name`, `description`, `pattern` (regex) e `execute(ctx)`.
