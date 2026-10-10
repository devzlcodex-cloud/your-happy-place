# CMM Aviation — protótipo funcional

## Experiência
- Substituir a página inicial por uma visão geral operacional refinada, em pt-BR, com bases GRU/VCP, data, indicadores e próximas operações.
- Criar páginas próprias para agenda, novo agendamento, atendimento de campo, clientes, equipe e financeiro.
- Usar a marca tipográfica CMM Aviation e a paleta solicitada, com navegação fixa no desktop e compacta no telefone.

## Fluxos
- Validar agendamentos com cliente, base, data/hora, serviços e responsável; apoio e aeronave opcionais.
- Exibir função, base, idiomas e capacidade operacional da equipe; congelar preços ao agendar.
- Permitir check-in, observações e checkout por colaborador, bloqueando duplicação.
- Criar um repasse de R$80 por colaborador concluído e uma cobrança agregada após todos concluírem.
- Separar recebíveis e repasses, incluir ajustes auditáveis fictícios e o fechamento demonstrativo de R$1.820.

## Dados e limites
- Usar exclusivamente nomes e dados fictícios, sem login.
- Persistir a demonstração neste navegador. Lovable Cloud, banco e autenticação permanecerão desconectados.
- Não solicitar credenciais, publicar ou alterar visibilidade. Documentar que um futuro seed será apenas para desenvolvimento/homologação.

## Detalhes técnicos
- Preservar TanStack Start, infraestrutura, error reporting e convenções existentes.
- Separar regras de negócio e repositório de demonstração das páginas, preparando a futura conexão ao Supabase próprio.
- Testar idempotência financeira, preços congelados e rotas; verificar os fluxos no preview desktop e telefone.
- Informar preview, validações, limitações e SHA disponível ao finalizar.