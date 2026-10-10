# CMM Aviation — modo demonstração

O Lovable Cloud/Supabase está habilitado e a migration de autenticação e permissões foi aplicada. O banco possui estrutura com 14 tabelas protegidas por RLS, mas ainda não há contas de usuários nem dados operacionais reais. O projeto continua sem publicação.

## Dados da demonstração

As telas existentes continuam usando registros fictícios salvos somente neste navegador. Todos os clientes, colaboradores, contatos, aeronaves e valores do protótipo são fictícios. A data inicial é 10/10/2026, com reservas demonstrativas entre GRU e VCP. Não há nomes/documentos de passageiros nem detalhes de saúde.

O armazenamento local não sincroniza entre pessoas ou dispositivos, não tem trilha de auditoria e não oferece autorização de produção. Não usar dados reais.

## Regras simuladas

Preços ficam aplicados à reserva, em centavos. Cada colaborador possui uma sessão de atendimento. Checkout exige check-in e evita gerar repasse duplicado; a cobrança agregada aparece após a conclusão de toda a equipe. Recebimentos, repasses e ajustes são simulações, sem pagamentos externos.

O fechamento Camila Duarte (22 × R$80 + R$100 − R$40 = R$1.820) é uma referência fictícia independente. Ajustes adicionais não alteram esse exemplo.

## Acesso real e próximos passos

A migration `supabase/migrations/20261010_cmm_auth_rbac.sql` está aplicada no Cloud. RLS limita gestor, financeiro e campo; o primeiro gestor ainda deve ser criado manualmente. O login e o portal autenticado estão em implementação. Até a integração estar concluída e as permissões testadas, use somente a demonstração e nunca insira dados pessoais reais.

Antes de habilitar usuários, desligue o cadastro público no painel Cloud, configure SMTP, crie o gestor via SQL Editor e implemente criação segura de contas por gestor. O navegador nunca deve receber uma service-role key. A demonstração local não é sincronizada com o banco e não deve ser confundida com dados reais.
