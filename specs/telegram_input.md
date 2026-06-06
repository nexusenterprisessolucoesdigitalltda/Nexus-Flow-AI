# Especificação: Telegram Mídia e Input Handler

## Requisitos de Mídia
1. **Documentos**: Permitir o recebimento de arquivos `.pdf`, `.md` e `.txt`. O sistema deve extrair o texto desses arquivos e passá-los como contexto no prompt do agente.
2. **Planilhas**: Permitir o recebimento de arquivos `.xlsx` e `.csv`. Extrair dados tabulares e converter para texto.
3. **Áudio/Voz**: Permitir o recebimento de mensagens de voz (`.ogg`) e arquivos de áudio (`.mp3`, `.wav`, `.m4a`).
4. **Transcrição**: O arquivo de áudio deve ser baixado temporariamente na pasta `temp/` e transcrito usando Whisper (local via `whisper.cpp`/Python ou via API OpenAI).
5. **Imagens**: Receber fotos e imagens, baixar temporariamente e analisar usando o LLM (Gemini tem visão nativa) ou descrever o conteúdo.
6. **Tamanho**: Respeitar limites do Telegram (50MB para bots).
