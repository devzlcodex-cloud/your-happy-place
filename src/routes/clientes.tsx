import { createFileRoute } from '@tanstack/react-router';
import { Search, Mail, Building2 } from 'lucide-react';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { clients } from '@/lib/cmm/domain';
import { useDemo } from '@/lib/cmm/provider';
import { pageHead } from '@/lib/cmm/head';
import { PageHeading, Avatar, Empty } from '@/components/cmm/shared';
export const Route = createFileRoute('/clientes')({ head: () => pageHead('Clientes', 'Diretório de clientes e contatos inteiramente fictícios da CMM Aviation.'), component: Clients });
function Clients() { const [search,setSearch] = useState(''); const { state } = useDemo(); const filtered = clients.filter(c => `${c.name} ${c.contact}`.toLowerCase().includes(search.toLowerCase())); return <><PageHeading title="Clientes" subtitle="Relacionamentos que conectam a nossa operação."/><div className="directory-toolbar"><span>{clients.length} clientes cadastrados <small>· Fictícios</small></span><div className="search-input"><Search className="size-4"/><Input aria-label="Buscar cliente" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar cliente ou contato"/></div></div><div className="directory-grid">{filtered.map(c => <article className="directory-card" key={c.id}><div className="flex items-center gap-4"><Avatar initials={c.initials}/><div className="min-w-0"><h2>{c.name}</h2><p>{c.category}</p></div></div><div className="directory-details"><span><Building2/>{c.contact} · Contato fictício</span><span><Mail/>{c.email}</span></div><div className="directory-bottom"><span>{state.bookings.filter(b => b.clientId === c.id).length} agendamentos</span><span className="status status-success"><span className="status-dot"/>Ativo</span></div></article>)}</div>{!filtered.length && <Empty text="Nenhum cliente encontrado."/>}</>; }
