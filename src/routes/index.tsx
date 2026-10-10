import { createFileRoute } from '@tanstack/react-router';
import { Overview } from '@/components/cmm/overview';
import { pageHead } from '@/lib/cmm/head';
export const Route = createFileRoute('/')({ head: () => pageHead('Visão geral', 'Central de operações CMM Aviation. Agenda, equipe e indicadores demonstrativos de GRU e VCP.'), component: Overview });
