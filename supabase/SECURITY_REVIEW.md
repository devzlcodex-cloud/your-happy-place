# Revisão estática de segurança — CMM Aviation

**Escopo:** leitura da migration e do seed sintético em 10/10/2026. Nenhum SQL foi executado. Não é auditoria independente nem aprovação para produção.

## Alterações aplicadas nesta fundação

- RLS permanece habilitada em todas as tabelas expostas, sem política para `anon`.
- A migration revoga os privilégios padrão de `public`, `anon` e `authenticated`, e só reabre leitura para usuários autenticados, sujeita às políticas RLS. CRUD via Data API fica fechado enquanto não houver comandos de escrita de domínio.
- As funções `SECURITY DEFINER` de check-in e conclusão ficam no schema `private`; apenas wrappers `SECURITY INVOKER` estreitos ficam em `public`. Os corpos usam `search_path` vazio e nomes qualificados. A autorização verifica a sessão ativa, papel e vínculo do colaborador.
- Check-in e conclusão usam `now()` no banco para os registros financeiros/operacionais; a API não aceita timestamps escolhidos pelo navegador.
- Usuários financeiros deixaram de ler reservas completas, que incluem notas operacionais e referência da aeronave. Eles consultam os livros financeiros e os dados empresariais mínimos do cliente.
- E-mail de faturamento foi retirado do cadastro inicial de clientes. O modelo não inclui nome de passageiro, CPF, documento de viagem, dados bancários ou saúde.
- Dados-semente são fictícios e não incluem e-mails de contato.

## Limites e riscos restantes

- **Ainda não validado por execução:** a base não foi aplicada a Supabase local ou hospedado; grants efetivos, políticas, wrappers/RPCs, concorrência e integração PostgREST precisam de testes positivos e negativos por papel.
- **Escrita de produto incompleta:** reservar/editar, cadastrar cliente/equipe, provisionar contas, ajustar tarifa e aprovar/pagar lançamentos ainda não têm comandos de backend. Não reabra grants gerais para fazer esses fluxos funcionarem.
- **Texto livre:** notas operacionais e de checkout podem receber dados pessoais por engano. Não usar com passageiros reais antes de definir conteúdo permitido, necessidade, minimização, acesso, retenção e auditoria; interface sozinha não é controle de segurança.
- **Identificadores indiretos:** referência de aeronave, horário, aeroporto, cliente e notas podem identificar uma pessoa pública por combinação. Restringir operação a quem precisa e evitar copiar itinerário ou nome de passageiro.
- **Auditoria e ciclo de vida:** ainda não há trilha imutável suficiente de leituras/alterações, retenção/eliminação, exportação controlada, revogação de sessão, revisão periódica de acesso nem procedimento de incidente.
- **Administração privilegiada:** o provisionamento de `user_profiles.role` e do vínculo empregado-conta precisa ocorrer por processo restrito, fora de cadastro público e sem confiar em valores enviados pelo navegador.
- **Privilégios elevados:** `service_role`, proprietário da base e SQL Editor ignoram RLS em cenários privilegiados. Segredos de serviço não podem ir para bundle web, log ou repositório.
- **Configuração do projeto:** manter `private` fora de Exposed Schemas da API Supabase; expor apenas o schema necessário. Desabilitar permissões/grants padrão não usados e validar após migrations.

## Condições mínimas antes de dados reais

1. Executar a migration em banco de desenvolvimento descartável, com análise estática e testes de autorização para `anon`, cada papel e usuário sem vínculo.
2. Validar grants além das políticas: leitura e escrita negadas no banco/API onde não previstas, colunas sensíveis indisponíveis, horários financeiros gerados no servidor e wrappers sem caminho para executar operações de terceiros.
3. Implementar audit trail e comandos de escrita estreitos; testar adulteração de `employee_id`, `role`, preço congelado, status financeiro, notas e ids de terceiros.
4. Revisar necessidade/finalidade, base legal, aviso/transparência, retenção e resposta a incidentes com a pessoa responsável por privacidade. Aplicar minimização a todos os titulares, sejam ou não figuras públicas.
5. Integrar o frontend somente com chave pública apropriada e Auth; nunca distribuir `service_role`. Confirmar RLS com as mesmas chamadas do cliente real.

Referência técnica consultada: [Supabase — Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security), [Database Functions](https://supabase.com/docs/guides/database/functions) e [Column Level Security](https://supabase.com/docs/guides/database/postgres/column-level-security). A documentação recomenda grants mínimos, testes de allow/deny por operação e `search_path = ''` em funções definidoras de segurança.

