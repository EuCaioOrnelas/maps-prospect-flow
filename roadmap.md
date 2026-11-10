# Roadmap — Evolução do SDR Inteligente

## Introdução 3D Wiize
- [x] Produzir introdução animada de 9 segundos, 16:9, com logo oficial, elementos 3D, mensagem e áudio
- [x] Conferir o MP4 final e apresentar o resultado
- [x] Refazer a introdução em estilo clean e minimalista, com alinhamento vertical correto da logo
- [x] Conferir e entregar a segunda versão sem substituir a primeira

- [x] Fase 1 — Auditoria e plano aprovado
- [x] Fase 2 — Catálogo comercial (sdr_products, sdr_agent_products, tela de catálogo, wizard)
- [x] Fase 3 — Inteligência de vendas (modo venda_direta no sdr-brain, seleção de produto, anti-alucinação, proposta por produto, eventos)
- [x] Fase 4 — Motor de elegibilidade (sdr_check_eligibility, modos de ativação, exclusões, correção de handoff)
- [x] Fase 5 — Interface e dashboard (abas do wizard, funil comercial na página do SDR)
- [x] Fase 6 — Testes automatizados (blindagem de preços: 15 testes; suíte completa 77/77)
- [ ] Pendente de homologação real: conversa ponta a ponta no WhatsApp com venda direta ativa; controles por contato na tela de conversas (pausar/excluir/retomar já existem via useSDRContactStatus)

## Admin — Churn
- [x] Contar somente cancelamentos com pagamento real comprovado, inclusive registros locais antigos
- [x] Exibir principal motivo e gráfico de pizza respeitando o filtro de datas
- [x] Testar regras de pagamento, motivos e período; compilação e função verificadas
- [ ] Conferir os valores com os dados reais de produção após publicar a tela e a função nesse ambiente
## Domine a Wiize — Central de Aprendizado
- [x] Card "Domine a Wiize" na Central de Ajuda apontando para /aprenda
- [x] Tabelas learning_modules/learning_lessons com RLS (leitura pública de publicados; escrita só admin)
- [x] Bucket de imagens da central (privado, URLs assinadas)
- [x] Páginas públicas /aprenda, /aprenda/:slug, /aprenda/:slug/:lessonSlug
- [x] Player YouTube com extração de ID
- [x] Painel admin "Gerenciar Aprendizado" (módulos, aulas, ordem, ativação, upload)
- [x] Acesso ao /aprenda no site e na plataforma
- [x] Testes e verificação de regressão
- [x] Relatório final
- [ ] Produção: rodar docs/sql/prod-domine-a-wiize.sql e publicar os arquivos
## Ajustes pós Domine a Wiize
- [x] Sidebar: trocar "Domine a Wiize" por "Central de Ajuda"
- [x] Sino de avisos no MainDashboard ao lado do tema, mantendo bolha com contador
- [x] Corrigir avisos que reaparecem após apagar/marcar como lido (sino e popup sincronizados; validado no banco)
- [x] Lista completa com checkbox de arquivos criados/editados
- [ ] Produção: rodar docs/sql/prod-avisos-sino.sql junto com prod-domine-a-wiize.sql
