# Criptografia das mensagens do chat (AES-256-GCM)

## O que encontrei hoje (análise, sem alterações)

**Onde as mensagens vivem**
- Tabela `chat_messages` — campos de conteúdo: `content` (texto) e `media_caption`. Resto (ids, datas, status, telefone, mídia) é técnico.
- Tabela `chat_conversations` — guarda uma prévia do último texto em `last_message_text` (também vaza conteúdo num dump).

**Quem grava mensagens (todos passariam pela mesma camada)**
- `evolution-webhook` (recebidas pelo número de atendimento)
- `meta-webhook` (recebidas pela API oficial)
- `send-chat-message` / envio pelo app
- `chat-auto-reply`, `wa-flow-runner`, `sdr-dispatch`, `sdr-followup-processor`, `meta-send-campaign` (automações, Wian, SDR)
- O próprio app (hook `useChat`) hoje **insere direto no banco** ao enviar mensagem, mídia e template.

**Quem lê o conteúdo**
- App: `useChat` lê `chat_messages` direto do banco e recebe as novas por realtime.
- Backend: `chat-summarize`, `intel-engine`, automações, scoring.

**Busca**
- Não existe busca por conteúdo no banco (nada de LIKE/ILIKE/full-text em `chat_messages`).
- A busca de conversas é por nome/telefone; a busca dentro da conversa acontece na memória do navegador, sobre as mensagens já carregadas.
- Conclusão: criptografar `content` **não quebra** nenhuma busca existente.

**Mídia**
- Arquivos ficam no Storage privado (`chat-media`), acessados por links assinados temporários. Não há necessidade de mexer nisso agora — só o texto/caption é criptografado.

## O ponto que precisa da sua decisão

Hoje o app lê as mensagens **direto do banco**. Se o texto for guardado criptografado, o app sozinho não consegue mais lê-lo — e a chave nunca pode ir para o navegador (é exatamente isso que dá a proteção).

Ou seja: o caminho de leitura do chat precisa passar a buscar o texto pelo backend. É a única mudança estrutural necessária; nada de design, CRM, automações ou integrações muda.

Proponho o formato mais conservador:

- Envio: o app deixa de inserir a mensagem direto e passa a criar a mensagem pela função de envio já existente (o texto sai do navegador, é criptografado no backend e só então é gravado).
- Leitura: uma nova função de backend devolve as mensagens já decifradas, respeitando exatamente as mesmas regras de acesso de hoje (dono da conta e colaboradores ativos).
- Realtime: continua avisando que chegou mensagem nova; o texto vem decifrado pela função de leitura. Nada de "piscar" na tela.
- Prévia da conversa (`last_message_text`) também criptografada, decifrada pela mesma função.

## Como será feito

1. **Camada única de criptografia** (backend): funções `encryptMessage` / `decryptMessage` em AES-256-GCM, IV aleatório de 12 bytes por mensagem, formato versionado `{v, alg, iv, data}` guardado em coluna nova. Nenhuma outra parte do sistema implementa cripto.
2. **Colunas novas, sem remover nada**: `content_enc` e `media_caption_enc` em `chat_messages`, `last_message_enc` em `chat_conversations`. As colunas antigas continuam existindo (vazias para mensagens novas), então nada quebra e a mudança é reversível.
3. **Todos os pontos de gravação** listados acima passam a chamar a mesma camada antes de inserir. Se a criptografia falhar, a mensagem não é gravada em texto puro — retorna erro controlado, sem conteúdo nem chave em log.
4. **Todos os pontos de leitura do backend** (Wian, resumos, inteligência, automações, SDR) passam a decifrar pela mesma camada, mantendo o comportamento atual.
5. **Mensagens antigas**: nada é apagado. Uma rotina administrativa criptografa em lotes, de forma idempotente (pula o que já está criptografado), preservando ids, datas, status e metadados. Até rodar, o sistema lê o campo antigo normalmente.
6. **Segredo**: o código lê `WIIZE_MESSAGE_ENCRYPTION_KEY` só no backend. Vou pedir o cadastro pelo formulário seguro e te explico como gerar (32 bytes aleatórios em base64) — nenhum valor real entra no código, no banco, no git ou em log.
7. **Testes**: ida e volta do texto, IV diferente por mensagem, chave errada falhando, ciphertext adulterado falhando, e verificação dos fluxos de WhatsApp oficial, Evolution, envio pelo app, automações, realtime e permissões de colaborador.
8. **Documentação curta** em `docs/criptografia-mensagens.md` com fluxo, limitações e rotação de chave.

## Limitações honestas

- Protege contra vazamento do banco/backup. Quem obtiver a chave do backend junto com o banco continua conseguindo ler — não é criptografia ponta a ponta.
- A tela do chat passa a depender do backend para exibir o texto; se a função de leitura cair, o chat não mostra mensagens (hoje ele leria direto do banco).
- Rotação de chave exige uma rodada de re-criptografia (previsto na documentação).
