# Banco e acesso — CMM Aviation

O Lovable Cloud/Supabase está habilitado. Há uma migração de schema em `migrations/20261010_cmm_auth_rbac.sql`. Ela não inclui seed, usuários nem dados reais.

## Estado atual

- A migração foi aplicada ao banco Cloud. A consulta de catálogo confirmou 14 tabelas com RLS ativo e 14 policies de leitura; nenhuma tabela recebeu dados.
- O portal de login e as áreas por perfil estão no GitHub; o login chama `get_my_profile`, que só retorna papéis ativos. Contas sem papel ativo são bloqueadas.
- O portal gestor já invoca a Edge Function `create-member-account`, que cria ficha, conta Auth, vínculo de perfil e link de definição de senha sem expor a service-role no navegador. O código está versionado, mas a função ainda precisa ser implantada/configurada no Lovable Cloud.
- A demonstração local permanece com dados fictícios. A conexão do portal real não torna os dados da demonstração reais nem sincroniza o armazenamento local.

## Estrutura

A migração cria papéis `gestor`, `financeiro` e `campo`, registros de colaboradores, clientes, serviços, reservas, atribuições, observações, recebíveis, repasses e ajustes. As tabelas têm RLS. Escritas de domínio passam por RPCs com checagem de papel; não conceda CRUD direto para fazer telas funcionarem.

A migração foi consolidada como a única fundação ativa. Não reaplique schemas antigos ou seeds incompatíveis.

## Primeiro gestor

Após aplicar a migração em um ambiente controlado:

1. Desative novos cadastros públicos em Authentication > Settings, mantendo o login por email habilitado.
2. Crie a primeira conta Auth pelo painel de administração do Cloud, sem convite automático se os emails não estiverem configurados.
3. Copie o UUID da conta criada e execute no SQL Editor:
   ```sql
   insert into public.user_roles (user_id, role, assigned_by)
   values ('UUID_DA_CONTA_AUTH', 'gestor', null);
   ```
4. Confirme que a trilha `role_audit` registra a inclusão e que a pessoa entra com o perfil gestor.

O valor do UUID é um exemplo de posição a preencher, não uma credencial. O trigger de proteção aceita essa operação manual somente porque o SQL Editor não tem `auth.uid()`; usuários da aplicação não podem atribuir nem alterar o próprio perfil.

## Contas de colaboradores

A ficha de colaborador pode ser criada no portal gestor. A conta Auth ainda deve ser criada pelo painel administrativo e vinculada após revisão do email e do perfil. Não coloque a service-role key no navegador ou no repositório. O provisionamento pelo portal fica pendente de uma Edge Function que valide o perfil gestor.

Recuperação de senha depende da configuração de email/SMTP do projeto. Não envie emails reais nesta fase.

## Segurança

Consulte [SECURITY_REVIEW.md](./SECURITY_REVIEW.md). A migration foi aplicada e a revisão verificou RLS, policies e privilégios do catálogo. A função auxiliar `actor_label()` foi revogada para clientes e `get_my_profile()` filtra contas ativas. Ainda faltam testes funcionais com contas por papel e checagens negativas antes de qualquer uso real.
