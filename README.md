# CMM Aviation

Painel responsivo de operações aeroportuárias para GRU e VCP, em português do Brasil.

## Demonstração

O app atual demonstra visão geral, agenda, atendimento de campo, criação de agendamento com múltiplos serviços, diretórios de clientes/equipe e financeiro. Os dados são fictícios e ficam no armazenamento local do navegador; não há autenticação, sincronização entre dispositivos ou backend ativo.

- Agendamentos preservam o preço dos serviços no momento da criação.
- Cada colaborador tem seu próprio check-in e checkout.
- Checkout concluído gera no máximo um repasse demonstrativo de R$ 80 por colaborador.
- A cobrança agregada é criada uma vez, após todos os colaboradores concluírem o atendimento.
- Nenhuma cobrança ou transferência é executada.

## Desenvolvimento

Requisitos: Node.js e npm.

```sh
npm install
npm run dev
```

Também há scripts para build, lint e testes. O projeto mantém TanStack Start, TypeScript, Vite e os componentes Lovable existentes.

## Dados e privacidade

Use exclusivamente dados sintéticos. Não insira nomes/itinerários de passageiros, documentos, dados de saúde, contatos pessoais ou dados bancários no modo demonstração. Pessoas públicas continuam titulares de dados pessoais. Referências de aeronave, horário, base e observações podem identificar alguém por combinação.

## Supabase

A pasta `supabase/` contém uma fundação de schema/RLS e seed sintético, ainda **não aplicada** a nenhum projeto Supabase. O modo app ainda não está conectado ao banco nem à autenticação.

- Leia `supabase/SECURITY_REVIEW.md` e `supabase/README.md` antes de aplicar qualquer migration.
- Grants de escrita pela API permanecem fechados até a criação de RPCs específicas e auditadas para os fluxos de produto.
- A fundação SQL requer aplicação e testes allow/deny por papel em ambiente descartável. Não é certificação para produção.
- Nunca exponha a chave `service_role` no navegador ou no GitHub.
- Use o seed apenas em desenvolvimento/homologação e nunca com dados reais.

O repositório é sincronizado com o projeto Lovable CMM Aviation. Commits na branch conectada aparecem no editor Lovable.
