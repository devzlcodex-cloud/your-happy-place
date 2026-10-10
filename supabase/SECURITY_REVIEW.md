# Revisão estática de segurança — CMM Aviation

**Escopo:** leitura estática de `supabase/migrations/20261010_cmm_auth_rbac.sql` em 10/10/2026. Nenhum SQL foi aplicado nesta revisão. Isto não é auditoria independente nem aprovação para produção.

## Controles definidos na migração

- RLS é habilitada nas tabelas de domínio. Privilégios de tabelas e sequences são revogados para `PUBLIC`, `anon` e `authenticated`; usuários autenticados recebem apenas SELECT, condicionado às policies. Escrita de domínio ocorre pelas RPCs listadas e validadas por perfil.
- Helpers de autorização e atribuição usam schema `private` e não aceitam identidade fornecida pelo browser para verificar o papel do próprio chamador. A função que inspeciona o papel de outro usuário não é concedida ao cliente.
- O perfil `user_roles` é separado da identidade Auth. Há bloqueio de alteração do próprio papel e trilha `role_audit` para mudanças; o primeiro gestor exige bootstrap manual pelo SQL Editor.
- Gestores têm acesso operacional integral; financeiro lê livros financeiros e tem ações financeiras permitidas; campo lê reservas atribuídas e registra presença somente na própria sessão. O financeiro não recebe uma função de listagem da equipe.
- Notas, requisitos operacionais, contatos de clientes e preços ficam em tabelas separadas e com policies distintas. Evite armazenar nome/documento/saúde de passageiros em campos livres.
- Check-in/checkout e registros de valores usam horário do banco. Checkout usa lock e chaves únicas para impedir duplicidade de repasse e recebível.
- A senha/service-role key não deve ser exposta ao browser. Ainda não existe função de servidor para criar contas a partir da tela Equipe.

## Defeitos corrigidos nesta revisão

- Helpers de papel/atribuição que antes podiam ser consultados com UUIDs arbitrários foram movidos para `private` e limitados ao usuário autenticado nas policies.
- `finance_collaborators()`, que permitia listar todos os colaboradores, foi removida. Financeiro só pode referenciar pessoa já presente em repasse visível.
- Search path de funções foi fixado vazio e o direito CREATE no schema público foi revogado.
- Vínculo de conta Auth tem chave estrangeira; o vínculo também valida email da conta Auth.
- A métrica mensal de campo separa futuros reais no fuso de São Paulo e rejeita mês ausente.
- Uma migração antiga conflitante e seu seed sintético foram removidos do caminho ativo. Não há seed para aplicar a Cloud.

## Limitações e trabalho pendente

- **Migração ainda não aplicada/verificada no Cloud:** confirmar tabelas, RLS, policies, grants, funções, tipos e sequences após execução. Banco estava vazio antes da migração.
- **App ainda é demonstração:** login, logout, guard de sessão, telas por perfil e consultas Supabase ainda não estão conectados; as telas existentes usam estado fictício/localStorage.
- **Configuração de cadastro público:** autenticação por email foi habilitada, mas cadastro público ainda precisa ser desligado em Authentication > Settings antes de permitir contas. A ausência de formulário de cadastro não desativa o endpoint Auth.
- **Provisionamento de contas:** falta Edge Function/server function protegida para o gestor criar acesso sem exposição de service-role. O primeiro gestor é manual. Não enviar convite/recuperação até configurar e validar SMTP.
- **Notas livres:** a migration limita tamanho, não consegue detectar todos os dados pessoais/saúde. Os campos livres precisam de orientação operacional, retenção e revisão de minimização.
- **Verificação:** não foram executados testes, build ou auditoria por papéis. Não usar dados reais nem publicar como sistema de produção.

## Pré-condições antes de dados reais

1. Aplicar a migração em desenvolvimento controlado e validar sintaxe, grants e RLS efetivos.
2. Criar contas de teste para gestor, financeiro, campo e conta sem papel; confirmar isolamento com consultas e tentativas de escrita indevidas.
3. Implementar e revisar Auth UI, provisionamento e fluxo de revogação antes de atribuir contas reais.
4. Revisar finalidade/base legal, aviso de privacidade, retenção e resposta a incidentes para dados pessoais de figuras públicas.
