# Configuração de vídeos dos avisos

## Erro “Bucket not found”

O campo MP4 já funciona. Esse erro significa que o serviço de armazenamento do ambiente que o site está usando não encontrou a pasta de arquivos dos avisos.

No armazenamento **do mesmo ambiente ao qual sua produção está conectada**, configure:

- Nome/ID exato: `wiize-updates`
- Acesso: **privado** (não público)
- Limite por arquivo: **50 MB**
- Tipos aceitos, caso configure uma lista: `video/mp4`, `video/webm`, `image/jpeg`, `image/png`, `image/webp`

Na Lovable, essa pasta pode ser criada pelas ferramentas de armazenamento. Em uma produção externa, use a administração de armazenamento desse ambiente. A pasta fica no armazenamento, não dentro de `src`, `public` ou do seu computador.

As migrations 0044 e 0045 e o SQL consolidado 0039–0051 configuram as permissões e a validação dos arquivos. A criação da pasta é uma etapa separada pela API/tela de armazenamento. Não é preciso repetir todas as migrations para resolver “Bucket not found”.

Se a pasta já existe, confira se seu site local/produção está conectado ao mesmo ambiente onde você a criou. Criá-la aqui na Lovable não cria a pasta automaticamente em uma cópia com outro ambiente.

Depois de configurar, entre como administrador, escolha novamente o vídeo em **Mídia → Vídeo**, aguarde **Mídia enviada** e salve a publicação. Se aparecer outro erro, ele precisa ser verificado separadamente; não torne a pasta pública nem remova as permissões de segurança.