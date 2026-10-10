# Fundação Supabase — CMM Aviation MVP

Este diretório contém uma base **local e não aplicada** para a futura integração do CMM Aviation com Supabase. Não há URL de projeto, segredo, chave, conta, deploy ou migração de produção neste workspace.

## Conteúdo

- `migrations/0001_cmm_aviation_foundation.sql`: modelo relacional, regras de integridade, RLS e RPCs de check-in/conclusão.
- `seed/0001_synthetic_demo.sql`: somente registros sintéticos para demonstrar GRU, VCP, operação de aeronave e fechamento de R$ 1.820,00.

Os valores monetários são inteiros em centavos. Todos os eventos operacionais e financeiros usam `timestamptz`.

## Como aplicar quando existir um projeto

1. Crie um projeto Supabase e mantenha `private` fora da lista de schemas expostos pela API. O schema `public` contém somente a RPC que o app precisa chamar.
2. Revise o SQL com o responsável técnico e jurídico. Em especial, escolha o fluxo protegido que criará usuários em `auth.users`, seus registros em `user_profiles`, as funções e o vínculo opcional em `employees.user_profile_id`.
3. Aplique primeiro `migrations/0001_cmm_aviation_foundation.sql` em uma base de desenvolvimento vazia, pelo fluxo de migrations escolhido para o repositório futuro ou pelo SQL Editor do projeto de desenvolvimento.
4. Depois de revisar os dados demonstrativos, aplique `seed/0001_synthetic_demo.sql` somente em desenvolvimento ou homologação. Nunca use este seed em produção.
5. Crie contas de teste e perfis antes de testar a RLS. O seed não cria usuários de autenticação deliberadamente.
6. Teste as RPCs autenticadas `public.check_in_attendance(p_attendance_id, p_checked_in_at)` e `public.complete_attendance(p_attendance_id, p_completed_at, p_checkout_note)` em papéis diferentes e confirme que o cliente não tem acesso à `service_role`.

## Garantias do modelo

- `payouts.attendance_id` e `receivables.booking_id` são únicos.
- `check_in_attendance` e `complete_attendance` só permitem que um colaborador atue no próprio atendimento; ambas são idempotentes. A conclusão bloqueia a reserva dentro da transação, exige um período de pagamento `open` que cubra o horário de conclusão, usa inserções com conflito seguro e não cria um segundo repasse ou recebível.
- A cobrança do cliente é calculada a partir dos preços aplicados em `booking_line_items`, não do preço atual do catálogo, e só é criada quando todos os atendimentos estiverem concluídos.
- O banco não contém CPF, dados bancários, nomes de passageiros ou detalhes de saúde. Acessibilidade é apenas um marcador operacional e uma capacidade da equipe.

## Papéis e RLS

Toda tabela tem RLS habilitada e não existe política para `anon`. A migration também revoga as permissões de leitura e gravação padrão e concede somente `SELECT` para `authenticated`. As políticas RLS filtram as linhas visíveis por papel/vínculo. Até implementar comandos RPC específicos e auditados para criar/editar reservas, cadastros e lançamentos financeiros, a API não permite CRUD direto. Isso é deliberado: RLS sozinha não impede que um usuário autorizado altere colunas sensíveis de uma linha que ele pode gravar.

| Papel | Acesso concedido |
| --- | --- |
| `collaborator` | Catálogo e aeroportos; agendamentos atribuídos; próprio atendimento, repasse e ajuste. Só conclui seu próprio atendimento pela RPC. |
| `operations` | Consulta dados operacionais autorizados e pode chamar as RPCs de check-in/conclusão. Não consulta os livros financeiros nem grava diretamente nas tabelas. |
| `finance` | Consulta agenda para contextualização, recebíveis, repasses, ajustes e períodos. Não conclui atendimento e não grava diretamente. |
| `admin` | Consulta os escopos de operação e financeiro e pode chamar as RPCs operacionais; CRUD e administração de papéis dependem de comandos privilegiados ainda não definidos. |

Nenhuma tabela aceita gravação direta pela API autenticada nesta etapa. Recebíveis e repasses são criados exclusivamente como efeito da RPC de conclusão. A definição de uma trilha administrativa segura para aprovar/pagar esses lançamentos é uma decisão pendente de produto e controle financeiro.

## Revisão manual obrigatória antes do uso real

- Validar regras de retenção, auditoria e acesso para empregados e clientes com o responsável de privacidade.
- Integrar o campo à sequência autenticada de `check_in_attendance` e depois `complete_attendance`; a segunda RPC exige o estado `checked_in`.
- Criar RPCs de escrita com validação de domínio e autorização por papel para clientes, equipe, catálogo, reservas, serviços congelados e períodos; nunca reabrir grants genéricos para substituir esses comandos.
- Definir um fluxo de provisionamento de conta e vínculo de colaborador por administrador confiável, fora do auto-cadastro público. Nunca aceitar `role` do cliente/browser como fonte de autoridade.
- Revisar os campos de observação operacional: instruir a equipe a não registrar nome de passageiro, contato pessoal, itinerário identificável ou informação de saúde; limitar acesso e retenção antes de habilitar notas reais.
- Para dados pessoais de pessoas públicas, aplicar a mesma minimização e proteção de qualquer titular: não armazenar dados de passageiros sem necessidade e base legal definidas; preferir apenas referência operacional e marcador sintético de acessibilidade. Se um caso operacional exigir dado adicional, definir finalidade, acesso restrito, prazo de retenção e trilha de auditoria antes de incluí-lo.
- O protótipo não possui log imutável de leitura/alteração, exportação controlada, política de retenção/eliminação, gestão de incidentes ou revisão de acesso. Implementar e validar esses controles antes de inserir dados reais.
- Definir a regra de cancelamento e de cobrança para reservas sem atendimento ou com atendimento cancelado.
- Abrir um período que cubra o horário do atendimento antes de concluir. Sem período `open`, a RPC aborta e não cria repasse ou recebível. Definir também o processo de fechamento, aprovação/pagamento de repasses e emissão fiscal; estes itens não são automatizados.
- Em ambiente Supabase, testar a função `SECURITY DEFINER` com a propriedade adequada e manter o `search_path` vazio e nomes qualificados, como na migration. Não conceder `service_role` ao navegador.
- Cobrir cada política com testes positivos e negativos para `anon` e cada papel autenticado; validar também privilégios SQL (não apenas RLS), acesso por coluna e RPCs, em uma base descartável antes de conectar qualquer frontend.

## Seed de demonstração

O período `DEMO-2026-09-B` fecha com `22 × R$ 80,00 + R$ 100,00 − R$ 40,00 = R$ 1.820,00`; `DEMO-2026-10-A` está aberto para os exemplos operacionais. Também há reservas abertas para Meet & Assist em GRU, recepção de aeronave + limpeza QTU/QTA + pushback com duas pessoas, e apoio operacional de acessibilidade em VCP.

