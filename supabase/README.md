# Banco e acesso — CMM Aviation

O Lovable Cloud/Supabase está habilitado. Há uma migração de schema em `migrations/20261010_cmm_auth_rbac.sql`. Ela não inclui seed, usuários nem dados reais.

## Estado atual

- O banco Cloud foi confirmado vazio antes desta etapa; a migração ainda não foi aplicada.
- O provedor de autenticação por email está habilitado, mas o app ainda não tem tela de login nem proteção de rotas.
- Não há fluxo seguro de criação de usuários para o gestor. A RPC `grant_member_access` vincula um usuário Auth já criado a um colaborador, mas não cria conta.
- O app ainda usa dados fictícios no navegador. Não inserir informações reais até conectar a interface ao banco e validar acesso.

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

A tela e a função segura de provisionamento ainda precisam ser implementadas. Não coloque a service-role key no navegador ou no repositório. Enquanto não houver uma Edge Function autenticada que valide o perfil gestor, crie usuários pelo painel administrativo e vincule-os pela RPC apenas após revisar o fluxo.

Recuperação de senha depende da configuração de email/SMTP do projeto. Não envie emails reais nesta fase.

## Segurança

Consulte [SECURITY_REVIEW.md](./SECURITY_REVIEW.md). A revisão atual é estática. A migração precisa ser aplicada e verificada em ambiente controlado, com contas de teste para cada papel e checagens negativas antes de qualquer uso real.
