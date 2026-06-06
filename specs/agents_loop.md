# Especificação: Agent Loop

## Comportamento do Pipeline
1. **Recepção**: Mensagem chega via Telegram Listener.
2. **Autenticação**: Verifica se o usuário está em `ALLOWED_USER_IDS`.
3. **Pré-processamento**: Se a mensagem contém mídia (documento, áudio, imagem), extrai/transcreve o conteúdo.
4. **Contexto**: Carrega histórico da conversa do banco SQLite (últimas N mensagens).
5. **Skill Matching**: Verifica se alguma skill registrada pode atender à solicitação.
6. **LLM Call**: Envia o prompt completo (contexto + mensagem + conteúdo extraído) para o LLM ativo.
7. **Pós-processamento**: Se o LLM retornar um comando de skill, executa a skill.
8. **Resposta**: Envia a resposta final de volta ao Telegram e salva no histórico.
