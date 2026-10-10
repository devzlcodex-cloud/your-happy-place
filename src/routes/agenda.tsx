import { createFileRoute } from '@tanstack/react-router';
import { PageHeading, Filters, useFilters, OperationsTable, SectionHeader } from '@/components/cmm/shared';
import { pageHead } from '@/lib/cmm/head';
export const Route = createFileRoute('/agenda')({ head: () => pageHead('Agenda e atendimentos', 'Programação demonstrativa das bases GRU e VCP.'), component: Agenda });
function Agenda() { const filters = useFilters(); return <><PageHeading title="Agenda e atendimentos" subtitle="Cada atendimento, da programação à conclusão."/><Filters filters={filters} searching/><SectionHeader title="Programação"><span className="text-sm text-muted-foreground">{filters.bookings.length} atendimentos</span></SectionHeader><div className="surface"><OperationsTable bookings={filters.bookings}/></div></>; }
