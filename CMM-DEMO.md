# CMM Aviation — modo demonstração

O banco de dados e a autenticação **não estão conectados**. Nenhum recurso Cloud foi provisionado, nenhuma credencial foi solicitada e o projeto não foi publicado.

## Dados
Todos os clientes, colaboradores, contatos, aeronaves e valores são fictícios. O catálogo é demonstrativo. A data inicial é 10/10/2026, com oito reservas entre GRU e VCP. Não são usados dados reais de passageiros ou informações de saúde.

O repositório demonstrativo usa armazenamento versionado do navegador, carregado após a hidratação. Alterações persistem na mesma origem/navegador. Não há sincronização entre dispositivos, autenticação, trilha imutável ou segurança de produção. Dados incompatíveis/armazenamento indisponível tornam o modo somente consulta, sem afirmar que alterações foram salvas. Não usar dados reais.

## Regras
Preços aplicados ficam na reserva, em centavos. Cada colaborador possui uma sessão. Checkout exige check-in e é idempotente, com chave por reserva/colaborador e repasse de R$80. A cobrança agregada surge uma única vez após todos os colaboradores atribuídos concluírem. Observações não podem conter identificação ou saúde de passageiros. Recebimentos, repasses e ajustes são simulações, sem pagamentos externos.

O fechamento Camila Duarte (22 × R$80 + R$100 − R$40 = R$1.820) é uma referência independente, não integra os totais das reservas. Ajustes adicionais ficam em bloco separado com motivo, autor fictício e data, sem alterar o exemplo de referência.

## Conexão futura ao projeto Supabase próprio
A conexão deve ser feita pelo proprietário no editor Lovable. Não inserir chaves privadas no código. Substituir a implementação do repositório por um adaptador remoto, implementar autenticação, permissões e validações do servidor; garantir unicidade/transações no banco para repasses e recebíveis. A interface atual NÃO é uma garantia de integridade para produção, especialmente sob concorrência entre abas/dispositivos.

Um futuro seed Supabase deverá ser aplicado **somente em desenvolvimento/homologação**, nunca automaticamente em produção. Nenhum seed/migration Supabase foi aplicado neste protótipo.
