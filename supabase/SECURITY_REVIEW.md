# Revisão estática de segurança — CMM Aviation

**Escopo:** revisão do desenho SQL em 10/10/2026 e inspeção do catálogo do Lovable Cloud após a aplicação da migration `20261010_cmm_auth_rbac.sql`. RLS e catálogo foram verificados; não foi feita auditoria independente nem validação por contas reais de cada perfil.

## Controles definidos e verificados no banco

- As 14 tabelas de domínio estão com RLS ativa. Foram inspecionadas 14 políticas SELECT; não há leitura concedida a `anon`.
- Privilégios de escrita direta são revogados para `PUBLIC`, `anon` e `authenticated`; gravações operacionais passam por RPCs com autorização por papel.
- Helpers de autorização e atribuição usam schema `private` e não aceitam identidade fornecida pelo browser para verificar o papel do próprio chamador. A função que inspeciona papel de outro usuário não é concedida ao cliente.
- O perfil `user_roles` é separado da identidade Auth. Há bloqueio de alteração do próprio papel e trilha `role_audit`; o primeiro gestor exige bootstrap manual pelo SQL Editor.
- Gestores têm acesso operacional integral; financeiro lê livros financeiros e tem ações financeiras permitidas; campo lê reservas atribuídas e registra presença somente na própria sessão. O financeiro não recebe uma função de listagem da equipe.
- Notas, requisitos operacionais, contatos de clientes e preços ficam em tabelas separadas e com policies distintas. Evite armazenar nome/documento/saúde de passageiros em campos livres.
- Check-in/checkout e registros de valores usam horário do banco. Checkout usa lock e chaves únicas para impedir duplicidade de repasse e recebível.
- A senha/service-role key não deve ser exposta ao browser. Ainda falta função de servidor para criar usuários Auth pela tela Equipe.

## Defeitos corrigidos

- Helpers de papel/atribuição que antes podiam ser consultados com UUIDs arbitrários foram movidos para `private` e limitados ao usuário autenticado nas policies.
- `finance_collaborators()`, que permitia listar todos os colaboradores, foi removida. Financeiro só pode referenciar pessoa já presente em repasse visível.
- Search path de funções foi fixado vazio e o direito CREATE no schema público foi revogado.
- Vínculo de conta Auth tem chave estrangeira; o vínculo também valida email da conta Auth.
- A métrica mensal de campo separa futuros reais no fuso de São Paulo e rejeita mês ausente.
- A migration antiga conflitante e seu seed sintético foram removidos do caminho ativo. Não há seed para aplicar ao Cloud.

## Limitações e trabalho pendente

undefined
- **Cadastro público:** autenticação por email foi habilitada, mas cadastro público precisa ser desligado em Authentication > Settings antes de permitir contas. A ausência de formulário de cadastro não desativa o endpoint Auth.
- **Provisionamento de contas:** falta função de servidor protegida para o gestor criar contas Auth. O primeiro gestor é manual. Não enviar convite/recuperação até configurar e validar SMTP.
- **Notas livres:** a migration limita tamanho, não consegue detectar todos os dados pessoais/saúde. Campos livres precisam de orientação operacional, retenção e revisão de minimização.
- **Verificação funcional:** não foram executados testes, build ou auditoria por papéis. Inspeção estática do catálogo não substitui tentativas reais de acesso negado por cada conta. Não usar dados reais nem publicar como sistema de produção.

## Pré-condições antes de dados reais

1. Desligar cadastro público e criar o primeiro gestor pelo processo manual documentado.
2. Implementar provisionamento seguro, revogação de acesso e recuperação de conta.
3. Criar contas de teste para gestor, financeiro, campo e conta sem papel; confirmar isolamento com consultas e tentativas de escrita indevidas.
4. Revisar finalidade/base legal, aviso de privacidade, retenção e resposta a incidentes para dados pessoais de figuras públicas.
