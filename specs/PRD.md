# PRD - Nexus Flow (Agente Pessoal IA)

## Objetivo Geral
Criar um agente de Inteligência Artificial pessoal, focado em privacidade, operando 100% sob o controle do usuário local.

## Requisitos Funcionais
1. O agente deve se comunicar exclusivamente através de um Bot do Telegram.
2. Deve suportar múltiplos LLMs dinamicamente (Gemini 1.5/Pro, DeepSeek, OpenAI) configurados via `.env`.
3. Deve possuir um sistema de autenticação rígido baseado no ID único do Telegram (`ALLOWED_USER_IDS`). Se outro usuário mandar mensagem, o bot deve ignorar.
4. Deve processar as mensagens através de um pipeline estruturado: Recepção -> Processamento/Loop de Agente -> Execução de Skill (se houver) -> Resposta.
5. Deve suportar recebimento de mídia: documentos (PDF, MD, TXT, XLSX), áudio/voz (transcrição Whisper), e imagens (análise visual).
