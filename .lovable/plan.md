# Persistir o tipo de atuação da empresa

## Correção
- Adicionar ao perfil empresarial o campo persistente `company_business_model`, que a interface já tenta salvar e consultar.
- Preservar todos os perfis existentes e preencher o perfil atual da Bless como `representante`, conforme confirmado pelo usuário.
- Remover o comportamento de compatibilidade que trata a ausência desse campo como sucesso, evitando que uma confirmação não salva pareça concluída.

## Validação
- Confirmar no banco que o perfil da conta mantém `company_business_model = representante`.
- Abrir novamente a Gestão de Oportunidades e verificar que a confirmação não reaparece.
- Validar que futuras edições do perfil continuam salvando normalmente.

## Arquivos previstos
- Nova migration em `supabase/migrations/`
- `src/components/opportunities/CompanyProfileOnboarding.tsx`
- `src/pages/Profile.tsx`
