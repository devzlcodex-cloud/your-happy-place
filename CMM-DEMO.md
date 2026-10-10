# CMM Aviation — modo demonstração

O Lovable Cloud/Supabase está habilitado, mas a migração de tabelas ainda não foi aplicada e o app não está conectado a Auth ou banco. As telas continuam usando dados fictícios salvos somente neste navegador. Nenhum usuário ou informação real foi criado e o projeto não foi publicado.

## Dados

Todos os clientes, colaboradores, contatos, aeronaves e valores do protótipo são fictícios. A data inicial é 10/10/2026, com reservas de demonstração entre GRU e VCP. Não há nomes ou documentos de passageiros nem detalhes de saúde.

O armazenamento local é demonstrativo: não sincroniza entre pessoas ou dispositivos, não tem trilha de auditoria e não oferece autorização de produção. Dados incompatíveis/armazenamento indisponível tornam o modo somente consulta. Não usar dados reais.

## Regras simuladas

Preços ficam aplicados à reserva, em centavos. Cada colaborador possui uma sessão de atendimento. Checkout exige check-in e evita gerar repasse duplicado; a cobrança agregada aparece após a conclusão de toda a equipe. Recebimentos, repasses e ajustes são simulações, sem pagamentos externos.

O fechamento Camila Duarte (22 × R$80 + R$100 − R$40 = R$1.820) é uma referência fictícia independente. Ajustes adicionais não alteram esse exemplo.

## Próxima etapa de acesso

A migração de banco e RLS está em revisão/versionamento em `supabase/migrations/20261010_cmm_auth_rbac.sql`. Antes de ativar usuários, aplique e valide a migração, desligue o cadastro público no painel Cloud, conecte a interface ao Supabase Auth/RPCs e implemente provisionamento seguro de contas pelo gestor. A primeira conta gestora deve receber o papel explicitamente pelo SQL Editor; nunca há promoção automática do primeiro cadastro.

Até que essas etapas estejam concluídas, o protótipo continua demonstrativo e não deve receber dados pessoais reais.
